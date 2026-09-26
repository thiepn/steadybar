import { audio } from '../audio/engine.js';
import { defaultAccents } from '../audio/scheduler.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import type { Exercise, MetronomeConfig, Subdivision } from '../domain/models.js';
import { activeProfile } from '../domain/profiles.js';
import {
  buildDrumPhrase, DRUM_FILL_PRESETS, DRUM_GROOVE_PRESETS, phraseBarText,
  type DrumFillLength, type DrumFillPresetId, type DrumGroovePresetId,
} from '../domain/drum-phrase.js';
import { drumGridStepLabels, DRUM_GRID_VOICES } from '../domain/drum-grid.js';
import { metadata } from '../domain/utils.js';
import { addToday, freeBlock, launchPractice } from '../practice/launch.js';
import { el } from '../ui/dom.js';
import { button, empty, formDialog, formText, input, link, notify, pageHeader, sectionHeader, select, textarea } from '../ui/components.js';

type PhraseProtocol=ReturnType<typeof buildDrumPhrase>;
interface DrumPhraseLabDraft { phrase:PhraseProtocol; groove:DrumGroovePresetId; fill:DrumFillPresetId; fillLength:DrumFillLength; variation:number; barCount:2|4|8|16; subdivision:Subdivision; minutes:number; inspectBar:number }
const drumPhraseDrafts=new Map<string,DrumPhraseLabDraft>();

