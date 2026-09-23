import { audio } from '../audio/engine.js';
import { MicrophoneTimingInput, timingInput, type TimingInputHit } from '../audio/timing-input.js';
import { deleteTimingLabResult, saveTimingLabResult } from '../app/timing-lab.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { analyzeTiming, buildExpectedTimingGrid, timingBiasLabel, timingMatchWindowMs } from '../domain/timing-analysis.js';
import type { ClickMode, MetronomeConfig, Subdivision, TimingLabResult } from '../domain/models.js';
import { resolvedTiming, timingClickLabel } from '../audio/scheduler.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, confirmAction, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { formatDate, titleCase } from '../domain/utils.js';

const clickModes:[ClickMode,string][]=[
  ['standard','Standard click'],['two-four','2 & 4 only'],['sparse','Sparse click'],['one-per-bar','One click per bar'],['gap','Gap click'],
];
const subdivisions:[string,string][]=[['1','Quarter / beat'],['2','Eighths'],['3','Triplets'],['4','Sixteenths']];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const signed=(value:number)=>`${value>0?'+':''}${value.toFixed(1)} ms`;
const confidenceLabel=(value:TimingLabResult['confidence'])=>value==='high'?'High measurement confidence':value==='medium'?'Medium measurement confidence':'Low measurement confidence';

function resultCard(result:TimingLabResult,allowDelete=false):HTMLElement{
  const hasMatches=result.matchedCount>0,hasSpread=result.matchedCount>1,hasDrift=result.matchedCount>2;
  const bias=hasMatches?timingBiasLabel(result.meanOffsetMs):undefined,matchRate=result.expectedCount?Math.round(result.matchedCount/result.expectedCount*100):0;
  const card=el('article',{class:'panel timing-result-card'},
    sectionHeader(allowDelete?'Saved test':'Latest result',`${result.bpm} BPM · ${result.subdivision}× subdivision · ${timingClickLabel({...store.snapshot().settings.metronome,bpm:result.bpm,meter:result.meter,subdivision:result.subdivision,timing:result.timingClick})}`,
      allowDelete?[button('Delete',async()=>{if(await confirmAction('Delete this timing result?','The saved timing diagnostics will be permanently removed.','Delete result',true))await deleteTimingLabResult(result.id);},'ghost danger-text')]:[]),
    el('div',{class:'tag-row'},badge(confidenceLabel(result.confidence),result.confidence==='high'?'accent':'neutral'),badge(`${matchRate}% matched`),badge(`${result.misses} missed`),badge(`${result.extras} extra`)),
    el('div',{class:'stats-strip timing-stats'},
      stat('Average bias',hasMatches?signed(result.meanOffsetMs):'—',!hasMatches?'No matched hits':bias==='centered'?'Centered within ±5 ms':bias==='early'?'Negative = early':'Positive = late'),
      stat('Typical error',hasMatches?`${result.meanAbsoluteErrorMs.toFixed(1)} ms`:'—',hasMatches?'Mean absolute distance from grid':'No matched hits'),
      stat('Spread',hasSpread?`${result.spreadMs.toFixed(1)} ms`:'—',hasSpread?'Standard deviation of matched offsets':'Needs at least two matched hits'),
      stat('Drift',hasDrift?`${result.driftMsPerMinute>0?'+':''}${result.driftMsPerMinute.toFixed(1)} ms/min`:'—',hasDrift?'Trend across the test':'Needs at least three matched hits')),
    el('p',{class:'field-hint'},`Matched ${result.matchedCount} of ${result.expectedCount} expected hits inside a ±${result.matchWindowMs} ms window. Input compensation: ${result.inputOffsetMs} ms. These metrics describe detected timing only; they are not a musicianship score.`));
  if(result.hits.length){
    const limit=Math.max(result.matchWindowMs,20);
    const plot=el('div',{class:'timing-offset-plot','aria-hidden':'true'},el('div',{class:'timing-zero-line'}));
    for(const hit of result.hits){
      const x=result.durationSeconds?clamp(hit.elapsedMs/(result.durationSeconds*1000)*100,0,100):0;
      const y=50-clamp(hit.offsetMs/limit,-1,1)*42;
      plot.append(el('span',{class:`timing-hit-dot ${hit.offsetMs<-5?'early':hit.offsetMs>5?'late':'centered'}`,style:`left:${x}%;top:${y}%`}));
    }
    card.append(el('div',{class:'timing-plot-wrap'},el('div',{class:'split'},el('strong',{},'Offset over time'),el('span',{class:'muted small'},'up = late · down = early')),plot));
  }
  return card;
}

