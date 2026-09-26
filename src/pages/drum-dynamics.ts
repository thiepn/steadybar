import { audio } from '../audio/engine.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import type { Exercise, Subdivision } from '../domain/models.js';
import type { DrumDynamicSurface, PracticeProtocol } from '../domain/practice-types.js';
import { activeProfile } from '../domain/profiles.js';
import { buildDrumDynamics, cycleDrumDynamicsCell, drumDynamicsLevelLabel, drumDynamicsText, DRUM_DYNAMICS_PRESETS, DRUM_DYNAMIC_SURFACES, type DrumDynamicsPresetId } from '../domain/drum-dynamics.js';
import { drumGridStepLabels } from '../domain/drum-grid.js';
import { metadata } from '../domain/utils.js';
import { addToday, freeBlock, launchPractice } from '../practice/launch.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, input, link, notify, pageHeader, sectionHeader, select } from '../ui/components.js';

type DynamicsProtocol=Extract<PracticeProtocol,{kind:'drum-dynamics'}>;

export function drumDynamicsPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page drum-dynamics-page'},
    pageHeader('Drum practice tool','Dynamics & Touch Lab','Author relative soft / medium / strong targets without pretending they are acoustic dB values.'),
    empty('Switch to a drum profile','Dynamics Lab is limited to drum profiles so kit-surface targets stay meaningful.',link('Manage practice profiles','/profiles','button primary','settings')))};

  let preset:DrumDynamicsPresetId='ghost-backbeat',variation=0,subdivision:Subdivision=4,protocol:DynamicsProtocol=buildDrumDynamics(preset,snapshot.settings.metronome.bpm,subdivision,variation),previewing=false,disposed=false;
  const page=el('div',{class:'page drum-dynamics-page'},pageHeader('Drum touch workstation','Dynamics & Touch Lab',profile.name+' · Train relative touch, contrast, quiet control, and balance without changing the pulse.',[
    link('Pocket Lab','/pocket','button secondary','pulse'),link('Grid Lab','/drum-grid','button secondary','routine'),link('Rudiment Lab','/rudiments','button secondary','routine'),
  ]));

  const presetSelect=select('dynPreset','Dynamic study',DRUM_DYNAMICS_PRESETS.map(row=>[row.id,row.label] as [string,string]),preset);
  const bpm=input('dynBpm','BPM',protocol.pulse.bpm,'number',{min:20,max:300,step:1,required:true});
  const subdivisionSelect=select('dynSubdivision','Subdivision',[['2','Eighth notes'],['3','Triplets'],['4','Sixteenth notes']],String(subdivision));
  const minutes=input('dynMinutes','Practice minutes',8,'number',{min:1,max:180,step:1,required:true});
  const variationText=el('span',{class:'muted small'},'Variation 1');
  const gridHost=el('div',{class:'dynamics-grid-editor'});
  const focus=el('p',{class:'pre-line dynamics-focus'}),notation=el('pre',{class:'dynamics-text'}),status=el('p',{class:'dynamics-status',role:'status'},'Tap cells to cycle rest → soft → medium → strong.');
  let previewButton!:HTMLButtonElement;

  const activeLane=(surface:DrumDynamicSurface)=>protocol.lanes.find(lane=>lane.surface===surface);
  const render=()=>{
    const labels=drumGridStepLabels(protocol.pulse.beats,protocol.pulse.subdivision);
    variationText.textContent='Variation '+(variation+1);focus.textContent=protocol.focus;notation.textContent=drumDynamicsText(protocol);
    gridHost.replaceChildren(el('div',{class:'dynamics-grid-row dynamics-grid-header'},el('strong',{},''),...labels.map(label=>el('span',{},label))));
    for(const surface of DRUM_DYNAMIC_SURFACES){
      const lane=activeLane(surface.id),steps=lane?.steps??'.'.repeat(labels.length),row=el('div',{class:'dynamics-grid-row'},el('strong',{title:surface.label},surface.short));
      [...steps].forEach((level,index)=>{
        const cell=button(level==='.'?'·':level,()=>{
          if(!activeLane(surface.id))protocol={...protocol,lanes:[...protocol.lanes,{surface:surface.id,steps:'.'.repeat(labels.length)}]};
          protocol=cycleDrumDynamicsCell(protocol,surface.id,index);render();
        },`dynamics-edit-cell ${level==='.'?'rest':'level-'+level}`);
        cell.setAttribute('aria-label',`${surface.label}, step ${index+1}: ${drumDynamicsLevelLabel(level)}`);
        row.append(cell);
      });
      gridHost.append(row);
    }
  };
  const regenerate=(reset=false)=>{
    if(reset)variation=0;
    preset=presetSelect.querySelector('select')!.value as DrumDynamicsPresetId;subdivision=Number(subdivisionSelect.querySelector('select')!.value) as Subdivision;
    protocol=buildDrumDynamics(preset,Number(bpm.querySelector<HTMLInputElement>('input')!.value),subdivision,variation);
    if(previewing)stopPreview();render();
  };
  presetSelect.addEventListener('change',()=>regenerate(true));subdivisionSelect.addEventListener('change',()=>regenerate(false));
  bpm.addEventListener('change',()=>{const control=bpm.querySelector<HTMLInputElement>('input')!;if(!control.reportValidity())return;protocol={...protocol,pulse:{...protocol.pulse,bpm:Number(control.value)}};if(previewing)void audio.update({...structuredClone(store.snapshot().settings.metronome),bpm:protocol.pulse.bpm,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,countIn:1});render();});

  const stopPreview=()=>{audio.stop();previewing=false;if(previewButton){previewButton.querySelector('span')!.textContent='Preview click';previewButton.setAttribute('aria-pressed','false');}};
  const togglePreview=async()=>{
    if(previewing){stopPreview();status.textContent='Preview stopped.';return;}
    await audio.start({...structuredClone(store.snapshot().settings.metronome),bpm:protocol.pulse.bpm,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,countIn:1},{onInterrupted:()=>{stopPreview();status.textContent='Audio preview was suspended. Tap Preview click to restart.';}});
    if(disposed){audio.stop();return;}previewing=true;previewButton.querySelector('span')!.textContent='Stop preview';previewButton.setAttribute('aria-pressed','true');status.textContent=`Previewing ${protocol.pulse.bpm} BPM · levels stay visual/relative.`;
  };
  previewButton=button('Preview click',togglePreview,'secondary','pulse');previewButton.setAttribute('aria-pressed','false');

  const valid=()=>bpm.querySelector<HTMLInputElement>('input')!.reportValidity()&&minutes.querySelector<HTMLInputElement>('input')!.reportValidity();
  const practiceBlock=()=>({...freeBlock(Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60),protocol.pulse.bpm,'Dynamics · '+protocol.name),profileId:profile.id,protocol:structuredClone(protocol),notes:protocol.focus});
  const start=async()=>{if(!valid())return;stopPreview();await launchPractice([practiceBlock()]);};
  const add=async()=>{if(!valid())return;await addToday(practiceBlock());notify('Dynamics study added to Today.');};
  const saveExercise=async()=>{
    if(!valid())return;
    const exercise:Exercise={...metadata(),name:protocol.name,instrument:'Drums',category:'technique',description:protocol.focus,instructions:protocol.focus,profileId:profile.id,skillArea:'dynamics',primarySkillId:'drums.dynamics',secondarySkillIds:['drums.technique','drums.timing','drums.groove'],protocol:structuredClone(protocol),level:profile.level,defaultSeconds:Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60),defaultBpm:protocol.pulse.bpm,minBpm:20,maxBpm:300,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,accents:'',tags:['dynamics','touch',preset],notes:'',builtin:false,archived:false};
    await store.save('exercises',exercise);notify('Dynamics study saved to the exercise library.');
  };

  const setup=el('section',{class:'panel dynamics-setup'},sectionHeader('Build the study','Levels are relative touch intentions: 1 soft / ghost, 2 medium, 3 strong / accent.'),
    el('div',{class:'form-grid dynamics-controls'},presetSelect,bpm,subdivisionSelect,minutes),
    el('div',{class:'actions wrap dynamics-variations'},button('Previous variation',()=>{variation=Math.max(0,variation-1);regenerate(false);},'ghost','up'),variationText,button('Next variation',()=>{variation++;regenerate(false);},'ghost','down')),focus);
  const score=el('section',{class:'panel dynamics-score'},sectionHeader('Dynamic score',undefined,[badge('· rest'),badge('1 soft'),badge('2 medium'),badge('3 strong')]),gridHost,status,
    el('div',{class:'actions wrap'},previewButton,button('Start practice',start,'primary','play'),button('Add to Today',add,'secondary','plus'),button('Save as exercise',saveExercise,'secondary','library')),
    el('details',{class:'dynamics-notation'},el('summary',{},'Text notation'),notation));
  const method=el('section',{class:'panel'},sectionHeader('Practice method','Dynamic contrast only counts if the pulse and sound remain controlled.'),
    el('ol',{class:'dynamics-method'},el('li',{},'Establish the rhythm first at a neutral volume.'),el('li',{},'Make level 1 genuinely soft without losing contact or timing.'),el('li',{},'Make level 3 clearly stronger without tightening or rushing.'),el('li',{},'Keep unaffected voices stable while changing one surface.'),el('li',{},'Use recordings or MIDI evidence for comparison when available; this score itself is not an automatic loudness measurement.')));
  page.append(setup,score,method);render();
  return {node:page,cleanup:()=>{disposed=true;stopPreview();}};
}
