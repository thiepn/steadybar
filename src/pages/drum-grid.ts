import { audio } from '../audio/engine.js';
import { defaultAccents } from '../audio/scheduler.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { activeProfile } from '../domain/profiles.js';
import type { Exercise, MetronomeConfig } from '../domain/models.js';
import type { DrumGridVoice } from '../domain/practice-types.js';
import {
  buildDrumGrid, cycleDrumGridCell, DRUM_GRID_PRESETS, DRUM_GRID_VOICES,
  drumGridStepLabels, drumGridText, mirrorDrumGrid, rotateDrumGrid, type DrumGridPresetId,
} from '../domain/drum-grid.js';
import { metadata } from '../domain/utils.js';
import { addToday, freeBlock, launchPractice } from '../practice/launch.js';
import { el } from '../ui/dom.js';
import { button, empty, formDialog, formText, input, link, notify, pageHeader, sectionHeader, select, textarea } from '../ui/components.js';

interface DrumGridLabDraft { protocol:ReturnType<typeof buildDrumGrid>; preset:DrumGridPresetId; variation:number; complexity:number; subdivision:1|2|3|4; minutes:number }
const drumGridDrafts=new Map<string,DrumGridLabDraft>();

export function drumGridPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page drum-grid-page'},
    pageHeader('Drum practice tool','Drum Grid Lab','Build explicit hand/foot coordination patterns and practice them against Steadybar’s audio-time click.'),
    empty('Switch to a drum profile','Drum Grid Lab is intentionally limited to drum profiles so limb labels and progression evidence stay honest.',link('Manage practice profiles','/profiles','button primary','settings')))};

  const savedDraft=drumGridDrafts.get(profile.id);
  let preset:DrumGridPresetId=savedDraft?.preset??'kick-displacement',variation=savedDraft?.variation??0,complexity=savedDraft?.complexity??2,subdivision:1|2|3|4=savedDraft?.subdivision??4;
  let protocol=savedDraft?.protocol?structuredClone(savedDraft.protocol):buildDrumGrid(preset,snapshot.settings.metronome.bpm,subdivision,variation,complexity),previewing=false,disposed=false;
  const page=el('div',{class:'page drum-grid-page'},pageHeader('Drum coordination workstation','Drum Grid Lab',profile.name+' · Generate, edit, displace, mirror, preview, save, and practice coordination grids.',[
    link('Rudiment Lab','/rudiments','button secondary','routine'),link('MIDI Drum Lab','/midi-lab','button secondary','pulse'),link('Timing Lab','/timing-lab','button secondary','pulse'),
  ]));
  const bpm=input('gridBpm','BPM',protocol.pulse.bpm,'number',{min:20,max:300,step:1,required:true});
  const minutes=input('gridMinutes','Practice minutes',savedDraft?.minutes??10,'number',{min:1,max:180,step:1,required:true});
  const presetSelect=select('gridPreset','Pattern family',DRUM_GRID_PRESETS.map(row=>[row.id,row.label]),preset);
  const subdivisionSelect=select('gridSubdivision','Subdivision',[['2','Eighth notes'],['3','Triplets'],['4','Sixteenth notes']],String(subdivision));
  const complexitySelect=select('gridComplexity','Complexity',[['1','1 · Foundation'],['2','2 · Simple'],['3','3 · Developing'],['4','4 · Dense'],['5','5 · Advanced']],String(complexity));
  const variationText=el('span',{class:'muted small'},'Variation 1');
  const status=el('p',{class:'drum-grid-status',role:'status'},'Edit cells directly or use the deterministic variation controls.');
  const gridHost=el('div',{class:'drum-grid-scroll'}),focusText=el('p',{class:'pre-line drum-grid-focus'}),textGrid=el('pre',{class:'drum-grid-text'});
  let previewButton!:HTMLButtonElement;

  const previewConfig=():MetronomeConfig=>{
    const base=store.snapshot().settings.metronome;
    return {...structuredClone(base),bpm:protocol.pulse.bpm,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,
      accents:defaultAccents(protocol.pulse.beats,protocol.pulse.beatUnit),countIn:1,timing:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1}};
  };
  const clearPlayhead=()=>gridHost.querySelectorAll('.drum-grid-edit-cell.playing').forEach(cell=>cell.classList.remove('playing'));
  const showStep=(step:number)=>{clearPlayhead();gridHost.querySelectorAll('.drum-grid-edit-cell[data-step="'+step+'"]').forEach(cell=>cell.classList.add('playing'));};
  const stopPreview=()=>{audio.stop();previewing=false;clearPlayhead();if(previewButton){previewButton.querySelector('span')!.textContent='Preview click';previewButton.setAttribute('aria-pressed','false');}};
  const togglePreview=async()=>{
    if(previewing){stopPreview();status.textContent='Preview stopped.';return;}
    await audio.start(previewConfig(),{onBeat:event=>{
      if(disposed)return;
      if(event.countingIn){status.textContent='Count-in · one bar';clearPlayhead();return;}
      const step=event.beat*protocol.pulse.subdivision+event.part;showStep(step);status.textContent='Previewing · '+protocol.pulse.bpm+' BPM · '+protocol.pulse.subdivision+'× subdivision';
    },onInterrupted:()=>{stopPreview();status.textContent='Audio preview was suspended. Tap Preview click to restart.';}});
    previewing=true;previewButton.querySelector('span')!.textContent='Stop preview';previewButton.setAttribute('aria-pressed','true');
  };
  previewButton=button('Preview click',togglePreview,'secondary','pulse');previewButton.setAttribute('aria-pressed','false');

  const persistDraft=()=>drumGridDrafts.set(profile.id,{protocol:structuredClone(protocol),preset,variation,complexity,subdivision,minutes:Number((minutes.querySelector('input') as HTMLInputElement).value)});
  const renderGrid=()=>{
    const labels=drumGridStepLabels(protocol.pulse.beats,protocol.pulse.subdivision),style='--grid-steps:'+labels.length;
    focusText.textContent=protocol.focus;variationText.textContent='Variation '+(variation+1);textGrid.textContent=drumGridText(protocol);
    const grid=el('div',{class:'drum-grid-editor',style,role:'group','aria-label':'Editable drum grid'},
      el('div',{class:'drum-grid-row drum-grid-header'},el('strong',{},''),...labels.map(label=>el('span',{},label))));
    for(const voice of DRUM_GRID_VOICES){
      const lane=protocol.lanes.find(row=>row.voice===voice.id),steps=lane?.steps??'.'.repeat(labels.length);
      grid.append(el('div',{class:'drum-grid-row'},el('strong',{title:voice.label},voice.short),...[...steps].map((cell,index)=>{
        const b=button(cell==='.'?'·':cell,()=>{
          protocol=cycleDrumGridCell(protocol,voice.id as DrumGridVoice,index);renderGrid();status.textContent='Edited '+voice.label+' · step '+(index+1)+'.';
        },'drum-grid-edit-cell '+(cell==='X'?'accent':cell==='x'?'hit':'rest'));
        b.dataset.step=String(index);b.setAttribute('aria-label',voice.label+' step '+(index+1)+': '+(cell==='X'?'accent':cell==='x'?'hit':'rest')+'. Activate to change.');return b;
      })));
    }
    gridHost.replaceChildren(grid);persistDraft();
  };
  const regenerate=(resetVariation=false)=>{
    if(resetVariation)variation=0;
    preset=presetSelect.querySelector('select')!.value as DrumGridPresetId;
    subdivision=Number(subdivisionSelect.querySelector('select')!.value) as 1|2|3|4;
    complexity=Number(complexitySelect.querySelector('select')!.value);
    protocol=buildDrumGrid(preset,Number((bpm.querySelector('input') as HTMLInputElement).value),subdivision,variation,complexity);
    if(previewing){stopPreview();status.textContent='Grid changed · restart the preview when ready.';}
    renderGrid();
  };
  presetSelect.addEventListener('change',()=>regenerate(true));subdivisionSelect.addEventListener('change',()=>regenerate(true));complexitySelect.addEventListener('change',()=>regenerate(false));
  bpm.addEventListener('change',()=>{const control=bpm.querySelector('input') as HTMLInputElement;if(!control.reportValidity())return;protocol={...protocol,pulse:{...protocol.pulse,bpm:Number(control.value)}};if(previewing)audio.update(previewConfig());renderGrid();});
  minutes.addEventListener('change',()=>{const control=minutes.querySelector('input') as HTMLInputElement;if(control.reportValidity())persistDraft();});

  const practiceBlock=()=>{
    const bpmValue=protocol.pulse.bpm,minutesValue=Number((minutes.querySelector('input') as HTMLInputElement).value);
    return {...freeBlock(minutesValue*60,bpmValue,'Grid · '+protocol.name),profileId:profile.id,protocol:structuredClone(protocol),notes:protocol.focus};
  };
  const start=async()=>{const control=minutes.querySelector('input') as HTMLInputElement;if(!control.reportValidity())return;persistDraft();stopPreview();await launchPractice([practiceBlock()]);};
  const add=async()=>{const control=minutes.querySelector('input') as HTMLInputElement;if(!control.reportValidity())return;persistDraft();await addToday(practiceBlock());};
  const saveExercise=()=>formDialog('Save grid as exercise',[
    input('name','Exercise name',protocol.name,'text',{required:true,maxlength:200}),
    textarea('instructions','Practice cue',protocol.focus,3),
    el('p',{class:'field-hint'},'The current grid, pulse, subdivision, and accents are stored in the exercise. Later edits create new practice snapshots without rewriting history.'),
  ],async form=>{
    const name=formText(form,'name').trim(),instructions=formText(form,'instructions').trim()||protocol.focus,exercise:Exercise={
      ...metadata(),name,instrument:'Drums',category:'coordination',description:instructions,instructions,profileId:profile.id,skillArea:'coordination',
      primarySkillId:'drums.coordination',secondarySkillIds:['drums.timing'],protocol:{...structuredClone(protocol),name,focus:instructions},level:profile.level,
      defaultSeconds:Number((minutes.querySelector('input') as HTMLInputElement).value)*60,tags:['drum-grid','coordination'],notes:'',builtin:false,archived:false,
    };
    persistDraft();await store.save('exercises',exercise);notify('Grid saved to your exercise library.');
  },'Save exercise');

  const variationActions=el('div',{class:'actions wrap drum-grid-variations'},
    button('Previous variation',()=>{variation=Math.max(0,variation-1);regenerate(false);},'ghost','up'),
    variationText,
    button('Next variation',()=>{variation++;regenerate(false);},'ghost','down'),
    button('Rotate +1',()=>{protocol=rotateDrumGrid(protocol,1);renderGrid();status.textContent='Shifted every lane forward by one subdivision.';},'ghost'),
    button('Mirror hands',()=>{protocol=mirrorDrumGrid(protocol);renderGrid();status.textContent='Right- and left-hand lanes mirrored.';},'ghost'),
    button('Reset family',()=>regenerate(false),'ghost','restart'));

  const setup=el('section',{class:'panel drum-grid-setup'},sectionHeader('Build the pattern','x = hit · X = accent · · = rest'),
    el('div',{class:'form-grid drum-grid-controls'},presetSelect,subdivisionSelect,complexitySelect,bpm,minutes),variationActions,focusText,status);
  const gridPanel=el('section',{class:'panel drum-grid-panel'},sectionHeader('Coordination grid','Tap any cell to cycle rest → hit → accent.'),gridHost,
    el('div',{class:'actions wrap'},previewButton,button('Start practice',start,'primary','play'),button('Add to Today',add,'secondary','plus'),button('Save as exercise',saveExercise,'secondary','library')));
  const guidance=el('section',{class:'panel'},sectionHeader('Practice method','Use the grid as a coordination target, not a speed score.'),
    el('ol',{class:'drum-grid-method'},
      el('li',{},'Read the complete bar slowly without the click.'),
      el('li',{},'Add the click at a tempo where every limb stays relaxed and predictable.'),
      el('li',{},'Repeat long enough to hear instability; do not immediately increase BPM after one clean bar.'),
      el('li',{},'Use Mirror, Rotate, or Next variation to change one coordination demand while keeping the pulse stable.'),
      el('li',{},'Save useful grids as exercises so Steadybar can retain their practice history and coordination/timing evidence.')),
    el('details',{},el('summary',{},'Text version of the current grid'),textGrid));
  page.append(setup,gridPanel,guidance);renderGrid();
  return {node:page,cleanup:()=>{disposed=true;stopPreview();}};
}
