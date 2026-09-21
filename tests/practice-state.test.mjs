import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {evidenceForTarget} from '../dist/app/domain/practice-evidence.js';
import {rebuildPracticeStates} from '../dist/app/domain/practice-state-rebuild.js';
import {legacyRatingToPracticeResult,practiceTargetKey} from '../dist/app/domain/practice-state.js';
import {skillIdForExercise,skillDefinitionsFor} from '../dist/app/domain/skill-graph.js';
import {validateData,validateSong} from '../dist/app/domain/validation.js';
import {createSession} from '../dist/app/practice/logic.js';

const date='2026-09-20T12:00:00.000Z';
const later='2026-09-20T12:05:00.000Z';

function modern(){
  return migratePracticeData(seedData(date));
}
function exerciseSession(data,exercise){
  const block={id:'phase2-block',type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:300,bpm:80,notes:'',order:0};
  const session=createSession([block],data);
  session.status='completed';session.endedAt=later;session.runtime.phase='paused';
  const practiced=session.blocks[0];practiced.startedAt=date;practiced.endedAt=later;practiced.actualActiveSeconds=300;practiced.completed=true;
  return session;
}

test('practice target keys are deterministic and include arrangement identity',()=>{
  assert.equal(practiceTargetKey({kind:'skill',profileId:'p1',skillId:'drums.timing'}),'skill|p1|drums.timing');
  assert.equal(practiceTargetKey({kind:'exercise',exerciseId:'e1'}),'exercise|e1');
  assert.equal(practiceTargetKey({kind:'song',songId:'s1'}),'song|s1|shared');
  assert.equal(practiceTargetKey({kind:'song-section',songId:'s1',partId:'p1',sectionId:'verse'}),'section|s1|p1|verse');
  assert.equal(practiceTargetKey({kind:'song-transition',songId:'s1',transitionId:'t1'}),'transition|s1|shared|t1');
  assert.equal(practiceTargetKey({kind:'lesson',profileId:'p1',courseId:'c',lessonId:'l',revision:2}),'lesson|p1|c|l|2');
});

test('legacy tempo ratings are interpreted without rewriting the five-level history',()=>{
  assert.equal(legacyRatingToPracticeResult('failed'),'not-yet');
  assert.equal(legacyRatingToPracticeResult('messy'),'not-yet');
  assert.equal(legacyRatingToPracticeResult('acceptable'),'usable');
  assert.equal(legacyRatingToPracticeResult('clean'),'solid');
  assert.equal(legacyRatingToPracticeResult('effortless'),'solid');
});

test('drum skill graph exposes the nine canonical Phase 0 domains',()=>{
  const ids=skillDefinitionsFor('drums').map(s=>s.id);
  assert.deepEqual(ids,['drums.timing','drums.groove','drums.coordination','drums.technique','drums.fills','drums.dynamics','drums.reading','drums.repertoire','drums.musicality']);
  assert.equal(skillIdForExercise('drums','warmup'),'drums.technique');
  assert.equal(skillIdForExercise('drums','rudiments'),'drums.technique');
  assert.equal(skillIdForExercise('drums','timing'),'drums.timing');
});

test('Phase 2 migration bootstraps historical peak but never invents working, cold or mastery evidence',()=>{
  const data=modern(),exercise=data.exercises.find(e=>e.name==='Double Stroke Roll')??data.exercises[0];
  const session=exerciseSession(data,exercise);
  session.blocks[0].tempoAttempts=[
    {id:'a1',bpm:95,rating:'clean',timestamp:'2026-09-20T12:01:00.000Z',note:''},
    {id:'a2',bpm:105,rating:'clean',timestamp:'2026-09-20T12:02:00.000Z',note:''},
    {id:'a3',bpm:110,rating:'messy',timestamp:'2026-09-20T12:03:00.000Z',note:''},
  ];
  data.sessions=[session];
  const next=migratePracticeModel(data),state=next.practiceStates.find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  assert.equal(next.practiceModelVersion,1);
  assert.ok(exercise.primarySkillId||next.exercises.find(e=>e.id===exercise.id).primarySkillId);
  assert.equal(state.mastery,'unassessed');
  assert.equal(state.tempo.peak,105);
  assert.equal(state.tempo.working,undefined);
  assert.equal(state.tempo.cold,undefined);
  assert.equal(state.nextReviewAt,undefined);
  assert.equal(state.latestResult,'not-yet');
  assert.equal(session.blocks[0].tempoAttempts[1].rating,'clean');
  assert.deepEqual(migratePracticeModel(next),next);
});

test('normalized evidence preserves source identity and legacy reliability',()=>{
  const data=modern(),exercise=data.exercises[0],session=exerciseSession(data,exercise);
  session.blocks[0].tempoAttempts=[{id:'attempt-1',bpm:100,rating:'acceptable',timestamp:'2026-09-20T12:02:00.000Z',note:''}];
  session.blocks[0].evaluation={id:'eval-1',timestamp:'2026-09-20T12:04:00.000Z',result:'solid',context:'cold',limitations:[],note:''};
  data.sessions=[session];
  const migrated=migratePracticeModel(data),rows=evidenceForTarget(migrated,{kind:'exercise',exerciseId:exercise.id});
  assert.equal(rows.length,3);
  const attempt=rows.find(row=>row.source.kind==='tempo-attempt'),evaluation=rows.find(row=>row.source.kind==='block-evaluation');
  assert.equal(attempt.reliability,'legacy');assert.equal(attempt.result,'usable');assert.equal(attempt.bpm,100);
  assert.equal(evaluation.reliability,'self-report');assert.equal(evaluation.context,'cold');assert.equal(evaluation.result,'solid');
});

