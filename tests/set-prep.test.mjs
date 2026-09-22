import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData } from '../dist/app/db/seed.js';
import { migratePracticeData } from '../dist/app/db/profile-migration.js';
import { migratePracticeModel } from '../dist/app/db/practice-model-migration.js';
import { assessSetlist, applySetPrepPlan, applySetPrepSessionScheduling, buildSetPrepPlan, SET_PREP_ENGINE_VERSION, setPrepWindow } from '../dist/app/domain/set-prep.js';
import { practiceTargetKey } from '../dist/app/domain/practice-state.js';
import { validateData } from '../dist/app/domain/validation.js';

const at='2026-09-22T08:00:00.000Z',today='2026-09-22';

function modern(){return migratePracticeModel(migratePracticeData(seedData(at)));}
function song(id='song-1',title='Song One'){
  return {
    id,createdAt:at,updatedAt:at,title,artist:'',bpm:72,meter:{beats:4,beatUnit:4},key:'D',
    difficulty:2,status:'performance-ready',notes:'Whole-song cue.',
    sections:[
      {id:id+'-verse',name:'Verse',notes:'Verse cue.',order:0},
      {id:id+'-chorus',name:'Chorus',notes:'Chorus cue.',order:1},
    ],
    transitions:[{id:id+'-v-c',fromSectionId:id+'-verse',toSectionId:id+'-chorus',name:'Verse → Chorus',notes:'Land the chorus cleanly.'}],
  };
}
function setlist(songIds,date='2026-09-27'){
  return {id:'set-1',createdAt:at,updatedAt:at,name:'Sunday Set',date,songIds,notes:'Worship set.'};
}
function state(profileId,target,overrides={}){
  const key=practiceTargetKey(target);
  return {
    id:'state-'+key.replaceAll('|','-'),createdAt:at,updatedAt:at,profileId,targetKey:key,target,
    mastery:'maintain',lastPracticedAt:'2026-09-21T08:00:00.000Z',lastEvaluatedAt:'2026-09-21T08:00:00.000Z',
    lastAppliedAt:'2026-09-21T08:00:00.000Z',nextReviewAt:'2026-10-01T08:00:00.000Z',
    latestResult:'solid',limitations:[],challenge:'hold',evidenceCount:5,recent:{solid:3,usable:0,notYet:0},
    scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at},...overrides,
  };
}

test('set-prep windows follow dated performance phases without a numeric readiness score',()=>{
  const base=setlist(['song-1']);
  assert.equal(setPrepWindow({...base,date:undefined},today).window,'build');
  assert.deepEqual(setPrepWindow({...base,date:'2026-10-20'},today),{window:'build',daysUntil:28});
  assert.deepEqual(setPrepWindow({...base,date:'2026-10-01'},today),{window:'integrate',daysUntil:9});
  assert.deepEqual(setPrepWindow({...base,date:'2026-09-27'},today),{window:'simulate',daysUntil:5});
  assert.deepEqual(setPrepWindow({...base,date:'2026-09-24'},today),{window:'taper',daysUntil:2});
  assert.deepEqual(setPrepWindow({...base,date:'2026-09-22'},today),{window:'performance-day',daysUntil:0});
  assert.deepEqual(setPrepWindow({...base,date:'2026-09-21'},today),{window:'past',daysUntil:-1});
});

test('manual performance-ready status alone does not fabricate readiness evidence',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song();d.songs=[s];d.setlists=[setlist([s.id])];d.practiceStates=[];
  const assessment=assessSetlist(d,d.setlists[0],p,{now:at,today});
  assert.equal(assessment.items[0].manualStatus,'performance-ready');
  assert.equal(assessment.items[0].readiness,'unassessed');
  assert.match(assessment.items[0].summary,/manually/i);
  assert.equal(assessment.readiness,'attention');
});

