import { audio } from '../audio/engine.js';
import { resolvedTiming, timingClickLabel } from '../audio/scheduler.js';
import { deleteMidiPerformanceResult, midiProfileFor, saveMidiDeviceProfile, saveMidiPerformanceResult } from '../app/midi-lab.js';
import { resolveMidiEvidenceSource } from '../domain/midi-evidence.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { analyzeMidiGridPerformance, analyzeMidiPerformance, analyzeMidiPhrasePerformance, defaultMidiMappings, drumPhraseCycleSeconds, MIDI_VOICES } from '../domain/midi-analysis.js';
import { drumGridText } from '../domain/drum-grid.js';
import { phraseBarText } from '../domain/drum-phrase.js';
import type { ClickMode, MetronomeConfig, MidiDeviceProfile, MidiDrumMapping, MidiDrumVoice, MidiExpectedPattern, MidiGridLaneAssignment, MidiPerformanceResult, Subdivision } from '../domain/models.js';
import type { DrumGridVoice, PracticeProtocol } from '../domain/practice-types.js';
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
const patternOptions:[MidiExpectedPattern,string][]=[['subdivision','Every subdivision'],['beat','Beat only'],['two-four','2 & 4 backbeat'],['drum-grid','Authored Drum Grid'],['drum-phrase','Authored Drum Phrase']];
type GridProtocol=Extract<PracticeProtocol,{kind:'drum-grid'}>;
type PhraseProtocol=Extract<PracticeProtocol,{kind:'drum-phrase'}>;
const gridLaneLabels:[DrumGridVoice,string][]=[['right-hand','Right-hand lane'],['left-hand','Left-hand lane'],['kick','Kick lane'],['hihat-foot','Hi-hat-foot lane']];
const defaultGridVoice:Record<DrumGridVoice,MidiDrumVoice>={'right-hand':'hihat-closed','left-hand':'snare',kick:'kick','hihat-foot':'hihat-pedal'};
const signed=(value:number)=>`${value>0?'+':''}${value.toFixed(1)} ms`;
const confidenceLabel=(value:MidiPerformanceResult['confidence'])=>value==='high'?'High measurement confidence':value==='medium'?'Medium measurement confidence':'Low measurement confidence';

