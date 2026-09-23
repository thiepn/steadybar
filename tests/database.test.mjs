import {validateData,validateSession} from '../dist/app/domain/validation.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
/** Real database repository functions against a controlled transaction adapter.
 * Native IndexedDB/reload tests remain in e2e.py and require a real browser origin. */
import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {transactionAdapter} from './helpers/transaction-adapter.mjs';
import * as db from '../dist/app/db/database.js';
import {seedData} from '../dist/app/db/seed.js';
import {createBackup,restoreBackup} from '../dist/app/db/backup.js';
import {createSession,pauseSession,finishBlock} from '../dist/app/practice/logic.js';
import {applyAutopilotPlan,buildAutopilotPlan} from '../dist/app/domain/autopilot.js';
import {buildTrainingPlan} from '../dist/app/domain/training-plan.js';
import {buildWeeklySchedule} from '../dist/app/domain/weekly-schedule.js';
import {requireActive} from '../dist/app/practice/guards.js';
import {metadata,uuid} from '../dist/app/domain/utils.js';
const adapter=transactionAdapter([...db.STORES,'migrationBackups']);
globalThis.indexedDB=adapter.factory;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
beforeEach(()=>adapter.reset());
const free=()=>({id:uuid(),type:'free',title:'Free practice',targetSeconds:60,bpm:80,notes:'',order:0});
const active=()=>{const data=migratePracticeData(seedData());return createSession([{...free(),profileId:data.settings.activeProfileId}],data);};

