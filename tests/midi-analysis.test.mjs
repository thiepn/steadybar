import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMidiNoteMessage,midiTimestampToAudioTime} from '../dist/app/midi/input.js';
import {analyzeMidiGridPerformance,analyzeMidiPerformance,analyzeMidiPhrasePerformance,defaultMidiMappings,drumPhraseCycleSeconds,expectedMidiDrumGrid,expectedMidiDrumPhrase,expectedMidiGrid,mapMidiEvents,midiDeviceKey} from '../dist/app/domain/midi-analysis.js';
import {buildExpectedTimingGrid} from '../dist/app/domain/timing-analysis.js';
import {buildDrumPhrase} from '../dist/app/domain/drum-phrase.js';
import {resolveMidiEvidenceSource} from '../dist/app/domain/midi-evidence.js';
import {validateMidiPerformanceResult,validateTimingLabResult} from '../dist/app/domain/validation.js';

const config={bpm:120,meter:{beats:4,beatUnit:4},subdivision:2};
const profile={channel:10,mappings:[{note:38,voice:'snare',label:'Snare',enabled:true},{note:36,voice:'kick',label:'Kick',enabled:true}]};

test('Web MIDI parser accepts note-on velocity and preserves one-based channel',()=>{
  const parsed=parseMidiNoteMessage({data:new Uint8Array([0x99,38,101]),receivedTime:123.5,timeStamp:120});
  assert.deepEqual(parsed,{note:38,velocity:101,channel:10,receivedTime:123.5});
  assert.equal(parseMidiNoteMessage({data:new Uint8Array([0x89,38,0]),receivedTime:1,timeStamp:1}),undefined);
  assert.equal(parseMidiNoteMessage({data:new Uint8Array([0x99,38,0]),receivedTime:1,timeStamp:1}),undefined);
});

test('MIDI receivedTime is normalized onto the shared AudioContext clock without Date.now',()=>{
  assert.equal(midiTimestampToAudioTime(1250,1000,20),20.25);
  assert.equal(midiTimestampToAudioTime(990,1000,20),19.99);
});

test('General MIDI drum defaults are unique and use stable name/manufacturer device identity',()=>{
  const mappings=defaultMidiMappings();
  assert.equal(new Set(mappings.map(row=>row.note)).size,mappings.length);
  assert.ok(mappings.some(row=>row.note===36&&row.voice==='kick'));
  assert.ok(mappings.some(row=>row.note===38&&row.voice==='snare'));
  assert.equal(midiDeviceKey(' Roland ',' TD-17 '),'roland::td-17');
});

test('mapping honors channel filters and counts only genuinely unmapped note-ons',()=>{
  const events=[
    {time:1,note:38,velocity:90,channel:10},
    {time:1.1,note:99,velocity:80,channel:10},
    {time:1.2,note:38,velocity:70,channel:1},
  ];
  const result=mapMidiEvents(events,profile);
  assert.equal(result.mapped.length,1);
  assert.equal(result.mapped[0].mapping.voice,'snare');
  assert.equal(result.unmappedCount,1);
});

test('perfect single-voice MIDI timing produces exact timing and device-relative velocity evidence',()=>{
  const start=5,expected=buildExpectedTimingGrid(config,start,4);
  const velocities=expected.map((_,index)=>index%2?100:80);
  const events=expected.map((hit,index)=>({time:hit.time,note:38,velocity:velocities[index],channel:10}));
  const result=analyzeMidiPerformance(config,start,4,events,profile,80,'snare');
  assert.equal(result.matchedCount,expected.length);
  assert.equal(result.misses,0);assert.equal(result.extras,0);assert.equal(result.unmappedCount,0);
  assert.equal(result.meanOffsetMs,0);assert.equal(result.meanAbsoluteErrorMs,0);assert.equal(result.spreadMs,0);
  assert.equal(result.velocityMean,90);assert.equal(result.velocityMedian,90);assert.equal(result.velocityMin,80);assert.equal(result.velocityMax,100);assert.equal(result.velocityRange,20);
  assert.equal(result.velocitySpread,10);
  assert.equal(result.voices.length,1);assert.equal(result.voices[0].voice,'snare');assert.equal(result.voices[0].count,expected.length);
  assert.equal(result.confidence,'high');
});

