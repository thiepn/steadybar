import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {activeProfile} from '../dist/app/domain/profiles.js';
import {buildPracticeLoadCalibration} from '../dist/app/domain/practice-load.js';
import {buildWeeklySchedule} from '../dist/app/domain/weekly-schedule.js';
import {buildTrainingPlan} from '../dist/app/domain/training-plan.js';
import {validateWeeklySchedule} from '../dist/app/domain/validation.js';

const at='2026-09-20T08:00:00.000Z',monday='2026-09-21';
function modern(){
  const data=migratePracticeModel(migratePracticeData(seedData(at)));
  data.trainingPlans=[];data.weeklySchedules=[];data.recordings=[];data.goals=[];data.sessions=[];
  return data;
}
function practiceSession(profile,date,minutes,id){
  const seconds=minutes*60,startedAt=date+'T10:00:00.000Z',endedAt=date+'T11:00:00.000Z';
  return {
    id,createdAt:startedAt,updatedAt:endedAt,profileId:profile.id,profileNameSnapshot:profile.name,
    status:'completed',startedAt,endedAt,activeBlockIndex:0,sessionNotes:'',
    runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:endedAt,metronomeOn:false},
    blocks:[{
      id:'block-'+id,profileId:profile.id,profileNameSnapshot:profile.name,type:'free',titleSnapshot:'Calibrated practice',
      categorySnapshot:'other',stickingSnapshot:'',meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,
      targetSeconds:seconds,actualActiveSeconds:seconds,tempoAttempts:[],notes:'',completed:true,skipped:false,
      protocolSnapshot:{kind:'free',focus:'Practice'},
    }],
  };
}
function addWeeks(data,profile,minutes=30){
  const weeks=[
    ['2026-08-11','2026-08-13','2026-08-15'],
    ['2026-08-18','2026-08-20','2026-08-22'],
    ['2026-08-25','2026-08-27','2026-08-29'],
    ['2026-09-01','2026-09-03','2026-09-05'],
    ['2026-09-08','2026-09-10','2026-09-12'],
    ['2026-09-15','2026-09-17','2026-09-19'],
  ];
  data.sessions=weeks.flatMap((dates,w)=>dates.map((date,d)=>practiceSession(profile,date,minutes,`s-${w}-${d}`)));
}

test('load calibration learns stable active-day duration and weekday preference from the preceding six weeks',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,30);
  const calibration=buildPracticeLoadCalibration(data,profile.id,monday,90);
  assert.equal(calibration.confidence,'high');
  assert.equal(calibration.observedActiveWeeks,6);
  assert.equal(calibration.observedActiveDays,18);
  assert.equal(calibration.observedSessions,18);
  assert.equal(calibration.typicalActiveDayMinutes,30);
  assert.equal(calibration.medianActiveWeekMinutes,90);
  assert.equal(calibration.suggestedWeeklyMinutes,90);
  assert.equal(calibration.suggestedPracticeDays,3);
  assert.deepEqual(calibration.preferredWeekdays.slice(0,3),[1,3,5]);
});

test('adaptive Calendar uses learned weekday placement while preserving exact weekly minutes',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,30);
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,now:at});
  const practice=schedule.days.map((day,index)=>day.kind==='practice'?index:-1).filter(index=>index>=0);
  assert.deepEqual(practice,[1,3,5]);
  assert.equal(schedule.targetMinutes,90);
  assert.equal(schedule.days.filter(day=>day.kind==='practice').reduce((sum,day)=>sum+day.plannedMinutes,0),90);
  assert.equal(schedule.source.loadCalibration?.confidence,'high');
  assert.equal(schedule.source.loadCalibration?.patternAdjusted,true);
  assert.doesNotThrow(()=>validateWeeklySchedule(schedule));
});

test('profile-default weekly load adapts gradually and is bounded to thirty percent per generation',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,40);
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,now:at});
  assert.equal(schedule.source.loadCalibration?.baselineWeeklyMinutes,90);
  assert.equal(schedule.source.loadCalibration?.medianActiveWeekMinutes,120);
  assert.equal(schedule.source.loadCalibration?.suggestedWeeklyMinutes,115);
  assert.equal(schedule.targetMinutes,115);
  assert.equal(schedule.source.loadCalibration?.loadAdjusted,true);
});

test('manual Calendar minutes are not mislabeled as an accepted adaptive-load suggestion',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,40);
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,targetMinutes:100,now:at});
  assert.equal(schedule.targetMinutes,100);
  assert.equal(schedule.source.loadCalibration?.suggestedWeeklyMinutes,115);
  assert.equal(schedule.source.loadCalibration?.loadAdjusted,false);
});

test('explicit weekly-minute goals remain authoritative even when recent observed load is lower',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,20);
  data.goals=[{id:'minutes-goal',createdAt:at,updatedAt:at,profileId:profile.id,type:'weekly-minutes',title:'150 minute week',description:'',targetValue:150,unit:'minutes',completed:false}];
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,now:at});
  assert.equal(schedule.targetMinutes,150);
  assert.equal(schedule.source.loadCalibration?.targetSource,'weekly-goal');
  assert.equal(schedule.source.loadCalibration?.baselineWeeklyMinutes,150);
  assert.equal(schedule.source.loadCalibration?.loadAdjusted,false);
});

test('active Training Cycle load remains authoritative while calibration may still place practice days',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,20);
  const plan=buildTrainingPlan(data,{profileId:profile.id,name:'Explicit cycle',startOn:'2026-09-01',endOn:'2026-11-30',baselineWeeklyMinutes:180,goalIds:[],setlistIds:[],now:at});
  data.trainingPlans=[{...plan,status:'active'}];
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,now:at});
  assert.equal(schedule.source.loadCalibration?.targetSource,'training-plan');
  assert.equal(schedule.source.loadCalibration?.loadAdjusted,false);
  assert.equal(schedule.targetMinutes,schedule.source.loadCalibration?.baselineWeeklyMinutes);
});

test('low evidence never changes load or legacy weekday pattern',()=>{
  const data=modern(),profile=activeProfile(data);
  data.sessions=[practiceSession(profile,'2026-09-15',20,'only-session')];
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:true,now:at});
  assert.equal(schedule.source.loadCalibration?.confidence,'low');
  assert.equal(schedule.targetMinutes,90);
  assert.deepEqual(schedule.days.map((day,index)=>day.kind==='practice'?index:-1).filter(index=>index>=0),[0,2,4]);
  assert.equal(schedule.source.loadCalibration?.loadAdjusted,false);
  assert.equal(schedule.source.loadCalibration?.patternAdjusted,false);
});

test('disabling calibration reproduces the legacy target and Monday-Wednesday-Friday pattern',()=>{
  const data=modern(),profile=activeProfile(data);addWeeks(data,profile,40);
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:monday,adaptiveLoad:false,now:at});
  assert.equal(schedule.targetMinutes,90);
  assert.deepEqual(schedule.days.map((day,index)=>day.kind==='practice'?index:-1).filter(index=>index>=0),[0,2,4]);
  assert.equal(schedule.source.loadCalibration,undefined);
});