test('repository initialization commits all starter tables without fake history',async()=>{
  await db.initializeDatabase();const data=await db.readData();
  assert.equal(data.exercises.length,36);assert.equal(data.routines.length,8);assert.equal(data.sessions.length,0);assert.deepEqual(data.trainingPlans,[]);assert.deepEqual(data.weeklySchedules,[]);assert.deepEqual(data.recordings,[]);assert.deepEqual(data.timingResults,[]);assert.deepEqual(data.midiDeviceProfiles,[]);assert.deepEqual(data.midiResults,[]);assert.deepEqual(data.audioTracks,[]);
  assert.equal(adapter.state.aborted,0);
});
test('initialization adds missing Phase 19 built-ins without overwriting edited built-ins',async()=>{
  await db.initializeDatabase();let data=await db.readData();
  const edited=data.exercises.find(row=>row.id==='rudiment-1');assert.ok(edited);
  edited.name='My edited single strokes';edited.archived=true;data.exercises=data.exercises.filter(row=>row.id!=='exercise-15').map(row=>row.id===edited.id?edited:row);
  await db.replaceData(data);assert.equal((await db.readData()).exercises.some(row=>row.id==='exercise-15'),false);
  await db.initializeDatabase();data=await db.readData();
  assert.equal(data.exercises.find(row=>row.id==='rudiment-1').name,'My edited single strokes');
  assert.equal(data.exercises.find(row=>row.id==='rudiment-1').archived,true);
  assert.equal(data.exercises.find(row=>row.id==='exercise-15').name,'Complete Take Recovery');
  const once=structuredClone(data);await db.initializeDatabase();assert.deepEqual(await db.readData(),once);
});
test('repository exercise create/read/update/archive uses durable repository calls',async()=>{
  await db.initializeDatabase();const e={...migratePracticeData(seedData()).exercises[0],...metadata(),name:'My control exercise',builtin:false};
  await db.put('exercises',e);assert.deepEqual(await db.get('exercises',e.id),e);
  await db.put('exercises',{...e,name:'Renamed control',archived:true});
  assert.equal((await db.get('exercises',e.id)).name,'Renamed control');assert.equal((await db.get('exercises',e.id)).archived,true);
});
test('repository does not report save completion after a request but before commit',async()=>{
  await db.initializeDatabase();adapter.state.holdCommit=true;
  const e={...migratePracticeData(seedData()).exercises[0],...metadata(),name:'Commit barrier'};let resolved=false;
  const write=db.put('exercises',e).then(()=>{resolved=true;});
  for(let i=0;i<100&&!adapter.state.held.length;i++)await flush();
  assert.equal(adapter.state.held.length,1);assert.equal(resolved,false);
  assert.equal(adapter.state.tables.get('exercises').has(e.id),false);
  adapter.releaseCommits();await write;assert.equal(resolved,true);
  assert.equal((await db.get('exercises',e.id)).name,'Commit barrier');
});
test('repository rolls back a failed commit and surfaces the original error',async()=>{
  await db.initializeDatabase();const e={...migratePracticeData(seedData()).exercises[0],...metadata(),name:'Not saved'};
  adapter.state.failCommit=new DOMException('Injected commit failure','QuotaExceededError');
  await assert.rejects(db.put('exercises',e),/Injected commit failure/);
  assert.equal(await db.get('exercises',e.id),undefined);assert.equal(adapter.state.aborted,1);
});
test('invalid complete replacement leaves every existing table untouched',async()=>{
  await db.initializeDatabase();const before=await db.readData(),bad=structuredClone(before);bad.exercises[0].defaultBpm=900;
  const writes=adapter.state.writes;await assert.rejects(db.replaceData(bad),/300/);
  assert.equal(adapter.state.writes,writes);assert.deepEqual(await db.readData(),before);
});
test('mid-replacement failure rolls back earlier clears and writes in all stores',async()=>{
  await db.initializeDatabase();const before=await db.readData(),replacement=structuredClone(before);
  replacement.exercises[0].name='Must roll back';adapter.state.failWriteAt=adapter.state.writes+8;
  await assert.rejects(db.replaceData(replacement),/Injected write failure/);
  assert.deepEqual(await db.readData(),before);
});
test('two concurrent session launches cannot insert two active sessions',async()=>{
  await db.initializeDatabase();const results=await Promise.allSettled([db.insertActiveSession(active()),db.insertActiveSession(active())]);
  assert.deepEqual(results.map(r=>r.status).sort(),['fulfilled','rejected']);
  assert.match(results.find(r=>r.status==='rejected').reason.message,/unfinished session/);
  assert.equal((await db.all('sessions')).length,1);
});
test('generic session writes cannot bypass the one-active-session invariant',async()=>{
  await db.initializeDatabase();const first=active(),second=active();await db.put('sessions',first);
  await assert.rejects(db.put('sessions',second),/one active session/);assert.deepEqual((await db.all('sessions')).map(s=>s.id),[first.id]);
});
test('generic session put cannot rewrite an existing ended history row',async()=>{
 await db.initializeDatabase();let s=finishBlock(active());await db.put('sessions',s);const before=structuredClone(await db.get('sessions',s.id));
 await assert.rejects(db.put('sessions',{...s,sessionNotes:'rewritten through generic put'}),/guarded session commands/);assert.deepEqual(await db.get('sessions',s.id),before);
});
test('generic entity saves still validate after a session-backed lesson review exists',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES.find(c=>c.id==='drums-foundation'),l=c.lessons[0],p=d.profiles.find(p=>p.id===pid);
 let s=createSession(learning.lessonBlocks(c,l,p,{minutes:5}),d);for(let i=0;i<l.tasks.length;i++){s.blocks[i].startedAt='2026-09-09T12:00:00.000Z';s.blocks[i].actualActiveSeconds=20;s=finishBlock(s,false,Date.parse('2026-09-09T12:01:00.000Z')+i*20000);}d.sessions=[s];
 learning.reviewLesson(d,pid,c.id,l.id,{id:'save-after-review',checks:l.checks.map(()=>true),answers:l.questions.map(q=>q.answer),confidence:3,notes:'Keep evidence linked',evidence:{kind:'session',sessionId:s.id}},'2026-09-09T12:05:00.000Z');await db.replaceData(d);
 const setlist={...metadata(),name:'After guided review',songIds:[],notes:''};await db.put('setlists',setlist);assert.equal((await db.get('setlists',setlist.id)).name,setlist.name);
});
test('live-session update API cannot rewrite ended practice history',async()=>{
 await db.initializeDatabase();let s=active();s=finishBlock(s);await db.put('sessions',s);
 await assert.rejects(db.updateSession(s.id,row=>({...row,sessionNotes:'rewrite'})),/Ended practice history is immutable/);assert.equal((await db.get('sessions',s.id)).sessionNotes,'');
});
test('session updates serialize against the newest committed record',async()=>{
  await db.initializeDatabase();const s=active();await db.insertActiveSession(s);
  await Promise.all([db.updateSession(s.id,row=>{row.runtime.bpm+=1;return row;}),db.updateSession(s.id,row=>{row.runtime.bpm+=1;return row;})]);
  const persisted=await db.get('sessions',s.id);assert.equal(persisted.runtime.bpm,82);assert.ok(persisted.updatedAt>s.updatedAt);
});
test('ordinary session updates cannot end practice without atomic mastery finalization',async()=>{
  await db.initializeDatabase();const s=active();await db.insertActiveSession(s);
  await assert.rejects(db.updateSession(s.id,row=>finishBlock(row)),/session finalization|mastery state/i);
  assert.equal((await db.get('sessions',s.id)).status,'active');
});
test('session finalization commits history and mastery state together',async()=>{
  await db.initializeDatabase();const data=await db.readData(),exercise=data.exercises[0];
  const block={id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:60,bpm:80,notes:'',order:0};
  const session=createSession([block],data);await db.insertActiveSession(session);
  const ended=await db.finalizeSession(session.id,row=>{
    const b=row.blocks[0];b.startedAt='2026-09-20T12:00:00.000Z';b.actualActiveSeconds=60;
    b.evaluation={id:'summary-solid',timestamp:'2026-09-20T12:01:00.000Z',result:'solid',context:'normal',limitations:[],note:''};
    return finishBlock(row,false,Date.parse('2026-09-20T12:02:00.000Z'));
  });
  assert.equal(ended.status,'completed');
  const state=(await db.all('practiceStates')).find(s=>s.target.kind==='exercise'&&s.target.exerciseId===exercise.id);
  assert.ok(state);assert.equal(state.mastery,'stabilize');assert.equal(state.engine.version,2);
  assert.equal(state.latestResult,'solid');assert.equal(state.nextReviewAt,'2026-09-22T12:01:00.000Z');
});
test('Autopilot finalization persists skip bookkeeping through the real repository transaction',async()=>{
  await db.initializeDatabase();
  await db.mutateWorkspace(data=>applyAutopilotPlan(data,buildAutopilotPlan(data,{minutes:5,intent:'balanced',now:'2026-09-21T18:00:00.000Z',today:'2026-09-21'})));
  const data=await db.readData(),plan=data.dailyPlans.find(p=>p.generation?.kind==='autopilot');
  const session=createSession(plan.blocks,data,{planId:plan.id});await db.insertActiveSession(session);
  await db.finalizeSession(session.id,row=>{
    const stamp='2026-09-21T18:05:00.000Z';row.runtime.phase='paused';row.status='completed';row.endedAt=stamp;row.activeBlockIndex=1;
    row.blocks[0].skipped=true;row.blocks[0].completed=false;row.blocks[0].endedAt=stamp;
    row.blocks[1].startedAt='2026-09-21T18:03:00.000Z';row.blocks[1].actualActiveSeconds=120;row.blocks[1].completed=true;row.blocks[1].endedAt=stamp;
    return row;
  });
  const saved=await db.readData(),first=plan.blocks[0].prescription.target,second=plan.blocks[1].prescription.target;
  const a=saved.practiceStates.find(s=>JSON.stringify(s.target)===JSON.stringify(first)),b=saved.practiceStates.find(s=>JSON.stringify(s.target)===JSON.stringify(second));
  assert.equal(a.scheduling.consecutiveSkips,1);assert.equal(a.scheduling.lastSkippedAt,'2026-09-21T18:05:00.000Z');
  assert.equal(b.scheduling.consecutiveSkips,0);assert.equal(b.scheduling.lastScheduledAt,'2026-09-21T18:00:00.000Z');
});
test('failed session finalization rolls back both history and mastery state',async()=>{
  await db.initializeDatabase();const data=await db.readData(),exercise=data.exercises[0];
  const block={id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:60,bpm:80,notes:'',order:0};
  const session=createSession([block],data);await db.insertActiveSession(session);adapter.state.failCommit=new DOMException('Finalization quota failure','QuotaExceededError');
  await assert.rejects(db.finalizeSession(session.id,row=>{const b=row.blocks[0];b.startedAt='2026-09-20T12:00:00.000Z';b.actualActiveSeconds=60;b.evaluation={id:'summary-solid',timestamp:'2026-09-20T12:01:00.000Z',result:'solid',context:'normal',limitations:[],note:''};return finishBlock(row,false,Date.parse('2026-09-20T12:02:00.000Z'));}),/Finalization quota failure/);
  assert.equal((await db.get('sessions',session.id)).status,'active');assert.equal((await db.all('practiceStates')).length,0);
});
test('stale commands after completion abort without rewriting saved history',async()=>{
  await db.initializeDatabase();const s=active();await db.insertActiveSession(s);await db.finalizeSession(s.id,row=>finishBlock(row));
  const before=await db.get('sessions',s.id);
  await assert.rejects(db.updateSession(s.id,row=>{requireActive(row,s.blocks[0].id);row.runtime.bpm=200;return row;}),/already ended/);
  assert.deepEqual(await db.get('sessions',s.id),before);
});
test('a session update cannot rewrite its persistent identity',async()=>{
  await db.initializeDatabase();const s=active();await db.insertActiveSession(s);
  await assert.rejects(db.updateSession(s.id,row=>({...row,id:'different'})),/identity/);
  assert.equal((await db.all('sessions')).length,1);assert.equal((await db.all('sessions'))[0].id,s.id);
});
test('complete backup restore preserves all entity types, attempts and historical snapshots',async()=>{
  const data=seedData(),e=data.exercises[1],song={...metadata(),title:'Original composition',artist:'Me',bpm:72,meter:{beats:6,beatUnit:8},key:'G',difficulty:2,status:'practicing',notes:'Bridge control',sections:[{id:uuid(),name:'Bridge',order:0,notes:'Soft hi-hat'}]};
  data.songs=[song];data.setlists=[{...metadata(),name:'Rehearsal',songIds:[song.id],notes:''}];
  data.goals=[{...metadata(),type:'bpm',title:'Clean double strokes',description:'',exerciseId:e.id,targetValue:120,unit:'BPM',completed:false}];
  data.dailyPlans=[{...metadata(),date:'2026-09-08',blocks:[free()]}];data.metronomePresets=[{...metadata(),name:'Slow pulse',config:data.settings.metronome}];
  const s=createSession([free()],seedData());s.blocks[0].sourceExerciseId=e.id;s.blocks[0].titleSnapshot=e.name;s.blocks[0].actualActiveSeconds=120;
  s.blocks[0].tempoAttempts=[{id:uuid(),bpm:105,rating:'clean',timestamp:new Date().toISOString(),note:'Relaxed grip'}];data.sessions=[finishBlock(s)];
  await db.replaceData(data);const exported=createBackup(await db.readData());
  await db.replaceData(seedData());await restoreBackup(exported);
  assert.deepEqual(await db.readData(),validateData({...migratePracticeModel(migratePracticeData(exported.data)),courseProgress:exported.data.courseProgress??[],trainingPlans:exported.data.trainingPlans??[],weeklySchedules:exported.data.weeklySchedules??[],recordings:exported.data.recordings??[],timingResults:exported.data.timingResults??[],midiDeviceProfiles:exported.data.midiDeviceProfiles??[],midiResults:exported.data.midiResults??[],audioTracks:exported.data.audioTracks??[]}));
});
test('backup restore rebuilds derived mastery from evidence while preserving manual scheduling overrides',async()=>{
  await db.initializeDatabase();const data=await db.readData(),exercise=data.exercises[0];
  const block={id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:60,bpm:80,notes:'',order:0};
  let s=createSession([block],data);s.blocks[0].startedAt='2026-09-20T12:00:00.000Z';s.blocks[0].actualActiveSeconds=60;
  s.blocks[0].evaluation={id:'restore-solid',timestamp:'2026-09-20T12:01:00.000Z',result:'solid',context:'normal',limitations:[],note:''};
  s=finishBlock(s,false,Date.parse('2026-09-20T12:02:00.000Z'));data.sessions=[s];
  data.practiceStates=(await import('../dist/app/domain/practice-state-rebuild.js')).rebuildPracticeStates(data);
  const state=data.practiceStates.find(row=>row.target.kind==='exercise'&&row.target.exerciseId===exercise.id);
  state.mastery='maintain';state.engine.version=1;state.scheduling.manualPriority=2;state.scheduling.snoozedUntil='2026-10-01T12:00:00.000Z';
  const backup=createBackup(validateData(data));await restoreBackup(backup);const restored=await db.readData();
  const next=restored.practiceStates.find(row=>row.target.kind==='exercise'&&row.target.exerciseId===exercise.id);
  assert.equal(next.mastery,'stabilize');assert.equal(next.engine.version,2);assert.equal(next.latestResult,'solid');
  assert.equal(next.scheduling.manualPriority,2);assert.equal(next.scheduling.snoozedUntil,'2026-10-01T12:00:00.000Z');
});
test('restore pauses a running checkpoint immediately, before any page reload',async()=>{
  const data=seedData(),s=active();s.runtime.phase='running';s.runtime.runStartedAt='2026-09-01T10:00:00.000Z';s.blocks[0].actualActiveSeconds=32;data.sessions=[s];
  await restoreBackup(createBackup(data));const restored=await db.get('sessions',s.id);
  assert.equal(restored.runtime.phase,'paused');assert.equal(restored.runtime.runStartedAt,undefined);assert.equal(restored.blocks[0].actualActiveSeconds,32);
  assert.equal(pauseSession(restored).blocks[0].actualActiveSeconds,32);
});