test('voice-lane analysis ignores simultaneous mapped voices rather than calling them errors',()=>{
  const start=2,expected=buildExpectedTimingGrid(config,start,4),events=[];
  for(const hit of expected){
    events.push({time:hit.time,note:38,velocity:95,channel:10});
    events.push({time:hit.time,note:36,velocity:110,channel:10});
  }
  const snare=analyzeMidiPerformance(config,start,4,events,profile,80,'snare');
  assert.equal(snare.detectedCount,expected.length);
  assert.equal(snare.matchedCount,expected.length);
  assert.equal(snare.extras,0);
  assert.ok(snare.hits.every(hit=>hit.voice==='snare'));
});

test('2 & 4 expected pattern creates only backbeat targets for a snare lane',()=>{
  const start=4,expected=expectedMidiGrid(config,start,8,'two-four');
  assert.ok(expected.length>0);
  assert.ok(expected.every(hit=>hit.part===0&&(hit.beat===1||hit.beat===3)));
  const events=expected.map(hit=>({time:hit.time,note:38,velocity:92,channel:10}));
  const result=analyzeMidiPerformance(config,start,8,events,profile,80,'snare','two-four');
  assert.equal(result.expectedCount,expected.length);
  assert.equal(result.matchedCount,expected.length);
  assert.equal(result.misses,0);assert.equal(result.extras,0);
});

test('2 & 4 expected pattern rejects meters with fewer than four beats',()=>{
  assert.throws(()=>expectedMidiGrid({bpm:120,meter:{beats:3,beatUnit:4},subdivision:2},4,8,'two-four'),/at least four beats/i);
});

test('unmapped notes outside the measured window are excluded from the result',()=>{
  const start=10,expected=buildExpectedTimingGrid(config,start,4);
  const events=[
    {time:start-1,note:99,velocity:80,channel:10},
    ...expected.map(hit=>({time:hit.time,note:38,velocity:90,channel:10})),
    {time:start+1,note:99,velocity:70,channel:10},
  ];
  const result=analyzeMidiPerformance(config,start,4,events,profile,80,'snare');
  assert.equal(result.unmappedCount,1);
  assert.equal(result.matchedCount,expected.length);
});

test('MIDI timing keeps signed high-resolution offsets and drift',()=>{
  const start=30,expected=buildExpectedTimingGrid(config,start,10);
  const events=expected.map(hit=>{
    const offsetMs=6+hit.elapsedMs/1000*2;
    return {time:hit.time+offsetMs/1000,note:38,velocity:96,channel:10};
  });
  const result=analyzeMidiPerformance(config,start,10,events,profile,100,'snare');
  assert.ok(result.meanOffsetMs>10);
  assert.ok(result.driftMsPerMinute>115&&result.driftMsPerMinute<125,String(result.driftMsPerMinute));
  assert.equal(result.velocitySpread,0);
});

const gridProfile={channel:10,mappings:[
  {note:42,voice:'hihat-closed',label:'Closed hi-hat',enabled:true},
  {note:38,voice:'snare',label:'Snare',enabled:true},
  {note:36,voice:'kick',label:'Kick',enabled:true},
  {note:44,voice:'hihat-pedal',label:'Hi-hat pedal',enabled:true},
]};
const grid={kind:'drum-grid',pulse:{bpm:120,beats:4,beatUnit:4,subdivision:2},name:'Test groove',focus:'Exact authored grid',lanes:[
  {voice:'right-hand',steps:'x.x.x.x.'},
  {voice:'left-hand',steps:'..X.x.X.'},
  {voice:'kick',steps:'x...x...'},
  {voice:'hihat-foot',steps:'.x.x.x.x'},
]};
const gridAssignments=[
  {gridVoice:'right-hand',midiVoice:'hihat-closed'},
  {gridVoice:'left-hand',midiVoice:'snare'},
  {gridVoice:'kick',midiVoice:'kick'},
  {gridVoice:'hihat-foot',midiVoice:'hihat-pedal'},
];
const noteForVoice={'hihat-closed':42,snare:38,kick:36,'hihat-pedal':44};

