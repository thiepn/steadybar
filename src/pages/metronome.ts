import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import type { Accent, ClickMode, MetronomeConfig, Subdivision, TimingClickConfig } from '../domain/models.js';
import { el } from '../ui/dom.js';
import { button, confirmAction, field, formDialog, formNumber, formText, iconButton, input, notify, pageHeader, sectionHeader, select } from '../ui/components.js';
import { audio } from '../audio/engine.js';
import { defaultAccents, resolvedTiming, tapTempo, timingClickLabel } from '../audio/scheduler.js';
import { clampBpm } from '../domain/utils.js';
import { savePreset } from '../ui/editors.js';
export function metronomePage():Page{
  let config=structuredClone(store.snapshot().settings.metronome),running=false,taps:number[]=[],disposed=false;
  let persistTimer:ReturnType<typeof setTimeout>|undefined,rampTimer:ReturnType<typeof setInterval>|undefined,rampStartedAt:number|undefined;
  let rampEnabled=false;
  const page=el('div',{class:'page metronome-page'},pageHeader('','Metronome','Tempo, subdivisions, sparse clicks, silent bars, accents, and automatic ramps.'));
  const status=el('span',{class:'status-label'},'Ready'),tempo=el('input',{type:'number',min:20,max:300,step:1,value:config.bpm,inputmode:'numeric',class:'metronome-bpm','aria-label':'BPM'}),slider=el('input',{type:'range',min:20,max:300,step:1,value:config.bpm,'aria-label':'Tempo slider'});
  const signature=el('select',{'aria-label':'Time signature'},['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'].map(m=>el('option',{value:m},m)));
  const subdivision=el('select',{'aria-label':'Subdivision'},[['1','Beat · 1 click'],['2','Eighths · 2 clicks'],['3','Triplets · 3 clicks'],['4','Sixteenths · 4 clicks']].map(([v,l])=>el('option',{value:v},l)));
  const countIn=el('select',{'aria-label':'Count-in'},[['0','None'],['1','1 bar'],['2','2 bars'],['4','4 bars']].map(([v,l])=>el('option',{value:v},l)));
  const volume=el('input',{type:'range',min:0,max:1,step:0.05,value:config.volume,'aria-label':'Metronome volume'}),volumeLabel=el('span',{class:'muted small'}),beats=el('div',{class:'metronome-beats'}),meterNote=el('p',{class:'field-hint'}),presets=el('div',{class:'preset-list'});
  const clickMode=el('select',{'aria-label':'Timing click mode'},[['standard','Standard click'],['two-four','2 & 4 only'],['sparse','Sparse click'],['one-per-bar','One click per bar'],['gap','Gap click · silent bars']].map(([v,l])=>el('option',{value:v},l)));
  const sparseEvery=el('select',{'aria-label':'Sparse click interval'},[['2','Every 2 beats'],['3','Every 3 beats'],['4','Every 4 beats']].map(([v,l])=>el('option',{value:v},l)));
  const gapClickBars=el('select',{'aria-label':'Audible bars'},Array.from({length:8},(_,i)=>el('option',{value:String(i+1)},`${i+1} click ${i?'bars':'bar'}`)));
  const gapSilentBars=el('select',{'aria-label':'Silent bars'},Array.from({length:8},(_,i)=>el('option',{value:String(i+1)},`${i+1} silent ${i?'bars':'bar'}`)));
  const sparseField=field('Sparse density',sparseEvery),gapClickField=field('Audible bars',gapClickBars),gapSilentField=field('Silent bars',gapSilentBars),timingHint=el('p',{class:'field-hint'});
  const gapPresets=el('div',{class:'actions wrap timing-presets'});
  const rampStart=el('input',{type:'number',min:20,max:300,step:1,value:config.bpm,'aria-label':'Ramp start BPM'}),rampStep=el('input',{type:'number',min:1,max:30,step:1,value:2,'aria-label':'Ramp step BPM'}),rampEvery=el('input',{type:'number',min:5,max:600,step:5,value:30,'aria-label':'Ramp interval seconds'}),rampMax=el('input',{type:'number',min:20,max:300,step:1,value:Math.min(300,config.bpm+20),'aria-label':'Ramp maximum BPM'});
  const rampStatus=el('p',{class:'field-hint'},'Off · enable it to increase tempo automatically while playing.');
  const persist=()=>{clearTimeout(persistTimer);persistTimer=setTimeout(()=>{void store.settings({metronome:config},false).catch(error=>notify(error.message,'error'));},200);};
  const apply=(next:MetronomeConfig)=>{config=structuredClone(next);if(audio.running)audio.update(config);renderControls();persist();};
  const setTiming=(patch:Partial<TimingClickConfig>)=>apply({...config,timing:{...resolvedTiming(config),...patch}});
  const setBpm=(bpm:number,persistChange=true)=>{config.bpm=clampBpm(bpm);tempo.value=String(config.bpm);slider.value=String(config.bpm);if(audio.running)audio.update(config);if(persistChange)persist();};
  const stopRamp=()=>{clearInterval(rampTimer);rampTimer=undefined;rampStartedAt=undefined;};
  const rampValid=()=>{if(!rampStart.reportValidity()||!rampStep.reportValidity()||!rampEvery.reportValidity()||!rampMax.reportValidity())return false;if(Number(rampMax.value)<Number(rampStart.value)){notify('Ramp maximum must be at least the starting BPM.','error');return false;}return true;};
  const applyRamp=()=>{if(!running||!rampEnabled||rampStartedAt===undefined)return;const steps=Math.floor((performance.now()-rampStartedAt)/(Number(rampEvery.value)*1000)),next=Math.min(Number(rampMax.value),Number(rampStart.value)+steps*Number(rampStep.value));if(next!==config.bpm)setBpm(next,false);};
  const startRamp=()=>{stopRamp();if(!rampEnabled)return;rampStartedAt=performance.now();rampTimer=setInterval(applyRamp,200);applyRamp();};
  const stop=()=>{audio.stop();stopRamp();running=false;status.textContent='Paused';play.querySelector('span')!.textContent='Start metronome';play.setAttribute('aria-pressed','false');Array.from(beats.children).forEach(b=>b.classList.remove('on'));if(rampEnabled)persist();};
  const toggle=async()=>{
    if(running){stop();return;}
    if(rampEnabled){if(!rampValid())return;setBpm(Number(rampStart.value),false);}
    await audio.start(config,{onBeat:event=>{if(disposed)return;if(event.firstPracticeBeat&&rampEnabled)startRamp();const label=event.countingIn?`Count-in · bar ${event.bar+1}`:`Playing · ${timingClickLabel(config)}${rampEnabled?' · ramp':''}`;if(status.textContent!==label)status.textContent=label;Array.from(beats.children).forEach((b,i)=>b.classList.toggle('on',event.accent>0&&i===event.beat));},onInterrupted:()=>{stop();notify('Audio was suspended. Tap Start to resume.','info');}});
    if(disposed){audio.stop();return;}running=true;status.textContent=config.countIn?'Count-in':`Playing · ${timingClickLabel(config)}`;play.querySelector('span')!.textContent='Pause metronome';play.setAttribute('aria-pressed','true');
  };
  const play=button('Start metronome',toggle,'primary metronome-play','play');play.setAttribute('aria-pressed','false');
  const tap=button('Tap tempo',()=>{const result=tapTempo(taps,performance.now());taps=result.taps;if(result.bpm&&!rampEnabled)setBpm(result.bpm);tapCount.textContent=result.bpm?`${result.bpm} BPM from ${taps.length} taps`:`${taps.length} tap · keep going`;},'secondary','pulse'),tapCount=el('span',{class:'muted small'},'Tap a steady beat');
  const tempoSteps=[-10,-5,-1,1,5,10].map(step=>button(step>0?`+${step}`:`−${Math.abs(step)}`,()=>setBpm(config.bpm+step),'tempo-step'));
  const renderControls=()=>{
    if(document.activeElement!==tempo)tempo.value=String(config.bpm);slider.value=String(config.bpm);
    const meter=`${config.meter.beats}/${config.meter.beatUnit}`;
    if(!Array.from(signature.options).some(o=>o.value===meter))signature.append(el('option',{value:meter},`${meter} · custom`));signature.value=meter;
    subdivision.value=String(config.subdivision);countIn.value=String(config.countIn);volume.value=String(config.volume);volumeLabel.textContent=`${Math.round(config.volume*100)}%`;
    meterNote.textContent=`${config.meter.beatUnit===8?'Eighth-note':'Quarter-note'} beat. Meter, subdivision, and timing-mode changes apply at the next bar.`;
    const timing=resolvedTiming(config);clickMode.value=timing.mode;sparseEvery.value=String(timing.sparseEvery);gapClickBars.value=String(timing.gapClickBars);gapSilentBars.value=String(timing.gapSilentBars);
    sparseField.hidden=timing.mode!=='sparse';gapClickField.hidden=timing.mode!=='gap';gapSilentField.hidden=timing.mode!=='gap';gapPresets.hidden=timing.mode!=='gap';
    timingHint.textContent=timing.mode==='standard'?'Every configured beat/subdivision is available.':timing.mode==='two-four'?'Only beats 2 and 4 click; subdivisions are silent.':timing.mode==='sparse'?`One click every ${timing.sparseEvery} beats.`:timing.mode==='one-per-bar'?'Only the first beat of each bar clicks.':`${timing.gapClickBars} audible bar${timing.gapClickBars===1?'':'s'}, then ${timing.gapSilentBars} silent bar${timing.gapSilentBars===1?'':'s'}.`;
    rampToggle.setAttribute('aria-pressed',String(rampEnabled));rampToggle.querySelector('span')!.textContent=rampEnabled?'Tempo ramp on':'Tempo ramp off';tempo.disabled=rampEnabled;slider.disabled=rampEnabled;tempoSteps.forEach(control=>control.disabled=rampEnabled);
    rampStatus.textContent=rampEnabled?`Ramp: ${rampStart.value} BPM +${rampStep.value} every ${rampEvery.value}s, up to ${rampMax.value}.`:'Off · enable it to increase tempo automatically while playing.';
    beats.replaceChildren(...config.accents.map((accent,i)=>{
      const b=button(String(i+1),()=>{const next=[...config.accents];next[i]=((accent+2)%3) as Accent;apply({...config,accents:next});},`metronome-beat accent-${accent}`);
      b.setAttribute('aria-label',`Beat ${i+1}: ${accent===2?'accent':accent===1?'normal':'muted'}. Click to change.`);b.append(el('small',{},accent===2?'accent':accent===1?'beat':'mute'));return b;
    }));
  };
  tempo.addEventListener('change',()=>{if(tempo.reportValidity())setBpm(Number(tempo.value));});slider.addEventListener('input',()=>setBpm(Number(slider.value)));
  signature.addEventListener('change',()=>{const [beats,unit]=signature.value.split('/').map(Number);apply({...config,meter:{beats:beats||4,beatUnit:unit===8?8:4},accents:defaultAccents(beats||4,unit||4)});});
  subdivision.addEventListener('change',()=>apply({...config,subdivision:Number(subdivision.value) as Subdivision}));
  countIn.addEventListener('change',()=>apply({...config,countIn:Number(countIn.value) as 0|1|2|4}));
  volume.addEventListener('input',()=>{config.volume=Number(volume.value);volumeLabel.textContent=`${Math.round(config.volume*100)}%`;if(audio.running)audio.update(config);persist();});
  clickMode.addEventListener('change',()=>setTiming({mode:clickMode.value as ClickMode}));sparseEvery.addEventListener('change',()=>setTiming({sparseEvery:Number(sparseEvery.value) as 2|3|4}));gapClickBars.addEventListener('change',()=>setTiming({gapClickBars:Number(gapClickBars.value)}));gapSilentBars.addEventListener('change',()=>setTiming({gapSilentBars:Number(gapSilentBars.value)}));
  const customMeter=()=>formDialog('Custom time signature',[input('beats','Beats per bar',config.meter.beats,'number',{min:1,max:16,step:1,required:true}),select('unit','Beat unit',[['4','Quarter note'],['8','Eighth note']],String(config.meter.beatUnit))],async form=>{const beats=formNumber(form,'beats'),unit=formText(form,'unit')==='8'?8:4;apply({...config,meter:{beats,beatUnit:unit},accents:defaultAccents(beats,unit)});});
  for(const [on,off] of [[3,1],[2,2],[1,3]] as const)gapPresets.append(button(`${on} click → ${off} silent`,()=>setTiming({mode:'gap',gapClickBars:on,gapSilentBars:off}),'ghost compact'));
  const rampToggle=button('Tempo ramp off',()=>{if(!rampEnabled&&!rampValid())return;rampEnabled=!rampEnabled;if(rampEnabled&&running){setBpm(Number(rampStart.value),false);startRamp();}else if(!rampEnabled)stopRamp();renderControls();},'secondary','progress');rampToggle.setAttribute('aria-pressed','false');
  const main=el('section',{class:'panel metronome-main'},
    el('div',{class:'instrument-heading'},el('label',{class:'label',for:'metronome-bpm'},'Tempo · BPM'),status),
    el('div',{class:'tempo-display'},tempo),
    el('div',{class:'standalone-tempo-steps'},tempoSteps),slider,
    el('div',{class:'metronome-transport'},play,el('div',{class:'tap-tempo'},tap,tapCount)),
    el('div',{class:'meter-workspace'},el('div',{class:'metronome-config'},field('Time signature',signature),field('Subdivision',subdivision),field('Count-in',countIn)),
      beats,el('p',{class:'muted small accent-help'},'Accent pattern · tap a beat: accent → normal → mute.'),meterNote),
    el('section',{class:'metronome-training'},sectionHeader('Timing trainer','Increase click difficulty without increasing BPM.'),el('div',{class:'form-grid timing-mode-grid'},field('Click mode',clickMode),sparseField,gapClickField,gapSilentField),gapPresets,timingHint),
    el('section',{class:'metronome-training tempo-ramp'},sectionHeader('Tempo ramp','Automatic BPM progression.'),el('div',{class:'form-grid ramp-grid'},field('Start BPM',rampStart),field('Add BPM',rampStep),field('Every seconds',rampEvery),field('Maximum BPM',rampMax)),el('div',{class:'actions wrap'},rampToggle),rampStatus),
    el('div',{class:'volume-row'},field('Volume',volume),volumeLabel,button('Custom meter',customMeter,'ghost')));
  tempo.id='metronome-bpm';
  const saved=el('aside',{class:'metronome-side'},
    el('section',{class:'panel'},sectionHeader('Presets',undefined,[button('Save current',()=>savePreset(config),'ghost','plus')]),presets),
    el('details',{class:'playback-help'},el('summary',{},'Playback & shortcuts'),
      el('p',{class:'muted small'},'The Web Audio clock sets the timing. Visual pulses only mirror audible clicks, and count-in stays fully audible even for sparse or gap training. Keep this app in the foreground for dependable playback.'),
      el('dl',{class:'shortcut-list'},el('dt',{},'Start / pause'),el('dd',{},el('kbd',{},'Space')),el('dt',{},'Change tempo'),el('dd',{},el('kbd',{},'↑ ↓')),el('dt',{},'Change by 5 BPM'),el('dd',{},el('kbd',{},'Shift + ↑ ↓')))));
  const drawPresets=()=>{
    presets.replaceChildren();const saved=store.snapshot().metronomePresets;
    if(!saved.length)presets.append(el('p',{class:'muted small inset'},'Save a tempo, meter, accents, subdivision, and timing mode you return to often.'));
    for(const preset of saved)presets.append(el('div',{class:'preset-row'},button(preset.name,()=>{apply(preset.config);notify('Preset loaded.');},'preset-button'),el('span',{class:'muted small'},`${preset.config.bpm} · ${preset.config.meter.beats}/${preset.config.meter.beatUnit} · ${timingClickLabel(preset.config)}`),iconButton(`Delete preset ${preset.name}`,'close',async()=>{if(await confirmAction('Delete this preset?',`Remove “${preset.name}”?`,'Delete preset',true))await store.delete('metronomePresets',preset.id);}))); 
  };
  page.append(el('div',{class:'metronome-grid'},main,saved));renderControls();drawPresets();const unsubscribe=store.subscribe(drawPresets);
  const key=(event:KeyboardEvent)=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    const target=event.target as HTMLElement;if(document.querySelector('dialog[open]')||target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(event.code==='Space'&&!target.closest('button,a')){event.preventDefault();void toggle().catch(e=>notify(e.message,'error'));}
    else if((event.key==='ArrowUp'||event.key==='ArrowDown')&&!rampEnabled){event.preventDefault();setBpm(config.bpm+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?5:1));}
  };
  const visibility=()=>{if(document.hidden&&store.snapshot().settings.pauseWhenHidden&&running)stop();};window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return {node:page,cleanup:()=>{disposed=true;stop();clearTimeout(persistTimer);void store.settings({metronome:config},false).catch(()=>{});unsubscribe();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);}};
}