test('solid maintained performance-context evidence produces Ready evidence when no review is due',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),target={kind:'song',songId:s.id};
  d.songs=[s];d.setlists=[setlist([s.id])];d.practiceStates=[state(p,target)];
  const assessment=assessSetlist(d,d.setlists[0],p,{now:at,today});
  assert.equal(assessment.items[0].readiness,'ready');
  assert.equal(assessment.readiness,'ready-evidence');
});

test('a recent weak transition overrides otherwise ready whole-song evidence',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),whole={kind:'song',songId:s.id},transition={kind:'song-transition',songId:s.id,transitionId:s.id+'-v-c'};
  d.songs=[s];d.setlists=[setlist([s.id])];
  d.practiceStates=[state(p,whole),state(p,transition,{mastery:'build',latestResult:'not-yet',lastAppliedAt:undefined,nextReviewAt:'2026-09-23T08:00:00.000Z',limitations:['timing']})];
  const item=assessSetlist(d,d.setlists[0],p,{now:at,today}).items[0];
  assert.equal(item.readiness,'needs-work');
  assert.equal(item.issues[0].kind,'transition');
  assert.equal(item.issues[0].readiness,'needs-work');
});

test('due retention downgrades whole-song Ready evidence to Usable until reconfirmed',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),target={kind:'song',songId:s.id};
  d.songs=[s];d.setlists=[setlist([s.id])];
  d.practiceStates=[state(p,target,{nextReviewAt:'2026-09-22T07:00:00.000Z'})];
  const item=assessSetlist(d,d.setlists[0],p,{now:at,today}).items[0];
  assert.equal(item.readiness,'usable');
  assert.match(item.summary,/Usable/i);
});

test('focused prep deterministically selects current transition risk and preserves exact time',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),sl=setlist([s.id],'2026-10-01');
  const whole={kind:'song',songId:s.id},transition={kind:'song-transition',songId:s.id,transitionId:s.id+'-v-c'};
  d.songs=[s];d.setlists=[sl];
  d.practiceStates=[state(p,whole),state(p,transition,{mastery:'build',latestResult:'not-yet',lastAppliedAt:undefined,limitations:['timing']})];
  const build=buildSetPrepPlan(d,sl,{profileId:p,minutes:15,mode:'focused',now:at,today});
  assert.equal(build.totalSeconds,900);
  assert.equal(build.plan.blocks.reduce((sum,b)=>sum+b.targetSeconds,0),900);
  assert.equal(build.plan.generation.kind,'set-prep');
  assert.equal(build.plan.generation.setPrepStage,'integrate');
  assert.equal(build.plan.generation.setPrepMode,'focused');
  assert.equal(build.plan.generation.setlistId,sl.id);
  assert.equal(build.selections[0].target.kind,'song-transition');
  assert.equal(build.selections[0].block.setPrep.role,'transition');
  assert.equal(build.selections[0].block.prescription.generatedBy,'set-prep');
  assert.ok(build.selections[0].block.prescription.reasons.includes('transition-risk'));
  assert.equal(SET_PREP_ENGINE_VERSION,1);
  assert.doesNotThrow(()=>validateData({...d,dailyPlans:[build.plan]}));
});

test('run-through preserves exact set order, duplicates, and performance context',()=>{
  const d=modern(),p=d.settings.activeProfileId,a=song('a','A'),b=song('b','B'),sl=setlist(['a','b','a'],'2026-09-27');
  d.songs=[a,b];d.setlists=[sl];d.practiceStates=[];
  const build=buildSetPrepPlan(d,sl,{profileId:p,minutes:15,mode:'run-through',now:at,today});
  assert.equal(build.totalSeconds,900);
  assert.deepEqual(build.plan.blocks.map(block=>block.songId),['a','b','a']);
  assert.deepEqual(build.plan.blocks.map(block=>block.setPrep.setPosition),[0,1,2]);
  assert.ok(build.plan.blocks.every(block=>block.prescription.intent==='perform'));
  assert.ok(build.plan.blocks.every(block=>block.prescription.reasons.includes('performance-simulation')));
  assert.ok(build.plan.blocks.every(block=>block.setPrep.role==='run-through'));
  assert.equal(build.plan.blocks.reduce((sum,block)=>sum+block.targetSeconds,0),900);
});

