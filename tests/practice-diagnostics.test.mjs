import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {buildPracticeDiagnostics,DIAGNOSTICS_ENGINE_VERSION} from '../dist/app/domain/practice-diagnostics.js';
import {practiceTargetKey} from '../dist/app/domain/practice-state.js';

const at='2026-09-22T08:00:00.000Z';
function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}

function block(id,exerciseId,{result,limitations=[],seconds=300,generatedBy,progression}={}){
  return {
    id,profileId:'profile-drums',type:'exercise',sourceExerciseId:exerciseId,titleSnapshot:'Exercise',categorySnapshot:'technique',stickingSnapshot:'',
    meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,targetSeconds:seconds,actualActiveSeconds:seconds,initialBpm:80,finalBpm:80,tempoAttempts:[],notes:'',
    completed:true,skipped:false,
    ...(result?{evaluation:{id:'eval-'+id,timestamp:at,result,context:'normal',limitations,note:''}}:{}),
    ...(generatedBy?{prescriptionSnapshot:{target:{kind:'exercise',exerciseId},intent:'build',reasons:['active-priority'],generatedBy,engineVersion:1}}:{}),
    ...(progression?{progressionSnapshot:progression}:{}),
  };
}
function session(id,startedAt,blocks,status='completed'){
  return {
    id,createdAt:startedAt,updatedAt:startedAt,profileId:'profile-drums',profileNameSnapshot:'Drums',status,startedAt,endedAt:startedAt,
    activeBlockIndex:0,blocks,sessionNotes:'',runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:startedAt,metronomeOn:true},
  };
}
function state(exerciseId,overrides={}){
  const target={kind:'exercise',exerciseId},targetKey=practiceTargetKey(target);
  return {
    id:'state-'+exerciseId,createdAt:at,updatedAt:at,profileId:'profile-drums',targetKey,target,mastery:'maintain',
    latestResult:'solid',limitations:[],challenge:'hold',evidenceCount:6,recent:{solid:4,usable:1,notYet:0},
    scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},...overrides,
  };
}

test('equal selected windows compare against the immediately preceding equal-length window',()=>{
  const d=modern(),e=d.exercises[0];
  d.sessions=[
    session('p1','2026-09-10T10:00:00.000Z',[block('pb1',e.id,{result:'not-yet',seconds:600})]),
    session('p2','2026-09-12T10:00:00.000Z',[block('pb2',e.id,{result:'usable',seconds:600})]),
    session('p3','2026-09-14T10:00:00.000Z',[block('pb3',e.id,{result:'usable',seconds:600})]),
    session('c1','2026-09-17T10:00:00.000Z',[block('cb1',e.id,{result:'solid',seconds:1200})]),
    session('c2','2026-09-19T10:00:00.000Z',[block('cb2',e.id,{result:'solid',seconds:1200})]),
    session('c3','2026-09-21T10:00:00.000Z',[block('cb3',e.id,{result:'solid',seconds:1200})]),
  ];
  const x=buildPracticeDiagnostics(d,{from:'2026-09-16',to:'2026-09-22',now:at});
  assert.equal(x.engineVersion,DIAGNOSTICS_ENGINE_VERSION);
  assert.deepEqual([x.comparison.previous.from,x.comparison.previous.to],['2026-09-09','2026-09-15']);
  assert.equal(x.comparison.current.activeSeconds,3600);
  assert.equal(x.comparison.previous.activeSeconds,1800);
  assert.equal(x.comparison.activeTimeTrend,'up');
  assert.equal(x.comparison.solidShareTrend,'up');
  assert.ok(x.insights.some(row=>row.code==='result-improving'));
});

test('recurring limitation is surfaced with exact evaluated-block evidence rather than a score',()=>{
  const d=modern(),e=d.exercises[0];
  d.sessions=[
    session('1','2026-09-17T10:00:00.000Z',[block('1b',e.id,{result:'usable',limitations:['timing']})]),
    session('2','2026-09-18T10:00:00.000Z',[block('2b',e.id,{result:'usable',limitations:['timing']})]),
    session('3','2026-09-19T10:00:00.000Z',[block('3b',e.id,{result:'solid',limitations:['timing']})]),
    session('4','2026-09-20T10:00:00.000Z',[block('4b',e.id,{result:'solid',limitations:[]})]),
  ];
  const x=buildPracticeDiagnostics(d,{from:'2026-09-16',to:'2026-09-22',now:at});
  assert.equal(x.limitations[0].tag,'timing');
  assert.equal(x.limitations[0].count,3);
  assert.equal(x.limitations[0].evaluatedBlocks,4);
  const insight=x.insights.find(row=>row.code==='recurring-limitation');
  assert.ok(insight);assert.match(insight.evidence,/3 of 4/);
});

