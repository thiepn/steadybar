import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePocket, analyzePocketTiming, pocketErrorLabel, pocketTargetLabel } from '../dist/app/domain/pocket-analysis.js';
import { analyzeTiming, buildExpectedTimingGrid } from '../dist/app/domain/timing-analysis.js';
import { validateTimingLabResult } from '../dist/app/domain/validation.js';

const hits=[-22,-18,-20,-5].map((offsetMs,index)=>({index,elapsedMs:index*500,offsetMs,strength:.5,bar:0,beat:index,part:0}));

test('Pocket analysis measures matched hits relative to a chosen feel target',()=>{
  const result=analyzePocket(hits,-20,5);
  assert.deepEqual(result,{targetOffsetMs:-20,targetBandMs:5,meanTargetErrorMs:3.8,medianTargetErrorMs:1,meanAbsoluteTargetErrorMs:4.8,targetBandHits:3});
  assert.equal(pocketTargetLabel(-20),'Ahead 20 ms');
  assert.equal(pocketTargetLabel(0),'Centered');
  assert.equal(pocketTargetLabel(20),'Behind 20 ms');
  assert.equal(pocketErrorLabel(-4),'earlier-than-target');
  assert.equal(pocketErrorLabel(0),'on-target');
  assert.equal(pocketErrorLabel(4),'later-than-target');
});

test('Pocket matching is centered on the chosen target instead of the raw grid',()=>{
  const config={bpm:240,meter:{beats:4,beatUnit:4},subdivision:4},expected=buildExpectedTimingGrid(config,10,1);
  const detected=expected.map(hit=>({time:hit.time-.05,strength:.5}));
  const raw=analyzeTiming(expected,detected,0,35);
  assert.ok(raw.matchedCount<expected.length);
  const result=analyzePocketTiming(expected,detected,0,-50,5,35);
  assert.equal(result.timing.matchedCount,expected.length);
  assert.equal(result.timing.meanOffsetMs,-50);
  assert.equal(result.pocket.meanTargetErrorMs,0);
  assert.equal(result.pocket.targetBandHits,expected.length);
});

test('Pocket target and band bounds reject nonsensical diagnostics',()=>{
  assert.throws(()=>analyzePocket(hits,-121,5),/between -120 and \+120/i);
  assert.throws(()=>analyzePocket(hits,0,0),/between 1 and 100/i);
});

test('Timing Lab v2 persistence recomputes Pocket evidence from stored hit offsets',()=>{
  const at='2026-09-26T20:00:00.000Z',pocket=analyzePocket(hits,-20,5);
  const result={
    id:'pocket-v2',createdAt:at,updatedAt:at,timingLabVersion:2,profileId:'profile-drums',
    bpm:120,meter:{beats:4,beatUnit:4},subdivision:1,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},
    durationSeconds:2,threshold:.08,inputOffsetMs:0,matchWindowMs:80,
    expectedCount:4,detectedCount:4,matchedCount:4,misses:0,extras:0,
    meanOffsetMs:-16.3,medianOffsetMs:-19,meanAbsoluteErrorMs:16.3,spreadMs:6.6,driftMsPerMinute:0,confidence:'low',
    ...pocket,hits,
  };
  assert.deepEqual(validateTimingLabResult(result),result);
  const corrupt={...result,targetBandHits:4};assert.throws(()=>validateTimingLabResult(corrupt),/must match saved hit offsets/i);
  const incomplete={...result};delete incomplete.meanTargetErrorMs;assert.throws(()=>validateTimingLabResult(incomplete),/complete target evidence/i);
});

test('Timing Lab v1 results cannot masquerade as Pocket results',()=>{
  const at='2026-09-26T20:00:00.000Z';
  const base={
    id:'timing-v1',createdAt:at,updatedAt:at,timingLabVersion:1,profileId:'profile-drums',
    bpm:120,meter:{beats:4,beatUnit:4},subdivision:1,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},
    durationSeconds:2,threshold:.08,inputOffsetMs:0,matchWindowMs:80,
    expectedCount:4,detectedCount:4,matchedCount:4,misses:0,extras:0,
    meanOffsetMs:-16.3,medianOffsetMs:-19,meanAbsoluteErrorMs:16.3,spreadMs:6.6,driftMsPerMinute:0,confidence:'low',hits,
  };
  assert.deepEqual(validateTimingLabResult(base),base);
  assert.throws(()=>validateTimingLabResult({...base,...analyzePocket(hits,-20,5)}),/cannot carry Pocket Lab/i);
});
