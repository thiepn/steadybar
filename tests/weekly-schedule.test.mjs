import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {activeProfile} from '../dist/app/domain/profiles.js';
import {buildTrainingPlan} from '../dist/app/domain/training-plan.js';
import {applyWeeklySchedule,buildWeeklySchedule,saveGeneratedWeeklySchedule,updateWeeklyScheduleDay,weeklyScheduleActuals,weekStartFor} from '../dist/app/domain/weekly-schedule.js';
import {buildAutopilotPlan} from '../dist/app/domain/autopilot.js';
import {validateData,validateWeeklySchedule} from '../dist/app/domain/validation.js';

const at='2026-09-22T08:00:00.000Z',monday='2026-09-21';
function modern(){const d=migratePracticeModel(migratePracticeData(seedData(at)));d.trainingPlans=[];d.weeklySchedules=[];return d;}

test('weekStartFor resolves Monday and generated days cover Monday through Sunday exactly',()=>{
  assert.equal(weekStartFor('2026-09-22'),monday);
  const d=modern(),p=activeProfile(d),schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:120,practiceDays:4,now:at});
  assert.equal(schedule.status,'draft');assert.equal(schedule.weekStart,monday);assert.equal(schedule.days.length,7);
  assert.deepEqual(schedule.days.map(row=>row.date),['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27']);
  assert.equal(schedule.days.filter(row=>row.kind==='practice').length,4);
  assert.equal(schedule.days.filter(row=>row.kind==='practice').reduce((sum,row)=>sum+row.plannedMinutes,0),120);
  assert.equal(schedule.targetMinutes,120);assert.doesNotThrow(()=>validateWeeklySchedule(schedule));
});

test('generation is runtime-only until saved and applied',()=>{
  const d=modern(),p=activeProfile(d),before=JSON.stringify(d),schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:90,practiceDays:3,now:at});
  assert.equal(JSON.stringify(d),before);
  let next=saveGeneratedWeeklySchedule(d,schedule);assert.equal(next.weeklySchedules.length,1);assert.equal(next.weeklySchedules[0].status,'draft');assert.equal(next.dailyPlans.length,d.dailyPlans.length);
  next=applyWeeklySchedule(next,schedule.id,at);assert.equal(next.weeklySchedules[0].status,'applied');assert.equal(next.dailyPlans.length,d.dailyPlans.length);
});

test('active training phase supplies weekly target and source snapshot without becoming a hard reference',()=>{
  const d=modern(),p=activeProfile(d),plan=buildTrainingPlan(d,{profileId:p.id,name:'Calendar source',startOn:'2026-09-01',endOn:'2026-11-30',baselineWeeklyMinutes:180,goalIds:[],setlistIds:[],now:at});
  d.trainingPlans=[{...plan,status:'active'}];
  const phase=plan.phases.find(row=>row.startOn<=monday&&row.endOn>='2026-09-27');assert.ok(phase);
  const schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,now:at});
  assert.equal(schedule.targetMinutes,phase.weeklyMinutes);
  assert.equal(schedule.source.trainingPlanId,plan.id);assert.ok(schedule.source.trainingPhaseIds.includes(phase.id));assert.ok(schedule.source.trainingPhaseNames.includes(phase.name));
  assert.doesNotThrow(()=>validateData({...d,weeklySchedules:[schedule]}));
});

test('active one-week priority selects a matching calendar emphasis ahead of the long-term phase',()=>{
  const d=modern(),p=activeProfile(d),timing=d.exercises.find(row=>row.profileId===p.id&&row.primarySkillId?.endsWith('.timing'));assert.ok(timing?.primarySkillId);
  d.priorityCycles=[{id:'weekly-priority',createdAt:at,updatedAt:at,profileId:p.id,name:'Timing week',status:'active',startedOn:monday,items:[{id:'timing-item',skillId:timing.primarySkillId,weight:3,note:''}]}];
  const schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:90,practiceDays:3,now:at});
  assert.equal(schedule.source.priorityCycleId,'weekly-priority');
  assert.ok(schedule.days.filter(row=>row.kind==='practice').every(row=>row.intent==='timing'));
});