test('simulate-stage focused work records performance intent even outside full run-through mode',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),sl=setlist([s.id],'2026-09-27');
  d.songs=[s];d.setlists=[sl];d.practiceStates=[];
  const build=buildSetPrepPlan(d,sl,{profileId:p,minutes:10,mode:'focused',now:at,today});
  assert.equal(build.plan.generation.setPrepStage,'simulate');
  assert.ok(build.plan.blocks.every(block=>block.prescription.intent==='perform'));
});

test('past performances cannot generate new set-prep plans until the date is updated',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),sl=setlist([s.id],'2026-09-21');
  d.songs=[s];d.setlists=[sl];
  assert.throws(()=>buildSetPrepPlan(d,sl,{profileId:p,minutes:10,mode:'focused',now:at,today}),/date has passed/i);
});

test('applying set prep replaces Today atomically and stamps selected targets without fabricating mastery',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),sl=setlist([s.id],'2026-09-27');
  d.songs=[s];d.setlists=[sl];d.practiceStates=[];
  const build=buildSetPrepPlan(d,sl,{profileId:p,minutes:10,mode:'focused',now:at,today}),next=applySetPrepPlan(d,build);
  assert.equal(next.dailyPlans.length,1);
  assert.equal(next.dailyPlans[0].generation.kind,'set-prep');
  for(const selection of build.selections){
    const st=next.practiceStates.find(row=>row.profileId===p&&row.targetKey===practiceTargetKey(selection.target));
    assert.ok(st);assert.equal(st.scheduling.lastScheduledAt,at);assert.equal(st.evidenceCount,0);assert.equal(st.mastery,'discover');
  }
  assert.doesNotThrow(()=>validateData(next));
});

test('set-prep skip bookkeeping is independent from mastery and resets after a completed generated block',()=>{
  const d=modern(),p=d.settings.activeProfileId,s=song(),target={kind:'song',songId:s.id},base=state(p,target,{scheduling:{lastScheduledAt:at,consecutiveSkips:1,manualPriority:0}});
  const snapshot={engineVersion:1,setlistId:'set-1',setlistName:'Sunday Set',performanceDate:'2026-09-27',stage:'simulate',mode:'focused',role:'song',setPosition:0};
  const prescription={target,intent:'perform',reasons:['setlist-focus','performance-simulation'],generatedBy:'set-prep',engineVersion:1};
  const session={id:'session-1',createdAt:at,updatedAt:at,profileId:p,status:'abandoned',startedAt:at,endedAt:'2026-09-22T08:10:00.000Z',activeBlockIndex:0,sessionNotes:'',runtime:{phase:'paused',bpm:72,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:at,metronomeOn:true},blocks:[{id:'b',profileId:p,type:'song',sourceSongId:s.id,titleSnapshot:s.title,categorySnapshot:'song',stickingSnapshot:'',meterSnapshot:s.meter,subdivisionSnapshot:1,targetSeconds:300,actualActiveSeconds:0,initialBpm:72,finalBpm:72,tempoAttempts:[],notes:'',completed:false,skipped:true,prescriptionSnapshot:prescription,setPrepSnapshot:snapshot}]};
  let states=applySetPrepSessionScheduling([base],session);
  assert.equal(states[0].scheduling.consecutiveSkips,2);
  const completed=structuredClone(session);completed.id='session-2';completed.status='completed';completed.blocks[0].skipped=false;completed.blocks[0].completed=true;completed.endedAt='2026-09-22T09:00:00.000Z';completed.blocks[0].endedAt=completed.endedAt;
  states=applySetPrepSessionScheduling(states,completed);
  assert.equal(states[0].scheduling.consecutiveSkips,0);
});