test('physical upgrade normalization and original safety snapshot commit atomically',async()=>{
 const legacy=seedData('2026-09-01T12:00:00.000Z');legacy.settings.instrument='Vocals';legacy.settings.onboardingDone=true;await db.replaceData(legacy);
 await db.initializeDatabase();const before=await db.migrationBackup(),data=await db.readData();
 assert.deepEqual(before,legacy);assert.equal(data.schemaVersion,2);assert.equal(data.settings.activeProfileId,'profile-voice');
 await db.initializeDatabase();assert.deepEqual(await db.migrationBackup(),before);assert.deepEqual(await db.readData(),data);
});
test('failed migration commits neither partial profiles nor a misleading backup record',async()=>{
 const legacy=seedData();await db.replaceData(legacy);adapter.state.failCommit=new DOMException('No quota','QuotaExceededError');
 await assert.rejects(db.initializeDatabase(),/No quota/);assert.deepEqual(await db.readData(),{...legacy,profiles:[]});assert.equal(await db.migrationBackup(),undefined);
 await db.initializeDatabase();assert.equal((await db.readData()).schemaVersion,2);
});
test('initialization repairs a historical bucket accidentally saved as the active profile',async()=>{
 const d=migratePracticeData(seedData()),real=d.profiles[0],historical={...real,id:'profile-earlier',name:'Earlier practice',instrumentType:'custom',family:'general',focusAreas:[],attribution:'unresolved-history'};
 real.archived=true;d.profiles.push(historical);d.settings.activeProfileId=historical.id;d.settings.primaryProfileId=historical.id;await db.replaceData(d);
 await db.initializeDatabase();const repaired=await db.readData();assert.equal(repaired.settings.activeProfileId,real.id);assert.equal(repaired.settings.primaryProfileId,real.id);assert.equal(repaired.profiles.find(p=>p.id===real.id).archived,false);assert.equal(repaired.profiles.find(p=>p.id===historical.id).attribution,'unresolved-history');
 await assert.rejects(db.patchSettings({activeProfileId:historical.id}),/profile management|available practice profile/);
});
test('concurrent settings patches merge against committed settings without stomping colors',async()=>{
 await db.initializeDatabase();await Promise.all([db.patchSettings({accent:'blue'}),db.patchSettings({surfaceTheme:'black'}),db.patchSettings({wakeLock:false})]);
 const d=await db.readData();assert.equal(d.settings.accent,'blue');assert.equal(d.settings.surfaceTheme,'black');assert.equal(d.settings.wakeLock,false);
 await assert.rejects(db.patchSettings({activeProfileId:'missing'}),/profile/);
});
test('profile rename mutation does not rewrite historical sessions or exercises',async()=>{
 await db.initializeDatabase();const s=active();s.status='completed';s.runtime.phase='paused';s.endedAt=s.startedAt;s.blocks[0].completed=true;
 await db.put('sessions',s);const writes=adapter.state.writes;
 await db.mutateWorkspace(d=>{d.profiles[0].name='Acoustic drums';return d;});
 assert.equal(adapter.state.writes-writes,1);assert.deepEqual(await db.get('sessions',s.id),validateSession(s));
});
test('referenced records cannot be deleted and profiles use archival rather than destructive removal',async()=>{
 await db.initializeDatabase();const d=await db.readData();await assert.rejects(db.remove('profiles',d.profiles[0].id),/Archive/);
 await assert.rejects(db.remove('exercises',d.routines[0].blocks[0].exerciseId),/belong/);
 assert.ok(await db.get('exercises',d.routines[0].blocks[0].exerciseId));
});
test('explicit reset removes old upgrade data as well as profiles and practice records',async()=>{
 const legacy=seedData();legacy.settings.instrument='Guitar';await db.replaceData(legacy);await db.initializeDatabase();assert.ok(await db.migrationBackup());
 await db.resetWorkspace();assert.equal(await db.migrationBackup(),undefined);const d=await db.readData();assert.equal(d.profiles.length,1);assert.equal(d.settings.onboardingDone,false);assert.equal(d.sessions.length,0);
});

