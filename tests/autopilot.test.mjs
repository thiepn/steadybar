import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {applyAutopilotPlan,applyAutopilotSessionScheduling,AUTOPILOT_MINUTES,buildAutopilotPlan} from '../dist/app/domain/autopilot.js';
import {practiceTargetKey} from '../dist/app/domain/practice-state.js';
import {validateData} from '../dist/app/domain/validation.js';
import {skillDefinition} from '../dist/app/domain/skill-graph.js';

const at='2026-09-21T18:00:00.000Z',today='2026-09-21';

function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}
function domains(candidate){return new Set(candidate.skillIds.map(id=>skillDefinition(id)?.domain).filter(Boolean));}
function stateFor(target,profileId,overrides={}){
  const key=practiceTargetKey(target);
  return {id:'state-'+key.replaceAll('|','-'),createdAt:at,updatedAt:at,profileId,targetKey:key,target,mastery:'build',limitations:[],challenge:'hold',evidenceCount:1,recent:{solid:0,usable:1,notYet:0},scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},...overrides};
}
function song(){
  return {id:'song-1',createdAt:at,updatedAt:at,title:'Sunday Song',artist:'',bpm:72,meter:{beats:4,beatUnit:4},key:'D',difficulty:2,status:'practicing',notes:'',sections:[
    {id:'verse',name:'Verse',notes:'Keep it light.',order:0},
    {id:'chorus',name:'Chorus',notes:'Open up.',order:1},
  ],transitions:[{id:'v-c',fromSectionId:'verse',toSectionId:'chorus',name:'Lift',notes:'Do not rush the fill.'}]};
}

test('voice stays on the existing rest-aware routine path while Autopilot v2 remains disabled for voice',()=>{
  const legacy=seedData(at);legacy.settings.instrument='Vocals';
  const voice=migratePracticeModel(migratePracticeData(legacy));
  assert.throws(()=>buildAutopilotPlan(voice,{minutes:15,intent:'balanced',now:at,today}),/does not schedule voice practice yet/i);
});

test('short sessions cap genuinely new non-ramp material when familiar alternatives exist',()=>{
  const d=modern(),p=d.settings.activeProfileId,familiar=d.exercises.slice(0,3);
  d.practiceStates=familiar.map((exercise,i)=>stateFor({kind:'exercise',exerciseId:exercise.id},p,{id:'familiar-'+i,evidenceCount:2,mastery:'stabilize',latestResult:'solid',lastPracticedAt:'2026-09-15T18:00:00.000Z'}));
  const build=buildAutopilotPlan(d,{minutes:15,intent:'balanced',now:at,today});
  const newNonRamp=build.selections.filter(s=>s.role!=='ramp-in'&&(!s.candidate.state||s.candidate.state.evidenceCount===0));
  assert.ok(newNonRamp.length<=1,newNonRamp.map(s=>s.candidate.label).join(', '));
});

test('all canonical Autopilot budgets allocate exact time with stable slot counts',()=>{
  const d=modern(),expected=new Map([[5,2],[10,3],[15,4],[20,4],[30,5],[45,6],[60,6]]);
  for(const minutes of AUTOPILOT_MINUTES){
    const build=buildAutopilotPlan(d,{minutes,intent:'balanced',now:at,today});
    assert.equal(build.totalSeconds,minutes*60,String(minutes));
    assert.equal(build.plan.blocks.reduce((sum,b)=>sum+b.targetSeconds,0),minutes*60);
    assert.equal(build.plan.blocks.length,expected.get(minutes));
    assert.equal(build.plan.generation.kind,'autopilot');
    assert.equal(build.plan.generation.requestedMinutes,minutes);
    assert.equal(build.plan.generation.sessionIntent,'balanced');
    assert.equal(build.plan.generation.engineVersion,2);
    assert.deepEqual(build.plan.blocks.map(b=>b.order),build.plan.blocks.map((_,i)=>i));
  }
});

test('five-minute rescue session skips generic ramp-in and uses primary plus application',()=>{
  const build=buildAutopilotPlan(modern(),{minutes:5,intent:'balanced',now:at,today});
  assert.deepEqual(build.selections.map(s=>s.role),['primary','application']);
  assert.deepEqual(build.plan.blocks.map(b=>b.targetSeconds),[180,120]);
});

