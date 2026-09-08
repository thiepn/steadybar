import type { PracticeProfile, PracticeProtocol, Pulse } from '../domain/practice-types.js';
import { NOTE_NAMES, noteName, parseNote, protocolPulse, pulse } from '../domain/protocols.js';
import { validateProtocol } from '../domain/practice-validation.js';
import { checkbox, formNumber, formText, input, select, textarea } from './components.js';
import { el } from './dom.js';

export interface ProtocolEditor { node:HTMLElement; read:(form:FormData)=>PracticeProtocol }
export function protocolEditor(initial:PracticeProtocol,profile:PracticeProfile):ProtocolEditor {
  const p=structuredClone(initial),node=el('div',{class:'protocol-editor','data-protocol':p.kind});
  const text=(name:string,label:string,value='',hint='')=>{const field=input(name,label,value,'text',{maxlength:1000});if(hint)field.append(el('small',{class:'field-hint'},hint));return field;};
  const number=(name:string,label:string,value:number,min:number,max:number,step=1)=>input(name,label,value,'number',{min,max,step,required:true,inputmode:step===1?'numeric':'decimal'});
  const note=(name:string,label:string,value:number)=>select(name,label,Array.from({length:88},(_,i)=>[String(i+21),noteName(i+21)]),String(value));
  const hand=(value:string)=>select('hands','Hands',[['left','Left hand'],['right','Right hand'],['together','Hands together']],value==='not-applicable'?'right':value);
  switch(p.kind){
    case 'free':node.append(textarea('focus','Practice focus',p.focus));break;
    case 'tempo':node.append(text('technique','Technique',p.technique));if(profile.family==='percussion')node.append(text('sticking','Sticking',p.sticking??''),text('orchestration','Limb / orchestration notes',p.orchestration??''));break;
    case 'repetitions':node.append(text('task','Repeated task',p.task),number('target','Target clean repetitions',p.target,1,10000));break;
    case 'chord-changes':node.append(text('chords','Chord sequence',p.chords.join(', '),'Separate chords with commas. Count results after playing; tapping is not required for every change.'),text('technique','Technique / rhythm',p.technique),number('target','Target clean changes',p.target,1,10000));break;
    case 'groove':node.append(el('div',{class:'form-grid'},text('key','Key',p.key),text('style','Style / feel',p.style)),select('grooveFocus','Listening focus',[['time','Time'],['muting','Muting'],['articulation','Articulation'],['coordination','Coordination']],p.focus),text('progression','Progression / groove notes',p.progression));break;
    case 'scale-cycle':{
      const keys=el('fieldset',{class:'key-options'},el('legend',{},'Keys in the cycle'));
      NOTE_NAMES.forEach((label,i)=>keys.append(checkbox(`key-${i}`,label,p.keys.includes(i))));
      node.append(keys,select('quality','Scale quality',[['major','Major'],['natural-minor','Natural minor'],['minor-pentatonic','Minor pentatonic'],['major-pentatonic','Major pentatonic'],['chromatic','Chromatic']],p.quality),
        el('div',{class:'form-grid'},select('octaves','Octaves',['1','2','3','4'],String(p.octaves)),profile.family==='keyboard'?hand(p.hands):text('position','Position / string set',p.position)),
        profile.family==='keyboard'?select('motion','Motion',[['parallel','Parallel'],['contrary','Contrary']],p.motion):'',text('fingering','Fingering / technique',p.fingering));break;
    }
    case 'fretboard':node.append(text('tuning','Tuning, low to high',p.tuning.map(noteName).join(', '),'Scientific pitch names, such as E2, A2, D3, G3, B3, E4.'),text('strings','Strings to test',p.strings.join(', '),'String 1 is the highest string. Separate numbers with commas.'),el('div',{class:'form-grid'},number('minFret','First fret',p.minFret,0,24),number('maxFret','Last fret',p.maxFret,0,24)),number('target','Recall prompts',p.target,1,1000));break;
    case 'vocal-pattern':node.append(el('p',{class:'voice-safety'},'Set a range that feels comfortable today. The complete pattern must fit. Stop singing when hoarse, tired or uncomfortable; rest rather than extending the range.'),
      el('div',{class:'form-grid'},note('lowMidi','Comfortable low pitch',p.lowMidi),note('highMidi','Comfortable high pitch',p.highMidi)),note('startMidi','Starting pitch',p.startMidi),
      text('offsets','Pattern: semitone offsets',p.offsets.join(', '),'0, 4, 7, 4, 0 plays a major triad up and down. These are semitones, not scale degrees.'),text('syllable','Syllable / vowel',p.syllable),
      el('div',{class:'form-grid'},select('transpose','Next root',[['1','Up 1 semitone'],['2','Up 2 semitones'],['-1','Down 1 semitone'],['-2','Down 2 semitones']],String(p.transpose)),number('noteSeconds','Seconds per reference note',p.noteSeconds,.2,3,.1)),number('restSeconds','Rest reminder (seconds)',p.restSeconds,5,120));break;
    case 'pitch-match':node.append(note('rootMidi','Reference pitch',p.rootMidi),select('interval','Target interval',Array.from({length:25},(_,i)=>[String(i-12),`${i-12===0?'Same pitch':(i-12>0?'+':'')+(i-12)+' semitones'}`]),String(p.interval)),number('target','Matching attempts',p.target,1,1000),el('p',{class:'field-hint'},'Reference tones and your own listening judgment. No microphone is used and no pitch accuracy is inferred.'));break;
    case 'sight-reading':node.append(textarea('material','Score / material',p.material),text('key','Key / tonal center',p.key),profile.family==='keyboard'?hand(p.hands):'',checkbox('firstRead','This material is new to me',p.firstRead),el('p',{class:'field-hint'},'Use your own score. The first recorded attempt is marked separately; repetitions are not new first reads.'));break;
    case 'repertoire':node.append(textarea('focus','Passage goal',p.focus),text('measures','Measures / phrase',p.measures),profile.family==='keyboard'?hand(p.hands):'');break;
  }
  let readPulse:((data:FormData)=>Pulse|undefined)|undefined;
  if('pulse' in p || ['free','repetitions','chord-changes','scale-cycle','sight-reading','repertoire'].includes(p.kind)){
    const mandatory=p.kind==='tempo'||p.kind==='groove',c=protocolPulse(p)??pulse();
    const enabled=checkbox('useClick','Use a metronome with this exercise',mandatory||!!protocolPulse(p));enabled.hidden=mandatory;
    const controls=el('div',{class:'form-grid'},number('protocolBpm','Starting BPM',c.bpm,20,300),select('beats','Beats per bar',Array.from({length:16},(_,i)=>String(i+1)),String(c.beats)),select('beatUnit','Beat unit',[['4','Quarter note'],['8','Eighth note']],String(c.beatUnit)),select('subdivision','Subdivision',[['1','1 per beat'],['2','2 per beat'],['3','3 per beat'],['4','4 per beat']],String(c.subdivision)));
    const toggle=()=>{const on=mandatory||enabled.querySelector('input')!.checked;controls.hidden=!on;controls.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select').forEach(e=>e.disabled=!on);};enabled.addEventListener('change',toggle);toggle();node.append(enabled,controls);
    readPulse=data=>mandatory||data.has('useClick')?{bpm:formNumber(data,'protocolBpm'),beats:formNumber(data,'beats'),beatUnit:formNumber(data,'beatUnit') as 4|8,subdivision:formNumber(data,'subdivision') as 1|2|3|4}:undefined;
  }
  const read=(data:FormData):PracticeProtocol=>{
    const text=(name:string)=>formText(data,name),n=(name:string)=>formNumber(data,name),list=(name:string)=>text(name).split(',').map(v=>v.trim()).filter(Boolean);
    const h=profile.family==='keyboard'?text('hands'):'not-applicable';
    let candidate:unknown;
    switch(p.kind){
      case 'free':candidate={kind:p.kind,focus:text('focus'),pulse:readPulse?.(data)};break;
      case 'tempo':candidate={kind:p.kind,pulse:readPulse?.(data),technique:text('technique'),...(profile.family==='percussion'?{sticking:text('sticking'),orchestration:text('orchestration')}:{})};break;
      case 'repetitions':candidate={kind:p.kind,task:text('task'),target:n('target'),pulse:readPulse?.(data)};break;
      case 'chord-changes':candidate={kind:p.kind,chords:list('chords'),target:n('target'),technique:text('technique'),pulse:readPulse?.(data)};break;
      case 'groove':candidate={kind:p.kind,pulse:readPulse?.(data),key:text('key'),style:text('style'),focus:text('grooveFocus'),progression:text('progression')};break;
      case 'scale-cycle':candidate={kind:p.kind,keys:Array.from({length:12},(_,i)=>i).filter(i=>data.has(`key-${i}`)),quality:text('quality'),octaves:n('octaves'),hands:h,motion:profile.family==='keyboard'?text('motion'):'parallel',fingering:text('fingering'),position:profile.family==='keyboard'?'':text('position'),pulse:readPulse?.(data)};break;
      case 'fretboard':candidate={kind:p.kind,tuning:list('tuning').map(parseNote),strings:list('strings').map(Number),minFret:n('minFret'),maxFret:n('maxFret'),target:n('target')};break;
      case 'vocal-pattern':candidate={kind:p.kind,startMidi:n('startMidi'),lowMidi:n('lowMidi'),highMidi:n('highMidi'),offsets:list('offsets').map(Number),syllable:text('syllable'),transpose:n('transpose'),noteSeconds:n('noteSeconds'),restSeconds:n('restSeconds')};break;
      case 'pitch-match':candidate={kind:p.kind,rootMidi:n('rootMidi'),interval:n('interval'),target:n('target')};break;
      case 'sight-reading':candidate={kind:p.kind,material:text('material'),key:text('key'),hands:h,firstRead:data.has('firstRead'),pulse:readPulse?.(data)};break;
      case 'repertoire':candidate={kind:p.kind,focus:text('focus'),measures:text('measures'),hands:h,pulse:readPulse?.(data)};break;
    }
    return validateProtocol(candidate);
  };
  return {node,read};
}