function resultCard(result:MidiPerformanceResult):HTMLElement{
  const matchRate=result.expectedCount?Math.round(result.matchedCount/result.expectedCount*100):0;
  const title=result.expectedPattern==='drum-phrase'?(result.phraseNameSnapshot??'Drum Phrase'):result.expectedPattern==='drum-grid'?(result.gridNameSnapshot??'Drum Grid'):result.analyzedVoice?MIDI_VOICES.find(row=>row.value===result.analyzedVoice)?.label??titleCase(result.analyzedVoice):'All mapped notes',pattern=patternOptions.find(row=>row[0]===result.expectedPattern)?.[1]??titleCase(result.expectedPattern);
  const card=el('article',{class:'panel midi-result-card'},
    sectionHeader('Latest MIDI result',`${result.deviceNameSnapshot} · ${result.bpm} BPM · ${title} · ${pattern}`),
    el('div',{class:'tag-row'},badge(confidenceLabel(result.confidence),result.confidence==='high'?'accent':'neutral'),badge(`${matchRate}% matched`),badge(`${result.misses} missed`),badge(`${result.extras} extra`),result.wrongVoiceCount?badge(`${result.wrongVoiceCount} wrong sound`):null,result.unmappedCount?badge(`${result.unmappedCount} unmapped`):null),
    el('div',{class:'stats-strip midi-stats'},
      stat('Average bias',result.matchedCount?signed(result.meanOffsetMs):'—',result.matchedCount?'Negative = early · positive = late':'Not enough matched events'),
      stat('Typical error',result.matchedCount?`${result.meanAbsoluteErrorMs.toFixed(1)} ms`:'—','Mean absolute timing distance'),
      stat('Timing spread',result.matchedCount>1?`${result.spreadMs.toFixed(1)} ms`:'—','Matched timing consistency'),
      stat('Velocity median',result.matchedCount?`${result.velocityMedian.toFixed(1)}`:'—','MIDI velocity 1–127'),
      stat('Velocity spread',result.matchedCount>1?`${result.velocitySpread.toFixed(1)}`:'—','Device-relative consistency'),
      stat('Velocity range',result.matchedCount?`${result.velocityMin}–${result.velocityMax}`:'—',result.matchedCount?`range ${result.velocityRange}`:'No matched velocities')),
    el('p',{class:'field-hint'},`Matched ${result.matchedCount} of ${result.expectedCount} expected positions inside ±${result.matchWindowMs} ms. MIDI velocity is device-specific and is not identical to acoustic loudness or force.`));
  if(result.expectedPattern==='drum-grid'&&result.gridLaneSummaries?.length){
    const laneSummary=el('div',{class:'midi-grid-lane-summary'},el('div',{class:'midi-grid-lane-head'},el('strong',{},'Grid lane'),el('strong',{},'Assigned sound'),el('strong',{},'Matched'),el('strong',{},'Missed')));
    for(const row of result.gridLaneSummaries){
      const lane=gridLaneLabels.find(item=>item[0]===row.gridVoice)?.[1]??titleCase(row.gridVoice),sound=MIDI_VOICES.find(item=>item.value===row.midiVoice)?.label??titleCase(row.midiVoice);
      laneSummary.append(el('div',{class:'midi-grid-lane-row'},el('span',{},lane),el('span',{},sound),el('span',{},`${row.matchedCount}/${row.expectedCount}`),el('span',{},row.misses)));
    }
    card.append(laneSummary);
    if(result.accentVelocityDifference!==undefined){
      const voices=[...new Set(result.hits.filter(hit=>hit.expectedAccent).map(hit=>hit.voice))],sound=voices.length===1?MIDI_VOICES.find(row=>row.value===voices[0])?.label:'Comparable mapped sound';
      card.append(el('p',{class:'field-hint'},`${sound??'Comparable mapped sound'} accent contrast · accent mean ${result.accentVelocityMean?.toFixed(1)} vs normal ${result.normalVelocityMean?.toFixed(1)} · Δ ${result.accentVelocityDifference>0?'+':''}${result.accentVelocityDifference.toFixed(1)} MIDI velocity on the same mapped sound. This is not acoustic loudness.`));
    }
  }
  if(result.expectedPattern==='drum-phrase'&&result.phraseBarSummaries?.length&&result.phraseLaneSummaries?.length){
    const landingExpected=result.landingExpectedCount??0,landingMatched=result.landingMatchedCount??0,landingMisses=result.landingMisses??Math.max(0,landingExpected-landingMatched);
    card.append(el('section',{class:'midi-landing-summary'},
      el('div',{},el('span',{class:'label'},'Return-bar beat 1'),el('strong',{},landingExpected?`${landingMatched} / ${landingExpected} landed`:'No landing targets')),
      el('div',{},el('span',{class:'label'},'Landing misses'),el('strong',{},landingMisses)),
      el('div',{},el('span',{class:'label'},'Landing bias'),el('strong',{},landingMatched?signed(result.landingMeanOffsetMs??0):'—')),
      el('div',{},el('span',{class:'label'},'Landing distance'),el('strong',{},landingMatched?`${(result.landingMeanAbsoluteErrorMs??0).toFixed(1)} ms`:'—')),
      el('p',{class:'field-hint'},'Landing evidence uses only authored hits on the first subdivision of beat 1 in each return bar. Negative bias = early; positive bias = late. It is MIDI timing/sound evidence, not a judgment of musical taste.')));
    const bars=el('div',{class:'midi-phrase-bar-summary'},el('div',{class:'midi-phrase-bar-head'},el('strong',{},'Bar'),el('strong',{},'Role'),el('strong',{},'Matched'),el('strong',{},'Missed'),el('strong',{},'Timing error')));
    for(const row of result.phraseBarSummaries)bars.append(el('div',{class:`midi-phrase-bar-row role-${row.role}`},el('span',{},String(row.barIndex+1)),el('span',{},`${row.role} · ${row.label}`),el('span',{},`${row.matchedCount}/${row.expectedCount}`),el('span',{},row.misses),el('span',{},row.matchedCount?`${row.meanAbsoluteErrorMs.toFixed(1)} ms`:'—')));
    card.append(bars);
    const laneSummary=el('div',{class:'midi-grid-lane-summary'},el('div',{class:'midi-grid-lane-head'},el('strong',{},'Phrase lane'),el('strong',{},'Assigned sound'),el('strong',{},'Matched'),el('strong',{},'Missed')));
    for(const row of result.phraseLaneSummaries){
      const lane=gridLaneLabels.find(item=>item[0]===row.gridVoice)?.[1]??titleCase(row.gridVoice),sound=MIDI_VOICES.find(item=>item.value===row.midiVoice)?.label??titleCase(row.midiVoice);
      laneSummary.append(el('div',{class:'midi-grid-lane-row'},el('span',{},lane),el('span',{},sound),el('span',{},`${row.matchedCount}/${row.expectedCount}`),el('span',{},row.misses)));
    }
    card.append(laneSummary);
    if(result.accentVelocityDifference!==undefined){
      const voices=[...new Set(result.hits.filter(hit=>hit.expectedAccent).map(hit=>hit.voice))],sound=voices.length===1?MIDI_VOICES.find(row=>row.value===voices[0])?.label:'Comparable mapped sound';
      card.append(el('p',{class:'field-hint'},`${sound??'Comparable mapped sound'} accent contrast · accent mean ${result.accentVelocityMean?.toFixed(1)} vs normal ${result.normalVelocityMean?.toFixed(1)} · Δ ${result.accentVelocityDifference>0?'+':''}${result.accentVelocityDifference.toFixed(1)} MIDI velocity on the same mapped sound. This is not acoustic loudness.`));
    }
  }
  const sourceActions=el('div',{class:'actions wrap midi-result-source-actions'});
  if(result.sourceExerciseId&&store.snapshot().exercises.some(exercise=>exercise.id===result.sourceExerciseId))sourceActions.append(link('Open source exercise',`/library/${result.sourceExerciseId}`,'button ghost','library'));
  if(result.sessionId&&store.snapshot().sessions.some(session=>session.id===result.sessionId))sourceActions.append(link('Open practice session',`/history/${result.sessionId}`,'button ghost','history'));
  if(sourceActions.childElementCount)card.append(sourceActions);
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
  let active=false,learning=false,disposed=false,startAudioTime=0,runningDuration=0,runningConfig:MetronomeConfig|undefined,runningVoice:MidiDrumVoice|undefined,runningPattern:MidiExpectedPattern='subdivision',runningGrid:GridProtocol|undefined,runningGridAssignments:MidiGridLaneAssignment[]|undefined,runningGridExerciseId:string|undefined,runningPhrase:PhraseProtocol|undefined,runningPhraseAssignments:MidiGridLaneAssignment[]|undefined,runningPhraseExerciseId:string|undefined;
  let events:MidiNoteEvent[]=[],eventOverflow=false,finishTimer:ReturnType<typeof setTimeout>|undefined,tickTimer:ReturnType<typeof setInterval>|undefined;
  let removeStateListener:()=>void=()=>{};

  const page=el('div',{class:'page midi-lab-page'},pageHeader('Electronic drum diagnostics','MIDI Drum Lab',`${profile.name} · High-resolution timing, mapped-sound accuracy and device-relative velocity evidence.`,[
    link('Phrase Lab','/phrases','button secondary','routine'),link('Drum Grid Lab','/drum-grid','button secondary','routine'),link('Timing Lab','/timing-lab','button secondary','pulse'),link('Progress','/progress','button secondary','progress'),
  ]));

  const status=el('p',{class:'midi-lab-status',role:'status'},supported?'Connect a MIDI input to begin.':'Web MIDI is unavailable in this browser. Saved MIDI history remains readable; use a Chromium-based browser for live MIDI input.');
  const deviceSelect=el('select',{'aria-label':'MIDI input'},el('option',{value:''},'No MIDI inputs loaded'));
  const channelSelect=select('midiChannel','Channel filter',channels,'');
  const analysisVoice=select('midiVoice','Analysis lane',voiceOptions,'');
  const expectedPattern=select('midiPattern','Expected hits',patternOptions,'subdivision');
  const bpm=input('midiBpm','BPM',snapshot.settings.metronome.bpm,'number',{min:20,max:300,step:1,required:true});
  const subdivision=select('midiSubdivision','Subdivision',subdivisions,String(snapshot.settings.metronome.subdivision));
  const clickMode=select('midiClick','Click mode',clickModes,resolvedTiming(snapshot.settings.metronome).mode);
  const durationInput=input('midiDuration','Test seconds',30,'number',{min:5,max:300,step:5,required:true});
  const activeSessionSnapshot=snapshot.sessions.find(session=>session.status==='active'&&session.profileId===profile.id),activeProtocol=activeSessionSnapshot?.blocks[activeSessionSnapshot.activeBlockIndex]?.protocolSnapshot;
  const gridExercises=snapshot.exercises.filter(exercise=>exercise.profileId===profile.id&&!exercise.archived&&exercise.protocol?.kind==='drum-grid');
  const gridOptions:[string,string][]=[...(activeProtocol?.kind==='drum-grid'?[['active','Current practice grid'] as [string,string]]:[]),...gridExercises.map(exercise=>[exercise.id,exercise.name] as [string,string])];
  if(!gridOptions.length)gridOptions.push(['','No Drum Grid exercises available']);
  const gridSource=select('midiGridSource','Drum Grid score',gridOptions,gridOptions[0]![0]);
  const gridAssignmentFields=new Map<DrumGridVoice,HTMLElement>(gridLaneLabels.map(([voice,label])=>[voice,select('midiGrid-'+voice,label+' sound',MIDI_VOICES.map(row=>[row.value,row.label] as [string,string]),defaultGridVoice[voice])] as [DrumGridVoice,HTMLElement]));
  const gridPreview=el('pre',{class:'midi-grid-preview'});
  const selectedGrid=():GridProtocol|undefined=>{
    const value=gridSource.querySelector('select')!.value;
    if(value==='active'){
      const session=store.snapshot().sessions.find(row=>row.status==='active'&&row.profileId===profile.id),block=session?.blocks[session.activeBlockIndex],protocol=block?.protocolSnapshot;
      return protocol?.kind==='drum-grid'?{...structuredClone(protocol),pulse:{...protocol.pulse,bpm:session!.runtime.bpm}}:undefined;
    }
    const exercise=store.snapshot().exercises.find(row=>row.id===value&&row.profileId===profile.id);
    return exercise?.protocol?.kind==='drum-grid'?structuredClone(exercise.protocol):undefined;
  };
  const readGridAssignments=():MidiGridLaneAssignment[]=>{const grid=selectedGrid(),activeVoices=new Set(grid?.lanes.filter(lane=>/[xX]/.test(lane.steps)).map(lane=>lane.voice)??[]);return gridLaneLabels.filter(([gridVoice])=>activeVoices.has(gridVoice)).map(([gridVoice])=>({gridVoice,midiVoice:gridAssignmentFields.get(gridVoice)!.querySelector('select')!.value as MidiDrumVoice}));};
  const gridScorePanel=el('section',{class:'midi-grid-score',hidden:true},sectionHeader('Authored Drum Grid','Assign each grid lane to the MIDI sound you will play. MIDI verifies mapped sounds, not physical hand identity.'),gridSource,gridPreview,el('div',{class:'form-grid midi-grid-assignment-grid'},...gridLaneLabels.map(([voice])=>gridAssignmentFields.get(voice)!)));

  const phraseExercises=snapshot.exercises.filter(exercise=>exercise.profileId===profile.id&&!exercise.archived&&exercise.protocol?.kind==='drum-phrase');
  const phraseOptions:[string,string][]=[...(activeProtocol?.kind==='drum-phrase'?[['active','Current practice phrase'] as [string,string]]:[]),...phraseExercises.map(exercise=>[exercise.id,exercise.name] as [string,string])];
  if(!phraseOptions.length)phraseOptions.push(['','No Drum Phrase exercises available']);
  const phraseSource=select('midiPhraseSource','Drum Phrase score',phraseOptions,phraseOptions[0]![0]);
  const phraseAssignmentFields=new Map<DrumGridVoice,HTMLElement>(gridLaneLabels.map(([voice,label])=>[voice,select('midiPhrase-'+voice,label+' sound',MIDI_VOICES.map(row=>[row.value,row.label] as [string,string]),defaultGridVoice[voice])] as [DrumGridVoice,HTMLElement]));
  const phrasePreview=el('pre',{class:'midi-grid-preview midi-phrase-preview'});
  const selectedPhrase=():PhraseProtocol|undefined=>{
    const value=phraseSource.querySelector('select')!.value;
    if(value==='active'){
      const session=store.snapshot().sessions.find(row=>row.status==='active'&&row.profileId===profile.id),block=session?.blocks[session.activeBlockIndex],protocol=block?.protocolSnapshot;
      return protocol?.kind==='drum-phrase'?{...structuredClone(protocol),pulse:{...protocol.pulse,bpm:session!.runtime.bpm}}:undefined;
    }
    const exercise=store.snapshot().exercises.find(row=>row.id===value&&row.profileId===profile.id);
    return exercise?.protocol?.kind==='drum-phrase'?structuredClone(exercise.protocol):undefined;
  };
  const readPhraseAssignments=():MidiGridLaneAssignment[]=>{const phrase=selectedPhrase(),activeVoices=new Set(phrase?.bars.flatMap(bar=>bar.lanes.filter(lane=>/[xX]/.test(lane.steps)).map(lane=>lane.voice))??[]);return gridLaneLabels.filter(([gridVoice])=>activeVoices.has(gridVoice)).map(([gridVoice])=>({gridVoice,midiVoice:phraseAssignmentFields.get(gridVoice)!.querySelector('select')!.value as MidiDrumVoice}));};
  const phraseScorePanel=el('section',{class:'midi-grid-score midi-phrase-score',hidden:true},sectionHeader('Authored Drum Phrase','Score the full groove → fill → return phrase. Lane labels are authored roles mapped to MIDI sounds; they are not hand detection.'),phraseSource,phrasePreview,el('div',{class:'form-grid midi-grid-assignment-grid'},...gridLaneLabels.map(([voice])=>phraseAssignmentFields.get(voice)!)));
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
    removeStateListener();removeStateListener=midiInput.onStateChange(next=>{
      if(active){
        const current=selected;
        if(current&&!next.some(row=>row.id===current.id)){
          resetTransport();status.textContent='The active MIDI input disconnected. The test was canceled and no result was saved.';notify(status.textContent,'error');
        }
        return;
      }
      if(!learning)renderDevices(next);
    });
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

  const syncPatternMode=()=>{
    const mode=expectedPattern.querySelector('select')!.value as MidiExpectedPattern,gridMode=mode==='drum-grid',phraseMode=mode==='drum-phrase',authored=gridMode||phraseMode;
    const grid=gridMode?selectedGrid():undefined,phrase=phraseMode?selectedPhrase():undefined,duration=durationInput.querySelector<HTMLInputElement>('input')!;
    gridScorePanel.hidden=!gridMode;phraseScorePanel.hidden=!phraseMode;analysisVoice.hidden=authored;subdivision.hidden=authored;
    gridPreview.textContent=grid?`${grid.name}\n${drumGridText(grid)}`:'No authored grid is available.';
    const gridVoices=new Set(grid?.lanes.filter(lane=>/[xX]/.test(lane.steps)).map(lane=>lane.voice)??[]);
    for(const [voice,field] of gridAssignmentFields)field.hidden=!gridMode||!gridVoices.has(voice);
    const phraseVoices=new Set(phrase?.bars.flatMap(bar=>bar.lanes.filter(lane=>/[xX]/.test(lane.steps)).map(lane=>lane.voice))??[]);
    for(const [voice,field] of phraseAssignmentFields)field.hidden=!phraseMode||!phraseVoices.has(voice);
    phrasePreview.textContent=phrase?[
      phrase.name,
      phrase.bars.map((bar,index)=>`${index+1}. ${bar.role.toUpperCase()} · ${bar.label}`).join('\n'),
      '',
      'FILL',
      phraseBarText(phrase.bars.at(-2)!),
      '',
      'RETURN',
      phraseBarText(phrase.bars.at(-1)!),
    ].join('\n'):'No authored phrase is available.';
    if(gridMode&&grid){
      bpm.querySelector<HTMLInputElement>('input')!.value=String(grid.pulse.bpm);
      subdivision.querySelector<HTMLSelectElement>('select')!.value=String(grid.pulse.subdivision);
      duration.min='5';duration.step='5';
      const value=Number(duration.value);if(Number.isFinite(value)&&((value-5)%5!==0))duration.value=String(Math.max(5,Math.round(value/5)*5));
    }else if(phraseMode&&phrase){
      bpm.querySelector<HTMLInputElement>('input')!.value=String(phrase.pulse.bpm);
      subdivision.querySelector<HTMLSelectElement>('select')!.value=String(phrase.pulse.subdivision);
      const minimum=Math.ceil(drumPhraseCycleSeconds(phrase,Number(bpm.querySelector<HTMLInputElement>('input')!.value)));duration.min=String(minimum);duration.step='1';
      if(Number(duration.value)<minimum)duration.value=String(minimum);
    }else{
      duration.min='5';duration.step='5';
      const value=Number(duration.value);if(Number.isFinite(value)&&((value-5)%5!==0))duration.value=String(Math.max(5,Math.round(value/5)*5));
    }
  };
  expectedPattern.addEventListener('change',syncPatternMode);gridSource.addEventListener('change',syncPatternMode);phraseSource.addEventListener('change',syncPatternMode);
  bpm.addEventListener('change',()=>{
    if(expectedPattern.querySelector('select')!.value!=='drum-phrase')return;
    const phrase=selectedPhrase(),bpmValue=Number(bpm.querySelector<HTMLInputElement>('input')!.value),duration=durationInput.querySelector<HTMLInputElement>('input')!;
    if(!phrase||!Number.isFinite(bpmValue))return;
    const minimum=Math.ceil(drumPhraseCycleSeconds(phrase,bpmValue));duration.min=String(minimum);duration.step='1';if(Number(duration.value)<minimum)duration.value=String(minimum);
  });
  syncPatternMode();

  const readConfig=():MetronomeConfig=>{
    const bpmInput=bpm.querySelector<HTMLInputElement>('input')!,duration=durationInput.querySelector<HTMLInputElement>('input')!,mode=expectedPattern.querySelector('select')!.value as MidiExpectedPattern;
    const grid=mode==='drum-grid'?selectedGrid():undefined,phrase=mode==='drum-phrase'?selectedPhrase():undefined,score=grid??phrase;
    if(!bpmInput.reportValidity()||!duration.reportValidity())throw new Error('Correct the MIDI test settings before starting.');
    if(mode==='drum-grid'&&!grid)throw new Error('Choose an available Drum Grid score before starting.');
    if(mode==='drum-phrase'&&!phrase)throw new Error('Choose an available Drum Phrase score before starting.');
    if(phrase&&Number(duration.value)+1e-6<drumPhraseCycleSeconds(phrase,Number(bpmInput.value)))throw new Error(`Test at least one complete phrase cycle (${Math.ceil(drumPhraseCycleSeconds(phrase,Number(bpmInput.value)))} seconds at this tempo).`);
    return {...structuredClone(store.snapshot().settings.metronome),bpm:Number(bpmInput.value),meter:score?{beats:score.pulse.beats,beatUnit:score.pulse.beatUnit}:structuredClone(store.snapshot().settings.metronome.meter),subdivision:score?score.pulse.subdivision:Number(subdivision.querySelector('select')!.value) as Subdivision,countIn:1,timing:{...resolvedTiming(store.snapshot().settings.metronome),mode:clickMode.querySelector('select')!.value as ClickMode}};
  };

  let startButton!:HTMLButtonElement;
  const setupControls:(HTMLInputElement|HTMLSelectElement|HTMLButtonElement)[]=[deviceSelect,channelSelect.querySelector('select')!,analysisVoice.querySelector('select')!,expectedPattern.querySelector('select')!,bpm.querySelector('input')!,subdivision.querySelector('select')!,clickMode.querySelector('select')!,durationInput.querySelector('input')!,gridSource.querySelector('select')!,phraseSource.querySelector('select')!,...[...gridAssignmentFields.values()].map(field=>field.querySelector('select')!),...[...phraseAssignmentFields.values()].map(field=>field.querySelector('select')!),connectButton,learnButton];
  const setSetupDisabled=(disabled:boolean)=>{for(const control of setupControls)control.disabled=disabled||(!supported&&(control===connectButton||control===learnButton||control===deviceSelect));};
  const stopTimers=()=>{clearTimeout(finishTimer);clearInterval(tickTimer);finishTimer=undefined;tickTimer=undefined;};
  const resetTransport=()=>{active=false;stopTimers();audio.stop();midiInput.stopListening();setSetupDisabled(false);startButton.querySelector('span')!.textContent='Start MIDI test';startButton.setAttribute('aria-pressed','false');live.hidden=true;runningConfig=undefined;runningDuration=0;runningVoice=undefined;runningPattern='subdivision';runningGrid=undefined;runningGridAssignments=undefined;runningGridExerciseId=undefined;runningPhrase=undefined;runningPhraseAssignments=undefined;runningPhraseExerciseId=undefined;syncPatternMode();};

  const finish=async(save=true)=>{
    if(!active)return;
    const config=runningConfig,duration=runningDuration,voice=runningVoice,pattern=runningPattern,grid=runningGrid,gridAssignments=runningGridAssignments,gridExerciseId=runningGridExerciseId,phrase=runningPhrase,phraseAssignments=runningPhraseAssignments,phraseExerciseId=runningPhraseExerciseId,device=selected,overflow=eventOverflow,captured=[...events],profileRow=activeProfileRow;
    resetTransport();
    if(!save){status.textContent='MIDI test canceled. No result was saved.';return;}
    if(!config||!device||!profileRow||!startAudioTime){status.textContent='MIDI test could not be finalized. Retry the test.';return;}
    if(overflow){status.textContent='Too many MIDI events were received to save a trustworthy result. Check for trigger chatter or duplicate MIDI messages.';notify(status.textContent,'error');return;}
    if(pattern==='drum-grid'&&(!grid||!gridAssignments))throw new Error('The Drum Grid score context was lost. Retry the MIDI test.');
    if(pattern==='drum-phrase'&&(!phrase||!phraseAssignments))throw new Error('The Drum Phrase score context was lost. Retry the MIDI test.');
    const analysis=pattern==='drum-phrase'
      ?analyzeMidiPhrasePerformance(config,startAudioTime,duration,captured,profileRow,phrase!,phraseAssignments!,timingMatchWindowMs(config))
      :pattern==='drum-grid'
        ?analyzeMidiGridPerformance(config,startAudioTime,duration,captured,profileRow,grid!,gridAssignments!,timingMatchWindowMs(config))
        :analyzeMidiPerformance(config,startAudioTime,duration,captured,profileRow,timingMatchWindowMs(config),voice,pattern);
    const activeSession=store.snapshot().sessions.find(row=>row.status==='active'&&row.profileId===profile.id),block=activeSession?.blocks[activeSession.activeBlockIndex];
    const source=resolveMidiEvidenceSource({expectedPattern:pattern,activeSessionId:activeSession?.id,activeBlockId:block?.id,activeSourceExerciseId:block?.sourceExerciseId,gridExerciseId,phraseExerciseId});
    const saved=await saveMidiPerformanceResult({
      profileId:profile.id,config,durationSeconds:duration,device:profileRow,analysis,expectedPattern:pattern,analyzedVoice:voice,
      ...source,
      ...(grid?{gridNameSnapshot:grid.name,gridLanesSnapshot:grid.lanes,gridAssignments:gridAssignments!}: {}),
      ...(phrase?{phraseNameSnapshot:phrase.name,phraseFocusSnapshot:phrase.focus,phraseBarsSnapshot:phrase.bars,phraseAssignments:phraseAssignments!}: {}),
    });
    status.textContent=pattern==='drum-phrase'
      ?`Saved phrase MIDI result · landing ${saved.landingMatchedCount??0}/${saved.landingExpectedCount??0} · ${saved.matchedCount}/${saved.expectedCount} total expected hits matched.`
      :`Saved MIDI result · ${saved.matchedCount}/${saved.expectedCount} expected hits matched${saved.wrongVoiceCount?` · ${saved.wrongVoiceCount} wrong sound${saved.wrongVoiceCount===1?'':'s'}`:''}.`;
  };

  const startTest=async()=>{
    if(active){await finish(false);return;}
    if(learning)stopLearning();
    if(!supported)throw new Error('Web MIDI is unavailable in this browser.');
    const descriptor=selectedDescriptor();if(!descriptor)throw new Error('Connect and choose a MIDI input first.');
    const config=readConfig(),duration=Number(durationInput.querySelector<HTMLInputElement>('input')!.value),pattern=expectedPattern.querySelector('select')!.value as MidiExpectedPattern,authored=pattern==='drum-grid'||pattern==='drum-phrase';
    const voiceValue=authored?'':analysisVoice.querySelector('select')!.value as MidiDrumVoice|'',grid=pattern==='drum-grid'?selectedGrid():undefined,gridAssignments=pattern==='drum-grid'?readGridAssignments():undefined,gridSourceValue=pattern==='drum-grid'?gridSource.querySelector('select')!.value:'';
    const phrase=pattern==='drum-phrase'?selectedPhrase():undefined,phraseAssignments=pattern==='drum-phrase'?readPhraseAssignments():undefined,phraseSourceValue=pattern==='drum-phrase'?phraseSource.querySelector('select')!.value:'';
    const profileRow=await saveMapping(false,false);
    if(voiceValue&&!profileRow.mappings.some(row=>row.enabled&&row.voice===voiceValue))throw new Error(`No enabled MIDI note is mapped to ${MIDI_VOICES.find(row=>row.value===voiceValue)?.label??voiceValue}.`);
    const checkAssignments=(rows:MidiGridLaneAssignment[],label:string)=>{
      if(new Set(rows.map(row=>row.midiVoice)).size!==rows.length)throw new Error(`Assign a different MIDI sound to each active ${label} lane so Steadybar can identify lane accuracy.`);
      for(const row of rows)if(!profileRow.mappings.some(mapping=>mapping.enabled&&mapping.voice===row.midiVoice))throw new Error(`No enabled MIDI note is mapped to ${MIDI_VOICES.find(item=>item.value===row.midiVoice)?.label??row.midiVoice}, which this ${label} assignment requires.`);
    };
    if(pattern==='drum-grid'){
      if(!grid||!gridAssignments)throw new Error('Choose an available Drum Grid score before starting.');
      checkAssignments(gridAssignments,'Drum Grid');
    }
    if(pattern==='drum-phrase'){
      if(!phrase||!phraseAssignments)throw new Error('Choose an available Drum Phrase score before starting.');
      if(duration+1e-6<drumPhraseCycleSeconds(phrase,config.bpm))throw new Error(`Test at least one complete phrase cycle (${Math.ceil(drumPhraseCycleSeconds(phrase,config.bpm))} seconds at this tempo).`);
      checkAssignments(phraseAssignments,'Drum Phrase');
    }
    const context=await audio.prepareContext();events=[];eventOverflow=false;startAudioTime=0;runningConfig=structuredClone(config);runningDuration=duration;runningVoice=voiceValue||undefined;runningPattern=pattern;
    runningGrid=grid?structuredClone(grid):undefined;runningGridAssignments=gridAssignments?structuredClone(gridAssignments):undefined;runningGridExerciseId=gridSourceValue&&gridSourceValue!=='active'?gridSourceValue:undefined;
    runningPhrase=phrase?structuredClone(phrase):undefined;runningPhraseAssignments=phraseAssignments?structuredClone(phraseAssignments):undefined;runningPhraseExerciseId=phraseSourceValue&&phraseSourceValue!=='active'?phraseSourceValue:undefined;
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
          startAudioTime=audioTime;
          status.textContent=runningPattern==='drum-phrase'?`Measuring authored phrase · ${runningPhrase?.name??'Drum Phrase'} · ${config.bpm} BPM`:runningPattern==='drum-grid'?`Measuring authored grid · ${runningGrid?.name??'Drum Grid'} · ${config.bpm} BPM`:`Measuring · ${config.bpm} BPM · ${config.subdivision}× subdivision · ${timingClickLabel(config)}`;
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

  const testPanel=el('section',{class:'panel midi-test-panel'},sectionHeader('Performance test','Pulse timing or exact mapped-sound scoring against an authored Drum Grid or Groove → Fill → Return phrase.'),
    el('div',{class:'form-grid midi-test-grid'},bpm,subdivision,clickMode,durationInput,analysisVoice,expectedPattern),gridScorePanel,phraseScorePanel,
    el('div',{class:'actions wrap'},startButton),live,
    el('p',{class:'field-hint'},'Pulse modes measure a lane or pulse. Authored Grid/Phrase modes use the saved score plus your explicit lane→MIDI-sound mapping. Phrase tests must include at least one complete groove → fill → return cycle.'));

  const limitations=el('section',{class:'panel'},sectionHeader('What MIDI evidence means','High timestamp precision does not make every metric universal.'),
    el('ul',{class:'plain-list'},el('li',{},'MIDI timing uses browser-reported high-resolution receive timestamps normalized to the metronome AudioContext clock.'),el('li',{},'Velocity is the device’s 1–127 MIDI value. It is useful for consistency and within-device comparison, not as an acoustic dB measurement.'),el('li',{},'Note mapping identifies drum voices only. Steadybar does not infer limb identity from a snare/hat/tom note.'),el('li',{},'Authored Grid/Phrase scoring compares mapped sounds with an explicit score. Phrase landing evidence is limited to authored return-bar beat-1 hits; it does not judge fill taste, motion quality, or musical appropriateness.')),
    !supported?el('p',{class:'field-hint'},'Web MIDI is primarily available in Chromium-based browsers. Firefox/WebKit can still open saved MIDI history and the rest of Steadybar normally.'):null);

  page.append(el('div',{class:'two-column wide-left'},devicePanel,testPanel),mappingPanel,limitations,resultHost);

  const renderHistory=()=>{
    const rows=(store.snapshot().midiResults??[]).filter(row=>row.profileId===profile.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    resultHost.replaceChildren();
    if(rows[0])resultHost.append(resultCard(rows[0]));
    const history=el('section',{class:'midi-history'},sectionHeader('MIDI performance history',rows.length?`${rows.length} saved result${rows.length===1?'':'s'}`:'No saved MIDI tests yet'));
    if(!rows.length)history.append(empty('No MIDI evidence yet.',supported?'Connect an electronic drum kit or MIDI pad and run a test.':'Open Steadybar in a Web MIDI-capable browser to capture new MIDI evidence.',undefined,'progress'));
    else for(const row of rows.slice(0,40)){
      const voice=row.expectedPattern==='drum-phrase'?(row.phraseNameSnapshot??'Drum Phrase'):row.expectedPattern==='drum-grid'?(row.gridNameSnapshot??'Drum Grid'):row.analyzedVoice?MIDI_VOICES.find(item=>item.value===row.analyzedVoice)?.label??titleCase(row.analyzedVoice):'All mapped notes',pattern=patternOptions.find(item=>item[0]===row.expectedPattern)?.[1]??titleCase(row.expectedPattern);
      history.append(el('article',{class:'midi-history-row'},el('div',{},el('strong',{},`${row.deviceNameSnapshot} · ${voice} · ${pattern}`),el('span',{class:'muted small'},`${formatDate(row.createdAt,true)} · ${row.bpm} BPM · ${titleCase(row.confidence)} confidence`)),
        el('div',{class:'tag-row'},row.matchedCount?badge(`error ${row.meanAbsoluteErrorMs.toFixed(1)} ms`):badge('no matches'),row.matchedCount?badge(`velocity ${row.velocityMedian.toFixed(1)}`):null,badge(`${row.matchedCount}/${row.expectedCount} matched`),row.expectedPattern==='drum-phrase'?badge(`landing ${row.landingMatchedCount??0}/${row.landingExpectedCount??0}`):null,row.wrongVoiceCount?badge(`${row.wrongVoiceCount} wrong sound`):null),
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
