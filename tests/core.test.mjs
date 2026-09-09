import test from 'node:test';
import assert from 'node:assert/strict';
import * as analytics from '../dist/app/domain/analytics.js';
import * as v from '../dist/app/domain/validation.js';
import * as u from '../dist/app/domain/utils.js';
import * as logic from '../dist/app/practice/logic.js';
import { trainerBpm } from '../dist/app/domain/trainer.js';
import { ScheduleClock, tapTempo, defaultAccents } from '../dist/app/audio/scheduler.js';
import { DEFAULT_METRONOME, DEFAULT_SETTINGS } from '../dist/app/domain/models.js';
import { seedData } from '../dist/app/db/seed.js';
import { createBackup, parseBackup } from '../dist/app/db/backup.js';
import { migrateSettingsV1 } from '../dist/app/db/database.js';
process.env.TZ='Europe/Berlin';
const date='2026-09-08T10:00:00.000Z';
function attempt(bpm,rating='clean',timestamp=date){return{id:u.uuid(),bpm,rating,timestamp,note:''};}
function free(title='Free practice',seconds=600){return{id:u.uuid(),type:'free',title,targetSeconds:seconds,bpm:80,notes:'',order:0};}
function session(seconds,category='technique',attempts=[],started=date){
 const s=logic.createSession([free()],seedData());s.status='completed';s.startedAt=started;s.endedAt=started;s.runtime.phase='paused';s.blocks[0].actualActiveSeconds=seconds;s.blocks[0].categorySnapshot=category;s.blocks[0].sourceExerciseId='exercise-x';s.blocks[0].tempoAttempts=attempts;s.blocks[0].completed=true;return s;
}
const fixture=[session(1200,'technique',[attempt(100)]),session(1800,'song'),session(600,'technique',[attempt(105),attempt(110,'messy')])];
test('controlled A/B/C: exactly 60 active minutes',()=>assert.equal(analytics.calculateTotalPracticeTime(fixture),3600));
test('controlled A/B/C: technique/song each 30 min and 50%',()=>assert.deepEqual(analytics.calculatePracticeDistribution(fixture),[{category:'technique',seconds:1800,percent:50},{category:'song',seconds:1800,percent:50}]));
test('controlled A/B/C: best clean 105; attempted 110',()=>{const a=analytics.exerciseAttempts(fixture,'exercise-x');assert.equal(analytics.calculateBestCleanBpm(a),105);assert.equal(analytics.calculateHighestAttemptedBpm(a),110);});
test('failed and messy attempts never raise best clean',()=>assert.equal(analytics.calculateBestCleanBpm([attempt(120),attempt(290,'messy'),attempt(300,'failed'),attempt(125,'effortless')]),125));
test('empty attempts do not invent a zero BPM result',()=>{assert.equal(analytics.calculateBestCleanBpm([]),undefined);assert.equal(analytics.calculateHighestAttemptedBpm([]),undefined);});
test('latest successful is chronological, not highest BPM',()=>assert.equal(analytics.latestSuccessfulBpm([attempt(100,'acceptable','2026-09-09T12:00:00.000Z'),attempt(150,'clean'),attempt(180,'messy','2026-09-10T12:00:00.000Z')]),100));
test('average active duration is 20 min',()=>assert.equal(analytics.calculateAverageSessionLength(fixture),1200));
test('zero history has zero average and an empty distribution',()=>{assert.equal(analytics.calculateAverageSessionLength([]),0);assert.deepEqual(analytics.calculatePracticeDistribution([]),[]);});
test('active sessions excluded, abandoned time retained',()=>{const s=session(100);s.status='active';const a=session(60);a.status='abandoned';assert.equal(analytics.calculateTotalPracticeTime([s,a]),60);});
test('weekly count uses local ISO Monday, excluding abandoned and active',()=>{
 const a=session(10,'other',[],'2025-12-28T23:00:00.000Z');const b=session(10,'other',[],'2026-01-04T22:59:59.000Z');const outside=session(10,'other',[],'2026-01-04T23:00:00.000Z');const abandoned=session(1);abandoned.status='abandoned';assert.equal(analytics.calculateWeeklySessionCount([a,b,outside,abandoned],new Date('2026-01-01T12:00:00.000Z')),2);
});
test('local date retains Europe/Berlin midnight boundary',()=>assert.equal(u.localDate('2026-09-08T22:30:00.000Z'),'2026-09-09'));
test('tempo series is cumulative clean only and grouped locally',()=>{
 const points=analytics.buildTempoProgressionSeries([attempt(110,'messy','2026-09-10T10:00:00.000Z'),attempt(105,'clean','2026-09-09T10:00:00.000Z'),attempt(100),attempt(90,'effortless','2026-09-10T11:00:00.000Z')]);assert.deepEqual(points.map(p=>p.bpm),[100,105,105]);
});
test('date filter uses inclusive local days',()=>assert.equal(analytics.filterSessions([session(1,'other',[],'2026-09-08T22:15:00.000Z')],'2026-09-09','2026-09-09').length,1));
test('practice daily totals are computed from actual time',()=>assert.equal(analytics.practiceByDay(fixture)[0].seconds,3600));
test('large attempt history does not overflow argument stack',()=>assert.equal(analytics.calculateBestCleanBpm(Array.from({length:200000},()=>attempt(100))),100));
test('built-in library includes every required rudiment, no history',()=>{const d=seedData();assert.equal(d.exercises.filter(e=>e.category==='rudiment').length,21);assert.equal(d.exercises.length,30);assert.equal(d.sessions.length,0);assert.equal(d.songs.length,0);assert.equal(d.goals.length,0);});
test('starter routines have exact 20/30/45/60 minute duration',()=>assert.deepEqual(seedData().routines.map(r=>analytics.routineDuration(r.blocks)),[1200,1800,2700,3600]));
test('all starter content validates and round-trips as backup',()=>{const b=createBackup(seedData(),date);assert.deepEqual(parseBackup(JSON.stringify(b)),b);});
test('new daily-plan blocks have independent IDs',()=>{const blocks=[free(),free()];const copies=u.freshBlocks(blocks);assert.notEqual(copies[0].id,blocks[0].id);assert.equal(copies[1].order,1);});
test('reorder is immutable and rejects out-of-range moves safely',()=>{const a=['a','b','c'];assert.deepEqual(u.reorder(a,0,2),['b','c','a']);assert.deepEqual(a,['a','b','c']);assert.deepEqual(u.reorder(a,-1,2),a);});
test('exercise history keeps snapshots after edit/archive',()=>{const d=seedData(),e=d.exercises[1];const s=logic.createSession([{...free(),type:'exercise',exerciseId:e.id}],d);e.name='Renamed';e.archived=true;assert.equal(s.blocks[0].titleSnapshot,'Double Stroke Roll');assert.equal(s.blocks[0].stickingSnapshot.replaceAll(' ',''),'RRLLRRLL');});
test('missing exercise cannot start an untraceable session',()=>assert.throws(()=>logic.createSession([{...free(),type:'exercise',exerciseId:'missing'}],seedData()),/unavailable/));
test('empty plan cannot start a session',()=>assert.throws(()=>logic.createSession([],seedData()),/at least one/));
test('timer is derived from timestamps rather than tick count',()=>{const s=logic.createSession([free()],seedData());s.runtime.phase='running';s.runtime.runStartedAt=date;assert.equal(logic.blockElapsed(s,Date.parse(date)+12050),12.05);});
test('pause excludes all subsequent wall-clock time',()=>{let s=logic.createSession([free()],seedData());s.runtime.phase='running';s.runtime.runStartedAt=date;s=logic.pauseSession(s,Date.parse(date)+4500);assert.equal(logic.blockElapsed(s,Date.parse(date)+60000),4.5);});
test('checkpoint advances the base without double-counting',()=>{let s=logic.createSession([free()],seedData());s.runtime.phase='running';s.runtime.runStartedAt=date;s=logic.checkpointSession(s,Date.parse(date)+5000);assert.equal(logic.blockElapsed(s,Date.parse(date)+8000),8);});
test('count-in never advances active time',()=>{const s=logic.createSession([free()],seedData());s.runtime.phase='countin';s.runtime.runStartedAt=date;assert.equal(logic.blockElapsed(s,Date.parse(date)+30000),0);});
test('recovery pauses at persisted checkpoint, excludes unknown downtime',()=>{let s=logic.createSession([free()],seedData());s.runtime.phase='running';s.runtime.runStartedAt=date;s=logic.checkpointSession(s,Date.parse(date)+5000);const r=logic.recoverSession(s);assert.equal(r.runtime.phase,'paused');assert.equal(logic.blockElapsed(r,Date.parse(date)+600000),5);});
test('finish and skip preserve independent block state',()=>{let s=logic.createSession([free('one'),free('two'),free('three')],seedData());s=logic.finishBlock(s,false);assert.equal(s.activeBlockIndex,1);assert.equal(s.runtime.phase,'ready');s=logic.finishBlock(s,true);s=logic.finishBlock(s,false);assert.equal(s.status,'completed');assert.deepEqual(s.blocks.map(b=>[b.completed,b.skipped]),[[true,false],[false,true],[true,false]]);assert.doesNotThrow(()=>v.validateSession(s));});
test('restart retains prior time and attempts in a separate segment',()=>{const s=logic.createSession([free()],seedData());s.blocks[0].actualActiveSeconds=12;s.blocks[0].tempoAttempts=[attempt(105)];const r=logic.restartBlock(s);assert.equal(r.blocks.length,2);assert.equal(r.blocks[0].actualActiveSeconds,12);assert.equal(r.blocks[0].tempoAttempts.length,1);assert.equal(r.blocks[1].actualActiveSeconds,0);assert.equal(r.blocks[1].tempoAttempts.length,0);});
test('wall clock going backward cannot create negative active duration',()=>{const s=logic.createSession([free()],seedData());s.runtime.phase='running';s.runtime.runStartedAt=date;assert.equal(logic.blockElapsed(s,Date.parse(date)-1000),0);});
test('progressive trainer clamps at max without wrapping',()=>{const c={mode:'progressive',start:80,step:5,seconds:120,max:120};assert.deepEqual([0,119,120,960,3000].map(t=>trainerBpm(c,t,0)),[80,80,85,120,120]);});
test('repetition trainer advances only at complete clean-round thresholds',()=>{const c={mode:'repetition',start:80,step:5,rounds:3,max:90};assert.deepEqual([0,2,3,5,6,300].map(n=>trainerBpm(c,900,n)),[80,80,85,85,90,90]);});
test('ladder follows explicit stages and holds final BPM',()=>{const c={mode:'ladder',bpms:[80,90,100,90,80],seconds:60};assert.deepEqual([0,60,120,180,240,9999].map(t=>trainerBpm(c,t,0)),[80,90,100,90,80,80]);});
test('endurance trainer remains fixed regardless of elapsed time',()=>assert.equal(trainerBpm({mode:'endurance',bpm:110,seconds:600},5000,99),110));
test('trainer rejects negative stages and backward maximum',()=>{assert.throws(()=>v.validateTrainer({mode:'progressive',start:100,step:5,seconds:0,max:120}));assert.throws(()=>v.validateTrainer({mode:'progressive',start:100,step:5,seconds:60,max:80}));assert.throws(()=>v.validateTrainer({mode:'ladder',bpms:[80],seconds:10}));});
test('backup rejects unknown format or future version',()=>{const b=createBackup(seedData());assert.throws(()=>v.validateBackup({...b,format:'other'}),/not a Steadybar/);assert.throws(()=>v.validateBackup({...b,version:4}),/unsupported/);});
test('malformed JSON does not become an empty successful import',()=>assert.throws(()=>parseBackup('{oops'),/not valid JSON/));
test('backup deeply validates BPMs, time, type, and accent length',()=>{for(const alter of [d=>d.exercises[0].defaultBpm=301,d=>d.exercises[0].defaultBpm='80',d=>d.settings.metronome.accents=[],d=>d.exercises[0].createdAt='2026-02-31T12:00:00.000Z']){const b=createBackup(seedData());alter(b.data);assert.throws(()=>v.validateBackup(b));}});
test('backup rejects duplicate IDs and multiple active sessions',()=>{const b=createBackup(seedData());b.data.exercises.push({...b.data.exercises[0]});assert.throws(()=>v.validateBackup(b),/duplicate/);const b2=createBackup(seedData());b2.data.sessions=[logic.createSession([free()],b2.data),logic.createSession([free()],b2.data)];assert.throws(()=>v.validateBackup(b2),/one active/);});
test('date-only validator rejects normalized invalid dates',()=>{assert.throws(()=>v.dateOnly('2026-02-29'));assert.equal(v.dateOnly('2028-02-29'),'2028-02-29');});
test('validation copies data instead of mutating backup input',()=>{const b=createBackup(seedData());const validated=v.validateBackup(b);validated.data.exercises[0].name='changed';assert.notEqual(b.data.exercises[0].name,'changed');});
test('ISO offset timestamps normalize to UTC for deterministic ordering',()=>{const b=createBackup(seedData());b.exportedAt='2026-09-08T12:00:00+02:00';assert.equal(v.validateBackup(b).exportedAt,date);});
test('v1 to v2 migration preserves choices and introduces safe visibility policy',()=>{const old={...DEFAULT_SETTINGS,theme:'dark',onboardingDone:true};delete old.pauseWhenHidden;const next=migrateSettingsV1(old);assert.equal(next.pauseWhenHidden,true);assert.equal(next.theme,'dark');assert.equal(next.onboardingDone,true);assert.equal(migrateSettingsV1({...old,pauseWhenHidden:false}).pauseWhenHidden,false);});
test('BPM goal derives from clean attempts, not attempted tempo',()=>{const d=seedData();d.sessions=fixture;const g={type:'bpm',exerciseId:'exercise-x',targetValue:120};const p=analytics.goalProgress(g,d);assert.equal(p.value,105);assert.equal(p.fraction,105/120);assert.equal(p.done,false);});
test('song mastery reflects status, custom goal manual completion',()=>{const d=seedData();d.songs=[{id:'song',status:'performance-ready'}];assert.equal(analytics.goalProgress({type:'song-mastery',songId:'song',targetValue:1},d).done,true);assert.equal(analytics.goalProgress({type:'custom',completed:true,targetValue:999},d).done,true);});
const metro=(change={})=>({...structuredClone(DEFAULT_METRONOME),...change});
test('Web Audio schedule: 120 BPM has exact 0.5-second beat intervals',()=>{const c=new ScheduleClock(metro({bpm:120}),2);assert.deepEqual(Array.from({length:5},()=>c.next().time),[2,2.5,3,3.5,4]);});
test('subdivisions stay phase-aligned with beats and measures',()=>{const c=new ScheduleClock(metro({bpm:120,subdivision:4}));const events=Array.from({length:17},()=>c.next());assert.equal(events[4].beat,1);assert.equal(events[4].time,0.5);assert.equal(events[16].bar,1);assert.equal(events[16].time,2);});
test('long-run schedule does not use rendered-frame timing',()=>{const c=new ScheduleClock(metro({bpm:137,subdivision:4}));let e;for(let i=0;i<=100000;i++)e=c.next();assert.ok(Math.abs(e.time-100000*60/137/4)<0.00001);});
test('meter and subdivision changes apply at a bar boundary',()=>{const c=new ScheduleClock(metro({bpm:120}));c.next();c.update(metro({bpm:120,meter:{beats:3,beatUnit:4},accents:[2,1,1],subdivision:2}));const e=Array.from({length:5},()=>c.next());assert.deepEqual(e.map(x=>[x.beat,x.part]),[[1,0],[2,0],[3,0],[0,0],[0,1]]);});
test('reverting a pending structural change cancels it',()=>{const c=new ScheduleClock(metro());c.next();c.update(metro({subdivision:4}));c.update(metro());const events=Array.from({length:5},()=>c.next());assert.ok(events.every(e=>e.part===0));});
test('tempo changes preserve beat order and affect next interval',()=>{const c=new ScheduleClock(metro({bpm:120}));assert.equal(c.next().time,0);c.update(metro({bpm:60}));assert.equal(c.next().time,0.5);assert.equal(c.next().time,1.5);});
test('accent muting silences every subdivision in that beat',()=>{const c=new ScheduleClock(metro({subdivision:2,accents:[2,0,1,1]}));const e=Array.from({length:4},()=>c.next());assert.equal(e[0].accent,2);assert.equal(e[2].accent,0);assert.equal(e[3].accent,0);});
test('count-in marks exactly the first two bars',()=>{const c=new ScheduleClock(metro({countIn:2}));const e=Array.from({length:9},()=>c.next());assert.ok(e.slice(0,8).every(x=>x.countingIn));assert.equal(e[8].countingIn,false);assert.equal(e[8].firstPracticeBeat,true);});
test('late scheduler skips stale clicks rather than bursting them',()=>{const c=new ScheduleClock(metro({bpm:120}));const e=c.scheduleThrough(10.1,10);assert.deepEqual(e.map(x=>x.time),[10]);});
test('compound meter defaults group accents in threes',()=>assert.deepEqual(defaultAccents(6,8),[2,1,1,2,1,1]));
test('tap tempo uses robust median of recent intervals',()=>{let taps=[];let bpm;for(const t of [0,500,1000,1510,2500,3000,3500])({taps,bpm}=tapTempo(taps,t));assert.equal(bpm,120);});
test('tap tempo resets after inactivity and ignores double taps',()=>{assert.deepEqual(tapTempo([0,500],600),{taps:[0,500]});assert.deepEqual(tapTempo([0,500],5000),{taps:[5000]});});
test('tap tempo covers the slow 20 BPM lower limit',()=>assert.equal(tapTempo([0],3000).bpm,20));

