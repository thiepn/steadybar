import { learningSummary } from '../ui/learning.js';
import { taskPanel, type TaskPanel } from '../ui/protocol-practice.js';
import { protocolPulse } from '../domain/protocols.js';
import { activeProfile, profileName } from '../domain/profiles.js';
import { suggestedExercises } from '../domain/protocol-analytics.js';
import { checkbox } from '../ui/components.js';
import { openAppearance } from '../ui/appearance.js';
import { store } from '../app/store.js';
import { navigate, type Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { button, confirmAction, empty, field, formDialog, formText, link, notify, pageHeader, sectionHeader, textarea } from '../ui/components.js';
import { selectRoutineDialog, trainerDialog } from '../ui/editors.js';
import { exerciseBlock, freeBlock, launchPractice } from '../practice/launch.js';
import { practice } from '../practice/controller.js';
import { duration, clock, localDate } from '../domain/utils.js';
import { RATINGS } from '../domain/models.js';
import { trainerLabel } from '../domain/trainer.js';
import { routineDuration } from '../domain/analytics.js';
import { sessionPage } from './history.js';
export function practicePage():Page{
  const snapshot=store.snapshot(),data=store.view(),plan=data.dailyPlans.find(p=>p.date===localDate()),active=snapshot.sessions.find(s=>s.status==='active');
  const page=el('div',{class:'page practice-launcher'},pageHeader('','Practice','Choose a plan, an exercise, or a timed free session.'));
  page.append(learningSummary());
  if(active)page.append(el('div',{class:'recovery-banner'},el('div',{},el('strong',{},`Unfinished ${profileName(snapshot,active.profileId)} session`),el('span',{},active.blocks[active.activeBlockIndex]?.titleSnapshot)),link('Resume session','/practice/active','button primary','play')));
  const planned=el('section',{class:'panel launcher-plan'},sectionHeader('Today’s session',`${plan?.blocks.length||0} blocks · ${duration(routineDuration(plan?.blocks||[]))}`));
  if(plan?.blocks.length)planned.append(el('ol',{class:'launch-sequence'},plan.blocks.map(b=>el('li',{},el('span',{},b.title),el('span',{class:'muted'},`${duration(b.targetSeconds)}${b.bpm===undefined?'':` · ${b.bpm} BPM`}`)))),button('Start today’s plan',()=>launchPractice(plan.blocks,{planId:plan.id}),'primary','play'));
  else planned.append(empty('No plan for today yet.','Choose a routine or start with a single exercise.',link('Plan today','/','button secondary','today')));
  const minutes=el('input',{type:'number',value:10,min:1,max:1440,step:1,'aria-label':'Free practice duration in minutes'}),bpm=el('input',{type:'number',value:data.settings.metronome.bpm,min:20,max:300,step:1,'aria-label':'Free practice BPM'});
  const click=checkbox('freeClick','Use metronome',activeProfile(store.snapshot()).instrumentType!=='voice');
  const drawClick=()=>{bpm.disabled=!click.querySelector('input')!.checked;bpm.parentElement?.toggleAttribute('hidden',bpm.disabled);};click.addEventListener('change',drawClick);
  const free=el('section',{class:'panel'},sectionHeader('Free practice'),el('p',{class:'muted'},'A timed session; the metronome is optional.'),el('div',{class:'form-grid'},field('Minutes',minutes),field('BPM',bpm)),click,button('Start free practice',async()=>{if(minutes.reportValidity()&&bpm.reportValidity())await launchPractice([{...freeBlock(Number(minutes.value)*60,Number(bpm.value)),bpm:click.querySelector('input')!.checked?Number(bpm.value):undefined}]);},'primary','play'));
  drawClick();
  page.append(el('div',{class:'two-column'},planned,free),el('div',{class:'launcher-options'},link('Choose an exercise','/library','launcher-option','library'),button('Use a routine',()=>selectRoutineDialog(r=>launchPractice(r.blocks,{routineId:r.id})),'launcher-option','routine'),link('Practice a song','/songs','launcher-option','song'),link('Just the metronome','/metronome','launcher-option','pulse')));
  const suggestions=suggestedExercises(data);
  page.append(el('section',{class:'panel'},sectionHeader('Suggested exercises',activeProfile(store.snapshot()).name),...suggestions.map(item=>{const e=data.exercises.find(e=>e.id===item.id)!;return el('div',{class:'suggestion-row'},el('div',{},link(e.name,`/library/${e.id}`),el('p',{class:'field-hint'},item.reason)),button('Practice',()=>launchPractice([exerciseBlock(e)]),'secondary'));})));
  return {node:page};
}
export function activePracticePage():Page{
  const active=practice.session;
  if(!active)return {node:empty('Ready for a session?','Choose something to practice first.',link('Open practice','/practice','button primary','play'))};
  if(active.status!=='active')return sessionPage(active.id,true);
  if(practice.external)return {node:empty('Practice is running in another tab.','Pause it in the other tab, then reload here. This protects your time and prevents duplicate metronomes.',button('Check again',async()=>{await practice.recover();navigate('/practice/active');},'primary','restart'))};
  let focus=store.snapshot().settings.defaultFocus;let task:TaskPanel|undefined;let taskStamp='';const cues=el('details',{class:'active-cues'},el('summary',{},'Practice cues'),el('p',{class:'pre-line'}));const taskHost=el('div',{class:'task-host'});
  const page=el('div',{class:`active-page ${focus?'focused':''}`}),body=el('div',{class:'active-grid'});
  const title=el('h1',{class:'active-title'}),sticking=el('p',{class:'active-sticking sticking'}),status=el('span',{class:'status-label'}),blockNumber=el('span',{class:'eyebrow'}),error=el('div',{class:'practice-error',role:'alert',hidden:true});
  const tempo=el('input',{type:'number',min:20,max:300,step:1,value:active.runtime.bpm,inputmode:'numeric',class:'active-bpm','aria-label':'BPM'});
  tempo.addEventListener('change',async()=>{if(!tempo.reportValidity())return;try{await practice.setBpm(Number(tempo.value));}catch(e){notify(e instanceof Error?e.message:'Tempo could not be saved.','error');}});
  const time=el('span',{class:'active-time','aria-label':'Elapsed active time'}),target=el('span',{class:'timer-target'}),fill=el('div',{class:'progress-fill'}),track=el('div',{class:'progress-track active-track'},fill);
  const start=button('Start practice',()=>practice.toggle(),'primary start-practice','play');
  const metro=button('Metronome on',()=>practice.toggleAudio(),'ghost','volume');
  const progressText=el('p',{class:'trainer-status'}),notesText=el('p',{class:'active-note-preview muted small'}),attemptText=el('p',{class:'attempt-feedback small',role:'status'});
  const beats=el('div',{class:'practice-beats','aria-hidden':'true'});
  const note=()=>{const current=practice.session!.blocks[practice.session!.activeBlockIndex]!;formDialog('Quick practice note',[textarea('note','What did you notice?',current.notes,4)],async data=>{await practice.note(formText(data,'note'));notify('Practice note saved.');},'Save note');};
  const next=el('div',{class:'next-block'}),queue=el('aside',{class:'practice-queue'});
  const setFocus=async(value:boolean)=>{
    focus=value;page.classList.toggle('focused',focus);focusButton.querySelector('span')!.textContent=focus?'Exit focus':'Focus mode';
    if(focus&&document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();}catch{/* CSS focus view remains available. */}}
    if(!focus&&document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
  };
  const focusButton=button(focus?'Exit focus':'Focus mode',()=>setFocus(!focus),'ghost','focus');
  const leave=button('Leave',async()=>{await practice.pause();await store.refresh();navigate('/');},'ghost','exit');leave.setAttribute('aria-label','Save & leave');leave.title='Pause, save, and leave practice';
  const header=el('header',{class:'practice-header'},leave,el('div',{class:'actions'},button('Appearance',openAppearance,'ghost'),focusButton,button('Finish session',async()=>{if(await confirmAction('Finish this session?','Your time, attempts, and notes will be saved. Unfinished future blocks will be marked skipped.','Finish session')){await practice.finish();draw();}},'secondary','check')));
  const ratingButtons=RATINGS.map(rating=>button(rating==='acceptable'?'Acceptable':rating[0]!.toUpperCase()+rating.slice(1),async()=>{const bpm=practice.session!.runtime.bpm;await practice.attempt(rating);attemptText.textContent=`Recorded ${bpm} BPM · ${rating}.`;},`rating-button ${rating==='clean'?'clean-rating':''}`));
  const steps=el('div',{class:'active-tempo-controls'},[-5,-1,1,5].map(step=>button(step>0?`+${step}`:`−${Math.abs(step)}`,()=>practice.setBpm(practice.session!.runtime.bpm+step),'tempo-step')));
  const transition=el('div',{class:'block-transition-controls'},
    button('Skip block',()=>practice.finishBlock(true),'ghost','skip'),
    button('Restart block',async()=>{await practice.restart();notify('New segment ready. Previous time and attempts remain in history.','info');},'ghost','restart'));
  const main=el('section',{class:'practice-workspace'},
    el('div',{class:'practice-identity'},el('div',{class:'practice-state'},blockNumber,status),title,sticking),
    el('div',{class:'practice-readouts'},
      el('div',{class:'time-readout'},el('span',{class:'label'},'Active time'),el('div',{class:'active-timer'},time,target),track),
      el('div',{class:'tempo-readout'},el('label',{class:'label',for:'practice-bpm'},'Tempo · BPM'),tempo,steps)),
    beats,
    el('div',{class:'practice-main-controls'},start,metro,button('Finish block',()=>practice.finishBlock(),'secondary','check')),
    el('div',{class:'attempt-section'},el('div',{class:'label'},'Record this attempt'),el('div',{class:'rating-buttons'},ratingButtons),attemptText),
    taskHost,cues,transition,
    el('div',{class:'practice-tools'},button('Quick note',note,'ghost','note'),button('Tempo trainer',()=>trainerDialog(practice.session!.blocks[practice.session!.activeBlockIndex]!.tempoTrainer,config=>practice.trainer(config),practice.session!.runtime.bpm),'ghost','progress')),
    progressText,notesText,error,next);
  tempo.id='practice-bpm';
  const readouts=main.querySelector<HTMLElement>('.practice-readouts')!;
  const tempoReadout=main.querySelector<HTMLElement>('.tempo-readout')!;
  const attempts=main.querySelector<HTMLElement>('.attempt-section')!;
  const controls=main.querySelector<HTMLElement>('.practice-main-controls')!;
  const tools=main.querySelector<HTMLElement>('.practice-tools')!;
  const trainerButton=[...tools.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()==='Tempo trainer')!;
  // Keep references for later blocks, but do not mount irrelevant controls.
  const mount=(node:HTMLElement,parent:HTMLElement,before:Node|null,visible:boolean)=>{
    if(visible&&!parent.contains(node))parent.insertBefore(node,before);
    else if(!visible&&node.parentElement)node.remove();
  };
  const recovery=el('section',{class:'session-recovery',hidden:!practice.recovered},el('strong',{},'Saved session recovered.'),el('p',{},'Your saved time, attempts, and notes are intact. Time while the app was closed is not counted. After an abrupt close, up to five seconds since the last checkpoint may be missing.'),el('div',{class:'actions wrap'},button('Resume saved session',()=>practice.start(),'primary','play'),button('End and keep history',async()=>{if(await confirmAction('End this saved session?','The session will remain in history as ended early, with its saved time, attempts, and notes.','End session')){await practice.finish(true);navigate(`/history/${active.id}`);}},'secondary'),button('Discard saved session',async()=>{if(await confirmAction('Discard this session permanently?','Only this unfinished session and its attempts will be removed. All other practice history remains.','Discard session',true)){await practice.discard();navigate('/practice');}},'ghost danger-text')));
  body.append(main,queue);page.append(header,recovery,body);
  let lastIndex=-1,lastId='',lastState='',completedView=false;
  const text=(node:Node,value:string)=>{if(node.textContent!==value)node.textContent=value;};
  const tick=()=>{
    const session=practice.session;if(!session||session.status!=='active')return;
    const block=session.blocks[session.activeBlockIndex]!,elapsed=practice.elapsed();
    text(time,clock(elapsed));text(target,`of ${clock(block.targetSeconds)}`);
    const width=`${Math.min(100,elapsed/block.targetSeconds*100).toFixed(2)}%`;if(fill.style.width!==width)fill.style.width=width;
    if(block.tempoTrainer)text(progressText,trainerLabel(block.tempoTrainer,Math.max(0,elapsed-session.runtime.trainerStartSeconds),session.runtime.trainerCleanRounds));
    else text(progressText,elapsed>=block.targetSeconds?'Target time reached. Finish when you are ready.':'');
  };
  function draw():void{
    const session=practice.session;if(!session)return;
    if(session.status!=='active'){if(!completedView){completedView=true;task?.cleanup();page.replaceChildren(sessionPage(session.id,true).node);}return;}
    const block=session.blocks[session.activeBlockIndex]!,phase=session.runtime.phase;
    const state=JSON.stringify([block.id,block.protocolSnapshot,phase,session.runtime.bpm,session.runtime.metronomeOn,block.notes,practice.error,practice.recovered]);
    if(lastState!==state){
      lastState=state;recovery.hidden=!practice.recovered;
      const cueText=block.instructionsSnapshot||'';cues.hidden=!cueText;text(cues.querySelector('p')!,cueText);
      text(title,block.titleSnapshot);const pattern=block.protocolSnapshot?.kind==='tempo'?block.protocolSnapshot.sticking:!block.protocolSnapshot?block.stickingSnapshot:undefined;text(sticking,pattern??'');sticking.hidden=!pattern;
      text(blockNumber,`${session.profileNameSnapshot??'Practice'} · Block ${session.activeBlockIndex+1} / ${session.blocks.length}`);
      if(document.activeElement!==tempo)tempo.value=String(session.runtime.bpm);
      text(status,phase==='running'?'Practicing':phase==='countin'?'Count-in':phase==='paused'?'Paused':'Ready');
      text(start.querySelector('span')!,phase==='running'||phase==='countin'?'Pause':phase==='paused'?'Resume':'Start practice');
      start.setAttribute('aria-label',phase==='running'||phase==='countin'?'Pause practice':phase==='paused'?'Resume practice':'Start practice');
      text(metro.querySelector('span')!,session.runtime.metronomeOn?'Metronome on':'Metronome off');metro.setAttribute('aria-pressed',String(session.runtime.metronomeOn));
      start.dataset.phase=phase;
      const hasTempo=!block.protocolSnapshot||!!protocolPulse(block.protocolSnapshot),tempoRating=!block.protocolSnapshot||block.protocolSnapshot.kind==='tempo';
      main.classList.toggle('without-tempo',!hasTempo);page.classList.toggle('protocol-practice',!!block.protocolSnapshot&&block.protocolSnapshot.kind!=='tempo');
      mount(tempoReadout,readouts,null,hasTempo);mount(beats,main,controls,hasTempo);
      mount(metro,controls,start.nextSibling,hasTempo);mount(attempts,main,taskHost,tempoRating);
      mount(trainerButton,tools,null,tempoRating);
      ratingButtons.forEach(b=>{b.disabled=phase==='ready'||phase==='countin';});
      error.hidden=!practice.error;text(error,practice.error);
      text(notesText,block.notes);notesText.hidden=!block.notes;
    }
    const configStamp=block.id+JSON.stringify(block.protocolSnapshot);if(taskStamp!==configStamp){taskStamp=configStamp;task?.cleanup();task=taskPanel(block);taskHost.replaceChildren(task.node);}task?.update(block);
    if(lastIndex!==session.activeBlockIndex||lastId!==block.id){
      lastIndex=session.activeBlockIndex;lastId=block.id;attemptText.textContent='';
    const upcoming=session.blocks[session.activeBlockIndex+1];next.replaceChildren(el('span',{class:'label'},upcoming?'Up next':'Final block'),el('strong',{},upcoming?`${upcoming.titleSnapshot} · ${duration(upcoming.targetSeconds)}`:'Finish the block to review your session.'));
      beats.replaceChildren(...Array.from({length:block.meterSnapshot.beats},(_,i)=>el('span',{class:'practice-beat'},String(i+1))));
      queue.replaceChildren(sectionHeader('Session sequence'),...session.blocks.map((b,i)=>el('div',{class:`queue-block ${i===session.activeBlockIndex?'current':''}`},el('span',{class:'queue-number'},b.completed?'✓':b.skipped?'—':String(i+1).padStart(2,'0')),el('div',{},el('strong',{},b.titleSnapshot),el('span',{class:'muted small'},`${duration(b.targetSeconds)}${b.initialBpm===undefined?'':` · ${b.initialBpm} BPM`}`)))));
    }
    Array.from(beats.children).forEach((b,i)=>b.classList.toggle('on',!!practice.beat&&practice.beat.beat===i&&(phase==='running'||phase==='countin')));

    tick();
  }
  const onKey=(event:KeyboardEvent)=>{
    const target=event.target as HTMLElement;
    if(practice.session?.status!=='active'||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    if(document.querySelector('dialog[open]')||target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(event.code==='Space'&&!target.closest('button,a')){event.preventDefault();void practice.toggle().catch(e=>notify(e.message,'error'));}
    else if((event.key==='ArrowUp'||event.key==='ArrowDown')&&(!practice.session!.blocks[practice.session!.activeBlockIndex]!.protocolSnapshot||protocolPulse(practice.session!.blocks[practice.session!.activeBlockIndex]!.protocolSnapshot!))){event.preventDefault();void practice.setBpm(practice.session!.runtime.bpm+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?5:1)).catch(e=>notify(e.message,'error'));}
    else if(event.key.toLowerCase()==='n'&&!event.ctrlKey&&!event.metaKey){event.preventDefault();note();}
    else if(event.key==='Escape'&&focus)void setFocus(false);
  };
  window.addEventListener('keydown',onKey);const unsubscribe=practice.subscribe(draw),timer=setInterval(tick,250);draw();
  return {node:page,cleanup:()=>{task?.cleanup();unsubscribe();clearInterval(timer);window.removeEventListener('keydown',onKey);if(!practice.external&&practice.session?.status==='active'&&['running','countin'].includes(practice.session.runtime.phase))void practice.pause().catch(()=>{});if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}};
}
