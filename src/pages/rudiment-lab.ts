import { audio } from '../audio/engine.js';
import { defaultAccents } from '../audio/scheduler.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { buildCleanTempoIndex } from '../domain/analytics.js';
import type { MetronomeConfig, Subdivision, TrainerConfig } from '../domain/models.js';
import { activeProfile } from '../domain/profiles.js';
import { exerciseBpm, exerciseProtocol } from '../domain/protocols.js';
import { mirrorRudimentSticking, parseRudimentSticking, rudimentAccentCue, rudimentSubdivisionLabel, rudimentVisual, type RudimentAccentMode } from '../domain/rudiments.js';
import { trainerBpm, trainerLabel, trainerTargetSeconds } from '../domain/trainer.js';
import { addToday, exerciseBlock, launchPractice } from '../practice/launch.js';
import { el } from '../ui/dom.js';
import { button, empty, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { trainerDialog } from '../ui/editors.js';

type LeadMode='original'|'mirror';
type OrchestrationMode='pad'|'split-hands'|'group-surfaces'|'free';
interface RudimentLabDraft {
  exerciseId:string;
  lead:LeadMode;
  accent:RudimentAccentMode;
  orchestration:OrchestrationMode;
  subdivision:Subdivision;
  bpm:number;
  minutes:number;
  trainer?:TrainerConfig;
}
const rudimentDrafts=new Map<string,RudimentLabDraft>();

const orchestrationOptions:[OrchestrationMode,string,string][]=[
  ['pad','Pad / snare only','Keep every primary stroke on one surface.'],
  ['split-hands','Split hands across two surfaces','Keep right-hand primary strokes on one surface and left-hand primary strokes on another.'],
  ['group-surfaces','Move each sticking group','Move each displayed group to a different surface while preserving the sticking and pulse.'],
  ['free','Free kit orchestration','Choose an orchestration before starting, then keep it repeatable for the whole attempt.'],
];

export function rudimentLabPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page rudiment-lab-page'},
    pageHeader('Drum practice tool','Rudiment Lab','Turn saved rudiments into focused tempo, accent and orchestration drills.'),
    empty('Switch to a drum profile','Rudiment Lab is limited to drum profiles so sticking and limb cues remain meaningful.',link('Manage practice profiles','/profiles','button primary','settings')))};

  const exercises=snapshot.exercises.filter(exercise=>{const protocol=exerciseProtocol(exercise);return !exercise.archived&&exercise.profileId===profile.id&&exercise.category==='rudiment'&&protocol.kind==='tempo'&&!!protocol.sticking;});
  if(!exercises.length)return {node:el('div',{class:'page rudiment-lab-page'},pageHeader('Drum practice tool','Rudiment Lab','Interactive sticking practice.'),empty('No rudiments available','Add or restore a drum rudiment exercise with a sticking pattern first.',link('Open exercise library','/library','button primary','library')))};

  const clean=buildCleanTempoIndex(snapshot.sessions);
  const savedDraft=rudimentDrafts.get(profile.id);
  let exercise=exercises.find(row=>row.id===savedDraft?.exerciseId)??exercises[0]!,lead:LeadMode=savedDraft?.lead??'original',accent:RudimentAccentMode=savedDraft?.accent??'none',orchestration:OrchestrationMode=savedDraft?.orchestration??'pad',trainer:TrainerConfig|undefined=savedDraft?.trainer?structuredClone(savedDraft.trainer):undefined,previewing=false,disposed=false;
  const initialProtocol=exerciseProtocol(exercise);
  let subdivision=(savedDraft?.subdivision??(initialProtocol.kind==='tempo'&&initialProtocol.pulse.subdivision>1?initialProtocol.pulse.subdivision:4)) as Subdivision;

  const page=el('div',{class:'page rudiment-lab-page'},pageHeader('Drum technique workstation','Rudiment Lab',profile.name+' · Visualize sticking, reverse the lead, shape accents, attach tempo training, and launch the exact variant.',[
    link('Phrase Lab','/phrases','button secondary','routine'),link('Drum Grid Lab','/drum-grid','button secondary','routine'),link('MIDI Drum Lab','/midi-lab','button secondary','pulse'),
  ]));
  const rudimentSelect=select('rudimentExercise','Rudiment',exercises.map(row=>[row.id,row.name] as [string,string]),exercise.id);
  const leadSelect=select('rudimentLead','Lead / direction',[['original','Original sticking'],['mirror','Mirror right ↔ left']],lead);
  const accentSelect=select('rudimentAccent','Accent focus',[['none','Even primary strokes'],['group-start','Accent group starts'],['every-fourth','Accent every fourth position']],accent);
  const subdivisionSelect=select('rudimentSubdivision','Stroke subdivision',[['2','Eighth-note grid'],['3','Triplet grid'],['4','Sixteenth-note grid']],String(subdivision));
  const orchestrationSelect=select('rudimentOrchestration','Orchestration',orchestrationOptions.map(([value,label])=>[value,label] as [string,string]),orchestration);
  const bpm=input('rudimentBpm','BPM',savedDraft?.bpm??exerciseBpm(exercise)??80,'number',{min:20,max:300,step:1,required:true});
  const minutes=input('rudimentMinutes','Practice minutes',savedDraft?.minutes??8,'number',{min:1,max:180,step:1,required:true});
  const visual=el('div',{class:'rudiment-visual',role:'group','aria-label':'Rudiment sticking visualization'}),stickingText=el('p',{class:'rudiment-sticking-text'}),cue=el('p',{class:'pre-line rudiment-cue'}),trainerStatus=el('p',{class:'rudiment-trainer-status muted small'}),previewStatus=el('p',{class:'rudiment-preview-status',role:'status'},'Ready.');
  const best=el('div',{class:'stats-strip rudiment-stats'});
  let previewButton!:HTMLButtonElement;

  const currentSticking=()=>{const protocol=exerciseProtocol(exercise),sticking=protocol.kind==='tempo'?protocol.sticking??exercise.sticking??'':exercise.sticking??'';return lead==='mirror'?mirrorRudimentSticking(sticking):sticking;};
  const orchestrationCue=()=>orchestrationOptions.find(([value])=>value===orchestration)?.[2]??'';
  const trainerSummary=()=>{if(!trainer)return 'No tempo trainer · steady tempo';const target=trainerTargetSeconds(trainer);return `${trainer.mode.replaceAll('-',' ')} · ${trainerLabel(trainer,0,0)}${target!==undefined?` · ${Math.round(target)} sec total`:''}`;};
  const effectiveStartBpm=()=>trainer?trainerBpm(trainer,0,0):Number(bpm.querySelector<HTMLInputElement>('input')!.value);
  const persistDraft=()=>rudimentDrafts.set(profile.id,{
    exerciseId:exercise.id,lead,accent,orchestration,subdivision,
    bpm:Number(bpm.querySelector<HTMLInputElement>('input')!.value),
    minutes:Number(minutes.querySelector<HTMLInputElement>('input')!.value),
    trainer:trainer?structuredClone(trainer):undefined,
  });

  const previewConfig=():MetronomeConfig=>{
    const base=store.snapshot().settings.metronome,bpmValue=effectiveStartBpm(),source=exerciseProtocol(exercise);
    const meter=source.kind==='tempo'?{beats:source.pulse.beats,beatUnit:source.pulse.beatUnit}:{beats:4,beatUnit:4 as const};
    return {...structuredClone(base),bpm:bpmValue,meter,subdivision,accents:defaultAccents(meter.beats,meter.beatUnit),countIn:1,timing:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1}};
  };
  const stopPreview=()=>{audio.stop();previewing=false;if(previewButton){previewButton.querySelector('span')!.textContent='Preview click';previewButton.setAttribute('aria-pressed','false');}};
  const togglePreview=async()=>{
    if(previewing){stopPreview();previewStatus.textContent='Preview stopped.';return;}
    await audio.start(previewConfig(),{onBeat:event=>{if(disposed)return;previewStatus.textContent=event.countingIn?'Count-in · one bar':`Previewing · ${effectiveStartBpm()} BPM · ${rudimentSubdivisionLabel(subdivision)}`;},onInterrupted:()=>{stopPreview();previewStatus.textContent='Audio preview was suspended. Tap Preview click to restart.';}});
    previewing=true;previewButton.querySelector('span')!.textContent='Stop preview';previewButton.setAttribute('aria-pressed','true');
  };
  previewButton=button('Preview click',togglePreview,'secondary','pulse');previewButton.setAttribute('aria-pressed','false');

  const render=()=>{
    const sticking=currentSticking(),groups=parseRudimentSticking(sticking),rows=rudimentVisual(sticking,accent);
    visual.replaceChildren();
    let flatIndex=0;
    groups.forEach((group,groupIndex)=>{
      const groupNode=el('div',{class:'rudiment-group','aria-label':'Sticking group '+(groupIndex+1)});
      group.strokes.forEach(stroke=>{
        const row=rows[flatIndex++]!,label=stroke.main?`${stroke.grace.length?stroke.grace.join(' ')+' grace then ':''}${stroke.main==='R'?'right':stroke.main==='L'?'left':'kick'} primary${row.accented?' accented':''}`:stroke.raw;
        groupNode.append(el('span',{class:`rudiment-stroke ${row.accented?'accented':''} ${stroke.grace.length?'with-grace':''}`,'aria-label':label},
          stroke.grace.length?el('span',{class:'rudiment-grace'},stroke.grace.join('')):null,el('strong',{},stroke.main??stroke.raw),row.accented?el('span',{class:'rudiment-accent-mark','aria-hidden':'true'},'›'):null));
      });
      visual.append(groupNode);
    });
    stickingText.textContent=sticking;
    cue.textContent=[exercise.instructions,rudimentAccentCue(accent),orchestrationCue()].filter(Boolean).join('\n');
    trainerStatus.textContent=trainerSummary();
    const bpmControl=bpm.querySelector<HTMLInputElement>('input')!,minutesControl=minutes.querySelector<HTMLInputElement>('input')!,finiteTrainer=trainer?trainerTargetSeconds(trainer):undefined;
    bpmControl.disabled=!!trainer;minutesControl.disabled=finiteTrainer!==undefined;
    if(trainer)bpmControl.value=String(effectiveStartBpm());
    persistDraft();
    const bestClean=clean.get(exercise.id);
    best.replaceChildren(stat('Starting tempo',`${effectiveStartBpm()} BPM`,trainer?'Trainer start':'Current setup'),stat('Best clean',bestClean?`${bestClean} BPM`:'—','Recorded clean / effortless attempts'),stat('Subdivision',rudimentSubdivisionLabel(subdivision)),stat('Positions',String(rows.length),'Primary sticking positions; grace notes shown separately'));
  };

  const resetForExercise=()=>{
    exercise=exercises.find(row=>row.id===rudimentSelect.querySelector('select')!.value)??exercises[0]!;
    lead='original';accent='none';orchestration='pad';trainer=undefined;
    leadSelect.querySelector('select')!.value=lead;accentSelect.querySelector('select')!.value=accent;orchestrationSelect.querySelector('select')!.value=orchestration;
    const protocol=exerciseProtocol(exercise);subdivision=(protocol.kind==='tempo'&&protocol.pulse.subdivision>1?protocol.pulse.subdivision:4) as Subdivision;subdivisionSelect.querySelector('select')!.value=String(subdivision);
    bpm.querySelector<HTMLInputElement>('input')!.value=String(exerciseBpm(exercise)??80);
    if(previewing)stopPreview();render();
  };
  rudimentSelect.addEventListener('change',resetForExercise);
  leadSelect.addEventListener('change',()=>{lead=leadSelect.querySelector('select')!.value as LeadMode;render();});
  accentSelect.addEventListener('change',()=>{accent=accentSelect.querySelector('select')!.value as RudimentAccentMode;render();});
  orchestrationSelect.addEventListener('change',()=>{orchestration=orchestrationSelect.querySelector('select')!.value as OrchestrationMode;render();});
  subdivisionSelect.addEventListener('change',()=>{subdivision=Number(subdivisionSelect.querySelector('select')!.value) as Subdivision;if(previewing){stopPreview();previewStatus.textContent='Subdivision changed · restart preview when ready.';}render();});
  bpm.addEventListener('change',()=>{const control=bpm.querySelector<HTMLInputElement>('input')!;if(!control.reportValidity())return;if(previewing)void audio.update(previewConfig());render();});
  minutes.addEventListener('change',()=>{const control=minutes.querySelector<HTMLInputElement>('input')!;if(control.reportValidity())persistDraft();});

  const configureTrainer=()=>trainerDialog(trainer,async config=>{trainer=config;bpm.querySelector<HTMLInputElement>('input')!.value=String(trainerBpm(config,0,0));if(previewing)stopPreview();render();notify('Tempo trainer attached to this rudiment variant.');},Number(bpm.querySelector<HTMLInputElement>('input')!.value));
  const clearTrainer=()=>{trainer=undefined;bpm.querySelector<HTMLInputElement>('input')!.disabled=false;minutes.querySelector<HTMLInputElement>('input')!.disabled=false;if(previewing)stopPreview();render();previewStatus.textContent='Tempo trainer removed.';};

  const practiceBlock=()=>{
    const base=exerciseBlock(exercise),source=exerciseProtocol(exercise);if(source.kind!=='tempo')throw new Error('Rudiment Lab requires a tempo-practice exercise.');
    const bpmValue=effectiveStartBpm(),trainerSeconds=trainer?trainerTargetSeconds(trainer):undefined,durationSeconds=trainerSeconds??Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60);
    return {...base,targetSeconds:durationSeconds,bpm:bpmValue,tempoTrainer:trainer?structuredClone(trainer):undefined,notes:[rudimentAccentCue(accent),orchestrationCue()].join('\n'),protocol:{...structuredClone(source),pulse:{...source.pulse,bpm:bpmValue,subdivision},sticking:currentSticking(),orchestration:orchestrationCue(),technique:[exercise.instructions,rudimentAccentCue(accent)].filter(Boolean).join(' ')}};
  };
  const validateSetup=()=>{const bpmControl=bpm.querySelector<HTMLInputElement>('input')!,minutesControl=minutes.querySelector<HTMLInputElement>('input')!;return (bpmControl.disabled||bpmControl.reportValidity())&&(minutesControl.disabled||minutesControl.reportValidity());};
  const start=async()=>{if(!validateSetup())return;persistDraft();stopPreview();await launchPractice([practiceBlock()]);};
  const add=async()=>{if(!validateSetup())return;persistDraft();await addToday(practiceBlock());notify('Rudiment variant added to Today.');};

  const setup=el('section',{class:'panel rudiment-setup'},sectionHeader('Rudiment setup','The source exercise stays unchanged; this practice variant is snapshotted when launched.'),
    el('div',{class:'form-grid rudiment-controls'},rudimentSelect,leadSelect,accentSelect,subdivisionSelect,orchestrationSelect,bpm,minutes),
    el('div',{class:'actions wrap'},button('Configure tempo trainer',configureTrainer,'secondary','progress'),button('Clear trainer',clearTrainer,'ghost','restart')),trainerStatus);
  const visualPanel=el('section',{class:'panel rudiment-visual-panel'},sectionHeader('Sticking','Grace notes are shown smaller; accent focus is a visual/practice cue, not automatic performance grading.'),visual,stickingText,cue,best,previewStatus,
    el('div',{class:'actions wrap'},previewButton,button('Start practice',start,'primary','play'),button('Add to Today',add,'secondary','plus')));
  const method=el('section',{class:'panel'},sectionHeader('Practice method','Control before speed.'),el('ol',{class:'rudiment-method'},
    el('li',{},'Read the sticking and say or tap the grouping before increasing tempo.'),
    el('li',{},'Keep grace notes quiet and close to the primary stroke; they do not replace the pulse.'),
    el('li',{},'Change one demand at a time: lead direction, accent focus, orchestration, subdivision, or tempo.'),
    el('li',{},'Use the tempo trainer only while sound, spacing and relaxation remain repeatable.'),
    el('li',{},'Record clean attempts in Focus Player so the original exercise keeps one continuous practice history.')));
  page.append(setup,visualPanel,method);render();
  return {node:page,cleanup:()=>{disposed=true;stopPreview();}};
}