test('current practice state exposes due reviews and peak / working / cold reliability gaps',()=>{
  const d=modern(),e=d.exercises[0];
  d.practiceStates=[state(e.id,{
    nextReviewAt:'2026-09-21T08:00:00.000Z',
    tempo:{peak:130,peakAt:'2026-09-01T08:00:00.000Z',working:110,workingAt:'2026-09-10T08:00:00.000Z',cold:95,coldAt:'2026-09-12T08:00:00.000Z'},
  })];
  const x=buildPracticeDiagnostics(d,{now:at});
  assert.equal(x.dueReviews.length,1);
  assert.equal(x.dueReviews[0].label,e.name);
  assert.equal(x.tempoGaps.length,1);
  assert.deepEqual({peak:x.tempoGaps[0].peak,working:x.tempoGaps[0].working,cold:x.tempoGaps[0].cold},{peak:130,working:110,cold:95});
  assert.ok(x.insights.some(row=>row.code==='retention-backlog'));
  assert.ok(x.insights.some(row=>row.code==='tempo-reliability-gap'));
});

test('generated practice follow-through and repeated skips are reported separately from mastery',()=>{
  const d=modern(),e=d.exercises[0];
  d.sessions=[
    session('1','2026-09-17T10:00:00.000Z',[block('1b',e.id,{result:'solid',generatedBy:'autopilot'})]),
    session('2','2026-09-18T10:00:00.000Z',[{...block('2b',e.id,{generatedBy:'autopilot'}),completed:false,skipped:true,actualActiveSeconds:0}]),
    session('3','2026-09-19T10:00:00.000Z',[{...block('3b',e.id,{generatedBy:'set-prep'}),completed:false,skipped:true,actualActiveSeconds:0}]),
    session('4','2026-09-20T10:00:00.000Z',[block('4b',e.id,{result:'usable',generatedBy:'set-prep'})]),
  ];
  const x=buildPracticeDiagnostics(d,{from:'2026-09-16',to:'2026-09-22',now:at});
  assert.deepEqual(x.comparison.current.generated,{blocks:4,completed:2,skipped:2,endedEarly:0});
  assert.ok(x.insights.some(row=>row.code==='generated-skips'));
});

test('repeated Not Yet results on the same progression dimension expose progression friction',()=>{
  const d=modern(),e=d.exercises[0],progression={engineVersion:1,direction:'advance',dimension:'click-density',level:1,summary:'Click on 2 & 4',cue:'Keep time.',bpm:80,targetSeconds:300,subdivision:1,timingClick:{mode:'two-four',sparseEvery:2,gapClickBars:3,gapSilentBars:1}};
  d.sessions=[
    session('1','2026-09-17T10:00:00.000Z',[block('1b',e.id,{result:'not-yet',progression})]),
    session('2','2026-09-18T10:00:00.000Z',[block('2b',e.id,{result:'not-yet',progression})]),
    session('3','2026-09-19T10:00:00.000Z',[block('3b',e.id,{result:'usable',progression})]),
  ];
  const x=buildPracticeDiagnostics(d,{from:'2026-09-16',to:'2026-09-22',now:at});
  assert.equal(x.progression[0].dimension,'click-density');
  assert.deepEqual({blocks:x.progression[0].blocks,notYet:x.progression[0].notYet,usable:x.progression[0].usable,solid:x.progression[0].solid},{blocks:3,notYet:2,usable:1,solid:0});
  assert.ok(x.insights.some(row=>row.code==='progression-friction'));
});

test('current mastery distribution remains a state snapshot independent of selected date range',()=>{
  const d=modern(),a=d.exercises[0],b=d.exercises[1];
  d.sessions=[];d.practiceStates=[state(a.id,{mastery:'build'}),state(b.id,{mastery:'maintain'})];
  const x=buildPracticeDiagnostics(d,{from:'2026-09-16',to:'2026-09-22',now:at});
  assert.deepEqual(x.mastery,[{mastery:'build',count:1},{mastery:'maintain',count:1}]);
  assert.equal(x.states.length,2);
});
