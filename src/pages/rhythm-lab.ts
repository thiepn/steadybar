import { rhythmAudio } from '../audio/rhythm-engine.js';
import { tapTempo } from '../audio/scheduler.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { rhythmCycle, rhythmCyclePositions, subdivisionName, swingFeelLabel, type RhythmLabConfig, type RhythmSubdivision } from '../domain/rhythm-lab.js';
import { el } from '../ui/dom.js';
import { button, confirmAction, field, link, notify, pageHeader, sectionHeader, select } from '../ui/components.js';

type RhythmMode=RhythmLabConfig['mode'];
const sequenceOptions:[string,string][]=[
  ['1,2,3,4','Quarter → eighth → triplet → sixteenth'],
  ['2,3,4','Eighth → triplet → sixteenth'],
  ['4,3,2','Sixteenth → triplet → eighth'],
  ['3,4','Triplet ↔ sixteenth'],
  ['2,4','Eighth ↔ sixteenth'],
];
const ratioOptions:[string,string][]=[['3:2','3:2 · three over two beats'],['2:3','2:3 · two over three beats'],['4:3','4:3 · four over three beats'],['3:4','3:4 · three over four beats'],['5:4','5:4 · five over four beats'],['4:5','4:5 · four over five beats'],['5:3','5:3 · five over three beats'],['3:5','3:5 · three over five beats']];