test('ten- and fifteen-minute sessions introduce a relevant ramp-in without duplicating targets when alternatives exist',()=>{
  for(const minutes of [10,15]){
    const build=buildAutopilotPlan(modern(),{minutes,intent:'balanced',now:at,today});
    assert.equal(build.selections[0].role,'ramp-in');
    assert.equal(build.plan.blocks[0].prescription.intent,'ramp-in');
    assert.equal(new Set(build.selections.map(s=>s.candidate.targetKey)).size,build.selections.length);
  }
});

test('Timing and Technique emphasis constrain the primary target when matching material exists',()=>{
  const d=modern();
  const timing=buildAutopilotPlan(d,{minutes:15,intent:'timing',now:at,today});
  const technique=buildAutopilotPlan(d,{minutes:15,intent:'technique',now:at,today});
  const timingPrimary=timing.selections.find(s=>s.role==='primary').candidate;
  const techniquePrimary=technique.selections.find(s=>s.role==='primary').candidate;
  assert.ok(domains(timingPrimary).has('timing'));
  assert.ok(domains(techniquePrimary).has('technique'));
  assert.ok(timing.selections.find(s=>s.role==='primary').block.prescription.reasons.includes('user-request'));
  assert.ok(technique.selections.find(s=>s.role==='primary').block.prescription.reasons.includes('user-request'));
});

test('Songs emphasis chooses repertoire as primary and preserves arrangement metadata',()=>{
  const d=modern();d.songs=[song()];
  const build=buildAutopilotPlan(d,{minutes:10,intent:'songs',now:at,today});
  const primary=build.selections.find(s=>s.role==='primary');
  assert.ok(['song','song-section','song-transition'].includes(primary.candidate.target.kind));
  assert.ok(primary.block.songId==='song-1');
  assert.ok(primary.block.prescription.reasons.includes('user-request'));
});

test('a high-priority persistent transition becomes a transition practice block with transition prescription identity',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song();d.songs=[s];
  const target={kind:'song-transition',songId:s.id,transitionId:'v-c'};
  d.practiceStates=[...(d.practiceStates??[]),stateFor(target,p,{scheduling:{consecutiveSkips:0,manualPriority:2}})];
  const build=buildAutopilotPlan(d,{minutes:5,intent:'songs',now:at,today});
  const selected=build.selections.find(item=>item.candidate.target.kind==='song-transition');
  assert.ok(selected);
  assert.equal(selected.block.type,'song-section');
  assert.equal(selected.block.songSectionId,'verse');
  assert.equal(selected.block.prescription.target.kind,'song-transition');
  assert.equal(selected.block.prescription.target.transitionId,'v-c');
  assert.match(selected.block.title,/Lift/);
  assert.match(selected.block.notes,/Do not rush/);
});

test('due Retest state produces cold-retest intent only when that target is selected for retention',()=>{
  const d=modern(),p=d.settings.activeProfileId,exercise=d.exercises.find(e=>e.primarySkillId==='drums.timing')??d.exercises[0];
  const target={kind:'exercise',exerciseId:exercise.id};
  d.practiceStates=[...(d.practiceStates??[]).filter(s=>s.targetKey!==practiceTargetKey(target)),stateFor(target,p,{mastery:'retest',latestResult:'solid',lastPracticedAt:'2026-09-16T18:00:00.000Z',nextReviewAt:'2026-09-20T18:00:00.000Z'})];
  const build=buildAutopilotPlan(d,{minutes:30,intent:'balanced',now:at,today});
  const retention=build.selections.find(s=>s.role==='retention');
  assert.ok(retention);
  if(retention.candidate.targetKey===practiceTargetKey(target))assert.equal(retention.block.prescription.intent,'retest');
  else assert.notEqual(retention.block.prescription.intent,'retest');
});

test('application slots do not fabricate transfer context for ordinary same-domain fallback exercises',()=>{
  const d=modern();d.songs=[];
  const build=buildAutopilotPlan(d,{minutes:5,intent:'balanced',now:at,today});
  const application=build.selections.find(s=>s.role==='application');
  const isMusical=application.candidate.target.kind!=='exercise'||application.candidate.state?.mastery==='apply'||application.candidate.reasons.includes('musical-transfer')||domains(application.candidate).has('repertoire');
  if(!isMusical)assert.notEqual(application.block.prescription.intent,'apply');
});

