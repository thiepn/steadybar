import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../dist/app/db/seed.js';
import { migratePracticeData } from '../dist/app/db/profile-migration.js';
import { migratePracticeModel } from '../dist/app/db/practice-model-migration.js';
import { buildPriorityCandidates, priorityReasonText, rankExerciseTargets, rankPracticeTargets } from '../dist/app/domain/priority-engine.js';
import { suggestedExercises } from '../dist/app/domain/protocol-analytics.js';
import { practiceTargetKey } from '../dist/app/domain/practice-state.js';

const at='2026-09-21T10:00:00.000Z';
const now='2026-09-21T12:00:00.000Z';
const today='2026-09-21';

function data(){
  return migratePracticeModel(migratePracticeData(seedData(at)));
}
function exerciseWith(d,skill){
  const item=d.exercises.find(e=>e.primarySkillId===skill);assert.ok(item,'Missing exercise for '+skill);return item;
}
function stateFor(exercise,overrides={}){
  const target={kind:'exercise',exerciseId:exercise.id},key=practiceTargetKey(target);
  return {
    id:'state-'+exercise.id,createdAt:at,updatedAt:at,profileId:exercise.profileId,targetKey:key,target,
    mastery:'build',limitations:[],challenge:'hold',evidenceCount:1,recent:{solid:0,usable:1,notYet:0},
    scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},...overrides,
  };
}
function factor(candidate,code){return candidate.factors.find(f=>f.code===code);}

test('active goals outrank otherwise similar exercise candidates and explain why',()=>{
  const d=data(),profile=d.settings.activeProfileId,tech=exerciseWith(d,'drums.technique'),timing=exerciseWith(d,'drums.timing');
  d.exercises=[tech,timing];d.goals=[{id:'goal',createdAt:at,updatedAt:at,profileId:profile,type:'bpm',title:'Timing target',description:'',exerciseId:timing.id,targetValue:100,unit:'BPM',completed:false}];
  const ranked=rankExerciseTargets(d,profile,{now,today});
  assert.equal(ranked[0].target.exerciseId,timing.id);
  assert.equal(factor(ranked[0],'active-goal').points,20);
  assert.equal(priorityReasonText(ranked[0]),'Linked to an active goal');
  assert.ok(ranked[0].reasons.includes('active-goal'));
});

test('priority cycles provide the strongest medium-term skill signal and replace profile-focus fallback',()=>{
  const d=data(),profile=d.settings.activeProfileId,tech=exerciseWith(d,'drums.technique'),timing=exerciseWith(d,'drums.timing');
  d.exercises=[tech,timing];d.profiles.find(p=>p.id===profile).focusAreas=['Technique'];
  let candidates=buildPriorityCandidates(d,profile,{now,today});
  assert.ok(factor(candidates.find(c=>c.target.kind==='exercise'&&c.target.exerciseId===tech.id),'profile-focus'));
  d.priorityCycles=[{id:'cycle',createdAt:at,updatedAt:at,profileId:profile,name:'Current focus',status:'active',startedOn:today,items:[{id:'p1',skillId:'drums.timing',weight:3,note:''}]}];
  candidates=buildPriorityCandidates(d,profile,{now,today});
  const timingCandidate=candidates.find(c=>c.target.kind==='exercise'&&c.target.exerciseId===timing.id),techCandidate=candidates.find(c=>c.target.kind==='exercise'&&c.target.exerciseId===tech.id);
  assert.equal(factor(timingCandidate,'active-priority').points,18);
  assert.equal(factor(techCandidate,'profile-focus'),undefined);
  assert.ok(timingCandidate.score>techCandidate.score);
});

test('due retention and recent weakness raise priority while same-day repetition suppresses it',()=>{
  const d=data(),profile=d.settings.activeProfileId,timing=exerciseWith(d,'drums.timing'),tech=exerciseWith(d,'drums.technique');d.exercises=[timing,tech];
  d.practiceStates=[
    stateFor(timing,{mastery:'retest',latestResult:'usable',lastPracticedAt:'2026-09-15T12:00:00.000Z',nextReviewAt:'2026-09-20T12:00:00.000Z'}),
    stateFor(tech,{mastery:'build',latestResult:'usable',lastPracticedAt:'2026-09-21T09:00:00.000Z'}),
  ];
  const ranked=rankExerciseTargets(d,profile,{now,today}),first=ranked[0];
  assert.equal(first.target.exerciseId,timing.id);
  assert.ok(factor(first,'retention-due').points>=16);
  assert.ok(factor(first,'recent-weakness').points>0);
  assert.equal(factor(ranked.find(c=>c.target.exerciseId===tech.id),'recent-repetition').points,-18);
});

test('upcoming setlists can temporarily lift real repertoire above general development',()=>{
  const d=data(),profile=d.settings.activeProfileId;
  d.exercises=d.exercises.slice(0,2);
  d.songs=[{id:'song-1',createdAt:at,updatedAt:at,title:'Sunday Song',artist:'',bpm:72,meter:{beats:4,beatUnit:4},key:'D',difficulty:2,status:'practicing',notes:'',sections:[{id:'verse',name:'Verse',notes:'',order:0}]}];
  d.setlists=[{id:'set-1',createdAt:at,updatedAt:at,name:'Sunday service',date:'2026-09-23',songIds:['song-1'],notes:''}];
  const candidates=rankPracticeTargets(d,profile,{now,today}),song=candidates.find(c=>c.target.kind==='song'&&c.target.songId==='song-1'),section=candidates.find(c=>c.target.kind==='song-section'&&c.target.songId==='song-1');
  assert.equal(factor(song,'upcoming-performance').points,24);
  assert.equal(factor(section,'upcoming-performance').points,24);
  assert.match(priorityReasonText(song),/Sunday service/);
  assert.ok(song.reasons.includes('upcoming-performance'));
});