test('training plans persist through the repository and modern backup restore',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId);
  const plan=buildTrainingPlan(data,{profileId:profile.id,name:'Repository cycle',startOn:'2026-09-22',endOn:'2026-11-22',baselineWeeklyMinutes:150,goalIds:[],setlistIds:[],now:'2026-09-22T08:00:00.000Z'});
  await db.put('trainingPlans',plan);assert.equal((await db.get('trainingPlans',plan.id)).name,'Repository cycle');
  const backup=createBackup(await db.readData());assert.equal(backup.version,4);assert.equal(backup.data.trainingPlans.length,1);
  await db.resetWorkspace();assert.equal((await db.readData()).trainingPlans.length,0);
  await restoreBackup(backup);const restored=await db.readData();assert.equal(restored.trainingPlans.length,1);assert.equal(restored.trainingPlans[0].id,plan.id);
});
test('recording metadata persists through the v8 structured repository',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId),exercise=data.exercises.find(row=>row.profileId===profile.id);
  const now='2026-09-23T08:00:00.000Z',row={id:'repository-recording',createdAt:now,updatedAt:now,recordingVersion:1,profileId:profile.id,assetId:'repository-recording',title:exercise.name,durationSeconds:8.5,mimeType:'audio/webm',sizeBytes:2048,sourceType:'exercise',sourceExerciseId:exercise.id,bpm:100,attemptNumber:1,note:'',tags:[],markedBest:false,milestone:false,favorite:false};
  await db.put('recordings',row);assert.equal((await db.get('recordings',row.id)).assetId,row.assetId);
  assert.equal((await db.readData()).recordings.length,1);
});

