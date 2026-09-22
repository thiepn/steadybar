import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../dist/app/db/seed.js';
import { migratePracticeData } from '../dist/app/db/profile-migration.js';
import { migratePracticeModel } from '../dist/app/db/practice-model-migration.js';
import { applyExerciseProgression, buildExerciseProgression, progressionDimensions, PROGRESSION_ENGINE_VERSION } from '../dist/app/domain/progression-engine.js';
import { createSession } from '../dist/app/practice/logic.js';
import { exerciseBpm } from '../dist/app/domain/protocols.js';
import { practiceTargetKey } from '../dist/app/domain/practice-state.js';
import { validateData } from '../dist/app/domain/validation.js';

const at='2026-09-22T08:00:00.000Z';

function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}

function exerciseState(exercise,overrides={}){
  const target={kind:'exercise',exerciseId:exercise.id},profileId=exercise.profileId;
  return {
    id:'state-'+exercise.id,createdAt:at,updatedAt:at,profileId,
    targetKey:practiceTargetKey(target),target,mastery:'retest',latestResult:'solid',
    limitations:[],challenge:'advance',evidenceCount:4,recent:{solid:2,usable:0,notYet:0},
    scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},
    tempo:{peak:100,working:100,peakAt:at,workingAt:at},
    ...overrides,
  };
}

function addProgressionHistory(data,exercise,progression,{finalBpm=100,timingClick,seconds=300,when='2026-09-21T08:00:00.000Z'}={}){
  const block={id:'block-'+data.sessions.length,type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:seconds,bpm:finalBpm,notes:'',order:0,progression};
  const session=createSession([block],data);
  session.status='completed';session.endedAt=when;session.updatedAt=when;session.runtime.phase='paused';
  const saved=session.blocks[0];saved.completed=true;saved.startedAt=when;saved.endedAt=when;saved.actualActiveSeconds=seconds;saved.finalBpm=finalBpm;
  saved.evaluation={id:'eval-'+data.sessions.length,timestamp:when,result:'solid',context:'normal',limitations:[],note:''};
  if(timingClick)saved.timingClickSnapshot=structuredClone(timingClick);
  data.sessions.push(session);
  return saved;
}

function tempoExercise(data){return data.exercises.find(e=>exerciseBpm(e)!==undefined&&e.profileId===data.settings.activeProfileId);}

test('progression engine exposes the complete Phase 8 challenge-axis vocabulary',()=>{
  assert.equal(PROGRESSION_ENGINE_VERSION,1);
  assert.deepEqual(progressionDimensions(),['tempo','duration','subdivision','click-density','gap-click','dynamics','orchestration','memory','musical-context']);
});

test('unassessed exercise establishes a baseline instead of fabricating advancement',()=>{
  const d=modern(),exercise=tempoExercise(d);
  d.practiceStates=(d.practiceStates??[]).filter(s=>s.targetKey!==practiceTargetKey({kind:'exercise',exerciseId:exercise.id}));
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.direction,'hold');assert.equal(plan.dimension,'baseline');assert.equal(plan.level,0);
  assert.equal(plan.bpm,exerciseBpm(exercise));
});

test('advance changes one axis at a time and stable timing work first reduces click information',()=>{
  const d=modern(),exercise=tempoExercise(d);d.practiceStates=[exerciseState(exercise)];
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.direction,'advance');assert.equal(plan.dimension,'click-density');assert.equal(plan.level,1);
  assert.equal(plan.timingClick.mode,'two-four');
  assert.equal(plan.bpm,undefined);assert.equal(plan.targetSeconds,undefined);assert.equal(plan.subdivision,undefined);
});

test('hold repeats the latest explicit challenge without silently stacking another variable',()=>{
  const d=modern(),exercise=tempoExercise(d),timing={mode:'gap',sparseEvery:2,gapClickBars:2,gapSilentBars:2};
  const challenge={engineVersion:1,direction:'advance',dimension:'gap-click',level:2,summary:'Gap click · 2 on / 2 silent',cue:'Keep playing.',timingClick:timing};
  addProgressionHistory(d,exercise,challenge,{timingClick:timing});
  d.practiceStates=[exerciseState(exercise,{challenge:'hold'})];
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.direction,'hold');assert.equal(plan.dimension,'gap-click');assert.equal(plan.level,2);assert.deepEqual(plan.timingClick,timing);
});

test('reduce steps back the same challenge axis that just failed',()=>{
  const d=modern(),exercise=tempoExercise(d),timing={mode:'gap',sparseEvery:2,gapClickBars:2,gapSilentBars:2};
  addProgressionHistory(d,exercise,{engineVersion:1,direction:'advance',dimension:'gap-click',level:2,summary:'Gap click',cue:'Keep playing.',timingClick:timing},{timingClick:timing});
  d.practiceStates=[exerciseState(exercise,{challenge:'reduce',latestResult:'not-yet',limitations:['timing']})];
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.direction,'reduce');assert.equal(plan.dimension,'gap-click');assert.equal(plan.level,1);
  assert.deepEqual(plan.timingClick,{mode:'gap',sparseEvery:2,gapClickBars:3,gapSilentBars:1});
});

