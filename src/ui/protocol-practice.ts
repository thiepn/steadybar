import type { PracticeBlock } from '../domain/models.js';
import type { ProtocolOutcome } from '../domain/practice-types.js';
import { protocolDefinition } from '../domain/profiles.js';
import { fretPrompt, noteName, NOTE_NAMES, patternFits, protocolSummary, scaleOffsets } from '../domain/protocols.js';
import { outcomeSummary } from '../domain/protocol-analytics.js';
import { reference } from '../audio/reference.js';
import { audio } from '../audio/engine.js';
import { practice } from '../practice/controller.js';
import { store } from '../app/store.js';
import { protocolEditor } from './protocol-editor.js';
import { button, formDialog, formNumber, input, notify, select, textarea, formText } from './components.js';
import { nowISO, uuid } from '../domain/utils.js';
import { el } from './dom.js';

export interface TaskPanel {node:HTMLElement;update:(block:PracticeBlock)=>void;cleanup:()=>void}
export function taskPanel(initial:PracticeBlock):TaskPanel {
  let block=initial,stamp='',restUntil=0;
  const p=initial.protocolSnapshot;
  const node=el('section',{class:'protocol-task','data-protocol':p?.kind??'legacy'}),heading=el('h2',{class:'task-heading'}),cue=el('p',{class:'task-cue'}),detail=el('p',{class:'muted small'}),actions=el('div',{class:'task-actions'}),feedback=el('p',{class:'task-feedback',role:'status'}),recent=el('p',{class:'muted small task-result'});
  if(!p||p.kind==='tempo')return {node,update:()=>{},cleanup:()=>reference.stop()};
  node.append(el('div',{class:'task-heading-row'},heading),cue,detail,actions,feedback,recent);
  const state=()=>block.protocolState??{step:0,clean:0,total:0};
  const base=()=>({id:uuid(),timestamp:nowISO(),note:'',source:'self-report' as const});
  const ensureStarted=()=>{if(!practice.session||['ready','countin'].includes(practice.session.runtime.phase))throw new Error('Start practice before logging a result.');};
  const log=async(value:ProtocolOutcome,step=state().step)=>{await practice.outcome(value,step);feedback.textContent='Result saved.';};
  const score=(name:string,label:string,value=3)=>select(name,label,['1','2','3','4','5'],String(value));
  const listen=async(notes:number[],seconds=.7)=>{if(audio.running)await practice.pause();await reference.play(notes,seconds,Math.min(.3,store.snapshot().settings.metronome.volume*.25));};
  const configure=()=>{
    const profile=store.snapshot().profiles?.find(profile=>profile.id===block.profileId);if(!profile)throw new Error('Profile unavailable.');
    const editor=protocolEditor(block.protocolSnapshot!,profile);
    formDialog('Task settings',[editor.node,el('p',{class:'field-hint'},'Changing a task after practice has begun keeps the previous work as a separate history segment.')],async form=>{await practice.configureProtocol(editor.read(form));},'Apply task settings');
  };
  if(p.kind==='repetitions'||p.kind==='chord-changes'){
    const round=()=>{ensureStarted();const step=state().step;formDialog('Log a practice round',[
      el('p',{class:'field-hint'},'Enter counts after playing. Do not interrupt each repetition to tap the screen.'),
      el('div',{class:'form-grid'},input('clean','Clean repetitions',0,'number',{min:0,max:10000,step:1,required:true}),input('total','Total attempts',1,'number',{min:1,max:10000,step:1,required:true})),
      textarea('note','Observation','',2),
    ],async form=>{const earlier=(block.outcomes??[]).filter(r=>r.kind==='count').reduce((n,r)=>n+r.durationSeconds,0);await log({...base(),kind:'count',protocol:p.kind,clean:formNumber(form,'clean'),total:formNumber(form,'total'),durationSeconds:Math.max(0,practice.elapsed()-earlier),note:formText(form,'note')},step);},'Save round');};
    actions.append(button('Log round',round,'primary'),button(p.kind==='chord-changes'?'+ Clean change':'+ Clean repetition',async()=>{ensureStarted();await log({...base(),kind:'count',protocol:p.kind,clean:1,total:1,durationSeconds:0});},'secondary'),button('Miss',async()=>{ensureStarted();await log({...base(),kind:'count',protocol:p.kind,clean:0,total:1,durationSeconds:0});},'ghost'));
  }else if(p.kind==='groove'){
    actions.append(button('Review groove',()=>{ensureStarted();const step=state().step;formDialog('Groove review',[
      el('p',{class:'field-hint'},'Your own listening assessment, from 1 (needs work) to 5 (controlled).'),score('timing','Time / pulse'),score('control',p.focus==='muting'?'Muting':'Control'),score('articulation','Articulation'),textarea('note','Observation','',2),
    ],async form=>log({...base(),kind:'groove',timing:formNumber(form,'timing'),control:formNumber(form,'control'),articulation:formNumber(form,'articulation'),durationSeconds:practice.elapsed(),note:formText(form,'note')},step),'Save review');},'primary'));
  }else if(p.kind==='scale-cycle'){
    actions.append(button('Log scale',()=>{ensureStarted();const step=state().step,key=p.keys[step%p.keys.length]!;formDialog('Scale result',[
      el('p',{},`${NOTE_NAMES[key]} ${p.quality.replaceAll('-',' ')} · ${p.hands}`),input('mistakes','Note / continuity errors',0,'number',{min:0,max:1000,step:1,required:true}),textarea('note','Control / fingering notes','',2),
    ],async form=>log({...base(),kind:'scale',key,quality:p.quality,hands:p.hands,mistakes:formNumber(form,'mistakes'),bpm:p.pulse?practice.session!.runtime.bpm:undefined,note:formText(form,'note')},step),'Save and next key');},'primary'),
      button('Previous key',()=>practice.moveTask(-1),'secondary'),button('Next key',()=>practice.moveTask(1),'secondary'),
      button('Hear scale',()=>{const key=p.keys[state().step%p.keys.length]!,unit=scaleOffsets(p.quality),offsets=Array.from({length:p.octaves},(_,i)=>unit.slice(0,-1).map(n=>n+i*12)).flat();offsets.push(p.octaves*12);const root=(p.octaves>2?36:48)+key;return listen(offsets.map(n=>root+n),.4);},'ghost'));
  }else if(p.kind==='fretboard'){
    const answers=el('div',{class:'note-answers',role:'group','aria-label':'Note answers'});
    for(let answer=0;answer<12;answer++)answers.append(button(NOTE_NAMES[answer]!,async()=>{
      ensureStarted();const step=state().step,prompt=fretPrompt(p,step);
      answers.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await log({...base(),kind:'recall',string:prompt.string,fret:prompt.fret,expected:prompt.pitchClass,answer,correct:answer===prompt.pitchClass,source:'scored-input'},step);feedback.textContent=answer===prompt.pitchClass?'Correct. Next note.':`That was ${NOTE_NAMES[prompt.pitchClass]}. Next note.`;}finally{answers.querySelectorAll('button').forEach(b=>b.disabled=false);}
    },'secondary note-answer'));
    actions.append(answers);
  }else if(p.kind==='vocal-pattern'){
    actions.append(button('Play pattern',async()=>{const root=state().rootMidi??p.startMidi;await listen(p.offsets.map(n=>root+n),p.noteSeconds);restUntil=Date.now()+p.offsets.length*p.noteSeconds*1000+p.restSeconds*1000;feedback.textContent=`Listen, sing comfortably, then rest for ${p.restSeconds} seconds.`;},'primary'),
      button('Stop reference',()=>reference.stop(),'secondary'),button('Previous pitch',()=>practice.moveTask(-1).finally(()=>setTimeout(()=>{stamp='';update(block);},0)),'secondary'),button('Next pitch',()=>practice.moveTask(1).finally(()=>setTimeout(()=>{stamp='';update(block);},0)),'secondary'),
      button('Review voice',()=>{ensureStarted();const step=state().step,root=state().rootMidi??p.startMidi;formDialog('Voice review',[
        el('p',{class:'field-hint'},'Self-assessment only. Ease runs from 1 (difficult) to 5 (easy); fatigue from 0 (none) to 5 (high).'),score('pitch','Pitch match'),score('ease','Ease'),score('breath','Breath coordination'),select('fatigue','Fatigue',['0','1','2','3','4','5'],'0'),textarea('note','Observation','',2),
      ],async form=>{const fatigue=formNumber(form,'fatigue');await log({...base(),kind:'voice',rootMidi:root,pitch:formNumber(form,'pitch'),ease:formNumber(form,'ease'),breath:formNumber(form,'breath'),fatigue,note:formText(form,'note')},step);if(fatigue>=4){await practice.pause();notify('Session paused. Rest your voice rather than pushing through fatigue.','info');}},'Save review');},'secondary'));
    node.append(el('p',{class:'voice-safety'},'Keep the complete pattern inside a comfortable range. Do not sing when hoarse, tired or uncomfortable. No microphone analysis is performed.'));
  }else if(p.kind==='pitch-match'){
    actions.append(button('Play reference',()=>listen([p.rootMidi,p.rootMidi+p.interval]),'primary'),button('Stop reference',()=>reference.stop(),'secondary'),
      button('Matched by ear',()=>{ensureStarted();return log({...base(),kind:'pitch',rootMidi:p.rootMidi,interval:p.interval,matched:true});},'secondary'),
      button('Needs another listen',()=>{ensureStarted();return log({...base(),kind:'pitch',rootMidi:p.rootMidi,interval:p.interval,matched:false});},'secondary'));
  }else if(p.kind==='sight-reading'){
    actions.append(button('Log reading attempt',()=>{ensureStarted();const step=state().step;formDialog('Reading result',[
      input('errors','Note / rhythm errors',0,'number',{min:0,max:1000,step:1,required:true}),score('continuity','Continuity'),textarea('note','Observation','',2),
    ],async form=>log({...base(),kind:'reading',firstRead:p.firstRead,errors:formNumber(form,'errors'),continuity:formNumber(form,'continuity'),note:formText(form,'note')},step),'Save reading result');},'primary'));
  }else{
    actions.append(button('Record reflection',()=>{ensureStarted();const step=state().step;formDialog('Practice reflection',[score('rating','Control / confidence'),textarea('note','One observation and next step','',3)],async form=>log({...base(),kind:'reflection',rating:formNumber(form,'rating'),note:formText(form,'note')},step),'Save reflection');},'secondary'));
  }
  node.append(button(p.kind==='vocal-pattern'?'Adjust range / pattern':'Task settings',configure,'ghost compact'));
  const update=(current:PracticeBlock)=>{
    block=current;const state=block.protocolState??{step:0,clean:0,total:0},next=JSON.stringify([state,block.outcomes?.length,practice.session?.runtime.phase]);if(next===stamp)return;stamp=next;
    heading.textContent=protocolDefinition(p.kind).label;cue.textContent=protocolSummary(p);detail.textContent=protocolDefinition(p.kind).description;
    if(p.kind==='chord-changes'||p.kind==='repetitions')detail.textContent=`${state.clean} clean / ${state.total} attempts · goal ${p.target} clean`;
    if(p.kind==='scale-cycle')detail.textContent=[p.motion==='contrary'?'Contrary motion':'Parallel motion',p.fingering,p.position].filter(Boolean).join(' · ');
    if(p.kind==='groove')detail.textContent=`${p.progression} · ${p.focus}. ${protocolDefinition(p.kind).description}`;
    if(p.kind==='sight-reading')cue.textContent=p.material||'Choose a short passage from your own score';
    if(p.kind==='scale-cycle')cue.textContent=`${NOTE_NAMES[p.keys[state.step%p.keys.length]!]} ${p.quality.replaceAll('-',' ')} · ${p.hands==='not-applicable'?p.position:p.hands+' hands'} · ${p.octaves} octave${p.octaves===1?'':'s'}`;
    if(p.kind==='fretboard'){const prompt=fretPrompt(p,state.step);cue.textContent=`String ${prompt.string} · fret ${prompt.fret}`;detail.textContent=`${state.clean} correct / ${state.total} answered · ${p.target} prompt target. String 1 is highest.`;}
    if(p.kind==='pitch-match')detail.textContent=`${state.clean} self-reported matches / ${state.total} attempts · target ${p.target}. No automatic grading.`;
    if(p.kind==='vocal-pattern'){
      const root=state.rootMidi??p.startMidi;cue.textContent=`${p.offsets.map(n=>noteName(root+n)).join(' · ')} — ${p.syllable}`;
      detail.textContent=`Root ${noteName(root)} · comfortable range ${noteName(p.lowMidi)}–${noteName(p.highMidi)} · ${p.restSeconds}s rest reminder`;
      for(const [label,delta] of [['Next pitch',1],['Previous pitch',-1]] as const){const b=[...actions.querySelectorAll('button')].find(b=>b.textContent?.trim()===label);if(b)b.disabled=!patternFits(p,root+delta*p.transpose);}
    }
    const last=block.outcomes?.at(-1);recent.textContent=last?outcomeSummary(last):'No result logged yet.';
    if(p.kind==='sight-reading')detail.textContent=p.firstRead&&!block.outcomes?.some(r=>r.kind==='reading')?'First attempt with this material. Later attempts will be marked repeat practice.':'Repeat reading; not counted as a new first read.';
  };
  const timer=p.kind==='vocal-pattern'?setInterval(()=>{if(restUntil&&Date.now()<restUntil&&!reference.running)feedback.textContent=`Rest reminder · ${Math.ceil((restUntil-Date.now())/1000)}s remaining`;else if(restUntil&&Date.now()>=restUntil){feedback.textContent='Rest reminder finished. Repeat only if it feels comfortable.';restUntil=0;}},1000):undefined;
  update(initial);return {node,update,cleanup:()=>{clearInterval(timer);reference.stop();}};
}
