import { audio } from '../audio/engine.js';
import { MicrophoneTimingInput, timingInput, type TimingInputHit } from '../audio/timing-input.js';
import { deleteTimingLabResult, saveTimingLabResult } from '../app/timing-lab.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { analyzeTiming, buildExpectedTimingGrid, timingBiasLabel, timingMatchWindowMs } from '../domain/timing-analysis.js';
import { analyzePocketTiming, pocketErrorLabel, pocketTargetLabel } from '../domain/pocket-analysis.js';
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
  const pocket=result.timingLabVersion===2,hasMatches=result.matchedCount>0,hasSpread=result.matchedCount>1,hasDrift=result.matchedCount>2;
  const bias=hasMatches?timingBiasLabel(result.meanOffsetMs):undefined,matchRate=result.expectedCount?Math.round(result.matchedCount/result.expectedCount*100):0;
  const targetRate=pocket&&result.matchedCount?Math.round((result.targetBandHits??0)/result.matchedCount*100):0;
  const stats=pocket?[
    stat('Target offset',pocketTargetLabel(result.targetOffsetMs??0),signed(result.targetOffsetMs??0)),
    stat('Average placement',hasMatches?signed(result.meanOffsetMs):'—','Grid-relative placement · negative ahead, positive behind'),
    stat('Average target error',hasMatches?signed(result.meanTargetErrorMs??0):'—',hasMatches?titleCase(pocketErrorLabel(result.meanTargetErrorMs??0).replaceAll('-',' ')):'No matched hits'),
    stat('Target distance',hasMatches?`${(result.meanAbsoluteTargetErrorMs??0).toFixed(1)} ms`:'—','Mean absolute distance from your chosen placement'),
    stat('Within target band',hasMatches?`${result.targetBandHits??0} / ${result.matchedCount}`:'—',hasMatches?`${targetRate}% inside ±${result.targetBandMs??0} ms around target`:'No matched hits'),
    stat('Spread',hasSpread?`${result.spreadMs.toFixed(1)} ms`:'—',hasSpread?'Consistency around your average placement':'Needs at least two matched hits'),
    stat('Drift',hasDrift?`${result.driftMsPerMinute>0?'+':''}${result.driftMsPerMinute.toFixed(1)} ms/min`:'—',hasDrift?'Change in placement over the test':'Needs at least three matched hits'),
  ]:[
    stat('Average bias',hasMatches?signed(result.meanOffsetMs):'—',!hasMatches?'No matched hits':bias==='centered'?'Centered within ±5 ms':bias==='early'?'Negative = early':'Positive = late'),
    stat('Typical error',hasMatches?`${result.meanAbsoluteErrorMs.toFixed(1)} ms`:'—',hasMatches?'Mean absolute distance from grid':'No matched hits'),
    stat('Spread',hasSpread?`${result.spreadMs.toFixed(1)} ms`:'—',hasSpread?'Standard deviation of matched offsets':'Needs at least two matched hits'),
    stat('Drift',hasDrift?`${result.driftMsPerMinute>0?'+':''}${result.driftMsPerMinute.toFixed(1)} ms/min`:'—',hasDrift?'Trend across the test':'Needs at least three matched hits'),
  ];
  const card=el('article',{class:`panel timing-result-card ${pocket?'pocket-result-card':''}`},
    sectionHeader(allowDelete?(pocket?'Saved pocket test':'Saved test'):(pocket?'Latest pocket result':'Latest result'),`${result.bpm} BPM · ${result.subdivision}× subdivision · ${timingClickLabel({...store.snapshot().settings.metronome,bpm:result.bpm,meter:result.meter,subdivision:result.subdivision,timing:result.timingClick})}`,
      allowDelete?[button('Delete',async()=>{if(await confirmAction('Delete this timing result?','The saved timing diagnostics will be permanently removed.','Delete result',true))await deleteTimingLabResult(result.id);},'ghost danger-text')]:[]),
    el('div',{class:'tag-row'},badge(confidenceLabel(result.confidence),result.confidence==='high'?'accent':'neutral'),badge(`${matchRate}% matched`),pocket?badge(`${targetRate}% target band`):null,badge(`${result.misses} missed`),badge(`${result.extras} extra`)),
    el('div',{class:`stats-strip timing-stats ${pocket?'pocket-stats':''}`},...stats),
    el('p',{class:'field-hint'},pocket
      ?`Matched ${result.matchedCount} of ${result.expectedCount} expected hits. Grid placement is still preserved; target diagnostics compare those matched hits with ${pocketTargetLabel(result.targetOffsetMs??0)} inside your ±${result.targetBandMs??0} ms band. Input compensation: ${result.inputOffsetMs} ms. This is a placement diagnostic, not a definition of good groove.`
      :`Matched ${result.matchedCount} of ${result.expectedCount} expected hits inside a ±${result.matchWindowMs} ms window. Input compensation: ${result.inputOffsetMs} ms. These metrics describe detected timing only; they are not a musicianship score.`));
  if(result.hits.length){
    const target=pocket?result.targetOffsetMs??0:0,limit=Math.max(result.matchWindowMs,Math.abs(target)+(result.targetBandMs??0)+10,20);
    const plot=el('div',{class:'timing-offset-plot','aria-hidden':'true'},el('div',{class:'timing-zero-line'}));
    if(pocket){const targetY=50-clamp(target/limit,-1,1)*42;plot.append(el('div',{class:'timing-target-line',style:`top:${targetY}%`}));}
    for(const hit of result.hits){
      const x=result.durationSeconds?clamp(hit.elapsedMs/(result.durationSeconds*1000)*100,0,100):0,y=50-clamp(hit.offsetMs/limit,-1,1)*42,relative=pocket?hit.offsetMs-target:hit.offsetMs;
      plot.append(el('span',{class:`timing-hit-dot ${pocket?(relative<-2?'early':relative>2?'late':'centered'):(hit.offsetMs<-5?'early':hit.offsetMs>5?'late':'centered')}`,style:`left:${x}%;top:${y}%`}));
    }
    card.append(el('div',{class:'timing-plot-wrap'},el('div',{class:'split'},el('strong',{},pocket?'Placement over time':'Offset over time'),el('span',{class:'muted small'},pocket?'target line = chosen feel · dots above/below are later/earlier':'up = late · down = early')),plot));
  }
  return card;
}
export function timingLabPage(mode:'timing'|'pocket'='timing'):Page{
  const pocketMode=mode==='pocket',snapshot=store.snapshot(),profile=activeProfile(snapshot);
  let config:MetronomeConfig={...structuredClone(snapshot.settings.metronome),countIn:1,timing:resolvedTiming(snapshot.settings.metronome)};
  let active=false,measurementStarted=false,startAudioTime=0,endAudioTime=0,finishTimer:ReturnType<typeof setTimeout>|undefined,tickTimer:ReturnType<typeof setInterval>|undefined;
  let detected:TimingInputHit[]=[];
  let runningConfig:MetronomeConfig|undefined,runningDuration=0,runningThreshold=0,runningOffset=0,runningTargetOffset=0,runningTargetBand=0;
  let disposed=false;

  const page=el('div',{class:`page timing-lab-page ${pocketMode?'pocket-lab-page':''}`},pageHeader('Microphone diagnostics',pocketMode?'Pocket Lab':'Timing Lab',pocketMode
    ?`${profile.name} · Practice deliberate ahead / centered / behind placement against a chosen timing target.`
    :`${profile.name} · Compare detected attacks with the Web Audio timing grid.`,[
    pocketMode?link('Timing Lab','/timing-lab','button secondary','pulse'):link('Pocket Lab','/pocket','button secondary','pulse'),
    link('Metronome','/metronome','button secondary','pulse'),link('MIDI Lab','/midi-lab','button secondary','pulse'),link('Progress','/progress','button secondary','progress'),
  ]));
  const bpm=input('timingBpm','BPM',config.bpm,'number',{min:20,max:300,step:1,required:true});
  const subdivision=select('timingSubdivision','Subdivision',subdivisions,String(config.subdivision));
  const clickMode=select('timingClick','Click mode',clickModes,config.timing!.mode);
  const durationInput=input('timingDuration','Test seconds',30,'number',{min:5,max:180,step:5,required:true});
  const thresholdInput=input('timingThreshold','Onset threshold',0.08,'number',{min:.005,max:.95,step:.005,required:true});
  const offsetInput=input('timingOffset','Input compensation (ms)',0,'number',{min:-250,max:250,step:1,required:true});
  const targetPreset=select('pocketTargetPreset','Placement target',[['0','Centered · 0 ms'],['-10','Ahead · −10 ms'],['-20','Ahead · −20 ms'],['-30','Ahead · −30 ms'],['10','Behind · +10 ms'],['20','Behind · +20 ms'],['30','Behind · +30 ms'],['custom','Custom offset']],'0');
  const targetOffset=input('pocketTargetOffset','Target offset (ms)',0,'number',{min:-120,max:120,step:1,required:true});
  const targetBand=input('pocketTargetBand','Target band ± (ms)',12,'number',{min:1,max:100,step:1,required:true});
  const targetPresetSelect=targetPreset.querySelector<HTMLSelectElement>('select')!,targetOffsetInput=targetOffset.querySelector<HTMLInputElement>('input')!;
  targetPresetSelect.addEventListener('change',()=>{if(targetPresetSelect.value!=='custom')targetOffsetInput.value=targetPresetSelect.value;});
  targetOffsetInput.addEventListener('input',()=>{const value=targetOffsetInput.value,target=[...targetPresetSelect.options].find(option=>option.value===value&&option.value!=='custom');targetPresetSelect.value=target?.value??'custom';});
  const status=el('p',{class:'timing-lab-status',role:'status'},MicrophoneTimingInput.supported()?'Ready · headphones strongly recommended to prevent click bleed.':'Precision microphone timing is unavailable in this browser.');
  const live=el('div',{class:'timing-live',hidden:true},el('strong',{class:'timing-live-clock'},'00.0'),el('span',{class:'muted'},'seconds'),el('span',{class:'timing-live-hits'},'0 detected attacks'));
  const resultHost=el('div',{class:'timing-result-host'});

  const readPocket=()=>{
    if(!pocketMode)return undefined;
    const target=targetOffset.querySelector<HTMLInputElement>('input')!,band=targetBand.querySelector<HTMLInputElement>('input')!;
    if(!target.reportValidity()||!band.reportValidity())throw new Error('Correct the Pocket target settings before starting.');
    return {targetOffsetMs:Number(target.value),targetBandMs:Number(band.value)};
  };
  const readConfig=():MetronomeConfig=>{
    const bpmInput=bpm.querySelector<HTMLInputElement>('input')!,duration=durationInput.querySelector<HTMLInputElement>('input')!,threshold=thresholdInput.querySelector<HTMLInputElement>('input')!,offset=offsetInput.querySelector<HTMLInputElement>('input')!;
    if(!bpmInput.reportValidity()||!duration.reportValidity()||!threshold.reportValidity()||!offset.reportValidity())throw new Error(`Correct the ${pocketMode?'Pocket':'Timing'} Lab settings before starting.`);
    readPocket();
    return {...config,bpm:Number(bpmInput.value),subdivision:Number(subdivision.querySelector('select')!.value) as Subdivision,countIn:1,timing:{...resolvedTiming(config),mode:clickMode.querySelector('select')!.value as ClickMode}};
  };
  const stopTimers=()=>{clearTimeout(finishTimer);clearInterval(tickTimer);finishTimer=undefined;tickTimer=undefined;};
  const setupFields=[bpm,subdivision,clickMode,durationInput,thresholdInput,offsetInput,...(pocketMode?[targetPreset,targetOffset,targetBand]:[])];
  const setSetupDisabled=(disabled:boolean)=>{for(const wrapper of setupFields){const control=wrapper.querySelector<HTMLInputElement|HTMLSelectElement>('input,select');if(control)control.disabled=disabled;}if(calibrateButton)calibrateButton.disabled=disabled||!MicrophoneTimingInput.supported();};
  const resetTransport=()=>{active=false;measurementStarted=false;stopTimers();audio.stop();timingInput.stop();runningConfig=undefined;runningDuration=0;runningThreshold=0;runningOffset=0;runningTargetOffset=0;runningTargetBand=0;setSetupDisabled(false);startButton.querySelector('span')!.textContent=pocketMode?'Start pocket test':'Start timing test';startButton.setAttribute('aria-pressed','false');live.hidden=true;};

  const finish=async(save=true)=>{
    if(!active)return;
    const testConfig=runningConfig;if(!testConfig)throw new Error(`The active ${pocketMode?'pocket':'timing'} test configuration was lost.`);
    const durationSeconds=runningDuration,threshold=runningThreshold,inputOffsetMs=runningOffset,targetOffsetMs=runningTargetOffset,targetBandMs=runningTargetBand;
    const start=startAudioTime,end=endAudioTime||start+durationSeconds,windowMs=timingMatchWindowMs(testConfig),wasMeasured=measurementStarted;
    const earliest=start+Math.min(0,targetOffsetMs)/1000-windowMs/1000,latest=end+Math.max(0,targetOffsetMs)/1000+windowMs/1000;
    const relevant=detected.filter(hit=>hit.time>=earliest&&hit.time<=latest);
    resetTransport();
    if(!save||!wasMeasured||!start){status.textContent='Test canceled. No result was saved.';return;}
    const expected=buildExpectedTimingGrid(testConfig,start,durationSeconds),resolved=pocketMode?analyzePocketTiming(expected,relevant,inputOffsetMs,targetOffsetMs,targetBandMs,windowMs):{timing:analyzeTiming(expected,relevant,inputOffsetMs,windowMs),pocket:undefined};
    const analysis=resolved.timing,pocket=resolved.pocket,saved=await saveTimingLabResult({profileId:profile.id,config:testConfig,durationSeconds,threshold,inputOffsetMs,analysis,pocket});
    status.textContent=pocketMode?`Saved pocket result · ${saved.targetBandHits??0}/${saved.matchedCount} matched hits inside the target band.`:`Saved · ${saved.matchedCount} of ${saved.expectedCount} expected hits matched.`;
  };

  const start=async()=>{
    if(active){await finish(false);return;}
    if(!MicrophoneTimingInput.supported())throw new Error(`${pocketMode?'Pocket':'Timing'} Lab needs microphone access and AudioWorklet support.`);
    const testConfig=readConfig(),durationSeconds=Number(durationInput.querySelector('input')!.value),threshold=Number(thresholdInput.querySelector('input')!.value),pocket=readPocket();
    config=testConfig;runningConfig=structuredClone(testConfig);runningDuration=durationSeconds;runningThreshold=threshold;runningOffset=Number(offsetInput.querySelector('input')!.value);runningTargetOffset=pocket?.targetOffsetMs??0;runningTargetBand=pocket?.targetBandMs??0;detected=[];startAudioTime=0;endAudioTime=0;measurementStarted=false;
    status.textContent='Opening microphone…';
    const context=await audio.prepareContext();
    await timingInput.start(context,threshold,hit=>{detected.push(hit);const target=live.querySelector('.timing-live-hits');if(target)target.textContent=`${detected.length} detected attack${detected.length===1?'':'s'}`;});
    active=true;setSetupDisabled(true);startButton.querySelector('span')!.textContent=pocketMode?'Cancel pocket test':'Cancel timing test';startButton.setAttribute('aria-pressed','true');live.hidden=false;
    status.textContent='Count-in · measurement starts on the first practice beat.';
    try{
      await audio.start(testConfig,{
        onReady:(_wallTime,audioTime)=>{
          if(disposed||!active)return;
          startAudioTime=audioTime;endAudioTime=audioTime+durationSeconds;measurementStarted=true;
          status.textContent=pocketMode?`Measuring · ${pocketTargetLabel(runningTargetOffset)} · ±${runningTargetBand} ms band · ${testConfig.bpm} BPM`:`Measuring · ${testConfig.bpm} BPM · ${testConfig.subdivision}× subdivision · ${timingClickLabel(testConfig)}`;
          const started=performance.now();
          tickTimer=setInterval(()=>{
            const elapsed=Math.min(durationSeconds,(performance.now()-started)/1000),clock=live.querySelector('.timing-live-clock');
            if(clock)clock.textContent=elapsed.toFixed(1);
          },100);
          finishTimer=setTimeout(()=>{void finish(true).catch(error=>notify(error instanceof Error?error.message:`${pocketMode?'Pocket':'Timing'} result could not be saved.`,'error'));},durationSeconds*1000+80);
        },
        onInterrupted:()=>{
          if(!active)return;
          resetTransport();status.textContent='Audio was interrupted. The test was canceled.';notify(`${pocketMode?'Pocket':'Timing'} Lab audio was interrupted. Retry when the app can stay in the foreground.`,'info');
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

  const startButton=button(MicrophoneTimingInput.supported()?(pocketMode?'Start pocket test':'Start timing test'):(pocketMode?'Pocket Lab unavailable':'Timing Lab unavailable'),start,'primary','pulse');
  startButton.disabled=!MicrophoneTimingInput.supported();startButton.setAttribute('aria-pressed','false');
  const calibrateButton=button('Calibrate microphone',calibrate,'secondary');
  calibrateButton.disabled=!MicrophoneTimingInput.supported();

  const setupGrid=el('div',{class:`form-grid timing-lab-grid ${pocketMode?'pocket-lab-grid':''}`},bpm,subdivision,clickMode,durationInput,thresholdInput,offsetInput,pocketMode?targetPreset:null,pocketMode?targetOffset:null,pocketMode?targetBand:null);
  const setup=el('section',{class:'panel timing-setup'},sectionHeader('Test setup',pocketMode?'One bar count-in; choose the placement you intend before playing.':'One bar count-in; expected strokes follow the selected subdivision.'),setupGrid,
    el('div',{class:'actions wrap'},startButton,calibrateButton),status,live,
    el('p',{class:'field-hint'},pocketMode
      ?'Use headphones when possible. Negative target offsets mean ahead of the reference grid; positive offsets mean behind. The target band is your own diagnostic window, not a universal standard. Input compensation is separate and should represent known microphone/hardware latency.'
      :'Use headphones when possible. Speaker clicks can enter the microphone and be detected as attacks. Positive offsets mean late; negative offsets mean early. Input compensation shifts detected attacks earlier/later to account for known hardware latency.'));

  const how=pocketMode
    ?el('section',{class:'panel'},sectionHeader('What Pocket Lab measures','Intentional placement, not “correct” feel.'),
      el('p',{},'Pocket Lab first performs the same deterministic microphone onset matching as Timing Lab. It then measures each matched attack relative to the placement target you chose before the test.'),
      el('ul',{class:'plain-list'},
        el('li',{},'Average placement · where you actually sat relative to the reference grid.'),
        el('li',{},'Average target error · whether your average landed earlier or later than the chosen feel.'),
        el('li',{},'Target distance · average absolute distance from the chosen feel.'),
        el('li',{},'Target band · how many matched attacks fell inside your own ±ms window.'),
        el('li',{},'Spread / drift · consistency and movement over time, independent of whether the target itself is ahead or behind.')),
      el('p',{class:'field-hint'},'There is no universally “best” ahead/behind value. Feel depends on tempo, style, ensemble context, sound, touch, and intent. These numbers help you reproduce a chosen placement; they do not define groove quality.'))
    :el('section',{class:'panel'},sectionHeader('What this measures','Deterministic onset matching; no automatic technique judgment.'),
      el('p',{},'Timing Lab detects short microphone attacks on the audio sample clock and matches them one-to-one to the nearest expected subdivision position inside a bounded window.'),
      el('ul',{class:'plain-list'},el('li',{},'Average bias · systematic early/late tendency.'),el('li',{},'Typical error · mean absolute distance from the expected grid.'),el('li',{},'Spread · consistency of matched offsets around their mean.'),el('li',{},'Drift · change in offset over time.'),el('li',{},'Misses / extras · unmatched expected and detected events.')),
      el('p',{class:'field-hint'},'Measurement confidence describes whether enough clean events were matched. It is not a skill rating, health assessment, or professional benchmark.'));

  page.append(el('div',{class:'two-column wide-left'},setup,how),resultHost);

  const renderHistory=()=>{
    const rows=(store.snapshot().timingResults??[]).filter(row=>row.profileId===profile.id&&(pocketMode?row.timingLabVersion===2:row.timingLabVersion===1)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    resultHost.replaceChildren();
    if(rows[0])resultHost.append(resultCard(rows[0]));
    const history=el('section',{class:'timing-history'},sectionHeader(pocketMode?'Pocket history':'Timing history',rows.length?`${rows.length} saved ${pocketMode?'pocket ':'timing '}test${rows.length===1?'':'s'}`:`No saved ${pocketMode?'pocket':'timing'} tests yet`));
    if(!rows.length)history.append(el('p',{class:'muted'},pocketMode?'Run a Pocket test to save your first intentional-placement result.':'Run a test to create your first microphone timing result.'));
    else for(const row of rows.slice(0,30))history.append(el('article',{class:'timing-history-row'},
      el('div',{},el('strong',{},pocketMode?`${pocketTargetLabel(row.targetOffsetMs??0)} · ${row.bpm} BPM`:`${row.bpm} BPM · ${row.subdivision}×`),el('span',{class:'muted small'},`${formatDate(row.createdAt,true)} · ${titleCase(row.confidence)} confidence`)),
      el('div',{class:'tag-row'},
        pocketMode&&row.matchedCount?badge(`target error ${signed(row.meanTargetErrorMs??0)}`):row.matchedCount?badge(`bias ${signed(row.meanOffsetMs)}`):badge('no matched hits'),
        pocketMode&&row.matchedCount?badge(`distance ${(row.meanAbsoluteTargetErrorMs??0).toFixed(1)} ms`):row.matchedCount?badge(`error ${row.meanAbsoluteErrorMs.toFixed(1)} ms`):null,
        pocketMode&&row.matchedCount?badge(`${row.targetBandHits??0}/${row.matchedCount} in ±${row.targetBandMs??0} ms`):row.matchedCount>1?badge(`spread ${row.spreadMs.toFixed(1)} ms`):null,
        badge(`${row.matchedCount}/${row.expectedCount} matched`)),
      button('Delete',async()=>{if(await confirmAction(`Delete this ${pocketMode?'pocket':'timing'} result?`,'This diagnostic result will be permanently removed.','Delete result',true))await deleteTimingLabResult(row.id);},'ghost compact danger-text')));
    resultHost.append(history);
  };
  renderHistory();
  return {
    node:page,
    beforeLeave:async()=>!active||await confirmAction(`Leave ${pocketMode?'Pocket':'Timing'} Lab?`,'The active test will be canceled and no result will be saved.',`Leave ${pocketMode?'Pocket':'Timing'} Lab`,true),
    isDirty:()=>active,
    cleanup:()=>{disposed=true;resetTransport();},
  };
}