test('endurance snapshot uses the trainer target duration and BPM',()=>{
 const s=logic.createSession([{...free('Endurance',600),tempoTrainer:{mode:'endurance',bpm:110,seconds:45}}],seedData());
 assert.equal(s.blocks[0].targetSeconds,45);assert.equal(s.blocks[0].initialBpm,110);
});
test('restarting a tempo trainer resets its BPM and keeps old attempts',()=>{
 const s=logic.createSession([{...free(),tempoTrainer:{mode:'progressive',start:80,step:5,seconds:10,max:120}}],seedData());
 s.runtime.bpm=105;s.blocks[0].actualActiveSeconds=50;s.blocks[0].tempoAttempts=[attempt(105)];
 const r=logic.restartBlock(s);assert.equal(r.runtime.bpm,80);assert.equal(r.blocks[1].initialBpm,80);assert.equal(r.blocks[0].tempoAttempts.length,1);assert.equal(r.blocks[1].tempoAttempts.length,0);assert.equal(r.blocks[0].actualActiveSeconds,50);
});
test('validation rejects duplicate attempt IDs within a block',()=>{
 const s=session(60,'technique',[attempt(100)]);s.blocks[0].tempoAttempts.push({...s.blocks[0].tempoAttempts[0]});assert.throws(()=>v.validateSession(s),/unique/i);
});
test('validation rejects a running timer without an ISO start timestamp',()=>{
 const s=logic.createSession([free()],seedData());s.runtime.phase='running';delete s.runtime.runStartedAt;assert.throws(()=>v.validateSession(s),/timestamp|start/i);
});
test('UUIDs use secure v4 format and are unique across generated records',()=>{
 const ids=Array.from({length:1000},()=>u.uuid());assert.equal(new Set(ids).size,1000);assert.ok(ids.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
});