export function timingLabPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot);
  let config:MetronomeConfig={...structuredClone(snapshot.settings.metronome),countIn:1,timing:resolvedTiming(snapshot.settings.metronome)};
  let active=false,measurementStarted=false,startAudioTime=0,endAudioTime=0,finishTimer:ReturnType<typeof setTimeout>|undefined,tickTimer:ReturnType<typeof setInterval>|undefined;
  let detected:TimingInputHit[]=[];
  let runningConfig:MetronomeConfig|undefined,runningDuration=0,runningThreshold=0,runningOffset=0;
  let disposed=false;

  const page=el('div',{class:'page timing-lab-page'},pageHeader('Microphone diagnostics','Timing Lab',`${profile.name} · Compare detected attacks with the Web Audio timing grid.`,[
    link('Metronome','/metronome','button secondary','pulse'),link('Progress','/progress','button secondary','progress'),
  ]));
  const bpm=input('timingBpm','BPM',config.bpm,'number',{min:20,max:300,step:1,required:true});
  const subdivision=select('timingSubdivision','Subdivision',subdivisions,String(config.subdivision));
  const clickMode=select('timingClick','Click mode',clickModes,config.timing!.mode);
  const durationInput=input('timingDuration','Test seconds',30,'number',{min:5,max:180,step:5,required:true});
  const thresholdInput=input('timingThreshold','Onset threshold',0.08,'number',{min:.005,max:.95,step:.005,required:true});
  const offsetInput=input('timingOffset','Input compensation (ms)',0,'number',{min:-250,max:250,step:1,required:true});
  const status=el('p',{class:'timing-lab-status',role:'status'},MicrophoneTimingInput.supported()?'Ready · headphones strongly recommended to prevent click bleed.':'Precision microphone timing is unavailable in this browser.');
  const live=el('div',{class:'timing-live',hidden:true},el('strong',{class:'timing-live-clock'},'00.0'),el('span',{class:'muted'},'seconds'),el('span',{class:'timing-live-hits'},'0 detected attacks'));
  const resultHost=el('div',{class:'timing-result-host'});

  const readConfig=():MetronomeConfig=>{
    const bpmInput=bpm.querySelector('input')!,duration=durationInput.querySelector('input')!,threshold=thresholdInput.querySelector('input')!,offset=offsetInput.querySelector('input')!;
    if(!bpmInput.reportValidity()||!duration.reportValidity()||!threshold.reportValidity()||!offset.reportValidity())throw new Error('Correct the Timing Lab settings before starting.');
    return {...config,bpm:Number(bpmInput.value),subdivision:Number(subdivision.querySelector('select')!.value) as Subdivision,countIn:1,timing:{...resolvedTiming(config),mode:clickMode.querySelector('select')!.value as ClickMode}};
  };
  const stopTimers=()=>{clearTimeout(finishTimer);clearInterval(tickTimer);finishTimer=undefined;tickTimer=undefined;};
  const setupFields=[bpm,subdivision,clickMode,durationInput,thresholdInput,offsetInput];
  const setSetupDisabled=(disabled:boolean)=>{for(const wrapper of setupFields){const control=wrapper.querySelector<HTMLInputElement|HTMLSelectElement>('input,select');if(control)control.disabled=disabled;}if(calibrateButton)calibrateButton.disabled=disabled||!MicrophoneTimingInput.supported();};
  const resetTransport=()=>{active=false;measurementStarted=false;stopTimers();audio.stop();timingInput.stop();runningConfig=undefined;runningDuration=0;runningThreshold=0;runningOffset=0;setSetupDisabled(false);startButton.querySelector('span')!.textContent='Start timing test';startButton.setAttribute('aria-pressed','false');live.hidden=true;};

  const finish=async(save=true)=>{
    if(!active)return;
    const testConfig=runningConfig;if(!testConfig)throw new Error('The active timing test configuration was lost.');
    const durationSeconds=runningDuration,threshold=runningThreshold,inputOffsetMs=runningOffset;
    const start=startAudioTime,end=endAudioTime||start+durationSeconds,windowMs=timingMatchWindowMs(testConfig),wasMeasured=measurementStarted;
    const relevant=detected.filter(hit=>hit.time>=start-windowMs/1000&&hit.time<=end+windowMs/1000);
    resetTransport();
    if(!save||!wasMeasured||!start){status.textContent='Test canceled. No result was saved.';return;}
    const expected=buildExpectedTimingGrid(testConfig,start,durationSeconds),analysis=analyzeTiming(expected,relevant,inputOffsetMs,windowMs);
    const saved=await saveTimingLabResult({profileId:profile.id,config:testConfig,durationSeconds,threshold,inputOffsetMs,analysis});
    status.textContent=`Saved · ${saved.matchedCount} of ${saved.expectedCount} expected hits matched.`;
  };

  const start=async()=>{
    if(active){await finish(false);return;}
    if(!MicrophoneTimingInput.supported())throw new Error('Timing Lab needs microphone access and AudioWorklet support.');
    const testConfig=readConfig(),durationSeconds=Number(durationInput.querySelector('input')!.value),threshold=Number(thresholdInput.querySelector('input')!.value);
    config=testConfig;runningConfig=structuredClone(testConfig);runningDuration=durationSeconds;runningThreshold=threshold;runningOffset=Number(offsetInput.querySelector('input')!.value);detected=[];startAudioTime=0;endAudioTime=0;measurementStarted=false;
    status.textContent='Opening microphone…';
    const context=await audio.prepareContext();
    await timingInput.start(context,threshold,hit=>{detected.push(hit);const target=live.querySelector('.timing-live-hits');if(target)target.textContent=`${detected.length} detected attack${detected.length===1?'':'s'}`;});
    active=true;setSetupDisabled(true);startButton.querySelector('span')!.textContent='Cancel timing test';startButton.setAttribute('aria-pressed','true');live.hidden=false;
    status.textContent='Count-in · measurement starts on the first practice beat.';
    try{
      await audio.start(testConfig,{
        onReady:(_wallTime,audioTime)=>{
          if(disposed||!active)return;
          startAudioTime=audioTime;endAudioTime=audioTime+durationSeconds;measurementStarted=true;
          status.textContent=`Measuring · ${testConfig.bpm} BPM · ${testConfig.subdivision}× subdivision · ${timingClickLabel(testConfig)}`;
          const started=performance.now();
          tickTimer=setInterval(()=>{
            const elapsed=Math.min(durationSeconds,(performance.now()-started)/1000),clock=live.querySelector('.timing-live-clock');
            if(clock)clock.textContent=elapsed.toFixed(1);
          },100);
          finishTimer=setTimeout(()=>{void finish(true).catch(error=>notify(error instanceof Error?error.message:'Timing result could not be saved.','error'));},durationSeconds*1000+80);
        },
        onInterrupted:()=>{
          if(!active)return;
          resetTransport();status.textContent='Audio was interrupted. The test was canceled.';notify('Timing Lab audio was interrupted. Retry when the app can stay in the foreground.','info');
        },
      });
    }catch(error){resetTransport();throw error;}
  };

  const calibrate=async()=>{
    if(active)throw new Error('Stop the current test before calibrating.');
    if(!MicrophoneTimingInput.supported())throw new Error('Microphone calibration is unavailable in this browser.');
    status.textContent='Calibrating · stay quiet for about one second.';
    const context=await audio.prepareContext(),calibration=await timingInput.calibrate(context,1200);
    thresholdInput.querySelector('input')!.value=String(calibration.threshold);
    status.textContent=calibration.samples?`Calibrated · ambient peak ${calibration.noisePeak.toFixed(3)} · onset threshold ${calibration.threshold.toFixed(3)}.`:'Calibration heard no usable samples. The conservative default threshold remains available.';
  };

  const startButton=button(MicrophoneTimingInput.supported()?'Start timing test':'Timing Lab unavailable',start,'primary','pulse');
  startButton.disabled=!MicrophoneTimingInput.supported();startButton.setAttribute('aria-pressed','false');
  const calibrateButton=button('Calibrate microphone',calibrate,'secondary');
  calibrateButton.disabled=!MicrophoneTimingInput.supported();

  const setup=el('section',{class:'panel timing-setup'},sectionHeader('Test setup','One bar count-in; expected strokes follow the selected subdivision.'),el('div',{class:'form-grid timing-lab-grid'},bpm,subdivision,clickMode,durationInput,thresholdInput,offsetInput),
    el('div',{class:'actions wrap'},startButton,calibrateButton),status,live,
    el('p',{class:'field-hint'},'Use headphones when possible. Speaker clicks can enter the microphone and be detected as attacks. Positive offsets mean late; negative offsets mean early. Input compensation shifts detected attacks earlier/later to account for known hardware latency.'));

  const how=el('section',{class:'panel'},sectionHeader('What this measures','Deterministic onset matching; no automatic technique judgment.'),
    el('p',{},'Timing Lab detects short microphone attacks on the audio sample clock and matches them one-to-one to the nearest expected subdivision position inside a bounded window.'),
    el('ul',{class:'plain-list'},el('li',{},'Average bias · systematic early/late tendency.'),el('li',{},'Typical error · mean absolute distance from the expected grid.'),el('li',{},'Spread · consistency of matched offsets around their mean.'),el('li',{},'Drift · change in offset over time.'),el('li',{},'Misses / extras · unmatched expected and detected events.')),
    el('p',{class:'field-hint'},'Measurement confidence describes whether enough clean events were matched. It is not a skill rating, health assessment, or professional benchmark.'));

  page.append(el('div',{class:'two-column wide-left'},setup,how),resultHost);

  const renderHistory=()=>{
    const rows=(store.snapshot().timingResults??[]).filter(row=>row.profileId===profile.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    resultHost.replaceChildren();
    if(rows[0])resultHost.append(resultCard(rows[0]));
    const history=el('section',{class:'timing-history'},sectionHeader('Timing history',rows.length?`${rows.length} saved test${rows.length===1?'':'s'}`:'No saved tests yet'));
    if(!rows.length)history.append(el('p',{class:'muted'},'Run a test to create your first microphone timing result.'));
    else for(const row of rows.slice(0,30))history.append(el('article',{class:'timing-history-row'},
      el('div',{},el('strong',{},`${row.bpm} BPM · ${row.subdivision}×`),el('span',{class:'muted small'},`${formatDate(row.createdAt,true)} · ${titleCase(row.confidence)} confidence`)),
      el('div',{class:'tag-row'},row.matchedCount?badge(`bias ${signed(row.meanOffsetMs)}`):badge('no matched hits'),row.matchedCount?badge(`error ${row.meanAbsoluteErrorMs.toFixed(1)} ms`):null,row.matchedCount>1?badge(`spread ${row.spreadMs.toFixed(1)} ms`):null,badge(`${row.matchedCount}/${row.expectedCount} matched`)),
      button('Delete',async()=>{if(await confirmAction('Delete this timing result?','This diagnostic result will be permanently removed.','Delete result',true))await deleteTimingLabResult(row.id);},'ghost compact danger-text')));
    resultHost.append(history);
  };
  renderHistory();

  return {
    node:page,
    beforeLeave:async()=>!active||await confirmAction('Leave Timing Lab?','The active timing test will be canceled and no result will be saved.','Leave Timing Lab',true),
    isDirty:()=>active,
    cleanup:()=>{disposed=true;resetTransport();},
  };
}
