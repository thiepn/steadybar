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
  assert.deepEqual(await db.readData(),validateData(migratePracticeData(exported.data)));
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
