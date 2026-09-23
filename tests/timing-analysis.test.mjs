import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTiming,buildExpectedTimingGrid,timingBiasLabel,timingMatchWindowMs} from '../dist/app/domain/timing-analysis.js';

const config={bpm:120,meter:{beats:4,beatUnit:4},subdivision:2};

test('expected timing grid follows the selected subdivision on a stable audio-time origin',()=>{
  const grid=buildExpectedTimingGrid(config,10,4);
  assert.equal(grid.length,16);
  assert.equal(grid[0].time,10);
  assert.equal(grid[1].time,10.25);
  assert.deepEqual(grid.slice(0,5).map(hit=>[hit.bar,hit.beat,hit.part]),[[0,0,0],[0,0,1],[0,1,0],[0,1,1],[0,2,0]]);
  assert.equal(timingMatchWindowMs(config),113);
});

test('perfect detected attacks produce centered zero-error high-confidence analysis',()=>{
  const expected=buildExpectedTimingGrid(config,5,8);
  const detected=expected.map(hit=>({time:hit.time,strength:.5}));
  const result=analyzeTiming(expected,detected,0,80);
  assert.equal(result.matchedCount,expected.length);
  assert.equal(result.misses,0);assert.equal(result.extras,0);
  assert.equal(result.meanOffsetMs,0);assert.equal(result.meanAbsoluteErrorMs,0);assert.equal(result.spreadMs,0);assert.equal(result.driftMsPerMinute,0);
  assert.equal(result.confidence,'high');assert.equal(timingBiasLabel(result.meanOffsetMs),'centered');
});

test('constant late attacks preserve signed bias and input compensation can remove known latency',()=>{
  const expected=buildExpectedTimingGrid(config,5,8);
  const detected=expected.map(hit=>({time:hit.time+.02,strength:.6}));
  const raw=analyzeTiming(expected,detected,0,80);
  assert.equal(raw.meanOffsetMs,20);assert.equal(raw.meanAbsoluteErrorMs,20);assert.equal(timingBiasLabel(raw.meanOffsetMs),'late');
  const compensated=analyzeTiming(expected,detected,20,80);
  assert.equal(compensated.meanOffsetMs,0);assert.equal(compensated.meanAbsoluteErrorMs,0);
});

test('matching is one-to-one and reports missed and extra attacks without double counting',()=>{
  const expected=buildExpectedTimingGrid(config,2,4);
  const detected=expected.filter((_,index)=>index!==3).map(hit=>({time:hit.time,strength:.4}));
  detected.push({time:expected[4].time+.04,strength:.3});
  const result=analyzeTiming(expected,detected,0,20);
  assert.equal(result.matchedCount,expected.length-1);
  assert.equal(result.misses,1);
  assert.equal(result.extras,1);
  assert.equal(new Set(result.hits.map(hit=>hit.index)).size,result.hits.length);
});

test('linear late drift is reported as a per-minute slope while spread remains independent',()=>{
  const expected=buildExpectedTimingGrid(config,20,12);
  const detected=expected.map(hit=>{
    const offsetMs=hit.elapsedMs/1000*3;
    return {time:hit.time+offsetMs/1000,strength:.55};
  });
  const result=analyzeTiming(expected,detected,0,100);
  assert.ok(result.driftMsPerMinute>170&&result.driftMsPerMinute<190,String(result.driftMsPerMinute));
  assert.ok(result.meanOffsetMs>15);
  assert.equal(result.confidence,'high');
});

test('sparse matched evidence remains low confidence instead of becoming a timing score',()=>{
  const expected=buildExpectedTimingGrid(config,1,8);
  const detected=expected.slice(0,4).map(hit=>({time:hit.time+.01,strength:.5}));
  const result=analyzeTiming(expected,detected,0,80);
  assert.equal(result.confidence,'low');
  assert.equal(result.matchedCount,4);
  assert.ok(result.misses>0);
});