test('authored Drum Grid expands simultaneous lane hits into exact MIDI voice targets',()=>{
  const expected=expectedMidiDrumGrid(config,5,2,grid,gridAssignments);
  assert.equal(expected.length,13);
  assert.ok(expected.some(hit=>hit.time===5&&hit.gridVoice==='right-hand'&&hit.midiVoice==='hihat-closed'));
  assert.ok(expected.some(hit=>hit.time===5&&hit.gridVoice==='kick'&&hit.midiVoice==='kick'));
  assert.ok(expected.filter(hit=>hit.accent).every(hit=>hit.gridVoice==='left-hand'));
});

test('perfect authored Drum Grid MIDI performance matches every assigned sound and preserves accent contrast',()=>{
  const start=5,expected=expectedMidiDrumGrid(config,start,2,grid,gridAssignments);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:hit.accent?110:80,channel:10}));
  const result=analyzeMidiGridPerformance(config,start,2,events,gridProfile,grid,gridAssignments,80);
  assert.equal(result.expectedCount,13);assert.equal(result.matchedCount,13);assert.equal(result.misses,0);assert.equal(result.extras,0);assert.equal(result.wrongVoiceCount,0);
  assert.equal(result.gridLaneSummaries.length,4);assert.equal(result.gridLaneSummaries.reduce((n,row)=>n+row.matchedCount,0),13);
  assert.equal(result.accentVelocityMean,110);assert.equal(result.normalVelocityMean,80);assert.equal(result.accentVelocityDifference,30);
  assert.ok(result.hits.every(hit=>hit.expectedGridVoice&&typeof hit.expectedAccent==='boolean'));
});

test('authored Drum Grid distinguishes a near-time wrong sound from a simple timing miss',()=>{
  const start=5,expected=expectedMidiDrumGrid(config,start,2,grid,gridAssignments);
  const wrongTarget=expected.find(hit=>hit.gridVoice==='left-hand');
  const events=expected.filter(hit=>hit!==wrongTarget).map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  events.push({time:wrongTarget.time,note:36,velocity:95,channel:10});
  const result=analyzeMidiGridPerformance(config,start,2,events,gridProfile,grid,gridAssignments,80);
  assert.equal(result.matchedCount,12);assert.equal(result.misses,1);assert.equal(result.extras,1);assert.equal(result.wrongVoiceCount,1);
  const left=result.gridLaneSummaries.find(row=>row.gridVoice==='left-hand');assert.equal(left.misses,1);
});

test('generic MIDI analysis refuses Drum Grid mode without an authored score',()=>{
  assert.throws(()=>expectedMidiGrid(config,5,2,'drum-grid'),/authored grid/i);
});

test('dense long authored Grid matching remains exact with thousands of events',()=>{
  const denseConfig={bpm:240,meter:{beats:4,beatUnit:4},subdivision:4},denseGrid={kind:'drum-grid',pulse:{bpm:240,beats:4,beatUnit:4,subdivision:4},name:'Dense stress grid',focus:'Matcher regression',lanes:[
    {voice:'right-hand',steps:'xxxxxxxxxxxxxxxx'},
    {voice:'left-hand',steps:'xxxxxxxxxxxxxxxx'},
    {voice:'kick',steps:'xxxxxxxxxxxxxxxx'},
    {voice:'hihat-foot',steps:'xxxxxxxxxxxxxxxx'},
  ]};
  const expected=expectedMidiDrumGrid(denseConfig,2,120,denseGrid,gridAssignments);
  assert.equal(expected.length,7680);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  const result=analyzeMidiGridPerformance(denseConfig,2,120,events,gridProfile,denseGrid,gridAssignments,60);
  assert.equal(result.matchedCount,expected.length);assert.equal(result.misses,0);assert.equal(result.extras,0);assert.equal(result.wrongVoiceCount,0);
});

test('authored Drum Grid rejects duplicate MIDI sounds across active lanes',()=>{
  const ambiguous=gridAssignments.map(row=>row.gridVoice==='left-hand'?{...row,midiVoice:'hihat-closed'}:row);
  assert.throws(()=>expectedMidiDrumGrid(config,5,2,grid,ambiguous),/different MIDI sounds/i);
});


