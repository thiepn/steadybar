import test from 'node:test';
import assert from 'node:assert/strict';
import { ScheduleClock, resolvedTiming, timingClickLabel } from '../dist/app/audio/scheduler.js';
import { DEFAULT_METRONOME } from '../dist/app/domain/models.js';
import { validateMetronome } from '../dist/app/domain/validation.js';
import { seedData } from '../dist/app/db/seed.js';
import { createSession } from '../dist/app/practice/logic.js';

function config(overrides={}) {
  return {
    ...structuredClone(DEFAULT_METRONOME),
    bpm: 60,
    countIn: 0,
    ...overrides,
  };
}
function bar(clock,beats=4,subdivision=1) {
  return Array.from({length:beats*subdivision},()=>clock.next());
}

test('legacy metronome data remains valid and resolves to standard timing',()=>{
  const legacy={bpm:80,meter:{beats:4,beatUnit:4},subdivision:1,accents:[2,1,1,1],countIn:0,volume:.65};
  const validated=validateMetronome(legacy);
  assert.equal(validated.timing,undefined);
  assert.equal(resolvedTiming(validated).mode,'standard');
});

test('standard mode preserves subdivisions and authored accents',()=>{
  const c=config({subdivision:2,accents:[2,1,0,1],timing:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const events=bar(new ScheduleClock(c),4,2);
  assert.deepEqual(events.map(e=>e.accent),[2,1,1,1,0,0,1,1]);
});

test('2 & 4 mode removes subdivisions and clicks only beats two and four',()=>{
  const c=config({subdivision:4,timing:{mode:'two-four',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const events=bar(new ScheduleClock(c),4,4);
  assert.deepEqual(events.filter(e=>e.accent>0).map(e=>[e.beat,e.part]),[[1,0],[3,0]]);
  assert.equal(timingClickLabel(c),'2 & 4');
});

test('sparse click counts beats continuously across bar lines',()=>{
  const c=config({timing:{mode:'sparse',sparseEvery:3,gapClickBars:3,gapSilentBars:1}});
  const clock=new ScheduleClock(c),events=[...bar(clock),...bar(clock)];
  assert.deepEqual(events.filter(e=>e.accent>0).map(e=>[e.bar,e.beat]),[[0,0],[0,3],[1,2]]);
});

test('one click per bar keeps only the bar reference',()=>{
  const c=config({subdivision:4,timing:{mode:'one-per-bar',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const clock=new ScheduleClock(c),events=[...bar(clock,4,4),...bar(clock,4,4)];
  assert.deepEqual(events.filter(e=>e.accent>0).map(e=>[e.bar,e.beat,e.part]),[[0,0,0],[1,0,0]]);
});

test('gap click follows 3 on / 1 silent progression without changing BPM',()=>{
  const c=config({timing:{mode:'gap',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const clock=new ScheduleClock(c),events=Array.from({length:16},()=>clock.next());
  const audibleByBar=[0,1,2,3].map(n=>events.filter(e=>e.bar===n&&e.accent>0).length);
  assert.deepEqual(audibleByBar,[4,4,4,0]);
  assert.equal(new Set(events.slice(0,12).map((e,i)=>i===0?0:Number((e.time-events[i-1]?.time||0).toFixed(6)))).has(1),true);
});

test('count-in remains fully audible before a gap-click exercise starts',()=>{
  const c=config({countIn:1,timing:{mode:'gap',sparseEvery:2,gapClickBars:1,gapSilentBars:3}});
  const clock=new ScheduleClock(c),events=Array.from({length:12},()=>clock.next());
  assert.equal(events.filter(e=>e.bar===0&&e.accent>0).length,4);
  assert.equal(events.find(e=>e.firstPracticeBeat)?.bar,1);
  assert.equal(events.filter(e=>e.bar===2&&e.accent>0).length,0);
});

test('timing mode changes wait for the next bar boundary',()=>{
  const standard=config();
  const clock=new ScheduleClock(standard);
  clock.next();
  clock.update({...standard,timing:{mode:'one-per-bar',sparseEvery:2,gapClickBars:3,gapSilentBars:1}});
  const restOfBar=[clock.next(),clock.next(),clock.next()];
  assert.deepEqual(restOfBar.map(e=>e.accent),[1,1,1]);
  const next=clock.next();
  assert.equal(next.beat,0);assert.equal(next.accent,2);
  assert.equal(clock.next().accent,0);
});


test('new tempo blocks snapshot click difficulty independently from settings',()=>{
  const data=seedData();
  data.settings.metronome.timing={mode:'gap',sparseEvery:2,gapClickBars:2,gapSilentBars:2};
  const session=createSession([{id:'timing-evidence',type:'free',title:'Timing evidence',targetSeconds:60,bpm:80,notes:'',order:0}],data);
  assert.deepEqual(session.blocks[0].timingClickSnapshot,data.settings.metronome.timing);
  data.settings.metronome.timing.mode='standard';
  assert.equal(session.blocks[0].timingClickSnapshot.mode,'gap');
});

test('invalid timing configuration is rejected',()=>{
  const c=config({timing:{mode:'gap',sparseEvery:2,gapClickBars:0,gapSilentBars:1}});
  assert.throws(()=>validateMetronome(c));
});