test('snoozed targets are ineligible by default but remain inspectable for debugging',()=>{
  const d=data(),profile=d.settings.activeProfileId,exercise=d.exercises[0];d.exercises=[exercise];
  d.practiceStates=[stateFor(exercise,{scheduling:{consecutiveSkips:0,manualPriority:0,snoozedUntil:'2026-09-25T12:00:00.000Z'}})];
  assert.equal(rankExerciseTargets(d,profile,{now,today}).length,0);
  const candidate=buildPriorityCandidates(d,profile,{now,today,includeIneligible:true})[0];
  assert.equal(candidate.eligible,false);assert.equal(factor(candidate,'snoozed').points,-1000);
});

test('manual priority and repeated skips remain separate user/scheduler signals',()=>{
  const d=data(),profile=d.settings.activeProfileId,exercise=d.exercises[0];d.exercises=[exercise];
  d.practiceStates=[stateFor(exercise,{scheduling:{consecutiveSkips:3,manualPriority:2}})];
  const candidate=rankExerciseTargets(d,profile,{now,today})[0];
  assert.equal(factor(candidate,'manual-priority').points,16);
  assert.equal(factor(candidate,'skip-pattern').points,-12);
  assert.ok(candidate.reasons.includes('user-request'));
});

test('neglect grows gradually and never becomes automatic mastery decay',()=>{
  const d=data(),profile=d.settings.activeProfileId,exercise=d.exercises[0];d.exercises=[exercise];
  d.practiceStates=[stateFor(exercise,{mastery:'maintain',latestResult:'solid',lastPracticedAt:'2026-07-01T12:00:00.000Z',nextReviewAt:'2026-10-01T12:00:00.000Z'})];
  const candidate=rankExerciseTargets(d,profile,{now,today})[0];
  assert.equal(candidate.state.mastery,'maintain');
  assert.equal(factor(candidate,'neglected').points,12);
  assert.equal(factor(candidate,'maintenance').points,-6);
});

test('prerequisite gaps are a soft penalty and disappear once foundation evidence exists',()=>{
  const d=data(),profile=d.settings.activeProfileId,groove=exerciseWith(d,'drums.groove'),timing=exerciseWith(d,'drums.timing');d.exercises=[groove,timing];
  let grooveCandidate=rankExerciseTargets(d,profile,{now,today}).find(c=>c.target.exerciseId===groove.id);
  assert.equal(factor(grooveCandidate,'prerequisite-gap').points,-3);
  d.practiceStates=[stateFor(timing,{mastery:'stabilize',latestResult:'solid',evidenceCount:2})];
  grooveCandidate=rankExerciseTargets(d,profile,{now,today}).find(c=>c.target.exerciseId===groove.id);
  assert.equal(factor(grooveCandidate,'prerequisite-gap'),undefined);
});

test('domain balance notices recently neglected areas without dominating stronger signals',()=>{
  const d=data(),profile=d.settings.activeProfileId,tech=exerciseWith(d,'drums.technique'),timing=exerciseWith(d,'drums.timing');d.exercises=[tech,timing];
  d.sessions=[{
    id:'session',createdAt:at,updatedAt:at,profileId:profile,profileNameSnapshot:'Drums',status:'completed',startedAt:'2026-09-20T12:00:00.000Z',endedAt:'2026-09-20T12:10:00.000Z',activeBlockIndex:0,sessionNotes:'',
    runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:at,metronomeOn:true},
    blocks:[{id:'b',profileId:profile,type:'exercise',sourceExerciseId:tech.id,titleSnapshot:tech.name,categorySnapshot:'technique',stickingSnapshot:'',meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,targetSeconds:600,actualActiveSeconds:600,initialBpm:80,finalBpm:80,tempoAttempts:[],notes:'',startedAt:'2026-09-20T12:00:00.000Z',endedAt:'2026-09-20T12:10:00.000Z',completed:true,skipped:false}],
  }];
  const timingCandidate=rankExerciseTargets(d,profile,{now,today}).find(c=>c.target.exerciseId===timing.id);
  assert.equal(factor(timingCandidate,'domain-balance').points,6);
});

test('ranking is deterministic, runtime-only, and does not mutate workspace state',()=>{
  const d=data(),before=structuredClone(d),profile=d.settings.activeProfileId;
  const first=rankPracticeTargets(d,profile,{now,today}).map(c=>({key:c.targetKey,score:c.score,factors:c.factors}));
  const second=rankPracticeTargets(d,profile,{now,today}).map(c=>({key:c.targetKey,score:c.score,factors:c.factors}));
  assert.deepEqual(first,second);assert.deepEqual(d,before);
  assert.ok(first.length>0);
});

test('existing Suggested exercises UI now consumes the priority engine explanation',()=>{
  const d=data(),profile=d.settings.activeProfileId,exercise=d.exercises[0];d.exercises=[exercise];
  d.goals=[{id:'goal-ui',createdAt:at,updatedAt:at,profileId:profile,type:'bpm',title:'Target',description:'',exerciseId:exercise.id,targetValue:120,unit:'BPM',completed:false}];
  const suggestions=suggestedExercises(d);
  assert.equal(suggestions[0].id,exercise.id);
  assert.equal(suggestions[0].reason,'Linked to an active goal');
});
