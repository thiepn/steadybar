import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDrumGrid, cycleDrumGridCell, drumGridStepCount, drumGridStepLabels, mirrorDrumGrid, rotateDrumGrid } from '../dist/app/domain/drum-grid.js';
import { validateProtocol } from '../dist/app/domain/practice-validation.js';
import { createSession } from '../dist/app/practice/logic.js';
import { migratePracticeData } from '../dist/app/db/practice-model-migration.js';
import { seedData } from '../dist/app/db/seed.js';

const at='2026-09-25T03:00:00.000Z';
const drums=()=>migratePracticeData(seedData(at));

test('drum grid generation is deterministic for a preset, variation and complexity',()=>{
  const a=buildDrumGrid('kick-displacement',92,4,3,4),b=buildDrumGrid('kick-displacement',92,4,3,4);
  assert.deepEqual(a,b);assert.equal(a.pulse.bpm,92);assert.equal(drumGridStepCount(a),16);
  assert.ok(a.lanes.every(lane=>lane.steps.length===16));
});

test('all drum grid preset families produce valid bounded protocols',()=>{
  for(const preset of ['accent-grid','kick-displacement','linear-flow','four-limb-cycle','independence']){
    for(const subdivision of [1,2,3,4]){
      const protocol=buildDrumGrid(preset,80,subdivision,2,5);
      assert.deepEqual(validateProtocol(protocol),protocol);
      assert.equal(protocol.lanes.length,4);assert.equal(protocol.lanes[0].steps.length,4*subdivision);
    }
  }
});

test('grid labels preserve beat boundaries for straight and triplet subdivisions',()=>{
  assert.deepEqual(drumGridStepLabels(2,4),['1','e','&','a','2','e','&','a']);
  assert.deepEqual(drumGridStepLabels(2,3),['1','trip','let','2','trip','let']);
});

test('grid cell editing cycles rest to hit to accent to rest without changing other cells',()=>{
  const base=buildDrumGrid('accent-grid',80,4,0,1),voice=base.lanes[0].voice,index=1,before=base.lanes[0].steps;
  const a=cycleDrumGridCell(base,voice,index),b=cycleDrumGridCell(a,voice,index),c=cycleDrumGridCell(b,voice,index);
  assert.equal(a.lanes[0].steps[index],'x');assert.equal(b.lanes[0].steps[index],'X');assert.equal(c.lanes[0].steps[index],'.');
  assert.equal(base.lanes[0].steps,before);
});

test('rotation and hand mirroring are immutable and preserve pattern density',()=>{
  const base=buildDrumGrid('linear-flow',80,4,1,3),rotated=rotateDrumGrid(base,1),mirrored=mirrorDrumGrid(base);
  assert.notDeepEqual(rotated,base);assert.notDeepEqual(mirrored,base);
  const density=p=>p.lanes.reduce((n,l)=>n+[...l.steps].filter(v=>v!=='').filter(v=>v!=='.').length,0);
  assert.equal(density(rotated),density(base));assert.equal(density(mirrored),density(base));
  assert.deepEqual(mirrorDrumGrid(mirrored),base);
});

test('validation rejects duplicate voices, malformed symbols and mismatched step counts',()=>{
  const base=buildDrumGrid('kick-displacement',80,4,0,2);
  assert.throws(()=>validateProtocol({...base,lanes:[base.lanes[0],base.lanes[0]]}),/unique/i);
  assert.throws(()=>validateProtocol({...base,lanes:base.lanes.map((lane,i)=>i?lane:{...lane,steps:'xxxxxxxx'})}),/pulse length/i);
  assert.throws(()=>validateProtocol({...base,lanes:base.lanes.map((lane,i)=>i?lane:{...lane,steps:'z'.repeat(16)})}),/only/i);
});

test('a drum grid free block snapshots as a normal tempo-aware practice task',()=>{
  const d=drums(),profile=d.profiles.find(p=>p.instrumentType==='drums'),protocol=buildDrumGrid('four-limb-cycle',96,4,1,3);
  const s=createSession([{id:'grid-block',type:'free',profileId:profile.id,title:'Grid test',targetSeconds:300,bpm:96,protocol,notes:'Keep it relaxed.',order:0}],d);
  const block=s.blocks[0];
  assert.equal(block.protocolSnapshot.kind,'drum-grid');assert.equal(block.initialBpm,96);assert.equal(block.subdivisionSnapshot,4);assert.equal(s.runtime.metronomeOn,true);
  assert.equal(block.profileId,profile.id);assert.equal(block.notes,'Keep it relaxed.');
});