test('Timing Lab results persist through the v9 repository and modern backup restore',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId);
  const now='2026-09-23T10:00:00.000Z',row={id:'timing-result',createdAt:now,updatedAt:now,timingLabVersion:1,profileId:profile.id,bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:30,threshold:.08,inputOffsetMs:0,matchWindowMs:80,expectedCount:16,detectedCount:16,matchedCount:16,misses:0,extras:0,meanOffsetMs:8,medianOffsetMs:8,meanAbsoluteErrorMs:8,spreadMs:2,driftMsPerMinute:1.5,confidence:'high',hits:Array.from({length:16},(_,index)=>({index,elapsedMs:index*250,offsetMs:8,strength:.5,bar:Math.floor(index/8),beat:Math.floor((index%8)/2),part:index%2}))};
  await db.put('timingResults',row);assert.equal((await db.get('timingResults',row.id)).meanOffsetMs,8);
  const backup=createBackup(await db.readData());assert.equal(backup.version,4);assert.equal(backup.data.timingResults.length,1);
  await db.resetWorkspace();assert.deepEqual((await db.readData()).timingResults,[]);
  await restoreBackup(backup);const restored=await db.readData();assert.equal(restored.timingResults.length,1);assert.equal(restored.timingResults[0].id,row.id);
});
test('older version-4 backups without Timing Lab results restore with an empty timingResults collection',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.timingResults;
  await restoreBackup(backup);assert.deepEqual((await db.readData()).timingResults,[]);
});