test('saved authored MIDI scores own evidence attribution over unrelated active practice',()=>{
  const active={activeSessionId:'session-a',activeBlockId:'block-a',activeSourceExerciseId:'exercise-a'};
  assert.deepEqual(resolveMidiEvidenceSource({expectedPattern:'drum-grid',...active,gridExerciseId:'saved-grid'}),{sourceExerciseId:'saved-grid'});
  assert.deepEqual(resolveMidiEvidenceSource({expectedPattern:'drum-phrase',...active,phraseExerciseId:'saved-phrase'}),{sourceExerciseId:'saved-phrase'});
  assert.deepEqual(resolveMidiEvidenceSource({expectedPattern:'drum-grid',...active}),{sessionId:'session-a',blockId:'block-a',sourceExerciseId:'exercise-a'});
  assert.deepEqual(resolveMidiEvidenceSource({expectedPattern:'subdivision',...active}),{sessionId:'session-a',blockId:'block-a',sourceExerciseId:'exercise-a'});
});

test('generic MIDI persistence remains version 1',()=>{
  const start=5,expected=buildExpectedTimingGrid(config,start,2),events=expected.map(hit=>({time:hit.time,note:38,velocity:90,channel:10}));
  const analysis=analyzeMidiPerformance(config,start,2,events,profile,80,'snare');
  const at='2026-09-25T05:00:00.000Z',base={id:'generic-midi',createdAt:at,updatedAt:at,midiAnalysisVersion:1,profileId:'profile-drums',deviceKey:'test::kit',deviceNameSnapshot:'Test Kit',manufacturerSnapshot:'Test',bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:2,expectedPattern:'subdivision',analyzedVoice:'snare',...analysis};
  assert.deepEqual(validateMidiPerformanceResult(base),base);
  assert.throws(()=>validateMidiPerformanceResult({...base,midiAnalysisVersion:2}),/version 1/i);
});

test('persisted authored Drum Grid MIDI result validates with hit lane metadata and optional grid metrics',()=>{
  const start=5,expected=expectedMidiDrumGrid(config,start,2,grid,gridAssignments);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:hit.accent?110:80,channel:10}));
  const analysis=analyzeMidiGridPerformance(config,start,2,events,gridProfile,grid,gridAssignments,80);
  const at='2026-09-25T05:00:00.000Z';
  const result={
    id:'grid-midi-result',createdAt:at,updatedAt:at,midiAnalysisVersion:2,profileId:'profile-drums',
    deviceKey:'test::kit',deviceNameSnapshot:'Test Kit',manufacturerSnapshot:'Test',
    bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},
    durationSeconds:2,expectedPattern:'drum-grid',gridNameSnapshot:grid.name,gridLanesSnapshot:grid.lanes,gridAssignments,
    ...analysis,
  };
  assert.deepEqual(validateMidiPerformanceResult(result),result);
});

test('persisted Drum Grid MIDI evidence rejects lane/sound contradictions',()=>{
  const start=5,expected=expectedMidiDrumGrid(config,start,2,grid,gridAssignments);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:hit.accent?110:80,channel:10}));
  const analysis=analyzeMidiGridPerformance(config,start,2,events,gridProfile,grid,gridAssignments,80),at='2026-09-25T05:00:00.000Z';
  const base={id:'grid-midi-corrupt',createdAt:at,updatedAt:at,midiAnalysisVersion:2,profileId:'profile-drums',deviceKey:'test::kit',deviceNameSnapshot:'Test Kit',manufacturerSnapshot:'Test',bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:2,expectedPattern:'drum-grid',gridNameSnapshot:grid.name,gridLanesSnapshot:grid.lanes,gridAssignments,...analysis};
  const wrongHit=structuredClone(base);wrongHit.hits[0].voice='snare';assert.throws(()=>validateMidiPerformanceResult(wrongHit),/assigned sounds/i);
  const wrongSummary=structuredClone(base);wrongSummary.gridLaneSummaries[0].midiVoice='snare';assert.throws(()=>validateMidiPerformanceResult(wrongSummary),/saved assignments/i);
});

