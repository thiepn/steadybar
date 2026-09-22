import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {activeProfile} from '../dist/app/domain/profiles.js';
import {buildTrainingPlan,activateTrainingPlan,activeTrainingContext,trainingPlanProgress,updateTrainingPhase} from '../dist/app/domain/training-plan.js';
import {rankPracticeTargets} from '../dist/app/domain/priority-engine.js';
import {buildWeeklyReview} from '../dist/app/domain/weekly-review.js';
import {validateData,validateTrainingPlan} from '../dist/app/domain/validation.js';

const at='2026-09-22T08:00:00.000Z',today='2026-09-22';
function modern(){const d=migratePracticeModel(migratePracticeData(seedData(at)));d.trainingPlans=[];return d;}
function exerciseGoal(d,exercise){
  const goal={id:'goal-cycle',createdAt:at,updatedAt:at,profileId:exercise.profileId,type:'custom',title:'Cycle goal',description:'',exerciseId:exercise.id,targetValue:1,unit:'focus',deadline:'2026-12-15',completed:false};
  d.goals=[goal];return goal;
}
function daysInclusive(start,end){return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;}

test('generated training phases are contiguous and cover the exact plan window',()=>{
  const d=modern(),p=activeProfile(d),e=d.exercises.find(row=>row.profileId===p.id&&row.primarySkillId);assert.ok(e);
  const goal=exerciseGoal(d,e);
  const plan=buildTrainingPlan(d,{profileId:p.id,name:'Twelve week cycle',startOn:'2026-09-22',endOn:'2026-12-14',baselineWeeklyMinutes:180,goalIds:[goal.id],setlistIds:[],now:at});
  assert.equal(plan.status,'draft');assert.equal(plan.startOn,plan.phases[0].startOn);assert.equal(plan.endOn,plan.phases.at(-1).endOn);
  assert.ok(plan.phases.some(row=>row.kind==='deload'));assert.equal(plan.phases.at(-1).kind,'consolidate');
  let total=0;
  for(let i=0;i<plan.phases.length;i++){
    const phase=plan.phases[i];total+=daysInclusive(phase.startOn,phase.endOn);
    if(i)assert.equal(Date.parse(phase.startOn+'T00:00:00Z')-Date.parse(plan.phases[i-1].endOn+'T00:00:00Z'),86400000);
  }
  assert.equal(total,daysInclusive(plan.startOn,plan.endOn));
  assert.doesNotThrow(()=>validateTrainingPlan(plan));
});

test('performance-linked cycles finish with simulation and taper at reduced planned volume',()=>{
  const d=modern(),p=activeProfile(d),song=d.songs[0]??{id:'song-x',createdAt:at,updatedAt:at,title:'Set song',artist:'',bpm:80,meter:{beats:4,beatUnit:4},key:'',difficulty:2,status:'practicing',notes:'',sections:[]};
  if(!d.songs.some(row=>row.id===song.id))d.songs=[song];
  d.setlists=[{id:'set-cycle',createdAt:at,updatedAt:at,name:'December performance',date:'2026-12-12',songIds:[song.id],notes:''}];
  const plan=buildTrainingPlan(d,{profileId:p.id,name:'Performance cycle',startOn:'2026-09-22',endOn:'2026-12-12',baselineWeeklyMinutes:240,goalIds:[],setlistIds:['set-cycle'],now:at});
  assert.deepEqual(plan.phases.slice(-2).map(row=>row.kind),['simulate','taper']);
  assert.equal(plan.phases.at(-1).emphasis,'songs');
  assert.ok(plan.phases.at(-1).weeklyMinutes<plan.baselineWeeklyMinutes);
  assert.ok(plan.phases.at(-1).focuses.some(row=>row.skillId.endsWith('.repertoire')));
});

test('activation pauses the former active cycle instead of deleting it',()=>{
  const d=modern(),p=activeProfile(d);
  const a=buildTrainingPlan(d,{profileId:p.id,name:'First',startOn:'2026-09-22',endOn:'2026-10-20',baselineWeeklyMinutes:120,goalIds:[],setlistIds:[],now:at});
  const b=buildTrainingPlan(d,{profileId:p.id,name:'Second',startOn:'2026-09-22',endOn:'2026-11-01',baselineWeeklyMinutes:150,goalIds:[],setlistIds:[],now:at});
  d.trainingPlans=[{...a,status:'active'},b];
  const next=activateTrainingPlan(d,b.id,at),first=next.trainingPlans.find(row=>row.id===a.id),second=next.trainingPlans.find(row=>row.id===b.id);
  assert.equal(first.status,'paused');assert.equal(second.status,'active');assert.equal(next.trainingPlans.length,2);
  assert.doesNotThrow(()=>validateData(next));
});