test('MIDI mappings and performance results persist through the v10 repository and backup restore',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId),now='2026-09-23T12:00:00.000Z';
  const device={id:'midi-device',createdAt:now,updatedAt:now,profileId:profile.id,deviceKey:'roland::td-17',inputId:'input-1',manufacturer:'Roland',name:'TD-17',channel:10,mappings:[{note:38,voice:'snare',label:'Snare',enabled:true}]};
  await db.put('midiDeviceProfiles',device);assert.equal((await db.get('midiDeviceProfiles',device.id)).deviceKey,device.deviceKey);
  const hits=Array.from({length:16},(_,index)=>({index,elapsedMs:index*250,offsetMs:5,note:38,velocity:index%2?100:80,channel:10,voice:'snare',label:'Snare',bar:Math.floor(index/8),beat:Math.floor((index%8)/2),part:index%2}));
  const result={id:'midi-result',createdAt:now,updatedAt:now,midiAnalysisVersion:1,profileId:profile.id,deviceProfileId:device.id,deviceKey:device.deviceKey,deviceNameSnapshot:device.name,manufacturerSnapshot:device.manufacturer,bpm:120,meter:{beats:4,beatUnit:4},subdivision:2,timingClick:{mode:'standard',sparseEvery:2,gapClickBars:3,gapSilentBars:1},durationSeconds:4,expectedPattern:'subdivision',analyzedVoice:'snare',matchWindowMs:80,expectedCount:16,detectedCount:16,matchedCount:16,misses:0,extras:0,unmappedCount:0,meanOffsetMs:5,medianOffsetMs:5,meanAbsoluteErrorMs:5,spreadMs:0,driftMsPerMinute:0,confidence:'high',velocityMean:90,velocityMedian:90,velocitySpread:10,velocityMin:80,velocityMax:100,velocityRange:20,hits,voices:[{voice:'snare',label:'Snare',count:16,medianVelocity:90,velocitySpread:10,meanAbsoluteErrorMs:5,timingSpreadMs:0}]};
  await db.put('midiResults',result);assert.equal((await db.get('midiResults',result.id)).velocityMedian,90);
  const backup=createBackup(await db.readData());assert.equal(backup.version,4);assert.equal(backup.data.midiDeviceProfiles.length,1);assert.equal(backup.data.midiResults.length,1);
  await db.resetWorkspace();let empty=await db.readData();assert.deepEqual(empty.midiDeviceProfiles,[]);assert.deepEqual(empty.midiResults,[]);
  await restoreBackup(backup);const restored=await db.readData();assert.equal(restored.midiDeviceProfiles[0].id,device.id);assert.equal(restored.midiResults[0].id,result.id);
});
test('older version-4 backups without MIDI collections restore with empty MIDI state',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.midiDeviceProfiles;delete backup.data.midiResults;
  await restoreBackup(backup);const restored=await db.readData();assert.deepEqual(restored.midiDeviceProfiles,[]);assert.deepEqual(restored.midiResults,[]);
});