test('ordinary Timing Lab hit schema stays independent of Drum Grid MIDI metadata',()=>{
  const at='2026-09-25T05:00:00.000Z',base={
    id:'timing',createdAt:at,updatedAt:at,timingLabVersion:1,profileId:'profile-drums',bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,
    timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:1,threshold:.1,inputOffsetMs:0,matchWindowMs:80,
    expectedCount:1,detectedCount:1,matchedCount:1,misses:0,extras:0,meanOffsetMs:0,medianOffsetMs:0,meanAbsoluteErrorMs:0,spreadMs:0,driftMsPerMinute:0,confidence:'low',
    hits:[{index:0,elapsedMs:0,offsetMs:0,strength:.5,bar:0,beat:0,part:0}],
  };
  assert.deepEqual(validateTimingLabResult(base),base);
  const polluted=structuredClone(base);polluted.hits[0].expectedGridVoice='kick';polluted.hits[0].expectedAccent=true;
  assert.deepEqual(validateTimingLabResult(polluted),base);
});

const phrase=buildDrumPhrase('backbeat','alternating',80,2,2,'beat',0);
const phraseConfig={bpm:120,meter:{beats:4,beatUnit:4},subdivision:2};

test('Drum Phrase MIDI requires one complete phrase cycle at the actual test tempo',()=>{
  assert.equal(drumPhraseCycleSeconds(phrase,120),6);
  assert.throws(()=>expectedMidiDrumPhrase(phraseConfig,10,5.9,phrase,gridAssignments),/complete phrase cycle/i);
  const expected=expectedMidiDrumPhrase(phraseConfig,10,6,phrase,gridAssignments);
  assert.ok(expected.length>0);
  assert.ok(expected.some(hit=>hit.phraseBarRole==='fill'));
  assert.ok(expected.some(hit=>hit.phraseBarRole==='return'&&hit.beat===0));
});

test('authored Drum Phrase rejects duplicate mapped sounds across active lanes',()=>{
  const ambiguous=gridAssignments.map(row=>row.gridVoice==='left-hand'?{...row,midiVoice:'hihat-closed'}:row);
  assert.throws(()=>expectedMidiDrumPhrase(phraseConfig,10,6,phrase,ambiguous),/different MIDI sounds/i);
});

test('perfect authored Drum Phrase MIDI reports every bar and an exact return-beat landing',()=>{
  const start=10,duration=6,expected=expectedMidiDrumPhrase(phraseConfig,start,duration,phrase,gridAssignments);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:hit.accent?110:80,channel:10}));
  const result=analyzeMidiPhrasePerformance(phraseConfig,start,duration,events,gridProfile,phrase,gridAssignments,80);
  assert.equal(result.expectedCount,expected.length);assert.equal(result.matchedCount,expected.length);assert.equal(result.misses,0);assert.equal(result.extras,0);assert.equal(result.wrongVoiceCount,0);
  assert.deepEqual(result.phraseBarSummaries.map(row=>row.role),['groove','fill','return']);
  assert.ok(result.phraseBarSummaries.every(row=>row.misses===0&&row.matchedCount===row.expectedCount));
  assert.equal(result.landingExpectedCount,2);assert.equal(result.landingMatchedCount,2);assert.equal(result.landingMisses,0);assert.equal(result.landingMeanOffsetMs,0);assert.equal(result.landingMeanAbsoluteErrorMs,0);
  assert.ok(result.hits.filter(hit=>hit.expectedPhraseBarRole==='return'&&hit.beat===0).every(hit=>hit.expectedPhraseBarIndex===2));
});

