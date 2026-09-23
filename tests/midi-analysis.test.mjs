import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMidiNoteMessage,midiTimestampToAudioTime} from '../dist/app/midi/input.js';
import {analyzeMidiPerformance,defaultMidiMappings,mapMidiEvents,midiDeviceKey} from '../dist/app/domain/midi-analysis.js';
import {buildExpectedTimingGrid} from '../dist/app/domain/timing-analysis.js';

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
