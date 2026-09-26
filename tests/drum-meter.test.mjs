import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDrumMeter,cycleDrumMeterCell,drumMeterAccents,drumMeterGroupStarts,drumMeterGroupingText,drumMeterStepGroupStarts,DRUM_METER_PRESETS} from '../dist/app/domain/drum-meter.js';
import {validateProtocol,assertProtocolCompatible} from '../dist/app/domain/practice-validation.js';
import {definition} from '../dist/app/domain/profiles.js';

const drumProfile={id:'drums',name:'Drums',instrumentType:'drums',family:'percussion',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:'2026-09-27T00:00:00.000Z',updatedAt:'2026-09-27T00:00:00.000Z'};
const guitarProfile={...drumProfile,id:'guitar',name:'Guitar',instrumentType:'guitar',family:definition('guitar').family};

test('every odd-meter preset has positive groups that exactly fill its notated meter',()=>{
  for(const preset of DRUM_METER_PRESETS){
    assert.ok(preset.grouping.length>=2);
    assert.ok(preset.grouping.every(value=>Number.isInteger(value)&&value>0));
    assert.equal(preset.grouping.reduce((sum,value)=>sum+value,0),preset.beats,preset.id);
    assert.ok([4,8].includes(preset.beatUnit));
  }
});

test('group-start accents land exactly on authored beat groups',()=>{
  assert.deepEqual(drumMeterGroupStarts([2,2,3]),[0,2,4]);
  assert.deepEqual(drumMeterAccents([2,2,3]),[2,1,2,1,2,1,1]);
  assert.deepEqual(drumMeterStepGroupStarts([2,2,3],2),[0,4,8]);
  assert.equal(drumMeterGroupingText([2,2,3]),'2+2+3');
});

test('all meter/pattern combinations are deterministic and restore-valid',()=>{
  for(const preset of DRUM_METER_PRESETS){
    for(const pattern of ['count','anchors','start-end','alternating-groups']){
      for(const subdivision of [1,2]){
        const a=buildDrumMeter(preset.id,pattern,undefined,subdivision,3),b=buildDrumMeter(preset.id,pattern,undefined,subdivision,3);
        assert.deepEqual(a,b);assert.deepEqual(validateProtocol(a),a);assertProtocolCompatible(a,drumProfile);
        assert.equal(a.pulse.beats,preset.beats);assert.equal(a.pulse.beatUnit,preset.beatUnit);assert.equal(a.pulse.subdivision,subdivision);
        assert.deepEqual(a.grouping,preset.grouping);assert.ok(a.lanes.every(lane=>lane.steps.length===preset.beats*subdivision));
      }
    }
  }
});

test('count pattern accents group starts without changing subdivision spacing',()=>{
  const p=buildDrumMeter('7-8-2-2-3','count',105,2,0),rh=p.lanes.find(lane=>lane.voice==='right-hand');
  assert.ok(rh);assert.equal(rh.steps.length,14);
  assert.deepEqual([...rh.steps].map((cell,index)=>cell==='X'?index:-1).filter(index=>index>=0),[0,4,8]);
  assert.equal([...rh.steps].filter(cell=>cell!=='x'&&cell!=='X').length,0);
});

test('alternating-group variation flips the lead without changing the grouping',()=>{
  const a=buildDrumMeter('5-8-2-3','alternating-groups',110,1,0),b=buildDrumMeter('5-8-2-3','alternating-groups',110,1,1);
  assert.deepEqual(a.grouping,b.grouping);assert.notDeepEqual(a.lanes,b.lanes);
  assert.equal(a.lanes.find(lane=>lane.voice==='right-hand').steps.slice(0,2),'Xx');
  assert.equal(b.lanes.find(lane=>lane.voice==='left-hand').steps.slice(0,2),'Xx');
});

test('meter cell editing cycles rest hit accent rest immutably',()=>{
  const base=buildDrumMeter('7-8-2-2-3','count',105,1,0),voice='kick',index=1;
  const withLane={...base,lanes:[...base.lanes.filter(lane=>lane.voice!==voice),{voice,steps:'.'.repeat(7)}]},original=structuredClone(withLane);
  const a=cycleDrumMeterCell(withLane,voice,index),b=cycleDrumMeterCell(a,voice,index),c=cycleDrumMeterCell(b,voice,index);
  assert.equal(a.lanes.find(lane=>lane.voice===voice).steps[index],'x');
  assert.equal(b.lanes.find(lane=>lane.voice===voice).steps[index],'X');
  assert.equal(c.lanes.find(lane=>lane.voice===voice).steps[index],'.');
  assert.deepEqual(withLane,original);
});

test('meter validation rejects broken grouping, cells, lanes and non-percussion use',()=>{
  const base=buildDrumMeter('7-8-2-2-3','anchors',105,1,0);
  assert.throws(()=>validateProtocol({...base,grouping:[2,2,2]}),/sum to the meter beats/i);
  const duplicate=structuredClone(base);duplicate.lanes.push(structuredClone(duplicate.lanes[0]));assert.throws(()=>validateProtocol(duplicate),/unique/i);
  const wrongLength=structuredClone(base);wrongLength.lanes[0].steps='x';assert.throws(()=>validateProtocol(wrongLength),/pulse length/i);
  const invalid=structuredClone(base);invalid.lanes[0].steps='z'.repeat(7);assert.throws(()=>validateProtocol(invalid),/only/i);
  assert.throws(()=>validateProtocol({...base,lanes:[{voice:'kick',steps:'.'.repeat(7)}]}),/active hit/i);
  assert.throws(()=>assertProtocolCompatible(base,guitarProfile),/not supported|percussion/i);
});