test('phrase landing bias keeps early/late direction on the return downbeat',()=>{
  const start=10,duration=6,expected=expectedMidiDrumPhrase(phraseConfig,start,duration,phrase,gridAssignments);
  const events=expected.map(hit=>({time:hit.time+(hit.phraseBarRole==='return'&&hit.beat===0&&hit.part===0?.025:0),note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  const result=analyzeMidiPhrasePerformance(phraseConfig,start,duration,events,gridProfile,phrase,gridAssignments,80);
  assert.equal(result.landingMatchedCount,result.landingExpectedCount);
  assert.equal(result.landingMeanOffsetMs,25);
  assert.equal(result.landingMeanAbsoluteErrorMs,25);
});

test('multi-cycle Drum Phrase MIDI accumulates bar, lane and landing evidence deterministically',()=>{
  const start=10,duration=12,expected=expectedMidiDrumPhrase(phraseConfig,start,duration,phrase,gridAssignments);
  const events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  const result=analyzeMidiPhrasePerformance(phraseConfig,start,duration,events,gridProfile,phrase,gridAssignments,80);
  assert.equal(result.landingExpectedCount,4);assert.equal(result.landingMatchedCount,4);assert.equal(result.landingMisses,0);
  assert.equal(result.phraseBarSummaries.length,3);
  assert.ok(result.phraseBarSummaries.every(row=>row.matchedCount===row.expectedCount&&row.expectedCount>0));
  assert.equal(result.phraseBarSummaries.reduce((sum,row)=>sum+row.expectedCount,0),result.expectedCount);
  assert.equal(result.phraseLaneSummaries.reduce((sum,row)=>sum+row.expectedCount,0),result.expectedCount);
});

test('phrase landing metric isolates a missing/wrong sound on return beat 1',()=>{
  const start=10,duration=6,expected=expectedMidiDrumPhrase(phraseConfig,start,duration,phrase,gridAssignments),landingKick=expected.find(hit=>hit.phraseBarRole==='return'&&hit.beat===0&&hit.gridVoice==='kick');
  assert.ok(landingKick);
  const events=expected.filter(hit=>hit!==landingKick).map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  events.push({time:landingKick.time,note:38,velocity:95,channel:10});
  const result=analyzeMidiPhrasePerformance(phraseConfig,start,duration,events,gridProfile,phrase,gridAssignments,80);
  assert.equal(result.landingExpectedCount,2);assert.equal(result.landingMatchedCount,1);assert.equal(result.landingMisses,1);
  assert.equal(result.wrongVoiceCount,1);assert.equal(result.extras,1);
  const returnBar=result.phraseBarSummaries.find(row=>row.role==='return');assert.ok(returnBar);assert.equal(returnBar.misses,1);
});

test('persisted Drum Phrase MIDI v3 validates exact phrase, bar, lane and landing evidence',()=>{
  const start=10,duration=6,expected=expectedMidiDrumPhrase(phraseConfig,start,duration,phrase,gridAssignments),events=expected.map(hit=>({time:hit.time,note:noteForVoice[hit.midiVoice],velocity:90,channel:10}));
  const analysis=analyzeMidiPhrasePerformance(phraseConfig,start,duration,events,gridProfile,phrase,gridAssignments,80),at='2026-09-25T06:00:00.000Z';
  const result={id:'phrase-midi',createdAt:at,updatedAt:at,midiAnalysisVersion:3,profileId:'profile-drums',deviceKey:'test::kit',deviceNameSnapshot:'Test Kit',manufacturerSnapshot:'Test',bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:6,expectedPattern:'drum-phrase',phraseNameSnapshot:phrase.name,phraseFocusSnapshot:phrase.focus,phraseBarsSnapshot:phrase.bars,phraseAssignments:gridAssignments,...analysis};
  assert.deepEqual(validateMidiPerformanceResult(result),result);
  const wrongBar=structuredClone(result);wrongBar.phraseBarSummaries[2].role='fill';assert.throws(()=>validateMidiPerformanceResult(wrongBar),/saved phrase/i);
  const wrongHit=structuredClone(result);wrongHit.hits.find(hit=>hit.expectedPhraseBarRole==='return').expectedPhraseBarRole='fill';assert.throws(()=>validateMidiPerformanceResult(wrongHit),/saved bars/i);
  const wrongLanding=structuredClone(result);wrongLanding.landingMatchedCount--;wrongLanding.landingMisses++;assert.throws(()=>validateMidiPerformanceResult(wrongLanding),/landing matches/i);
  const truncated=structuredClone(result);truncated.durationSeconds=5.5;assert.throws(()=>validateMidiPerformanceResult(truncated),/complete phrase cycle/i);
});

test('generic expected-pattern helper refuses Drum Phrase mode without an authored phrase',()=>{
  assert.throws(()=>expectedMidiGrid(config,5,2,'drum-phrase'),/authored phrase/i);
});