test('repertoire audio metadata and cues persist through the v11 repository and backup restore',async()=>{
  await db.initializeDatabase();const now='2026-09-23T14:00:00.000Z';
  const song={id:'audio-song',createdAt:now,updatedAt:now,title:'Audio fixture',artist:'',bpm:100,meter:{beats:4,beatUnit:4},key:'',difficulty:2,status:'practicing',notes:'',sections:[{id:'audio-section',name:'Verse',bars:8,notes:'',order:0}]};
  await db.put('songs',song);
  const track={id:'audio-track',createdAt:now,updatedAt:now,songId:song.id,assetId:'audio-asset',title:'Practice mix',fileName:'practice.wav',mimeType:'audio/wav',sizeBytes:4096,durationSeconds:120,cues:[{id:'cue-1',sectionId:song.sections[0].id,label:song.sections[0].name,startSeconds:10,endSeconds:30,order:0}],lastPlaybackRate:.8};
  await db.put('audioTracks',track);assert.equal((await db.get('audioTracks',track.id)).lastPlaybackRate,.8);
  const backup=createBackup(await db.readData());assert.equal(backup.version,4);assert.equal(backup.data.audioTracks.length,1);assert.equal(backup.data.audioTracks[0].assetId,'audio-asset');
  await db.resetWorkspace();assert.deepEqual((await db.readData()).audioTracks,[]);
  await restoreBackup(backup);const restored=await db.readData();assert.equal(restored.audioTracks[0].cues[0].startSeconds,10);
});
test('older version-4 backups without repertoire audio restore with an empty audioTracks collection',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.audioTracks;
  await restoreBackup(backup);assert.deepEqual((await db.readData()).audioTracks,[]);
});

test('weekly schedules persist through the v7 repository and modern backup restore',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId);
  const schedule=buildWeeklySchedule(data,{profileId:profile.id,weekStart:'2026-09-21',targetMinutes:90,practiceDays:3,now:'2026-09-22T08:00:00.000Z'});
  await db.put('weeklySchedules',schedule);assert.equal((await db.get('weeklySchedules',schedule.id)).weekStart,'2026-09-21');
  const backup=createBackup(await db.readData());assert.equal(backup.version,4);assert.equal(backup.data.weeklySchedules.length,1);
  await db.resetWorkspace();assert.deepEqual((await db.readData()).weeklySchedules,[]);
  await restoreBackup(backup);const restored=await db.readData();assert.equal(restored.weeklySchedules.length,1);assert.equal(restored.weeklySchedules[0].id,schedule.id);
});
test('older version-4 backups without weekly schedules restore as an empty weeklySchedules collection',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.weeklySchedules;
  await restoreBackup(backup);assert.deepEqual((await db.readData()).weeklySchedules,[]);
});

test('older version-4 backups without recordings restore with an empty recording collection',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.recordings;
  await restoreBackup(backup);assert.deepEqual((await db.readData()).recordings,[]);
});

