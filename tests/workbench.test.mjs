import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCleanTempoIndex, calculateBestCleanBpm, exerciseAttempts} from '../dist/app/domain/analytics.js';
import {seedData} from '../dist/app/db/seed.js';
import {createSession} from '../dist/app/practice/logic.js';

function session(status='completed',id='rudiment-1',ratings=[[100,'clean']]) {
  const data=seedData(),s=createSession(data.routines[0].blocks,data);
  s.status=status;s.blocks=s.blocks.slice(0,1);s.blocks[0].sourceExerciseId=id;
  s.blocks[0].tempoAttempts=ratings.map(([bpm,rating],i)=>({id:`attempt-${i}`,bpm,rating,timestamp:s.startedAt,note:''}));
  return s;
}
test('clean-tempo index excludes active sessions and unsuccessful ratings',()=>{
  const data=[session('active','rudiment-1',[[290,'clean']]),session('completed','rudiment-1',[[110,'clean'],[200,'messy'],[150,'acceptable'],[300,'failed']])];
  assert.equal(buildCleanTempoIndex(data).get('rudiment-1'),110);
});
test('clean-tempo index includes saved early endings and effortless attempts',()=>{
  assert.equal(buildCleanTempoIndex([session('completed'),session('abandoned','rudiment-1',[[120,'effortless']])]).get('rudiment-1'),120);
});
test('no clean record is not reported as a measured zero or default tempo',()=>{
  const data=[session('completed','rudiment-1',[[80,'acceptable']])];assert.equal(buildCleanTempoIndex(data).has('rudiment-1'),false);assert.equal(buildCleanTempoIndex([]).size,0);
});
test('clean-tempo index preserves independently measured exercise records',()=>{
  const data=[session('completed','one',[[120,'clean']]),session('completed','two',[[80,'clean']])];
  assert.deepEqual([...buildCleanTempoIndex(data)],[['one',120],['two',80]]);
});
test('clean-tempo index agrees with established per-exercise analytics',()=>{
  const ratings=['clean','acceptable','effortless','messy','failed'];const data=[];
  for(let i=0;i<300;i++)data.push(session(i%7===0?'active':i%5===0?'abandoned':'completed',`exercise-${i%17}`,Array.from({length:10},(_,j)=>[20+(i+j)%281,ratings[(i+j)%5]])));
  const indexed=buildCleanTempoIndex(data);
  for(let i=0;i<17;i++){const id=`exercise-${i}`;assert.equal(indexed.get(id),calculateBestCleanBpm(exerciseAttempts(data,id)));}
});
test('index scans a large attempt history without spreading arguments or mutating records',()=>{
  const s=session(),block=s.blocks[0];block.tempoAttempts=Array.from({length:200000},(_,i)=>({bpm:20+i%281,rating:i%2?'clean':'failed'}));
  assert.equal(buildCleanTempoIndex([s]).get('rudiment-1'),300);assert.equal(block.tempoAttempts.length,200000);
});
