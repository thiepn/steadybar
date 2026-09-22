import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {activeProfile} from '../dist/app/domain/profiles.js';
import {buildWeeklyReview,applyWeeklyPriorityCycle,restorePriorityCycle,endActivePriorityCycle,WEEKLY_REVIEW_ENGINE_VERSION} from '../dist/app/domain/weekly-review.js';
import {validateData} from '../dist/app/domain/validation.js';

const at='2026-09-22T08:00:00.000Z',today='2026-09-22';
function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}

test('weekly review uses a rolling seven-day window and previous equal week',()=>{
  const d=modern(),p=activeProfile(d);
  const review=buildWeeklyReview(d,{profileId:p.id,now:at,today});
  assert.equal(review.engineVersion,WEEKLY_REVIEW_ENGINE_VERSION);
  assert.deepEqual(review.window,{from:'2026-09-16',to:'2026-09-22',previousFrom:'2026-09-09',previousTo:'2026-09-15'});
  assert.equal(review.diagnostics.comparison.current.from,'2026-09-16');
  assert.equal(review.diagnostics.comparison.previous?.from,'2026-09-09');
});

test('building a review is runtime-only and does not mutate active priority cycles',()=>{
  const d=modern(),p=activeProfile(d),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise?.primarySkillId);
  d.priorityCycles=[{id:'cycle',createdAt:at,updatedAt:at,profileId:p.id,name:'Existing',status:'active',startedOn:'2026-09-15',items:[{id:'item',skillId:exercise.primarySkillId,weight:3,note:'Keep this'}]}];
  const before=JSON.stringify(d),review=buildWeeklyReview(d,{profileId:p.id,now:at,today});
  assert.equal(JSON.stringify(d),before);
  assert.equal(review.activeCycle?.id,'cycle');
});

test('current priority-cycle weight does not self-reinforce next-week focus generation',()=>{
  const d=modern(),p=activeProfile(d),withSkills=d.exercises.filter(row=>row.primarySkillId);
  const a=withSkills[0];assert.ok(a?.primarySkillId);const b=withSkills.find(row=>row.primarySkillId!==a.primarySkillId);assert.ok(b?.primarySkillId);
  d.priorityCycles=[{id:'cycle',createdAt:at,updatedAt:at,profileId:p.id,name:'Existing',status:'active',startedOn:'2026-09-15',items:[{id:'item',skillId:a.primarySkillId,weight:3,note:'Old focus'}]}];
  d.goals=[{id:'goal',createdAt:at,updatedAt:at,profileId:p.id,type:'bpm',title:'Current goal',description:'',exerciseId:b.id,targetValue:b.targetBpm??120,unit:'BPM',completed:false}];
  const review=buildWeeklyReview(d,{profileId:p.id,now:at,today});
  assert.equal(review.focus[0]?.skillId,b.primarySkillId);
  assert.ok(review.focus[0]?.reasons.some(reason=>/active goal/i.test(reason)));
});

test('applying weekly focus completes the old cycle and creates one validated active cycle',()=>{
  const d=modern(),p=activeProfile(d),skills=[...new Set(d.exercises.map(row=>row.primarySkillId).filter(Boolean))];
  assert.ok(skills.length>=2);
  d.priorityCycles=[{id:'old',createdAt:at,updatedAt:at,profileId:p.id,name:'Old focus',status:'active',startedOn:'2026-09-10',items:[{id:'old-item',skillId:skills[0],weight:3,note:''}]}];
  const next=applyWeeklyPriorityCycle(d,p.id,[
    {skillId:skills[0],weight:2,note:'Retention due'},
    {skillId:skills[1],weight:3,note:'Active goal'},
  ],{now:at,today,name:'Weekly focus test'});
  const active=next.priorityCycles.find(row=>row.profileId===p.id&&row.status==='active'),old=next.priorityCycles.find(row=>row.id==='old');
  assert.ok(active);assert.equal(active.name,'Weekly focus test');assert.equal(active.items.length,2);
  assert.ok(old);assert.equal(old.status,'completed');assert.equal(old.endedOn,today);
  assert.doesNotThrow(()=>validateData(next));
});

test('weekly focus selection rejects duplicates and unavailable instrument skills',()=>{
  const d=modern(),p=activeProfile(d),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise?.primarySkillId);const skill=exercise.primarySkillId;
  assert.throws(()=>applyWeeklyPriorityCycle(d,p.id,[{skillId:skill,weight:3,note:''},{skillId:skill,weight:2,note:''}],{now:at,today}),/unique/i);
  assert.throws(()=>applyWeeklyPriorityCycle(d,p.id,[{skillId:'guitar.technique',weight:3,note:''}],{now:at,today}),/instrument/i);
});

test('restoring a historical cycle creates a new active copy without rewriting history',()=>{
  const d=modern(),p=activeProfile(d),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise?.primarySkillId);const skill=exercise.primarySkillId;
  d.priorityCycles=[{id:'history',createdAt:'2026-09-01T08:00:00.000Z',updatedAt:'2026-09-08T08:00:00.000Z',profileId:p.id,name:'Earlier focus',status:'completed',startedOn:'2026-09-01',endedOn:'2026-09-08',items:[{id:'old-item',skillId:skill,weight:3,note:'Earlier reason'}]}];
  const next=restorePriorityCycle(d,p.id,'history',{now:at,today});
  const original=next.priorityCycles.find(row=>row.id==='history'),active=next.priorityCycles.find(row=>row.status==='active');
  assert.ok(original);assert.equal(original.status,'completed');assert.equal(original.endedOn,'2026-09-08');
  assert.ok(active);assert.notEqual(active.id,'history');assert.equal(active.name,'Restored · Earlier focus');assert.equal(active.items[0].skillId,skill);
  assert.doesNotThrow(()=>validateData(next));
});

test('ending weekly focus keeps the cycle as completed history',()=>{
  const d=modern(),p=activeProfile(d),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise?.primarySkillId);const skill=exercise.primarySkillId;
  d.priorityCycles=[{id:'active',createdAt:at,updatedAt:at,profileId:p.id,name:'Current',status:'active',startedOn:'2026-09-20',items:[{id:'item',skillId:skill,weight:3,note:''}]}];
  const next=endActivePriorityCycle(d,p.id,{now:at,today});
  const cycle=next.priorityCycles.find(row=>row.id==='active');
  assert.ok(cycle);assert.equal(cycle.status,'completed');assert.equal(cycle.endedOn,today);
  assert.equal(next.priorityCycles.filter(row=>row.status==='active').length,0);
  assert.doesNotThrow(()=>validateData(next));
});
