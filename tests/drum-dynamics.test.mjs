import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDrumDynamics,cycleDrumDynamicsCell,drumDynamicsLevelLabel,drumDynamicsText} from '../dist/app/domain/drum-dynamics.js';
import {validateProtocol} from '../dist/app/domain/practice-validation.js';

test('all dynamics presets are deterministic, bounded, and valid across supported subdivisions',()=>{
  for(const preset of ['accent-tap','ghost-backbeat','dynamic-arc','voice-balance','low-volume']){
    for(const subdivision of [2,3,4]){
      const a=buildDrumDynamics(preset,88,subdivision,2),b=buildDrumDynamics(preset,88,subdivision,2);
      assert.deepEqual(a,b);assert.deepEqual(validateProtocol(a),a);
      assert.equal(a.pulse.bpm,88);assert.equal(a.pulse.subdivision,subdivision);
      assert.ok(a.lanes.length>=1&&a.lanes.length<=5);
      assert.ok(a.lanes.every(lane=>lane.steps.length===4*subdivision&&/^[.123]+$/.test(lane.steps)));
    }
  }
});

test('accent/tap variation moves a strong target while preserving quiet taps',()=>{
  const a=buildDrumDynamics('accent-tap',80,4,0),b=buildDrumDynamics('accent-tap',80,4,1);
  const sa=a.lanes.find(lane=>lane.surface==='snare').steps,sb=b.lanes.find(lane=>lane.surface==='snare').steps;
  assert.equal(sa[0],'3');assert.equal(sb[1],'3');assert.notEqual(sa,sb);
  assert.ok(sa.includes('1')&&sa.includes('3'));
});

test('ghost/backbeat and voice-balance patterns preserve an explicit relative hierarchy',()=>{
  const ghost=buildDrumDynamics('ghost-backbeat',80,4,0),snare=ghost.lanes.find(lane=>lane.surface==='snare').steps,hihat=ghost.lanes.find(lane=>lane.surface==='hihat').steps,kick=ghost.lanes.find(lane=>lane.surface==='kick').steps;
  assert.ok(snare.includes('1')&&snare.includes('3'));assert.ok(hihat.includes('2'));assert.ok(kick.includes('2'));
  const balance=buildDrumDynamics('voice-balance',80,4,0);
  assert.ok(balance.lanes.find(lane=>lane.surface==='hihat').steps.includes('1'));
  assert.ok(balance.lanes.find(lane=>lane.surface==='snare').steps.includes('3'));
  assert.ok(balance.lanes.find(lane=>lane.surface==='kick').steps.includes('2'));
});

test('dynamic arc reaches soft medium and strong levels without changing rhythmic density',()=>{
  for(const subdivision of [2,3,4]){
    const arc=buildDrumDynamics('dynamic-arc',80,subdivision,0),steps=arc.lanes.find(lane=>lane.surface==='snare').steps;
    assert.equal([...steps].filter(value=>value!=='.').length,4*subdivision);
    for(const level of ['1','2','3'])assert.ok(steps.includes(level),`missing level ${level} at subdivision ${subdivision}`);
  }
});

test('low-volume groove never introduces medium or strong targets',()=>{
  const low=buildDrumDynamics('low-volume',72,4,0);
  assert.ok(low.lanes.every(lane=>!/2|3/.test(lane.steps)));
  assert.ok(low.lanes.some(lane=>lane.steps.includes('1')));
});

test('dynamics cell editing cycles rest soft medium strong rest immutably',()=>{
  const base=buildDrumDynamics('low-volume',80,4,0),surface='snare',index=0;
  let protocol={...base,lanes:[...base.lanes.filter(lane=>lane.surface!==surface),{surface,steps:'.'.repeat(16)}]};
  const original=structuredClone(protocol);
  protocol=cycleDrumDynamicsCell(protocol,surface,index);assert.equal(protocol.lanes.find(lane=>lane.surface===surface).steps[index],'1');
  protocol=cycleDrumDynamicsCell(protocol,surface,index);assert.equal(protocol.lanes.find(lane=>lane.surface===surface).steps[index],'2');
  protocol=cycleDrumDynamicsCell(protocol,surface,index);assert.equal(protocol.lanes.find(lane=>lane.surface===surface).steps[index],'3');
  protocol=cycleDrumDynamicsCell(protocol,surface,index);assert.equal(protocol.lanes.find(lane=>lane.surface===surface).steps[index],'.');
  assert.equal(original.lanes.find(lane=>lane.surface===surface).steps[index],'.');
});

test('dynamics validation rejects malformed levels, duplicate surfaces, empty scores and wrong lengths',()=>{
  const base=buildDrumDynamics('accent-tap',80,4,0);
  const malformed=structuredClone(base);malformed.lanes[0].steps='x'.repeat(16);assert.throws(()=>validateProtocol(malformed),/1, 2, or 3/i);
  const duplicate=structuredClone(base);duplicate.lanes.push(structuredClone(duplicate.lanes[0]));assert.throws(()=>validateProtocol(duplicate),/unique/i);
  const short=structuredClone(base);short.lanes[0].steps='123';assert.throws(()=>validateProtocol(short),/pulse length/i);
  assert.throws(()=>validateProtocol({...base,lanes:[{surface:'snare',steps:'.'.repeat(16)}]}),/active hit/i);
});

test('dynamics helpers remain descriptive rather than absolute-loudness claims',()=>{
  assert.equal(drumDynamicsLevelLabel('1'),'Soft / ghost');
  assert.equal(drumDynamicsLevelLabel('2'),'Medium');
  assert.equal(drumDynamicsLevelLabel('3'),'Strong / accent');
  const text=drumDynamicsText(buildDrumDynamics('voice-balance',80,4,0));
  for(const label of ['SN','HH','K'])assert.match(text,new RegExp('^'+label,'m'));
  assert.doesNotMatch(text,/dB|decibel/i);
});