test('applying a generated plan preserves today plan identity and atomically stamps every selected target as scheduled',()=>{
  const d=modern(),profile=d.settings.activeProfileId;
  d.dailyPlans=[{id:'today-plan',createdAt:'2026-09-20T10:00:00.000Z',updatedAt:'2026-09-20T10:00:00.000Z',profileId:profile,date:today,sourceRoutineId:'routine-1',blocks:[]}];
  const build=buildAutopilotPlan(d,{minutes:15,intent:'balanced',now:at,today}),next=applyAutopilotPlan(d,build);
  assert.equal(build.plan.id,'today-plan');
  assert.equal(next.dailyPlans.length,1);
  assert.equal(next.dailyPlans[0].id,'today-plan');
  assert.equal(next.dailyPlans[0].sourceRoutineId,undefined);
  assert.equal(next.dailyPlans[0].generation.kind,'autopilot');
  for(const selection of build.selections){
    const state=next.practiceStates.find(s=>s.profileId===profile&&s.targetKey===selection.candidate.targetKey);
    assert.ok(state,selection.candidate.targetKey);assert.equal(state.scheduling.lastScheduledAt,at);
  }
  assert.doesNotThrow(()=>validateData(next));
});

test('newly scheduled unseen targets get discover state without fabricated mastery evidence',()=>{
  const d=modern(),build=buildAutopilotPlan(d,{minutes:5,intent:'balanced',now:at,today}),next=applyAutopilotPlan(d,build);
  const fresh=build.selections.map(s=>next.practiceStates.find(state=>state.targetKey===s.candidate.targetKey)).filter(state=>state?.evidenceCount===0);
  assert.ok(fresh.length>0);
  for(const state of fresh){assert.equal(state.mastery,'discover');assert.equal(state.latestResult,undefined);assert.equal(state.nextReviewAt,undefined);}
});

test('Autopilot session scheduling increments skips and resets the streak after a completed block',()=>{
  const d=modern(),p=d.settings.activeProfileId,exercise=d.exercises[0],target={kind:'exercise',exerciseId:exercise.id},base=stateFor(target,p,{scheduling:{lastScheduledAt:at,consecutiveSkips:1,manualPriority:0}});
  const prescription={target,intent:'build',reasons:['active-priority'],generatedBy:'autopilot',engineVersion:1};
  const skipped={id:'session-1',createdAt:at,updatedAt:at,profileId:p,status:'abandoned',startedAt:at,endedAt:'2026-09-21T18:05:00.000Z',activeBlockIndex:0,sessionNotes:'',runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:at,metronomeOn:true},blocks:[{id:'b1',profileId:p,type:'exercise',sourceExerciseId:exercise.id,titleSnapshot:exercise.name,categorySnapshot:exercise.category,stickingSnapshot:'',meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,targetSeconds:60,actualActiveSeconds:0,initialBpm:80,finalBpm:80,tempoAttempts:[],notes:'',endedAt:'2026-09-21T18:05:00.000Z',completed:false,skipped:true,prescriptionSnapshot:prescription}]};
  let states=applyAutopilotSessionScheduling([base],skipped);
  assert.equal(states[0].scheduling.consecutiveSkips,2);assert.equal(states[0].scheduling.lastSkippedAt,'2026-09-21T18:05:00.000Z');
  const completed=structuredClone(skipped);completed.id='session-2';completed.status='completed';completed.blocks[0].completed=true;completed.blocks[0].skipped=false;completed.blocks[0].endedAt='2026-09-21T19:00:00.000Z';completed.endedAt='2026-09-21T19:00:00.000Z';
  states=applyAutopilotSessionScheduling(states,completed);
  assert.equal(states[0].scheduling.consecutiveSkips,0);
});

test('manual/non-Autopilot sessions never change scheduling skip bookkeeping',()=>{
  const d=modern(),p=d.settings.activeProfileId,exercise=d.exercises[0],target={kind:'exercise',exerciseId:exercise.id},base=stateFor(target,p,{scheduling:{lastScheduledAt:at,consecutiveSkips:2,manualPriority:0}});
  const session={id:'manual-session',createdAt:at,updatedAt:at,profileId:p,status:'abandoned',startedAt:at,endedAt:at,activeBlockIndex:0,sessionNotes:'',runtime:{phase:'paused',bpm:80,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:at,metronomeOn:true},blocks:[{id:'b',profileId:p,type:'exercise',sourceExerciseId:exercise.id,titleSnapshot:exercise.name,categorySnapshot:exercise.category,stickingSnapshot:'',meterSnapshot:{beats:4,beatUnit:4},subdivisionSnapshot:1,targetSeconds:60,actualActiveSeconds:0,tempoAttempts:[],notes:'',completed:false,skipped:true}]};
  assert.deepEqual(applyAutopilotSessionScheduling([base],session),[base]);
});
