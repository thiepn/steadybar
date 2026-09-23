import { audio } from '../audio/engine.js';
import { resolvedTiming, timingClickLabel } from '../audio/scheduler.js';
import { deleteMidiDeviceProfile, deleteMidiPerformanceResult, midiProfileFor, saveMidiDeviceProfile, saveMidiPerformanceResult } from '../app/midi-lab.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { analyzeMidiPerformance, defaultMidiMappings, MIDI_VOICES } from '../domain/midi-analysis.js';
import type { ClickMode, MetronomeConfig, MidiDeviceProfile, MidiDrumMapping, MidiDrumVoice, MidiPerformanceResult, Subdivision } from '../domain/models.js';
import { timingMatchWindowMs } from '../domain/timing-analysis.js';
import { MidiInputManager, midiInput, type MidiInputDescriptor, type MidiNoteEvent } from '../midi/input.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, confirmAction, empty, field, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { formatDate, titleCase } from '../domain/utils.js';

const clickModes:[ClickMode,string][]=[
  ['standard','Standard click'],['two-four','2 & 4 only'],['sparse','Sparse click'],['one-per-bar','One click per bar'],['gap','Gap click'],
];
const subdivisions:[string,string][]=[['1','Quarter / beat'],['2','Eighths'],['3','Triplets'],['4','Sixteenths']];
const channels:[string,string][]=[['','Any MIDI channel'],...Array.from({length:16},(_,i)=>[String(i+1),`Channel ${i+1}`] as [string,string])];
const voiceOptions:[string,string][]=[['','All mapped notes'],...MIDI_VOICES.map(row=>[row.value,row.label] as [string,string])];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const signed=(value:number)=>`${value>0?'+':''}${value.toFixed(1)} ms`;
const confidenceLabel=(value:MidiPerformanceResult['confidence'])=>value==='high'?'High measurement confidence':value==='medium'?'Medium measurement confidence':'Low measurement confidence';

function resultCard(result:MidiPerformanceResult):HTMLElement{
  const matchRate=result.expectedCount?Math.round(result.matchedCount/result.expectedCount*100):0;
  const title=result.analyzedVoice?MIDI_VOICES.find(row=>row.value===result.analyzedVoice)?.label??titleCase(result.analyzedVoice):'All mapped notes';
  const card=el('article',{class:'panel midi-result-card'},
    sectionHeader('Latest MIDI result',`${result.deviceNameSnapshot} · ${result.bpm} BPM · ${title}`),
    el('div',{class:'tag-row'},badge(confidenceLabel(result.confidence),result.confidence==='high'?'accent':'neutral'),badge(`${matchRate}% matched`),badge(`${result.misses} missed`),badge(`${result.extras} extra`),result.unmappedCount?badge(`${result.unmappedCount} unmapped`):null),
    el('div',{class:'stats-strip midi-stats'},
      stat('Average bias',result.matchedCount?signed(result.meanOffsetMs):'—',result.matchedCount?'Negative = early · positive = late':'Not enough matched events'),
      stat('Typical error',result.matchedCount?`${result.meanAbsoluteErrorMs.toFixed(1)} ms`:'—','Mean absolute timing distance'),
      stat('Timing spread',result.matchedCount>1?`${result.spreadMs.toFixed(1)} ms`:'—','Matched timing consistency'),
      stat('Velocity median',result.matchedCount?`${result.velocityMedian.toFixed(1)}`:'—','MIDI velocity 1–127'),
      stat('Velocity spread',result.matchedCount>1?`${result.velocitySpread.toFixed(1)}`:'—','Device-relative consistency'),
      stat('Velocity range',result.matchedCount?`${result.velocityMin}–${result.velocityMax}`:'—',result.matchedCount?`range ${result.velocityRange}`:'No matched velocities')),
    el('p',{class:'field-hint'},`Matched ${result.matchedCount} of ${result.expectedCount} expected positions inside ±${result.matchWindowMs} ms. MIDI velocity is device-specific and is not identical to acoustic loudness or force.`));
  if(result.voices.length){
    const voices=el('div',{class:'midi-voice-summary'},el('div',{class:'midi-voice-head'},el('strong',{},'Mapped voice'),el('strong',{},'Hits'),el('strong',{},'Median vel.'),el('strong',{},'Vel. spread'),el('strong',{},'Timing error')));
    for(const row of result.voices)voices.append(el('div',{class:'midi-voice-row'},el('span',{},row.label),el('span',{},row.count),el('span',{},row.medianVelocity.toFixed(1)),el('span',{},row.velocitySpread.toFixed(1)),el('span',{},`${row.meanAbsoluteErrorMs.toFixed(1)} ms`)));
    card.append(voices);
  }
  return card;
}