export function drumPhrasePage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page drum-phrase-page'},
    pageHeader('Drum practice tool','Phrase Lab','Practice groove → fill → return as one musical unit.'),
    empty('Switch to a drum profile','Phrase Lab is limited to drum profiles so its limb and fill vocabulary stays meaningful.',link('Manage practice profiles','/profiles','button primary','settings')))};

  const savedDraft=drumPhraseDrafts.get(profile.id);
  let groove:DrumGroovePresetId=savedDraft?.groove??'backbeat',fill:DrumFillPresetId=savedDraft?.fill??'alternating',fillLength:DrumFillLength=savedDraft?.fillLength??'bar',variation=savedDraft?.variation??0,barCount:2|4|8|16=savedDraft?.barCount??4,subdivision:Subdivision=savedDraft?.subdivision??4;
  let phrase:PhraseProtocol=savedDraft?.phrase?structuredClone(savedDraft.phrase):buildDrumPhrase(groove,fill,snapshot.settings.metronome.bpm,subdivision,barCount,fillLength,variation),previewing=false,disposed=false,inspectBar=savedDraft?.inspectBar??0;
  const page=el('div',{class:'page drum-phrase-page'},pageHeader('Drum phrasing workstation','Phrase Lab',profile.name+' · Keep the groove stable, place one bounded fill, then prove the landing on the next bar.',[
    link('Rudiment Lab','/rudiments','button secondary','routine'),link('Grid Lab','/drum-grid','button secondary','routine'),
  ]));

  const grooveSelect=select('phraseGroove','Groove',DRUM_GROOVE_PRESETS.map(row=>[row.id,row.label] as [string,string]),groove);
  const fillSelect=select('phraseFill','Fill',DRUM_FILL_PRESETS.map(row=>[row.id,row.label] as [string,string]),fill);
  const fillLengthSelect=select('phraseFillLength','Fill length',[['beat','Last beat'],['half-bar','Half bar'],['bar','Full bar']],fillLength);
  const barsSelect=select('phraseBars','Setup phrase',[['2','2 bars + return'],['4','4 bars + return'],['8','8 bars + return'],['16','16 bars + return']],String(barCount));
  const subdivisionSelect=select('phraseSubdivision','Subdivision',[['2','Eighth notes'],['3','Triplets'],['4','Sixteenth notes']],String(subdivision));
  const bpm=input('phraseBpm','BPM',phrase.pulse.bpm,'number',{min:20,max:300,step:1,required:true});
  const minutes=input('phraseMinutes','Practice minutes',savedDraft?.minutes??10,'number',{min:1,max:180,step:1,required:true});
  const variationText=el('span',{class:'muted small'},'Variation 1');
  const timeline=el('div',{class:'phrase-timeline',role:'list','aria-label':'Phrase bar timeline'});
  const gridHost=el('div',{class:'phrase-current-bar'});
  const focus=el('p',{class:'pre-line drum-phrase-focus'}),status=el('p',{class:'drum-phrase-status',role:'status'},'Inspect any bar, then preview or start the whole phrase.');
  const notation=el('pre',{class:'drum-phrase-text'});
  let previewButton!:HTMLButtonElement;

  const previewConfig=():MetronomeConfig=>{
    const base=store.snapshot().settings.metronome;
    return {...structuredClone(base),bpm:phrase.pulse.bpm,meter:{beats:phrase.pulse.beats,beatUnit:phrase.pulse.beatUnit},subdivision:phrase.pulse.subdivision,accents:defaultAccents(phrase.pulse.beats,phrase.pulse.beatUnit),countIn:1,timing:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1}};
  };
  const clearPlayhead=()=>gridHost.querySelectorAll('.drum-grid-cell.current').forEach(cell=>cell.classList.remove('current'));
  const setBar=(index:number,step=-1)=>{
    inspectBar=Math.max(0,Math.min(phrase.bars.length-1,index));
    timeline.querySelectorAll<HTMLElement>('[data-bar]').forEach(chip=>chip.classList.toggle('current',Number(chip.dataset.bar)===inspectBar));
    const bar=phrase.bars[inspectBar]!,labels=drumGridStepLabels(phrase.pulse.beats,phrase.pulse.subdivision);
    const grid=el('div',{class:'focus-drum-grid phrase-inspect-grid',style:'--grid-steps:'+labels.length,'aria-label':bar.label},
      el('div',{class:'drum-grid-row drum-grid-header'},el('strong',{},bar.role.toUpperCase()),...labels.map(label=>el('span',{},label))),
      ...DRUM_GRID_VOICES.map(voice=>{
        const lane=bar.lanes.find(row=>row.voice===voice.id),steps=lane?.steps??'.'.repeat(labels.length);
        return el('div',{class:'drum-grid-row'},el('strong',{},voice.short),...[...steps].map((cell,cellIndex)=>el('span',{class:`drum-grid-cell ${cell==='X'?'accent':cell==='x'?'hit':'rest'} ${cellIndex===step?'current':''}`,'data-index':cellIndex,'aria-label':`${bar.label}, ${voice.label} step ${cellIndex+1}: ${cell==='X'?'accent':cell==='x'?'hit':'rest'}`},cell==='.'?'·':cell)));
      }));
    gridHost.replaceChildren(el('div',{class:'phrase-current-heading'},el('strong',{},`Bar ${inspectBar+1} · ${bar.label}`),el('span',{class:'badge'},bar.role)),grid);
    notation.textContent=phrase.bars.map((item,index)=>`BAR ${index+1} · ${item.label.toUpperCase()}\n${phraseBarText(item)}`).join('\n\n');
  };
  const persistDraft=()=>drumPhraseDrafts.set(profile.id,{phrase:structuredClone(phrase),groove,fill,fillLength,variation,barCount,subdivision,minutes:Number(minutes.querySelector<HTMLInputElement>('input')!.value),inspectBar});
  const render=()=>{
    variationText.textContent='Variation '+(variation+1);focus.textContent=phrase.focus;
    timeline.replaceChildren(...phrase.bars.map((bar,index)=>{
      const chip=button(String(index+1),()=>{if(!previewing)setBar(index);},`phrase-bar-button role-${bar.role}`);
      chip.dataset.bar=String(index);chip.setAttribute('aria-label',`Bar ${index+1}: ${bar.label}`);
      chip.append(el('small',{},bar.role==='groove'?'groove':bar.role==='fill'?'fill':'return'));return el('div',{role:'listitem'},chip);
    }));
    setBar(Math.min(inspectBar,phrase.bars.length-1));persistDraft();status.textContent=`${barCount} setup bars + return · ${fillLength==='beat'?'last-beat':fillLength==='half-bar'?'half-bar':'full-bar'} fill · ${phrase.pulse.bpm} BPM`;
  };
  const stopPreview=()=>{audio.stop();previewing=false;clearPlayhead();if(previewButton){previewButton.querySelector('span')!.textContent='Preview phrase';previewButton.setAttribute('aria-pressed','false');}};
  const togglePreview=async()=>{
    if(previewing){stopPreview();status.textContent='Preview stopped.';return;}
    await audio.start(previewConfig(),{onBeat:event=>{
      if(disposed)return;
      if(event.countingIn){status.textContent='Count-in · one bar';return;}
      const barIndex=Math.max(0,event.bar-1)%phrase.bars.length,step=event.beat*phrase.pulse.subdivision+event.part;
      if(barIndex!==inspectBar)setBar(barIndex,step);else{clearPlayhead();gridHost.querySelectorAll<HTMLElement>('.drum-grid-cell').forEach(cell=>cell.classList.toggle('current',Number(cell.dataset.index)===step));}
      const bar=phrase.bars[barIndex]!;status.textContent=`Previewing · bar ${barIndex+1}/${phrase.bars.length} · ${bar.label} · ${phrase.pulse.bpm} BPM`;
    },onInterrupted:()=>{stopPreview();status.textContent='Audio preview was suspended. Tap Preview phrase to restart.';}});
    previewing=true;previewButton.querySelector('span')!.textContent='Stop preview';previewButton.setAttribute('aria-pressed','true');
  };
  previewButton=button('Preview phrase',togglePreview,'secondary','pulse');previewButton.setAttribute('aria-pressed','false');

  const regenerate=(resetVariation=false)=>{
    if(resetVariation)variation=0;
    groove=grooveSelect.querySelector('select')!.value as DrumGroovePresetId;fill=fillSelect.querySelector('select')!.value as DrumFillPresetId;
    fillLength=fillLengthSelect.querySelector('select')!.value as DrumFillLength;barCount=Number(barsSelect.querySelector('select')!.value) as 2|4|8|16;
    subdivision=Number(subdivisionSelect.querySelector('select')!.value) as Subdivision;
    phrase=buildDrumPhrase(groove,fill,Number(bpm.querySelector<HTMLInputElement>('input')!.value),subdivision,barCount,fillLength,variation);
    inspectBar=0;if(previewing)stopPreview();render();
  };
  grooveSelect.addEventListener('change',()=>regenerate(true));fillSelect.addEventListener('change',()=>regenerate(true));fillLengthSelect.addEventListener('change',()=>regenerate(false));barsSelect.addEventListener('change',()=>regenerate(false));subdivisionSelect.addEventListener('change',()=>regenerate(false));
  bpm.addEventListener('change',()=>{const control=bpm.querySelector<HTMLInputElement>('input')!;if(!control.reportValidity())return;phrase={...phrase,pulse:{...phrase.pulse,bpm:Number(control.value)}};if(previewing)void audio.update(previewConfig());render();});
  minutes.addEventListener('change',()=>{const control=minutes.querySelector<HTMLInputElement>('input')!;if(control.reportValidity())persistDraft();});

  const practiceBlock=()=>{
    const targetSeconds=Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60);
    return {...freeBlock(targetSeconds,phrase.pulse.bpm,'Phrase · '+phrase.name),profileId:profile.id,protocol:structuredClone(phrase),notes:phrase.focus};
  };
  const valid=()=>bpm.querySelector<HTMLInputElement>('input')!.reportValidity()&&minutes.querySelector<HTMLInputElement>('input')!.reportValidity();
  const start=async()=>{if(!valid())return;persistDraft();stopPreview();await launchPractice([practiceBlock()]);};
  const add=async()=>{if(!valid())return;persistDraft();await addToday(practiceBlock());notify('Phrase added to Today.');};
  const saveExercise=()=>formDialog('Save phrase as exercise',[
    input('name','Exercise name',phrase.name,'text',{required:true,maxlength:200}),textarea('instructions','Practice cue',phrase.focus,4),
    el('p',{class:'field-hint'},'The complete groove/fill/return score is stored in the exercise. Later edits do not rewrite historical session snapshots.'),
  ],async form=>{
    const name=formText(form,'name').trim(),instructions=formText(form,'instructions').trim()||phrase.focus;
    const exercise:Exercise={...metadata(),name,instrument:'Drums',category:'coordination',description:instructions,instructions,profileId:profile.id,skillArea:'fills',primarySkillId:'drums.fills',secondarySkillIds:['drums.groove','drums.timing'],protocol:{...structuredClone(phrase),name,focus:instructions},level:profile.level,defaultSeconds:Math.round(Number(minutes.querySelector<HTMLInputElement>('input')!.value)*60),tags:['drum-phrase','fills','groove'],notes:'',builtin:false,archived:false};
    persistDraft();await store.save('exercises',exercise);notify('Phrase saved to the exercise library.');
  },'Save exercise');

  const setup=el('section',{class:'panel drum-phrase-setup'},sectionHeader('Build the phrase','The selected fill always resolves into an explicit return bar.'),
    el('div',{class:'form-grid drum-phrase-controls'},grooveSelect,fillSelect,fillLengthSelect,barsSelect,subdivisionSelect,bpm,minutes),
    el('div',{class:'actions wrap phrase-variations'},button('Previous variation',()=>{variation=Math.max(0,variation-1);regenerate(false);},'ghost','up'),variationText,button('Next variation',()=>{variation++;regenerate(false);},'ghost','down')),focus,status);
  const score=el('section',{class:'panel drum-phrase-score'},sectionHeader('Phrase score','Click a bar to inspect it. Preview follows the phrase automatically.'),timeline,gridHost,
    el('div',{class:'actions wrap'},previewButton,button('Start practice',start,'primary','play'),button('Add to Today',add,'secondary','plus'),button('Save as exercise',saveExercise,'secondary','library')),
    el('details',{class:'phrase-notation'},el('summary',{},'Text notation'),notation));
  const method=el('section',{class:'panel'},sectionHeader('Practice method','The landing is part of the fill.'),
    el('ol',{class:'drum-phrase-method'},el('li',{},'Play the groove bars identically before changing the fill.'),el('li',{},'Keep the fill inside the existing subdivision; do not add time.'),el('li',{},'Judge the fill by the return: beat 1 should feel inevitable, not rescued.'),el('li',{},'Use shorter fills before longer ones, then vary the fill while keeping the groove unchanged.'),el('li',{},'Save useful phrase scores as exercises so practice history stays attached to the exact arrangement.')));
  page.append(setup,score,method);render();
  return {node:page,cleanup:()=>{disposed=true;stopPreview();}};
}
