import {validateData,validateSession} from '../dist/app/domain/validation.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
/** Real database repository functions against a controlled transaction adapter.
 * Native IndexedDB/reload tests remain in e2e.py and require a real browser origin. */
import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {transactionAdapter} from './helpers/transaction-adapter.mjs';
import * as db from '../dist/app/db/database.js';
import {seedData} from '../dist/app/db/seed.js';
import {createBackup,restoreBackup} from '../dist/app/db/backup.js';
import {createSession,pauseSession,finishBlock} from '../dist/app/practice/logic.js';
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
  assert.equal(data.exercises.length,30);assert.equal(data.routines.length,8);assert.equal(data.sessions.length,0);
  assert.equal(adapter.state.aborted,0);
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
test('stale commands after completion abort without rewriting saved history',async()=>{
  await db.initializeDatabase();const s=active();await db.insertActiveSession(s);await db.updateSession(s.id,row=>finishBlock(row));
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
  assert.deepEqual(await db.readData(),validateData({...migratePracticeData(exported.data),courseProgress:exported.data.courseProgress??[]}));
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
 const before=await db.readData(),backup=createBackup(before);assert.equal(backup.version,3);
 await db.resetWorkspace();assert.equal((await db.readData()).courseProgress.length,0);
 await restoreBackup(backup);assert.deepEqual(await db.readData(),before);
});
