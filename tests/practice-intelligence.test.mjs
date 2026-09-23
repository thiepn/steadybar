import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {buildPracticeIntelligence,rankIntelligentPracticeTargets} from '../dist/app/domain/practice-intelligence.js';
import {practiceTargetKey} from '../dist/app/domain/practice-state.js';
import {recommendationBlock,recommendationHref} from '../dist/app/app/practice-intelligence.js';

const at='2026-09-23T10:00:00.000Z',today='2026-09-23';
function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}
function targetState(exercise,overrides={}){
  const target={kind:'exercise',exerciseId:exercise.id},targetKey=practiceTargetKey(target);
  return {
    id:'state-'+exercise.id,createdAt:at,updatedAt:at,profileId:exercise.profileId,targetKey,target,
    mastery:'build',limitations:[],challenge:'hold',evidenceCount:1,recent:{solid:0,usable:1,notYet:0},
    scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},...overrides,
  };
}
function recommendationFor(d,exercise){
  return buildPracticeIntelligence(d,{profileId:exercise.profileId,now:at,today}).recommendations.find(row=>row.target.kind==='exercise'&&row.target.exerciseId===exercise.id);
}

test('practice intelligence is deterministic, runtime-only and focused to five recommendations by default',()=>{
  const d=modern(),before=structuredClone(d);
  const a=buildPracticeIntelligence(d,{now:at,today}),b=buildPracticeIntelligence(d,{now:at,today});
  assert.deepEqual(a,b);assert.deepEqual(d,before);
  assert.equal(a.engineVersion,1);
  assert.ok(a.recommendations.length>0&&a.recommendations.length<=5);
  assert.deepEqual(a.recommendations.map(row=>row.targetKey),[...new Set(a.recommendations.map(row=>row.targetKey))]);
});

test('default recommendation diagnostics use a recent 28-day window instead of all historical sessions',()=>{
  const d=modern(),intelligence=buildPracticeIntelligence(d,{now:at,today});
  assert.equal(intelligence.diagnostics.comparison.current.from,'2026-08-27');
  assert.equal(intelligence.diagnostics.comparison.current.to,'2026-09-23');
});

test('low evidence cannot produce a Progress decision even if a stale challenge says advance',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{challenge:'advance',evidenceCount:0,recent:{solid:0,usable:0,notYet:0}})];
  const row=recommendationFor(d,exercise);assert.ok(row);
  assert.equal(row.confidence,'low');
  assert.equal(row.decision,'hold');
});

test('strong skill evidence cannot leak Progress confidence onto a fresh target in the same skill',()=>{
  const d=modern(),groups=new Map();
  for(const exercise of d.exercises){
    if(!exercise.primarySkillId)continue;
    const rows=groups.get(exercise.primarySkillId)??[];rows.push(exercise);groups.set(exercise.primarySkillId,rows);
  }
  const rows=[...groups.values()].find(items=>items.length>=3);assert.ok(rows,'Need three exercises in one skill domain');
  const [a,b,fresh]=rows;
  d.practiceStates=[
    targetState(a,{mastery:'stabilize',challenge:'advance',latestResult:'solid',evidenceCount:4,recent:{solid:2,usable:0,notYet:0}}),
    targetState(b,{mastery:'stabilize',challenge:'advance',latestResult:'solid',evidenceCount:4,recent:{solid:2,usable:0,notYet:0}}),
  ];
  const intelligence=buildPracticeIntelligence(d,{profileId:fresh.profileId,now:at,today,recommendationLimit:12});
  const skill=intelligence.skills.find(row=>row.skillId===fresh.primarySkillId);assert.ok(skill);assert.equal(skill.confidence,'high');
  const row=intelligence.recommendations.find(item=>item.target.kind==='exercise'&&item.target.exerciseId===fresh.id);assert.ok(row);
  assert.equal(row.confidence,'low');assert.equal(row.decision,'hold');
});

test('explicit reduce state becomes Repair plus Regress and is urgent',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{challenge:'reduce',latestResult:'not-yet',evidenceCount:3,recent:{solid:0,usable:0,notYet:2},limitations:['timing']})];
  const row=recommendationFor(d,exercise);assert.ok(row);
  assert.equal(row.action,'repair');assert.equal(row.decision,'regress');assert.equal(row.band,'now');
  assert.ok(row.progression);assert.equal(row.progression.direction,'reduce');
});