test('too-fast weakness lowers proven tempo rather than chasing the latest failed experiment',()=>{
  const d=modern(),exercise=tempoExercise(d);
  addProgressionHistory(d,exercise,undefined,{finalBpm:140});
  d.practiceStates=[exerciseState(exercise,{challenge:'reduce',latestResult:'not-yet',limitations:['too-fast'],tempo:{peak:100,peakAt:at}})];
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.dimension,'tempo');assert.equal(plan.direction,'reduce');assert.equal(plan.bpm,96);
});

test('Phase 7 one-click-per-bar evidence is inherited instead of being mistaken for standard click',()=>{
  const d=modern(),exercise=tempoExercise(d),timing={mode:'one-per-bar',sparseEvery:3,gapClickBars:3,gapSilentBars:1};
  addProgressionHistory(d,exercise,undefined,{timingClick:timing});
  d.practiceStates=[exerciseState(exercise)];
  const plan=buildExerciseProgression(d,exercise);
  assert.equal(plan.dimension,'gap-click');
  assert.equal(plan.level,1);
});

test('Autopilot-style strict budgets never expand duration',()=>{
  const d=modern(),base=d.exercises[0];
  const exercise={...structuredClone(base),id:'strict-duration-fixture',name:'Strict duration fixture',protocol:{kind:'fretboard',tuning:[40,45,50,55,59,64],strings:[1,2],minFret:0,maxFret:5,target:12},defaultSeconds:300};
  d.exercises.push(exercise);
  d.practiceStates=[exerciseState(exercise,{mastery:'stabilize',tempo:undefined})];
  const plan=buildExerciseProgression(d,exercise,{seconds:240,strictDuration:true});
  assert.equal(plan.targetSeconds,undefined);
  const block=applyExerciseProgression({id:'b',type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:240,notes:'',order:0},plan);
  assert.equal(block.targetSeconds,240);
});

test('voice exercises never receive automatic difficulty escalation',()=>{
  const legacy=seedData(at);legacy.settings.instrument='Vocals';
  const voice=migratePracticeModel(migratePracticeData(legacy));
  const profile=voice.profiles.find(p=>p.instrumentType==='voice'),source=voice.exercises.find(e=>e.profileId===profile?.id);
  assert.ok(profile);assert.ok(source);
  voice.practiceStates=[exerciseState(source,{profileId:profile.id,targetKey:practiceTargetKey({kind:'exercise',exerciseId:source.id}),target:{kind:'exercise',exerciseId:source.id},challenge:'advance',tempo:undefined})];
  const plan=buildExerciseProgression(voice,source);
  assert.equal(plan.direction,'hold');assert.equal(plan.dimension,'baseline');
});

test('applying a progression modifies only its declared hard parameter plus immutable metadata',()=>{
  const base={id:'b',type:'exercise',exerciseId:'e',profileId:'p',title:'Exercise',targetSeconds:300,bpm:80,notes:'',order:0};
  const progression={engineVersion:1,direction:'advance',dimension:'tempo',level:1,summary:'Tempo step · 84 BPM',cue:'Raise only tempo.',bpm:84};
  const next=applyExerciseProgression(base,progression);
  assert.equal(next.bpm,84);assert.equal(next.targetSeconds,300);assert.deepEqual(next.progression,progression);
  assert.equal(base.bpm,80);assert.equal(base.progression,undefined);
});

test('session snapshot applies click/subdivision progression and preserves it historically',()=>{
  const d=modern(),exercise=tempoExercise(d),protocol=structuredClone(exercise.protocol);
  protocol.pulse.subdivision=4;exercise.protocol=protocol;
  const progression={engineVersion:1,direction:'advance',dimension:'subdivision',level:1,summary:'Click subdivision · 2×',cue:'Reduce click support.',subdivision:2,timingClick:{mode:'sparse',sparseEvery:3,gapClickBars:3,gapSilentBars:1}};
  const block=applyExerciseProgression({id:'b',type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:300,bpm:exerciseBpm(exercise),notes:'',order:0},progression);
  const session=createSession([block],d),saved=session.blocks[0];
  assert.deepEqual(saved.progressionSnapshot,progression);
  assert.equal(saved.subdivisionSnapshot,2);
  assert.deepEqual(saved.timingClickSnapshot,progression.timingClick);
});

test('new progression fields validate while older blocks without them remain compatible',()=>{
  const d=modern(),exercise=tempoExercise(d);d.practiceStates=[exerciseState(exercise)];
  const plan=buildExerciseProgression(d,exercise);
  const block=applyExerciseProgression({id:'b',type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:300,bpm:exerciseBpm(exercise),notes:'',order:0},plan);
  d.dailyPlans=[{id:'plan',createdAt:at,updatedAt:at,profileId:exercise.profileId,date:'2026-09-22',blocks:[block]}];
  assert.doesNotThrow(()=>validateData(d));
  delete d.dailyPlans[0].blocks[0].progression;
  assert.doesNotThrow(()=>validateData(d));
});
