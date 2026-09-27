import test from 'node:test';
import assert from 'node:assert/strict';
import {rhythmCycle,rhythmCyclePositions,subdivisionName,swingFeelLabel,validateRhythmLabConfig} from '../dist/app/domain/rhythm-lab.js';

test('swing cycle places the offbeat at the configured ratio without moving the beat',()=>{
  const cycle=rhythmCycle({mode:'swing',bpm:120,beats:4,ratio:66.5});
  assert.equal(cycle.durationSeconds,2);
  assert.equal(cycle.events.length,8);
  assert.deepEqual(cycle.events.filter(event=>event.layer==='primary').map(event=>event.offsetSeconds),[0,.5,1,1.5]);
  assert.deepEqual(cycle.events.filter(event=>event.layer==='secondary').map(event=>event.offsetSeconds),[.3325,.8325,1.3325,1.8325]);
  assert.equal(cycle.events[0].accent,2);
  assert.match(cycle.summary,/Triplet swing/i);
});

test('swing labels stay descriptive rather than ranking one feel as better',()=>{
  assert.equal(swingFeelLabel(50),'Straight');
  assert.equal(swingFeelLabel(58),'Medium swing');
  assert.equal(swingFeelLabel(66.5),'Triplet swing');
  assert.equal(swingFeelLabel(72),'Deep swing');
});

test('subdivision switching preserves BPM while changing only note density by stage',()=>{
  const cycle=rhythmCycle({mode:'subdivision-switch',bpm:60,beats:4,sequence:[1,2,3,4],barsPerStage:1});
  assert.equal(cycle.durationSeconds,16);
  assert.equal(cycle.events.length,4+8+12+16);
  assert.deepEqual(cycle.events.slice(0,4).map(event=>event.offsetSeconds),[0,1,2,3]);
  assert.equal(cycle.events[4].offsetSeconds,4);
  assert.equal(cycle.events[12].offsetSeconds,8);
  assert.equal(cycle.events[24].offsetSeconds,12);
  assert.match(cycle.summary,/Quarter notes → Eighth notes → Triplets → Sixteenth notes/);
});

test('bars-per-stage expands time and event count deterministically',()=>{
  const one=rhythmCycle({mode:'subdivision-switch',bpm:90,beats:3,sequence:[2,3],barsPerStage:1});
  const two=rhythmCycle({mode:'subdivision-switch',bpm:90,beats:3,sequence:[2,3],barsPerStage:2});
  assert.equal(two.durationSeconds,one.durationSeconds*2);
  assert.equal(two.events.length,one.events.length*2);
});

test('3:2 polyrhythm uses a two-beat anchor cycle with three evenly spaced overlay hits',()=>{
  const cycle=rhythmCycle({mode:'polyrhythm',bpm:120,primary:3,secondary:2});
  assert.equal(cycle.durationSeconds,1);
  const anchor=cycle.events.filter(event=>event.layer==='primary').map(event=>event.offsetSeconds);
  const overlay=cycle.events.filter(event=>event.layer==='secondary').map(event=>event.offsetSeconds);
  assert.deepEqual(anchor,[0,.5]);
  assert.ok(Math.abs(overlay[0]-0)<1e-9);
  assert.ok(Math.abs(overlay[1]-1/3)<1e-9);
  assert.ok(Math.abs(overlay[2]-2/3)<1e-9);
  assert.match(cycle.summary,/3:2/);
});

test('polyrhythm cycle positions normalize independently per layer',()=>{
  const positions=rhythmCyclePositions({mode:'polyrhythm',bpm:100,primary:4,secondary:3});
  assert.deepEqual(positions.primary,[0,1/3,2/3]);
  assert.deepEqual(positions.secondary,[0,.25,.5,.75]);
});

test('rhythm lab validation rejects ambiguous or unsafe configurations',()=>{
  assert.throws(()=>validateRhythmLabConfig({mode:'swing',bpm:10,beats:4,ratio:66.5}),/BPM/i);
  assert.throws(()=>validateRhythmLabConfig({mode:'swing',bpm:80,beats:4,ratio:80}),/ratio/i);
  assert.throws(()=>validateRhythmLabConfig({mode:'subdivision-switch',bpm:80,beats:4,sequence:[],barsPerStage:1}),/stages/i);
  assert.throws(()=>validateRhythmLabConfig({mode:'polyrhythm',bpm:80,primary:3,secondary:3}),/different/i);
  assert.equal(subdivisionName(4),'Sixteenth notes');
});