test('older version-4 backups without training plans restore as an empty trainingPlans collection',async()=>{
  await db.initializeDatabase();const backup=createBackup(await db.readData());delete backup.data.trainingPlans;
  await restoreBackup(backup);const restored=await db.readData();assert.deepEqual(restored.trainingPlans,[]);
});
test('training-plan references prevent deleting linked goals or setlists',async()=>{
  await db.initializeDatabase();const data=await db.readData(),profile=data.profiles.find(row=>row.id===data.settings.activeProfileId),exercise=data.exercises.find(row=>row.profileId===profile.id&&row.primarySkillId);
  const goal={...metadata(),profileId:profile.id,type:'custom',title:'Linked cycle goal',description:'',exerciseId:exercise.id,targetValue:1,unit:'focus',completed:false};
  await db.put('goals',goal);
  const current=await db.readData(),plan=buildTrainingPlan(current,{profileId:profile.id,name:'Linked cycle',startOn:'2026-09-22',endOn:'2026-11-22',baselineWeeklyMinutes:120,goalIds:[goal.id],setlistIds:[],now:'2026-09-22T08:00:00.000Z'});
  await db.put('trainingPlans',plan);
  await assert.rejects(db.remove('goals',goal.id),/linked goal does not exist/i);
  assert.ok(await db.get('goals',goal.id));
});

// Learning records share the same all-store commit barrier as practice history.
const learning=await import('../dist/app/learning/engine.js');
const catalog=await import('../dist/app/learning/catalog.js');
const courseReview=(id)=>({id,checks:[true,true,true],answers:[catalog.COURSES[0].lessons[0].questions[0].answer],confidence:3,notes:'A real review',evidence:{kind:'off-app',minutes:5,confirmed:true}});
test('concurrent lesson note and review mutations preserve both committed changes',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES[0],l=c.lessons[0];
 await Promise.all([db.mutateWorkspace(data=>learning.saveLessonNote(data,pid,c.id,l.id,'Keep this observation')),db.mutateWorkspace(data=>learning.reviewLesson(data,pid,c.id,l.id,courseReview('review-concurrent')))]);
 const saved=(await db.readData()).courseProgress[0].lessons[0];assert.equal(saved.notes,'Keep this observation');assert.equal(saved.attempts.length,1);assert.equal(saved.attempts[0].result,'passed');
});
test('learning progress is not reported durable until the transaction commits',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES[0];adapter.state.holdCommit=true;let resolved=false;
 const operation=db.mutateWorkspace(data=>learning.enroll(data,pid,c.id)).then(()=>{resolved=true;});
 for(let i=0;i<100&&!adapter.state.held.length;i++)await flush();
 assert.equal(resolved,false);assert.equal(adapter.state.tables.get('courseProgress').size,0);adapter.releaseCommits();await operation;assert.equal(resolved,true);assert.equal((await db.readData()).courseProgress.length,1);
});
test('failed lesson review commit rolls back without losing earlier notes or practice',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES[0],l=c.lessons[0];
 await db.mutateWorkspace(data=>learning.saveLessonNote(data,pid,c.id,l.id,'Keep this note'));
 const before=await db.readData();adapter.state.failCommit=new DOMException('Learning quota failure','QuotaExceededError');
 await assert.rejects(db.mutateWorkspace(data=>learning.reviewLesson(data,pid,c.id,l.id,courseReview('failed-commit'))),/Learning quota failure/);assert.deepEqual(await db.readData(),before);
});
test('generic session deletion cannot orphan current guided-learning evidence',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES.find(c=>c.id==='drums-foundation'),l=c.lessons[0],p=d.profiles.find(p=>p.id===pid);
 let s=createSession(learning.lessonBlocks(c,l,p,{minutes:5}),d);for(let i=0;i<l.tasks.length;i++){s.blocks[i].startedAt='2026-09-09T12:00:00.000Z';s.blocks[i].actualActiveSeconds=20;s=finishBlock(s,false,Date.parse('2026-09-09T12:01:00.000Z')+i*20000);}d.sessions=[s];
 learning.reviewLesson(d,pid,c.id,l.id,{id:'linked-session-review',checks:l.checks.map(()=>true),answers:l.questions.map(q=>q.answer),confidence:3,notes:'Keep this evidence',evidence:{kind:'session',sessionId:s.id}},'2026-09-09T12:05:00.000Z');await db.replaceData(d);
 await assert.rejects(db.remove('sessions',s.id),/supporting guided session/);assert.ok(await db.get('sessions',s.id));
});
test('backup round trip retains learning history and reset clears it only when requested',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES[0],l=c.lessons[0];
 await db.mutateWorkspace(data=>learning.reviewLesson(data,pid,c.id,l.id,courseReview('backup-review')));
 const before=await db.readData(),backup=createBackup(before);assert.equal(backup.version,4);
 await db.resetWorkspace();assert.equal((await db.readData()).courseProgress.length,0);
 await restoreBackup(backup);assert.deepEqual(await db.readData(),before);
});