export function rhythmLabPage():Page{
  const metronome=store.snapshot().settings.metronome;
  let mode:RhythmMode='swing',running=false,disposed=false,taps:number[]=[],primaryOn=true,secondaryOn=true;
  const page=el('div',{class:'page rhythm-lab-page'},pageHeader('Drum time & coordination','Rhythm Lab','Swing placement, subdivision switching, and layered polyrhythms on a deterministic audio-time clock.',[link('Metronome','/metronome','button secondary','pulse'),link('Pocket Lab','/pocket','button secondary','pulse')]));
  const modeSelect=select('rhythmMode','Training mode',[['swing','Swing / shuffle'],['subdivision-switch','Subdivision switching'],['polyrhythm','Polyrhythm']],mode);
  const bpm=el('input',{type:'number',min:20,max:300,step:1,value:metronome.bpm,inputmode:'numeric','aria-label':'BPM'}),countIn=select('rhythmCountIn','Count-in',[['0','None'],['2','2 beats'],['4','4 beats']],'4');
  const volume=el('input',{type:'range',min:0,max:1,step:.05,value:metronome.volume,'aria-label':'Rhythm Lab volume'}),volumeText=el('span',{class:'muted small'},`${Math.round(metronome.volume*100)}%`);
  const swingBeats=select('swingBeats','Beats per bar',[['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['7','7']],'4');
  const swingRatio=el('input',{type:'range',min:50,max:75,step:.5,value:66.5,'aria-label':'Swing ratio'}),swingRatioText=el('strong',{class:'rhythm-ratio-value'},'66.5 / 33.5');
  const switchBeats=select('switchBeats','Beats per bar',[['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['7','7']],'4'),sequence=select('rhythmSequence','Subdivision sequence',sequenceOptions,'1,2,3,4'),barsPerStage=select('barsPerStage','Bars per stage',[['1','1 bar'],['2','2 bars'],['4','4 bars']],'1');
  const polyRatio=select('polyRatio','Polyrhythm ratio',ratioOptions,'3:2');
  const settingsHost=el('div',{class:'rhythm-mode-settings'}),visual=el('div',{class:'rhythm-visual','aria-live':'off'}),summary=el('p',{class:'rhythm-summary'}),cue=el('p',{class:'pre-line rhythm-cue'}),status=el('p',{class:'rhythm-status',role:'status'},'Ready.');
  let startButton!:HTMLButtonElement,primaryButton!:HTMLButtonElement,secondaryButton!:HTMLButtonElement;

  const config=():RhythmLabConfig=>{
    const tempo=Number(bpm.value);
    if(mode==='swing')return {mode,bpm:tempo,beats:Number(swingBeats.querySelector('select')!.value) as 2|3|4|5|6|7,ratio:Number(swingRatio.value)};
    if(mode==='subdivision-switch')return {mode,bpm:tempo,beats:Number(switchBeats.querySelector('select')!.value) as 2|3|4|5|6|7,sequence:sequence.querySelector('select')!.value.split(',').map(Number) as RhythmSubdivision[],barsPerStage:Number(barsPerStage.querySelector('select')!.value) as 1|2|4};
    const [primary,secondary]=polyRatio.querySelector('select')!.value.split(':').map(Number);return {mode,bpm:tempo,primary:primary as 2|3|4|5,secondary:secondary as 2|3|4|5};
  };
  const layerLabels=()=>mode==='swing'?['Beat','Offbeat']:mode==='subdivision-switch'?['Beat','Subdivision']:['Anchor','Overlay'];
  const practiceCue=()=>{
    const current=config();
    if(current.mode==='swing')return `${swingFeelLabel(current.ratio)}: keep the quarter-note pulse unchanged while the offbeat moves. The ratio is a timing reference, not a “correct groove” score.`;
    if(current.mode==='subdivision-switch')return `Keep one quarter-note pulse while your internal grid changes: ${current.sequence.map(subdivisionName).join(' → ')}. Do not let the BPM move when the note density changes.`;
    return `${current.primary}:${current.secondary}: hear the anchor first, then the overlay, then both together. The overlay contains ${current.primary} evenly spaced hits across ${current.secondary} quarter-note beats.`;
  };
  const stop=()=>{rhythmAudio.stop();running=false;if(startButton){startButton.querySelector('span')!.textContent='Start Rhythm Lab';startButton.setAttribute('aria-pressed','false');}visual.querySelectorAll('.on').forEach(node=>node.classList.remove('on'));};
  const setupChanged=()=>{if(running){stop();status.textContent='Setup changed · restart when ready.';}render();};

  const timeline=(label:string,layer:'primary'|'secondary',positions:number[])=>el('div',{class:'rhythm-lane'},el('strong',{},label),el('div',{class:'rhythm-lane-track'},...positions.map((position,index)=>el('span',{class:`rhythm-marker layer-${layer}`,'data-layer':layer,'data-pos':index,style:`left:${(position*100).toFixed(4)}%`},String(index+1)))));
  const renderVisual=()=>{
    const current=config(),cycle=rhythmCycle(current),labels=layerLabels();visual.replaceChildren();
    if(current.mode==='subdivision-switch'){
      const stages=el('div',{class:'rhythm-stage-grid'});
      current.sequence.forEach((stage,index)=>stages.append(el('div',{class:'rhythm-stage-card','data-stage':subdivisionName(stage)},el('strong',{},`${index+1}. ${subdivisionName(stage)}`),el('span',{class:'muted small'},`${current.barsPerStage} bar${current.barsPerStage===1?'':'s'} · ${stage} pulse${stage===1?'':'s'} per beat`),el('div',{class:'rhythm-stage-dots'},...Array.from({length:stage},(_,part)=>el('span',{class:part===0?'primary':''},String(part+1)))))));
      visual.append(stages);
    }else{
      const positions=rhythmCyclePositions(current);visual.append(timeline(labels[0]!, 'primary',positions.primary),timeline(labels[1]!, 'secondary',positions.secondary));
    }
    summary.textContent=cycle.summary;cue.textContent=practiceCue();
  };
  const renderSettings=()=>{
    settingsHost.replaceChildren();
    if(mode==='swing'){
      const presets=el('div',{class:'actions wrap rhythm-presets'});for(const value of [50,58,62,66.5,72] as const)presets.append(button(value===50?'Straight':value===66.5?'Triplet swing':`${value}%`,()=>{swingRatio.value=String(value);setupChanged();},'ghost compact'));
      settingsHost.append(el('div',{class:'form-grid rhythm-config-grid'},swingBeats,field('Swing ratio',swingRatio)),el('div',{class:'rhythm-ratio-row'},swingRatioText,presets));
    }else if(mode==='subdivision-switch')settingsHost.append(el('div',{class:'form-grid rhythm-config-grid'},switchBeats,sequence,barsPerStage));
    else settingsHost.append(el('div',{class:'form-grid rhythm-config-grid'},polyRatio),el('p',{class:'field-hint'},'Ratio A:B means A overlay hits spread evenly across B quarter-note beats. The anchor layer is the B-beat pulse.'));
    renderVisual();renderLayerButtons();
  };
  const renderLayerButtons=()=>{
    const labels=layerLabels();
    if(primaryButton){primaryButton.querySelector('span')!.textContent=`${labels[0]} ${primaryOn?'on':'off'}`;primaryButton.setAttribute('aria-pressed',String(primaryOn));}
    if(secondaryButton){secondaryButton.querySelector('span')!.textContent=`${labels[1]} ${secondaryOn?'on':'off'}`;secondaryButton.setAttribute('aria-pressed',String(secondaryOn));}
  };
  const render=()=>{
    const ratio=Number(swingRatio.value);swingRatioText.textContent=`${ratio.toFixed(1)} / ${(100-ratio).toFixed(1)} · ${swingFeelLabel(ratio)}`;
    volumeText.textContent=`${Math.round(Number(volume.value)*100)}%`;renderVisual();renderLayerButtons();
  };
  const toggleLayer=(layer:'primary'|'secondary')=>{
    const nextPrimary=layer==='primary'?!primaryOn:primaryOn,nextSecondary=layer==='secondary'?!secondaryOn:secondaryOn;
    if(!nextPrimary&&!nextSecondary){notify('Keep at least one Rhythm Lab layer audible.','info');return;}
    primaryOn=nextPrimary;secondaryOn=nextSecondary;rhythmAudio.setLayers(primaryOn,secondaryOn);renderLayerButtons();
  };
  const highlight=(layer:string,pos:number)=>{visual.querySelectorAll<HTMLElement>(`[data-layer="${layer}"]`).forEach(node=>node.classList.remove('on'));visual.querySelector<HTMLElement>(`[data-layer="${layer}"][data-pos="${pos}"]`)?.classList.add('on');};
  const start=async()=>{
    if(running){stop();status.textContent='Paused.';return;}if(!bpm.reportValidity())return;
    const current=config(),cycle=rhythmCycle(current);
    await rhythmAudio.start(current,{volume:Number(volume.value),countInBeats:Number(countIn.querySelector('select')!.value) as 0|2|4,primaryOn,secondaryOn},{
      onReady:()=>{if(!disposed)status.textContent=`Playing · ${cycle.summary}`;},
      onEvent:event=>{if(disposed)return;if(event.countingIn){status.textContent=event.label;return;}if(current.mode==='subdivision-switch'){const stage=event.label.split(' · ')[0];visual.querySelectorAll('.rhythm-stage-card').forEach(node=>node.classList.toggle('on',(node as HTMLElement).dataset.stage===stage));}else highlight(event.layer,event.cyclePosition);status.textContent=`Cycle ${event.cycle+1} · ${event.label}`;},
      onInterrupted:()=>{stop();status.textContent='Audio was suspended. Tap Start to resume.';},
    });
    if(disposed){rhythmAudio.stop();return;}running=true;startButton.querySelector('span')!.textContent='Pause Rhythm Lab';startButton.setAttribute('aria-pressed','true');status.textContent='Count-in…';
  };
  startButton=button('Start Rhythm Lab',start,'primary rhythm-start','play');startButton.setAttribute('aria-pressed','false');startButton.setAttribute('aria-keyshortcuts','Space');
  primaryButton=button('Primary on',()=>toggleLayer('primary'),'secondary','volume');secondaryButton=button('Secondary on',()=>toggleLayer('secondary'),'secondary','volume');primaryButton.setAttribute('aria-keyshortcuts','1');secondaryButton.setAttribute('aria-keyshortcuts','2');
  const tap=button('Tap tempo',()=>{const result=tapTempo(taps,performance.now());taps=result.taps;if(result.bpm){bpm.value=String(result.bpm);setupChanged();status.textContent=`${result.bpm} BPM from ${taps.length} taps.`;}else status.textContent=`${taps.length} tap${taps.length===1?'':'s'} · keep going.`;},'ghost','pulse');
  const tempoSteps=el('div',{class:'actions wrap rhythm-tempo-steps'},...[-5,-1,1,5].map(step=>button(step>0?`+${step}`:`−${Math.abs(step)}`,()=>{bpm.value=String(Math.max(20,Math.min(300,Number(bpm.value)+step)));setupChanged();},'ghost compact')));
  const transport=el('section',{class:'panel rhythm-transport'},sectionHeader('Pulse','Changes stop playback so the next start always follows one deterministic score.'),el('div',{class:'form-grid rhythm-common-grid'},field('BPM',bpm),countIn,el('div',{class:'rhythm-volume-field'},field('Volume',volume),volumeText)),tempoSteps,el('div',{class:'actions wrap'},tap,startButton,primaryButton,secondaryButton),status);
  const training=el('section',{class:'panel rhythm-training'},sectionHeader('Training pattern','Start with both layers, then mute support without changing the underlying pulse.'),modeSelect,settingsHost,summary,cue);
  const visualPanel=el('section',{class:'panel rhythm-visual-panel'},sectionHeader('Cycle','Visuals mirror the audio clock; they never determine click timing.'),visual);
  const method=el('section',{class:'panel'},sectionHeader('Practice method','Stability first, complexity second.'),el('ol',{class:'rhythm-method'},el('li',{},'Establish the quarter-note pulse before adding the second layer or moving the offbeat.'),el('li',{},'Change one variable at a time: tempo, swing ratio, subdivision stage, or polyrhythm ratio.'),el('li',{},'Use the layer buttons to remove support while keeping the same internal pulse.'),el('li',{},'If the pulse bends when density changes, lower BPM before adding complexity.'),el('li',{},'Rhythm Lab describes timing relationships; it does not claim one swing ratio or polyrhythm feel is universally better.')));
  modeSelect.addEventListener('change',()=>{mode=modeSelect.querySelector('select')!.value as RhythmMode;primaryOn=true;secondaryOn=true;setupChanged();renderSettings();});
  bpm.addEventListener('change',()=>{if(bpm.reportValidity())setupChanged();});countIn.addEventListener('change',setupChanged);volume.addEventListener('input',()=>{volumeText.textContent=`${Math.round(Number(volume.value)*100)}%`;rhythmAudio.setVolume(Number(volume.value));});
  swingBeats.addEventListener('change',setupChanged);swingRatio.addEventListener('input',setupChanged);switchBeats.addEventListener('change',setupChanged);sequence.addEventListener('change',setupChanged);barsPerStage.addEventListener('change',setupChanged);polyRatio.addEventListener('change',setupChanged);
  const key=(event:KeyboardEvent)=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    const target=event.target as HTMLElement;if(document.querySelector('dialog[open]')||target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(event.code==='Space'&&!target.closest('button,a')){event.preventDefault();void start().catch(error=>notify(error instanceof Error?error.message:'Rhythm Lab could not start.','error'));return;}
    if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();bpm.value=String(Math.max(20,Math.min(300,Number(bpm.value)+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?5:1))));setupChanged();return;}
    if(event.key==='1'){event.preventDefault();toggleLayer('primary');}
    else if(event.key==='2'){event.preventDefault();toggleLayer('secondary');}
  };
  page.append(el('div',{class:'two-column wide-left'},training,transport),visualPanel,method);renderSettings();render();window.addEventListener('keydown',key);
  return {node:page,beforeLeave:async()=>!running||await confirmAction('Leave Rhythm Lab?','Playback will stop.','Leave Rhythm Lab'),isDirty:()=>running,cleanup:()=>{disposed=true;stop();window.removeEventListener('keydown',key);}};
}