test('due retest is Hold until cold evidence is refreshed',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{mastery:'retest',latestResult:'solid',evidenceCount:3,nextReviewAt:'2026-09-22T09:00:00.000Z',recent:{solid:2,usable:0,notYet:0}})];
  const row=recommendationFor(d,exercise);assert.ok(row);
  assert.equal(row.action,'retest');assert.equal(row.decision,'hold');assert.equal(row.band,'now');
});

test('usable build evidence produces Consolidate instead of automatic progression',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{mastery:'build',latestResult:'usable',evidenceCount:3,recent:{solid:0,usable:2,notYet:0}})];
  const row=recommendationFor(d,exercise);assert.ok(row);
  assert.equal(row.action,'stabilize');assert.equal(row.decision,'consolidate');
});

test('explicit advance with sufficient solid evidence can produce Progress',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{mastery:'stabilize',challenge:'advance',latestResult:'solid',evidenceCount:3,recent:{solid:2,usable:0,notYet:0}})];
  const row=recommendationFor(d,exercise);assert.ok(row);
  assert.notEqual(row.confidence,'low');assert.equal(row.decision,'progress');
  assert.ok(row.progression);assert.equal(row.progression.direction,'advance');
});

test('intelligent ordering promotes repair/retest work ahead of generic unexplored targets',()=>{
  const d=modern(),withSkills=d.exercises.filter(row=>row.primarySkillId),repair=withSkills[0];assert.ok(repair);
  d.practiceStates=[targetState(repair,{challenge:'reduce',latestResult:'not-yet',evidenceCount:3,recent:{solid:0,usable:0,notYet:2}})];
  const ranked=rankIntelligentPracticeTargets(d,repair.profileId,{now:at,today});
  assert.equal(ranked[0].target.kind,'exercise');assert.equal(ranked[0].target.exerciseId,repair.id);
});

test('executable exercise recommendation preserves the progression snapshot and canonical target route',()=>{
  const d=modern(),exercise=d.exercises.find(row=>row.primarySkillId);assert.ok(exercise);
  d.practiceStates=[targetState(exercise,{mastery:'stabilize',challenge:'advance',latestResult:'solid',evidenceCount:3,recent:{solid:2,usable:0,notYet:0}})];
  const row=recommendationFor(d,exercise);assert.ok(row?.progression);
  const block=recommendationBlock(d,row);assert.ok(block);
  assert.equal(block.type,'exercise');assert.equal(block.exerciseId,exercise.id);
  assert.deepEqual(block.progression,row.progression);
  assert.equal(recommendationHref(row),'/library/'+exercise.id);
});

test('transition recommendation builds a bounded section block without inventing a second history model',()=>{
  const d=modern(),song={id:'song-i',createdAt:at,updatedAt:at,title:'Transition Song',artist:'',bpm:80,meter:{beats:4,beatUnit:4},key:'',difficulty:2,status:'practicing',notes:'',sections:[{id:'a',name:'Verse',notes:'',order:0},{id:'b',name:'Chorus',notes:'',order:1}],transitions:[{id:'t',fromSectionId:'a',toSectionId:'b',name:'Lift',notes:'Keep beat one clear.'}]};
  d.songs=[song];
  const row={source:'practice-target',target:{kind:'song-transition',songId:song.id,transitionId:'t'},targetKey:'transition|song-i|shared|t',label:'Transition Song · Lift',band:'now',action:'repair',confidence:'medium',decision:'consolidate',reasons:[],evidence:[],skillIds:[]};
  const block=recommendationBlock(d,row);assert.ok(block);
  assert.equal(block.type,'song-section');assert.equal(block.songId,song.id);assert.equal(block.songSectionId,'a');assert.equal(block.targetSeconds,300);
  assert.match(block.title,/Lift/);assert.match(block.notes,/Keep beat one clear/);
});

test('explicit recommendationLimit is bounded and never expands beyond twelve',()=>{
  const d=modern();
  assert.ok(buildPracticeIntelligence(d,{now:at,today,recommendationLimit:999}).recommendations.length<=12);
  assert.equal(buildPracticeIntelligence(d,{now:at,today,recommendationLimit:0}).recommendations.length,1);
});