test('active context and calendar progress are derived without mutating the plan',()=>{
  const d=modern(),p=activeProfile(d),plan=buildTrainingPlan(d,{profileId:p.id,name:'Context',startOn:'2026-09-01',endOn:'2026-10-31',baselineWeeklyMinutes:120,goalIds:[],setlistIds:[],now:at});
  d.trainingPlans=[{...plan,status:'active'}];const before=JSON.stringify(d.trainingPlans);
  const context=activeTrainingContext(d,p.id,today),progress=trainingPlanProgress(plan,today);
  assert.ok(context?.phase);assert.equal(context.plan.id,plan.id);assert.ok(progress.fraction>0&&progress.fraction<1);
  assert.equal(JSON.stringify(d.trainingPlans),before);
});

test('phase edits preserve boundaries while changing load, emphasis and explicit focuses',()=>{
  const d=modern(),p=activeProfile(d),skills=d.exercises.filter(row=>row.profileId===p.id&&row.primarySkillId).map(row=>row.primarySkillId).filter((v,i,a)=>v&&a.indexOf(v)===i);
  assert.ok(skills.length>=2);
  const plan=buildTrainingPlan(d,{profileId:p.id,name:'Editable',startOn:'2026-09-22',endOn:'2026-11-30',baselineWeeklyMinutes:150,goalIds:[],setlistIds:[],now:at});
  d.trainingPlans=[plan];const phase=plan.phases[0],start=phase.startOn,end=phase.endOn;
  const next=updateTrainingPhase(d,plan.id,phase.id,{name:'Custom foundation',kind:'custom',weeklyMinutes:90,emphasis:'timing',focuses:[{skillId:skills[0],weight:3,note:'Main'},{skillId:skills[1],weight:2,note:'Support'}],notes:'User-edited phase.'},at);
  const edited=next.trainingPlans[0].phases[0];
  assert.equal(edited.startOn,start);assert.equal(edited.endOn,end);assert.equal(edited.weeklyMinutes,90);assert.equal(edited.emphasis,'timing');assert.equal(edited.focuses.length,2);
  assert.doesNotThrow(()=>validateData(next));
});

test('an active phase contributes a modest explainable Priority factor and Weekly Review can see it',()=>{
  const d=modern(),p=activeProfile(d),e=d.exercises.find(row=>row.profileId===p.id&&row.primarySkillId);assert.ok(e?.primarySkillId);
  const goal=exerciseGoal(d,e),plan=buildTrainingPlan(d,{profileId:p.id,name:'Priority cycle',startOn:'2026-09-01',endOn:'2026-10-31',baselineWeeklyMinutes:120,goalIds:[goal.id],setlistIds:[],now:at});
  const phase=plan.phases.find(row=>row.startOn<=today&&row.endOn>=today);assert.ok(phase);
  phase.focuses=[{id:'focus-main',skillId:e.primarySkillId,weight:3,note:''}];d.trainingPlans=[{...plan,status:'active'}];
  const candidate=rankPracticeTargets(d,p.id,{now:at,today}).find(row=>row.target.kind==='exercise'&&row.target.exerciseId===e.id);assert.ok(candidate);
  const factor=candidate.factors.find(row=>row.code==='training-phase');assert.ok(factor);assert.equal(factor.points,10);assert.match(factor.detail,/Training phase/);
  const review=buildWeeklyReview(d,{profileId:p.id,now:at,today});
  assert.ok(review.focus.some(row=>row.signalCodes.includes('training-phase')));
});

test('validation rejects multiple active plans and cross-instrument phase focus',()=>{
  const d=modern(),p=activeProfile(d),a=buildTrainingPlan(d,{profileId:p.id,name:'A',startOn:'2026-09-22',endOn:'2026-10-22',baselineWeeklyMinutes:120,goalIds:[],setlistIds:[],now:at}),b=buildTrainingPlan(d,{profileId:p.id,name:'B',startOn:'2026-09-22',endOn:'2026-10-22',baselineWeeklyMinutes:120,goalIds:[],setlistIds:[],now:at});
  d.trainingPlans=[{...a,status:'active'},{...b,status:'active'}];assert.throws(()=>validateData(d),/one active training plan/i);
  d.trainingPlans=[{...a,status:'active'}];d.trainingPlans[0].phases[0].focuses=[{id:'bad',skillId:'guitar.technique',weight:3,note:''}];
  assert.throws(()=>validateData(d),/phase focus does not belong/i);
});