export function midiLabPage():Page{
  const snapshot=store.snapshot(),profile=activeProfile(snapshot),supported=MidiInputManager.supported();
  let devices:MidiInputDescriptor[]=[],selected:MidiInputDescriptor|undefined;
  let mappings:MidiDrumMapping[]=defaultMidiMappings(),activeProfileRow:MidiDeviceProfile|undefined;
  let active=false,learning=false,disposed=false,startAudioTime=0,runningDuration=0,runningConfig:MetronomeConfig|undefined,runningVoice:MidiDrumVoice|undefined;
  let events:MidiNoteEvent[]=[],eventOverflow=false,finishTimer:ReturnType<typeof setTimeout>|undefined,tickTimer:ReturnType<typeof setInterval>|undefined;
  let removeStateListener:()=>void=()=>{};

  const page=el('div',{class:'page midi-lab-page'},pageHeader('Electronic drum diagnostics','MIDI Drum Lab',`${profile.name} · High-resolution timing and device-relative velocity evidence from mapped MIDI note-on events.`,[
    link('Timing Lab','/timing-lab','button secondary','pulse'),link('Progress','/progress','button secondary','progress'),
  ]));

  const status=el('p',{class:'midi-lab-status',role:'status'},supported?'Connect a MIDI input to begin.':'Web MIDI is unavailable in this browser. Saved MIDI history remains readable; use a Chromium-based browser for live MIDI input.');
  const deviceSelect=el('select',{'aria-label':'MIDI input'},el('option',{value:''},'No MIDI inputs loaded'));
  const channelSelect=select('midiChannel','Channel filter',channels,'');
  const analysisVoice=select('midiVoice','Analysis lane',voiceOptions,'');
  const bpm=input('midiBpm','BPM',snapshot.settings.metronome.bpm,'number',{min:20,max:300,step:1,required:true});
  const subdivision=select('midiSubdivision','Subdivision',subdivisions,String(snapshot.settings.metronome.subdivision));
  const clickMode=select('midiClick','Click mode',clickModes,resolvedTiming(snapshot.settings.metronome).mode);
  const durationInput=input('midiDuration','Test seconds',30,'number',{min:5,max:180,step:5,required:true});
  const mappingHost=el('div',{class:'midi-mapping-list'});
  const mappingCount=el('span',{class:'muted small'});
  const live=el('div',{class:'midi-live',hidden:true},el('strong',{class:'midi-live-clock'},'0.0'),el('span',{class:'muted'},'seconds'),el('span',{class:'midi-live-events'},'0 MIDI notes'));
  const resultHost=el('div',{class:'midi-result-host'});

  const selectedDescriptor=()=>devices.find(row=>row.id===deviceSelect.value);
  const currentChannel=()=>{const value=channelSelect.querySelector('select')!.value;return value?Number(value):undefined;};
  const setChannel=(value:number|undefined)=>{channelSelect.querySelector('select')!.value=value===undefined?'':String(value);};

  const renderMappings=()=>{
    mappingHost.replaceChildren();
    mappingCount.textContent=`${mappings.filter(row=>row.enabled).length} enabled note mapping${mappings.filter(row=>row.enabled).length===1?'':'s'}`;
    for(const mapping of [...mappings].sort((a,b)=>a.note-b.note)){
      const enabled=el('input',{type:'checkbox','aria-label':`Enable MIDI note ${mapping.note}`,checked:mapping.enabled});
      const voice=el('select',{'aria-label':`Voice for MIDI note ${mapping.note}`},MIDI_VOICES.map(row=>el('option',{value:row.value,selected:row.value===mapping.voice},row.label)));
      const label=el('input',{type:'text','aria-label':`Label for MIDI note ${mapping.note}`,value:mapping.label,maxlength:80});
      enabled.addEventListener('change',()=>{mapping.enabled=enabled.checked;renderMappings();});
      voice.addEventListener('change',()=>{mapping.voice=voice.value as MidiDrumVoice;const definition=MIDI_VOICES.find(row=>row.value===mapping.voice);if(definition&&(!mapping.label||mapping.label===label.value))mapping.label=definition.label;renderMappings();});
      label.addEventListener('change',()=>{mapping.label=label.value.trim()||MIDI_VOICES.find(row=>row.value===mapping.voice)?.label||'Mapped note';});
      mappingHost.append(el('div',{class:'midi-mapping-row'},enabled,el('span',{class:'midi-note-number'},`Note ${mapping.note}`),voice,label,button('Remove',()=>{mappings=mappings.filter(row=>row.note!==mapping.note);renderMappings();},'ghost compact danger-text')));
    }
    if(!mappings.length)mappingHost.append(el('p',{class:'muted'},'No mapped notes. Reset General MIDI defaults or learn a note from the connected kit.'));
  };
  renderMappings();

  const loadDeviceProfile=(descriptor:MidiInputDescriptor)=>{
    selected=descriptor;activeProfileRow=midiProfileFor(profile.id,descriptor.deviceKey);
    mappings=activeProfileRow?.mappings.map(row=>({...row}))??defaultMidiMappings();
    setChannel(activeProfileRow?.channel);
    renderMappings();
    status.textContent=activeProfileRow?`Loaded saved mapping for ${descriptor.name}.`:`${descriptor.name} selected · General MIDI drum defaults loaded until you save or learn a custom mapping.`;
  };

  const renderDevices=(rows:MidiInputDescriptor[])=>{
    const previous=deviceSelect.value;devices=rows;
    deviceSelect.replaceChildren(el('option',{value:''},rows.length?'Choose MIDI input':'No MIDI inputs found'));
    for(const row of rows)deviceSelect.append(el('option',{value:row.id},row.manufacturer?`${row.name} · ${row.manufacturer}`:row.name));
    const preferred=rows.find(row=>row.id===previous)??rows.find(row=>midiProfileFor(profile.id,row.deviceKey))??rows[0];
    if(preferred){deviceSelect.value=preferred.id;loadDeviceProfile(preferred);}else{selected=undefined;status.textContent='No MIDI input is currently available.';}
  };

  const connectDevices=async()=>{
    status.textContent='Requesting MIDI access…';
    const rows=await midiInput.request();renderDevices(rows);
    removeStateListener();removeStateListener=midiInput.onStateChange(next=>renderDevices(next));
  };
  const connectButton=button(supported?'Connect / refresh MIDI':'Web MIDI unavailable',connectDevices,'primary','pulse');
  connectButton.disabled=!supported;
  deviceSelect.disabled=!supported;
  deviceSelect.addEventListener('change',()=>{const descriptor=selectedDescriptor();if(descriptor)loadDeviceProfile(descriptor);});

  const saveMapping=async(notifyUser=true,notifyStore=true)=>{
    const descriptor=selectedDescriptor();if(!descriptor)throw new Error('Choose a connected MIDI input first.');
    if(!mappings.some(row=>row.enabled))throw new Error('Enable at least one MIDI note mapping before saving.');
    activeProfileRow=await saveMidiDeviceProfile({
      profileId:profile.id,deviceKey:descriptor.deviceKey,inputId:descriptor.id,manufacturer:descriptor.manufacturer,name:descriptor.name,channel:currentChannel(),mappings,
    },notifyStore);
    if(notifyUser)notify('MIDI drum mapping saved.');
    return activeProfileRow;
  };

  const learnVoice=select('learnVoice','Learn as',MIDI_VOICES.map(row=>[row.value,row.label] as [string,string]),'snare');
  let learnButton!:HTMLButtonElement;
  const stopLearning=()=>{if(!learning)return;learning=false;midiInput.stopListening();learnButton.querySelector('span')!.textContent='Learn next note';};
  const learnNote=async()=>{
    if(learning){stopLearning();status.textContent='MIDI learn canceled.';return;}
    const descriptor=selectedDescriptor();if(!descriptor)throw new Error('Choose a MIDI input before learning a note.');
    const context=await audio.prepareContext(),voice=learnVoice.querySelector('select')!.value as MidiDrumVoice;
    learning=true;learnButton.querySelector('span')!.textContent='Cancel MIDI learn';status.textContent=`Strike the pad you want to map as ${MIDI_VOICES.find(row=>row.value===voice)?.label??voice}.`;
    let captured=false;
    await midiInput.listen(descriptor.id,context,event=>{
      if(captured||!learning)return;captured=true;
      const definition=MIDI_VOICES.find(row=>row.value===voice)!,existing=mappings.find(row=>row.note===event.note);
      if(existing){existing.voice=voice;existing.label=definition.label;existing.enabled=true;}
      else mappings.push({note:event.note,voice,label:definition.label,enabled:true});
      stopLearning();renderMappings();status.textContent=`Learned MIDI note ${event.note} as ${definition.label}. Save mapping to keep it.`;
    });
  };
  learnButton=button('Learn next note',learnNote,'secondary');
  learnButton.disabled=!supported;

  const resetMapping=()=>{mappings=defaultMidiMappings();renderMappings();status.textContent='General MIDI drum defaults restored locally. Save mapping to keep them for this device.';};

  const readConfig=():MetronomeConfig=>{
    const bpmInput=bpm.querySelector('input')!,duration=durationInput.querySelector('input')!;
    if(!bpmInput.reportValidity()||!duration.reportValidity())throw new Error('Correct the MIDI test settings before starting.');
    return {...structuredClone(store.snapshot().settings.metronome),bpm:Number(bpmInput.value),subdivision:Number(subdivision.querySelector('select')!.value) as Subdivision,countIn:1,timing:{...resolvedTiming(store.snapshot().settings.metronome),mode:clickMode.querySelector('select')!.value as ClickMode}};
  };

  let startButton!:HTMLButtonElement;
  const setupControls=[deviceSelect,channelSelect.querySelector('select')!,analysisVoice.querySelector('select')!,bpm.querySelector('input')!,subdivision.querySelector('select')!,clickMode.querySelector('select')!,durationInput.querySelector('input')!,connectButton,learnButton];
  const setSetupDisabled=(disabled:boolean)=>{for(const control of setupControls)control.disabled=disabled||(!supported&&(control===connectButton||control===learnButton||control===deviceSelect));};
  const stopTimers=()=>{clearTimeout(finishTimer);clearInterval(tickTimer);finishTimer=undefined;tickTimer=undefined;};
  const resetTransport=()=>{active=false;stopTimers();audio.stop();midiInput.stopListening();setSetupDisabled(false);startButton.querySelector('span')!.textContent='Start MIDI test';startButton.setAttribute('aria-pressed','false');live.hidden=true;runningConfig=undefined;runningDuration=0;runningVoice=undefined;};

  const finish=async(save=true)=>{
    if(!active)return;
    const config=runningConfig,duration=runningDuration,voice=runningVoice,device=selected,overflow=eventOverflow,captured=[...events],profileRow=activeProfileRow;
    resetTransport();
    if(!save){status.textContent='MIDI test canceled. No result was saved.';return;}
    if(!config||!device||!profileRow||!startAudioTime){status.textContent='MIDI test could not be finalized. Retry the test.';return;}
    if(overflow){status.textContent='Too many MIDI events were received to save a trustworthy result. Check for trigger chatter or duplicate MIDI messages.';notify(status.textContent,'error');return;}
    const analysis=analyzeMidiPerformance(config,startAudioTime,duration,captured,profileRow,timingMatchWindowMs(config),voice);
    const activeSession=store.snapshot().sessions.find(row=>row.status==='active'&&row.profileId===profile.id),block=activeSession?.blocks[activeSession.activeBlockIndex];
    const saved=await saveMidiPerformanceResult({profileId:profile.id,config,durationSeconds:duration,device:profileRow,analysis,analyzedVoice:voice,sessionId:activeSession?.id,blockId:block?.id,sourceExerciseId:block?.sourceExerciseId});
    status.textContent=`Saved MIDI result · ${saved.matchedCount}/${saved.expectedCount} expected positions matched.`;
  };

  const startTest=async()=>{
    if(active){await finish(false);return;}
    if(learning)stopLearning();
    if(!supported)throw new Error('Web MIDI is unavailable in this browser.');
    const descriptor=selectedDescriptor();if(!descriptor)throw new Error('Connect and choose a MIDI input first.');
    const config=readConfig(),duration=Number(durationInput.querySelector('input')!.value),voiceValue=analysisVoice.querySelector('select')!.value as MidiDrumVoice|'';
    const profileRow=await saveMapping(false,false);
    if(voiceValue&&!profileRow.mappings.some(row=>row.enabled&&row.voice===voiceValue))throw new Error(`No enabled MIDI note is mapped to ${MIDI_VOICES.find(row=>row.value===voiceValue)?.label??voiceValue}.`);
    const context=await audio.prepareContext();events=[];eventOverflow=false;startAudioTime=0;runningConfig=structuredClone(config);runningDuration=duration;runningVoice=voiceValue||undefined;
    activeProfileRow=profileRow;selected=descriptor;
    await midiInput.listen(descriptor.id,context,event=>{
      if(events.length<20000)events.push(event);else eventOverflow=true;
      const label=live.querySelector('.midi-live-events');if(label)label.textContent=`${events.length} MIDI note${events.length===1?'':'s'}${eventOverflow?' · capped':''}`;
    });
    active=true;setSetupDisabled(true);startButton.querySelector('span')!.textContent='Cancel MIDI test';startButton.setAttribute('aria-pressed','true');live.hidden=false;
    status.textContent='Count-in · measurement starts on the first practice beat.';
    try{
      await audio.start(config,{
        onReady:(_wallTime,audioTime)=>{
          if(disposed||!active)return;
          startAudioTime=audioTime;status.textContent=`Measuring · ${config.bpm} BPM · ${config.subdivision}× subdivision · ${timingClickLabel(config)}`;
          const started=performance.now();tickTimer=setInterval(()=>{const clock=live.querySelector('.midi-live-clock');if(clock)clock.textContent=Math.min(duration,(performance.now()-started)/1000).toFixed(1);},100);
          finishTimer=setTimeout(()=>{void finish(true).catch(error=>notify(error instanceof Error?error.message:'MIDI result could not be saved.','error'));},duration*1000+80);
        },
        onInterrupted:()=>{if(!active)return;resetTransport();status.textContent='Audio was interrupted. The MIDI test was canceled.';},
      });
    }catch(error){resetTransport();throw error;}
  };
  startButton=button(supported?'Start MIDI test':'MIDI unavailable',startTest,'primary','pulse');
  startButton.disabled=!supported;startButton.setAttribute('aria-pressed','false');

  const devicePanel=el('section',{class:'panel midi-device-panel'},sectionHeader('MIDI device','Web MIDI permission and per-device drum mapping.'),
    el('div',{class:'form-grid midi-device-grid'},field('MIDI input',deviceSelect),channelSelect),
    el('div',{class:'actions wrap'},connectButton,button('Save mapping',()=>saveMapping(true,true),'secondary'),button('Reset GM defaults',resetMapping,'ghost')),
    status);

  const mappingPanel=el('details',{class:'panel midi-mapping-panel'},el('summary',{},el('span',{},'Drum note mapping'),mappingCount),
    el('div',{class:'midi-mapping-body'},el('div',{class:'midi-learn-row'},learnVoice,learnButton),mappingHost,
      el('p',{class:'field-hint'},'General MIDI defaults cover common e-kit notes. Device/browser IDs can change; Steadybar primarily matches saved mappings by manufacturer + device name. Voice mapping does not infer left/right hand or foot.')));

  const testPanel=el('section',{class:'panel midi-test-panel'},sectionHeader('Performance test','One bar count-in; choose one voice lane for grooves with simultaneous notes.'),
    el('div',{class:'form-grid midi-test-grid'},bpm,subdivision,clickMode,durationInput,analysisVoice),
    el('div',{class:'actions wrap'},startButton),live,
    el('p',{class:'field-hint'},'All mapped notes works best for single-stroke/pad patterns. For grooves or coordination, select Snare, Kick, Hi-hat or another lane so simultaneous drum voices are not misclassified as extra hits.'));

  const limitations=el('section',{class:'panel'},sectionHeader('What MIDI evidence means','High timestamp precision does not make every metric universal.'),
    el('ul',{class:'plain-list'},el('li',{},'MIDI timing uses browser-reported high-resolution receive timestamps normalized to the metronome AudioContext clock.'),el('li',{},'Velocity is the device’s 1–127 MIDI value. It is useful for consistency and within-device comparison, not as an acoustic dB measurement.'),el('li',{},'Note mapping identifies drum voices only. Steadybar does not infer limb identity from a snare/hat/tom note.'),el('li',{},'Without an authored note-by-note drum score, Steadybar measures pulse timing on all notes or a selected voice lane; it does not claim full groove-note accuracy.')),
    !supported?el('p',{class:'field-hint'},'Web MIDI is primarily available in Chromium-based browsers. Firefox/WebKit can still open saved MIDI history and the rest of Steadybar normally.'):null);

  page.append(el('div',{class:'two-column wide-left'},devicePanel,testPanel),mappingPanel,limitations,resultHost);

  const renderHistory=()=>{
    const rows=(store.snapshot().midiResults??[]).filter(row=>row.profileId===profile.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    resultHost.replaceChildren();
    if(rows[0])resultHost.append(resultCard(rows[0]));
    const history=el('section',{class:'midi-history'},sectionHeader('MIDI performance history',rows.length?`${rows.length} saved result${rows.length===1?'':'s'}`:'No saved MIDI tests yet'));
    if(!rows.length)history.append(empty('No MIDI evidence yet.',supported?'Connect an electronic drum kit or MIDI pad and run a test.':'Open Steadybar in a Web MIDI-capable browser to capture new MIDI evidence.',undefined,'progress'));
    else for(const row of rows.slice(0,40)){
      const voice=row.analyzedVoice?MIDI_VOICES.find(item=>item.value===row.analyzedVoice)?.label??titleCase(row.analyzedVoice):'All mapped notes';
      history.append(el('article',{class:'midi-history-row'},el('div',{},el('strong',{},`${row.deviceNameSnapshot} · ${voice}`),el('span',{class:'muted small'},`${formatDate(row.createdAt,true)} · ${row.bpm} BPM · ${titleCase(row.confidence)} confidence`)),
        el('div',{class:'tag-row'},row.matchedCount?badge(`error ${row.meanAbsoluteErrorMs.toFixed(1)} ms`):badge('no matches'),row.matchedCount?badge(`velocity ${row.velocityMedian.toFixed(1)}`):null,badge(`${row.matchedCount}/${row.expectedCount} matched`)),
        button('Delete',async()=>{if(await confirmAction('Delete this MIDI result?','The saved MIDI timing/velocity diagnostics will be permanently removed. Device mapping is unchanged.','Delete result',true))await deleteMidiPerformanceResult(row.id);},'ghost compact danger-text')));
    }
    resultHost.append(history);
  };
  renderHistory();

  return {
    node:page,
    beforeLeave:async()=>!(active||learning)||await confirmAction('Leave MIDI Drum Lab?','The active MIDI test or MIDI-learn capture will be canceled. Unsaved mapping edits will not be saved automatically.','Leave MIDI Drum Lab',true),
    isDirty:()=>active||learning,
    cleanup:()=>{disposed=true;resetTransport();stopLearning();removeStateListener();void midiInput.close();},
  };
}