test('editing day type recomputes planned weekly target and rest always stores zero minutes',()=>{
  const d=modern(),p=activeProfile(d),schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:90,practiceDays:3,now:at});
  d.weeklySchedules=[schedule];const day=schedule.days.find(row=>row.kind==='practice');assert.ok(day);
  const next=updateWeeklyScheduleDay(d,schedule.id,day.id,{kind:'rest',plannedMinutes:90,intent:'songs',note:'Intentional day off'},at),saved=next.weeklySchedules[0],edited=saved.days.find(row=>row.id===day.id);
  assert.equal(edited.kind,'rest');assert.equal(edited.plannedMinutes,0);assert.ok(saved.targetMinutes<90);assert.doesNotThrow(()=>validateData(next));
});

test('optional minutes are visible planning context but excluded from targetMinutes',()=>{
  const d=modern(),p=activeProfile(d),schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:90,practiceDays:3,includeOptionalDay:true,now:at});
  const optional=schedule.days.find(row=>row.kind==='optional');assert.ok(optional);assert.ok(optional.plannedMinutes>=5);
  assert.equal(schedule.targetMinutes,schedule.days.filter(row=>row.kind==='practice').reduce((sum,row)=>sum+row.plannedMinutes,0));
});

test('actuals report recorded time and scheduled-day activity without an adherence score',()=>{
  const d=modern(),p=activeProfile(d),schedule=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:60,practiceDays:2,now:at}),practice=schedule.days.filter(row=>row.kind==='practice');
  const make=(id,date,seconds)=>({id,createdAt:date+'T10:00:00.000Z',updatedAt:date+'T10:30:00.000Z',profileId:p.id,profileNameSnapshot:p.name,status:'completed',startedAt:date+'T10:00:00.000Z',endedAt:date+'T10:30:00.000Z',activeBlockIndex:0,sessionNotes:'',runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:date+'T10:30:00.000Z',metronomeOn:true},blocks:[{id:'b-'+id,profileId:p.id,type:'free',titleSnapshot:'Practice',categorySnapshot:'other',stickingSnapshot:'',meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,targetSeconds:seconds,actualActiveSeconds:seconds,tempoAttempts:[],notes:'',completed:true,skipped:false,protocolSnapshot:{kind:'free',focus:'Practice'}}]});
  d.sessions=[make('s1',practice[0].date,900)];
  const actual=weeklyScheduleActuals(d,schedule);
  assert.equal(actual.activeSeconds,900);assert.equal(actual.activeDays,1);assert.equal(actual.scheduledPracticeDays,2);assert.equal(actual.practiceDaysWithActivity,1);
  assert.equal('score' in actual,false);assert.equal('percent' in actual,false);
});

test('validation rejects duplicate profile/week schedules and malformed rest days',()=>{
  const d=modern(),p=activeProfile(d),a=buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:60,practiceDays:2,now:at}),b={...buildWeeklySchedule(d,{profileId:p.id,weekStart:monday,targetMinutes:60,practiceDays:2,now:at}),id:'second'};
  d.weeklySchedules=[a,b];assert.throws(()=>validateData(d),/one schedule per profile and week/i);
  const broken=structuredClone(a),rest=broken.days.find(row=>row.kind==='rest');assert.ok(rest);rest.plannedMinutes=15;
  assert.throws(()=>validateWeeklySchedule(broken),/rest days must have zero/i);
});

test('Autopilot preserves canonical budgets and supports exact scheduled durations through 180 minutes',()=>{
  const d=modern();
  for(const minutes of [5,10,15,20,30,45,60,25,35,75,120,180]){
    const build=buildAutopilotPlan(d,{minutes,intent:'balanced',now:at,today:'2026-09-22'});
    assert.equal(build.totalSeconds,minutes*60,String(minutes));assert.equal(build.plan.generation.requestedMinutes,minutes);
  }
  assert.throws(()=>buildAutopilotPlan(d,{minutes:181,intent:'balanced',now:at,today:'2026-09-22'}),/5 to 180/);
});