test('practice state rebuild is deterministic and preserves manual scheduling overrides',()=>{
  const data=modern(),exercise=data.exercises[0],session=exerciseSession(data,exercise);
  session.blocks[0].tempoAttempts=[{id:'rebuild-attempt',bpm:100,rating:'clean',timestamp:'2026-09-20T12:02:00.000Z',note:''}];
  data.sessions=[session];
  const migrated=migratePracticeModel(data),first=rebuildPracticeStates(migrated);
  const state=first.find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  assert.ok(state);
  state.scheduling.manualPriority=2;state.scheduling.snoozedUntil='2026-09-25T12:00:00.000Z';
  migrated.practiceStates=first;
  const second=rebuildPracticeStates(migrated),again=second.find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  assert.equal(again.id,state.id);
  assert.equal(again.scheduling.manualPriority,2);
  assert.equal(again.scheduling.snoozedUntil,'2026-09-25T12:00:00.000Z');
  assert.equal(again.mastery,'unassessed');
  assert.equal(again.tempo.peak,100);
  assert.equal(again.tempo.working,undefined);
  assert.equal(again.tempo.cold,undefined);
  assert.deepEqual(rebuildPracticeStates({...migrated,practiceStates:second}),second);
});

test('Phase 3 rebuild upgrades engine-v1 states without losing manual scheduling overrides',()=>{
  const data=modern(),exercise=data.exercises[0],session=exerciseSession(data,exercise);
  session.blocks[0].evaluation={id:'phase3-eval',timestamp:'2026-09-20T12:04:00.000Z',result:'solid',context:'normal',limitations:[],note:''};
  data.sessions=[session];
  const current=migratePracticeModel(data),state=current.practiceStates.find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  state.engine.version=1;state.scheduling.manualPriority=2;state.scheduling.snoozedUntil='2026-09-30T12:00:00.000Z';delete state.challenge;
  const upgraded=migratePracticeModel(current),next=upgraded.practiceStates.find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  assert.equal(next.engine.version,2);assert.equal(next.mastery,'stabilize');assert.equal(next.challenge,'hold');
  assert.equal(next.scheduling.manualPriority,2);assert.equal(next.scheduling.snoozedUntil,'2026-09-30T12:00:00.000Z');
});

test('practice prescriptions survive immutable session snapshots',()=>{
  const data=migratePracticeModel(modern()),exercise=data.exercises[0];
  const target={kind:'exercise',exerciseId:exercise.id};
  const block={id:'prescribed',type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:120,bpm:80,notes:'',order:0,prescription:{target,intent:'retest',reasons:['retention-due'],generatedBy:'manual',engineVersion:1}};
  const session=createSession([block],data);
  assert.deepEqual(session.blocks[0].prescriptionSnapshot,block.prescription);
  block.prescription.reasons.push('user-request');
  assert.deepEqual(session.blocks[0].prescriptionSnapshot.reasons,['retention-due']);
});

test('priority cycles are profile-scoped and only one may be active',()=>{
  const data=migratePracticeModel(modern()),profile=data.profiles.find(p=>p.id===data.settings.activeProfileId);
  const cycle={id:'cycle-1',createdAt:date,updatedAt:date,profileId:profile.id,name:'Autumn focus',status:'active',startedOn:'2026-09-20',items:[{id:'priority-1',skillId:'drums.timing',weight:3,note:''}]};
  data.priorityCycles=[cycle];
  assert.doesNotThrow(()=>validateData(data));
  data.priorityCycles.push({...cycle,id:'cycle-2',name:'Duplicate active'});
  assert.throws(()=>validateData(data),/one active cycle/i);
});

test('priority cycles reject skills from another instrument graph',()=>{
  const data=migratePracticeModel(modern()),profile=data.profiles.find(p=>p.id===data.settings.activeProfileId);
  data.priorityCycles=[{id:'cycle-wrong',createdAt:date,updatedAt:date,profileId:profile.id,name:'Wrong graph',status:'active',startedOn:'2026-09-20',items:[{id:'p',skillId:'guitar.technique',weight:2,note:''}]}];
  assert.throws(()=>validateData(data),/skill does not belong/i);
});

test('practice state target keys must exactly match their target',()=>{
  const data=modern(),exercise=data.exercises[0],session=exerciseSession(data,exercise);data.sessions=[session];
  const migrated=migratePracticeModel(data),state=migrated.practiceStates[0];
  state.targetKey='exercise|wrong';
  assert.throws(()=>validateData(migrated),/target key/i);
});

test('song transitions require two existing distinct sections',()=>{
  const base={id:'song',createdAt:date,updatedAt:date,title:'Song',artist:'',bpm:80,meter:{beats:4,beatUnit:4},key:'',difficulty:2,status:'learning',notes:'',sections:[
    {id:'verse',name:'Verse',notes:'',order:0},{id:'chorus',name:'Chorus',notes:'',order:1}
  ],transitions:[{id:'v-c',fromSectionId:'verse',toSectionId:'chorus',notes:''}]};
  assert.doesNotThrow(()=>validateSong(base));
  assert.throws(()=>validateSong({...base,transitions:[{id:'bad',fromSectionId:'verse',toSectionId:'missing',notes:''}]}),/unavailable section/i);
  assert.throws(()=>validateSong({...base,transitions:[{id:'bad',fromSectionId:'verse',toSectionId:'verse',notes:''}]}),/different sections/i);
});
