import { audio } from '../audio/engine.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import type { Exercise, MetronomeConfig, Subdivision } from '../domain/models.js';
import type { DrumGridVoice, PracticeProtocol } from '../domain/practice-types.js';
import { activeProfile } from '../domain/profiles.js';
import {
  buildDrumMeter, cycleDrumMeterCell, drumMeterAccents, drumMeterGroupingText,
  drumMeterStepGroupStarts, drumMeterText, DRUM_METER_PATTERNS, DRUM_METER_PRESETS,
  type DrumMeterPatternId, type DrumMeterPresetId,
} from '../domain/drum-meter.js';
import { drumGridStepLabels, DRUM_GRID_VOICES } from '../domain/drum-grid.js';
import { metadata } from '../domain/utils.js';
import { addToday, freeBlock, launchPractice } from '../practice/launch.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, input, link, notify, pageHeader, sectionHeader, select } from '../ui/components.js';

type MeterProtocol=Extract<PracticeProtocol,{kind:'drum-meter'}>;

export function drumMeterPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page drum-meter-page'},
    pageHeader('Drum practice tool','Odd Meter & Grouping Lab','Make uneven meters feel like repeatable phrases rather than arithmetic.'),
    empty('Switch to a drum profile','Meter Lab is limited to drum profiles so the grouping and limb anchors stay meaningful.',link('Manage practice profiles','/profiles','button primary','settings')))};

  let presetId:DrumMeterPresetId='7-8-2-2-3',pattern:DrumMeterPatternId='anchors',variation=0,subdivision:Subdivision=1;
  let protocol:MeterProtocol=buildDrumMeter(presetId,pattern,undefined,subdivision,variation),previewing=false,disposed=false;
  const page=el('div',{class:'page drum-meter-page'},pageHeader('Odd-meter workstation','Odd Meter & Grouping Lab',profile.name+' · Hear the grouping, keep every notated beat the same length, and let the click accent the authored group starts.',[
    link('Timing Lab','/timing-lab','button secondary','pulse'),link('Grid Lab','/drum-grid','button secondary','routine'),link('Phrase Lab','/phrases','button secondary','routine'),
  ]));

  const presetSelect=select('meterPreset','Meter / grouping',DRUM_METER_PRESETS.map(row=>[row.id,row.label] as [string,string]),presetId);
  const patternSelect=select('meterPattern','Coordination pattern',DRUM_METER_PATTERNS.map(row=>[row.id,row.label] as [string,string]),pattern);
  const subdivisionSelect=select('meterSubdivision','Internal subdivision',[['1','1 per notated beat'],['2','2 per notated beat']],String(subdivision));
  const bpm=input('meterBpm','BPM',protocol.pulse.bpm,'number',{min:20,max:300,step:1,required:true});
  const minutes=input('meterMinutes','Practice minutes',8,'number',{min:1,max:180,step:1,required:true});
  const grouping=el('div',{class:'meter-grouping-strip','aria-label':'Meter grouping'}),counting=el('p',{class:'meter-counting'}),focus=el('p',{class:'pre-line meter-focus'}),status=el('p',{class:'meter-status',role:'status'},'Group starts are the strong click accents.');
  const gridHost=el('div',{class:'meter-grid-editor'}),notation=el('pre',{class:'meter-text'}),variationText=el('span',{class:'muted small'},'Variation 1'),pulseUnit=el('span',{class:'muted small'});
  let previewButton!:HTMLButtonElement;

  const activeLane=(voice:DrumGridVoice)=>protocol.lanes.find(row=>row.voice===voice);
  const countText=()=>protocol.grouping.map(size=>Array.from({length:size},(_,index)=>String(index+1)).join(' ')).join('  |  ');
  const render=()=>{
    const labels=drumGridStepLabels(protocol.pulse.beats,protocol.pulse.subdivision),starts=new Set(drumMeterStepGroupStarts(protocol.grouping,protocol.pulse.subdivision));
    gridHost.style.setProperty('--meter-steps',String(labels.length));
    grouping.replaceChildren(...protocol.grouping.map((size,index)=>el('span',{class:'meter-group-chip'},el('strong',{},String(size)),el('small',{},'group '+(index+1)))));
    counting.textContent='Count · '+countText();focus.textContent=protocol.focus;notation.textContent=drumMeterText(protocol);variationText.textContent='Variation '+(variation+1);
    pulseUnit.textContent=protocol.pulse.beats+'/'+protocol.pulse.beatUnit+' · BPM counts '+(protocol.pulse.beatUnit===8?'eighth':'quarter')+' notes · grouping '+drumMeterGroupingText(protocol.grouping);
    gridHost.replaceChildren(el('div',{class:'meter-grid-row meter-grid-header'},el('strong',{},drumMeterGroupingText(protocol.grouping)),...labels.map((label,index)=>el('span',{class:starts.has(index)?'group-start':''},label))));
    for(const voice of DRUM_GRID_VOICES){
      const lane=activeLane(voice.id),steps=lane?.steps??'.'.repeat(labels.length),row=el('div',{class:'meter-grid-row'},el('strong',{title:voice.label},voice.short));
      [...steps].forEach((cell,index)=>{
        const control=button(cell==='.'?'·':cell,()=>{
          if(!activeLane(voice.id))protocol={...protocol,lanes:[...protocol.lanes,{voice:voice.id,steps:'.'.repeat(labels.length)}]};
          protocol=cycleDrumMeterCell(protocol,voice.id,index);render();
        },'meter-edit-cell '+(cell==='X'?'accent':cell==='x'?'hit':'rest')+(starts.has(index)?' group-start':''));
        control.setAttribute('aria-label',voice.label+', step '+(index+1)+': '+(cell==='X'?'accent':cell==='x'?'hit':'rest')+(starts.has(index)?', group start':''));
        row.append(control);
      });
      gridHost.append(row);
    }
  };
  const stopPreview=()=>{audio.stop();previewing=false;if(previewButton){previewButton.querySelector('span')!.textContent='Preview grouping';previewButton.setAttribute('aria-pressed','false');}};
  const previewConfig=():MetronomeConfig=>({...structuredClone(store.snapshot().settings.metronome),bpm:protocol.pulse.bpm,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,accents:drumMeterAccents(protocol.grouping),countIn:1,timing:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const togglePreview=async()=>{
    if(previewing){stopPreview();status.textContent='Preview stopped.';return;}
    await audio.start(previewConfig(),{onBeat:event=>{if(disposed)return;status.textContent=event.countingIn?'Count-in · one full bar':'Previewing · '+protocol.pulse.beats+'/'+protocol.pulse.beatUnit+' · '+drumMeterGroupingText(protocol.grouping)+' · '+protocol.pulse.bpm+' BPM';},onInterrupted:()=>{stopPreview();status.textContent='Audio preview was suspended. Tap Preview grouping to restart.';}});
    if(disposed){audio.stop();return;}previewing=true;previewButton.querySelector('span')!.textContent='Stop preview';previewButton.setAttribute('aria-pressed','true');
  };
  previewButton=button('Preview grouping',togglePreview,'secondary','pulse');previewButton.setAttribute('aria-pressed','false');

  const regenerate=(presetChanged=false)=>{
    presetId=presetSelect.querySelector('select')!.value as DrumMeterPresetId;pattern=patternSelect.querySelector('select')!.value as DrumMeterPatternId;subdivision=Number(subdivisionSelect.querySelector('select')!.value) as Subdivision;
    const preset=DRUM_METER_PRESETS.find(row=>row.id===presetId)!;
    if(presetChanged)bpm.querySelector<HTMLInputElement>('input')!.value=String(preset.defaultBpm);
    protocol=buildDrumMeter(presetId,pattern,Number(bpm.querySelector<HTMLInputElement>('input')!.value),subdivision,variation);
    if(previewing)stopPreview();render();
  };
  presetSelect.addEventListener('change',()=>{variation=0;regenerate(true);});
  patternSelect.addEventListener('change',()=>{variation=0;regenerate(false);});
  subdivisionSelect.addEventListener('change',()=>regenerate(false));
  bpm.addEventListener('change',()=>{const control=bpm.querySelector<HTMLInputElement>('input')!;if(!control.reportValidity())return;protocol={...protocol,pulse:{...protocol.pulse,bpm:Number(control.value)}};if(previewing)void audio.update(previewConfig());render();});

  const valid=()=>bpm.querySelector<HTMLInputElement>('input')!.reportValidity()&&minutes.querySelector<HTMLInputElement>('input')!.reportValidity();
  const practiceBlock=()=>({...freeBlock(Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60),protocol.pulse.bpm,'Meter · '+protocol.name),profileId:profile.id,protocol:structuredClone(protocol),notes:protocol.focus});
  const start=async()=>{if(!valid())return;stopPreview();await launchPractice([practiceBlock()]);};
  const add=async()=>{if(!valid())return;await addToday(practiceBlock());notify('Odd-meter study added to Today.');};
  const saveExercise=async()=>{
    if(!valid())return;
    const exercise:Exercise={...metadata(),name:protocol.name,instrument:'Drums',category:'timing',description:protocol.focus,instructions:protocol.focus,profileId:profile.id,skillArea:'timing',primarySkillId:'drums.timing',secondarySkillIds:['drums.coordination','drums.groove'],protocol:structuredClone(protocol),level:profile.level,defaultSeconds:Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60),defaultBpm:protocol.pulse.bpm,minBpm:20,maxBpm:300,meter:{beats:protocol.pulse.beats,beatUnit:protocol.pulse.beatUnit},subdivision:protocol.pulse.subdivision,accents:'',tags:['odd-meter','grouping',presetId],notes:'',builtin:false,archived:false};
    await store.save('exercises',exercise);notify('Odd-meter study saved to the exercise library.');
  };

  const setup=el('section',{class:'panel meter-setup'},sectionHeader('Build the grouping','The click accents group starts; every notated beat remains the same length.'),
    el('div',{class:'form-grid meter-controls'},presetSelect,patternSelect,subdivisionSelect,bpm,minutes),
    pulseUnit,
    el('div',{class:'actions wrap meter-variations'},button('Previous variation',()=>{variation=Math.max(0,variation-1);regenerate(false);},'ghost','up'),variationText,button('Next variation',()=>{variation++;regenerate(false);},'ghost','down')),grouping,counting,focus);
  const score=el('section',{class:'panel meter-score'},sectionHeader('Grouping score',undefined,[badge('X group accent'),badge('x hit'),badge('· rest')]),gridHost,status,
    el('div',{class:'actions wrap'},previewButton,button('Start practice',start,'primary','play'),button('Add to Today',add,'secondary','plus'),button('Save as exercise',saveExercise,'secondary','library')),
    el('details',{class:'meter-notation'},el('summary',{},'Text notation'),notation));
  const method=el('section',{class:'panel'},sectionHeader('Practice method','Group the bar; do not distort the beat.'),
    el('ol',{class:'meter-method'},el('li',{},'Count the groups out loud before adding a kit pattern.'),el('li',{},'Keep every notated beat equal; grouping changes emphasis, not duration.'),el('li',{},'Use the strong click only as a group-start reference, not as permission to rush the smaller groups.'),el('li',{},'When the grouping feels stable, reduce click density or use gap click instead of increasing complexity immediately.'),el('li',{},'Apply the meter to a short groove or phrase only after you can land the bar line without counting panic.')));
  page.append(setup,score,method);render();
  return {node:page,cleanup:()=>{disposed=true;stopPreview();}};
}
