/** Pure/unit regressions. Database transaction stubs do NOT simulate native IndexedDB. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ExclusiveLease } from '../dist/app/platform/locks.js';
import { requireActive } from '../dist/app/practice/guards.js';
import { createSession, finishBlock } from '../dist/app/practice/logic.js';
import { ScheduleClock } from '../dist/app/audio/scheduler.js';
import { DEFAULT_METRONOME } from '../dist/app/domain/models.js';
import { writeTransaction, replaceData, insertActiveSession, put } from '../dist/app/db/database.js';
import { seedData } from '../dist/app/db/seed.js';
import * as v from '../dist/app/domain/validation.js';
const free=()=>({id:crypto.randomUUID(),type:'free',title:'Practice',targetSeconds:600,bpm:80,notes:'',order:0});
const metro=patch=>({...structuredClone(DEFAULT_METRONOME),...patch});
const session=()=>createSession([free(),free()],seedData());
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function lockManager(){
  const callbacks=[],owned=new Set();let requests=0;
  return {
    manager:{request(name,_options,callback){requests++;return new Promise((resolve,reject)=>{
      callbacks.push(async()=>{
        if(owned.has(name)){try{await callback(null);resolve();}catch(error){reject(error);}return;}
        owned.add(name);
        try{await callback({name});resolve();}catch(error){reject(error);}finally{owned.delete(name);}
      });
    });}},
    dispatch(){const run=callbacks.shift();assert.ok(run,'a lock request should be pending');void run();},
    get requests(){return requests;},owned,
  };
}

test('ownership coalesces simultaneous acquire requests without duplicate locks',async()=>{
  const mock=lockManager(),lease=new ExclusiveLease('session','busy',mock.manager);
  const first=lease.acquire(),second=lease.acquire();assert.equal(first,second);assert.equal(mock.requests,1);
  mock.dispatch();await first;assert.equal(lease.held,true);lease.release();await flush();assert.equal(mock.owned.size,0);
});
test('ownership cancellation prevents a late lock grant from starting work',async()=>{
  const mock=lockManager(),lease=new ExclusiveLease('session','busy',mock.manager);
  const pending=lease.acquire(),rejected=assert.rejects(pending,{name:'AbortError'});
  lease.release();mock.dispatch();await rejected;await flush();assert.equal(lease.held,false);assert.equal(mock.owned.size,0);
});
test('a cancelled old request cannot release a newer lease',async()=>{
  const mock=lockManager(),lease=new ExclusiveLease('session','busy',mock.manager);
  const first=lease.acquire(),rejected=assert.rejects(first,{name:'AbortError'});lease.release();const second=lease.acquire();
  mock.dispatch();await rejected;mock.dispatch();await second;assert.equal(lease.held,true);lease.release();await flush();
});
test('competing tab gets a useful error rather than a delayed automatic start',async()=>{
  const mock=lockManager(),one=new ExclusiveLease('audio','Audio is in use',mock.manager),two=new ExclusiveLease('audio','Audio is in use',mock.manager);
  const acquired=one.acquire();mock.dispatch();await acquired;
  const competing=two.acquire(),rejected=assert.rejects(competing,/Audio is in use/);mock.dispatch();await rejected;
  assert.equal(two.held,false);one.release();await flush();
});
test('unsupported Web Locks has a nonthrowing per-tab fallback',async()=>{
  const lease=new ExclusiveLease('optional','busy',undefined);await lease.acquire();assert.equal(lease.held,true);lease.release();assert.equal(lease.held,false);
});

test('completed sessions reject stale commands before any mutation',()=>{
  const s=session();s.status='completed';const before=structuredClone(s);
  assert.throws(()=>requireActive(s,s.blocks[0].id),/already ended/);assert.deepEqual(s,before);
});
test('abandoned sessions cannot be revived by a stale timer command',()=>{
  const s=session();s.status='abandoned';assert.throws(()=>requireActive(s),/already ended/);
});
test('queued commands for the previous block are not applied to the next block',()=>{
  const original=session(),next=finishBlock(original);assert.throws(()=>requireActive(next,original.blocks[0].id),/active block changed/);
  assert.doesNotThrow(()=>requireActive(next,next.blocks[1].id));
});

test('scheduler retains count-in onset when throttling skips its first practice click',()=>{
  const c=new ScheduleClock(metro({bpm:120,countIn:2}),5);c.scheduleThrough(5.12,5);
  const events=c.scheduleThrough(12.12,12);assert.equal(c.practiceStartTime,9);assert.ok(events.every(e=>e.time>=11.975));
});
test('very long scheduler suspension catches up arithmetically without stale bursts',()=>{
  const c=new ScheduleClock(metro({bpm:300,subdivision:4,countIn:4}));
  const events=c.scheduleThrough(31536000.12,31536000);
  assert.equal(c.practiceStartTime,3.2);assert.ok(events.length<=4);assert.ok(events.every(e=>e.time>=31535999.975));
});
test('pending meter change and skipped count-in retain the correct onset',()=>{
  const c=new ScheduleClock(metro({bpm:120,countIn:2}));c.next();
  c.update(metro({bpm:120,countIn:2,meter:{beats:3,beatUnit:4},accents:[2,1,1]}));
  c.scheduleThrough(10.2,10);assert.equal(c.practiceStartTime,3.5);
});
test('changing count-in while playing applies only to the next start',()=>{
  const c=new ScheduleClock(metro({bpm:120,countIn:1}));c.next();
  c.update(metro({bpm:120,countIn:4}));for(let i=0;i<5;i++)c.next();assert.equal(c.practiceStartTime,2);
});
test('arithmetic catch-up matches a reference event-by-event clock across configurations',()=>{
  for(const bpm of [20,77,137,300])for(const subdivision of [1,2,3,4])for(const beats of [3,4,7]){
    const config=metro({bpm,subdivision,meter:{beats,beatUnit:4},accents:Array(beats).fill(1),countIn:2});
    const fast=new ScheduleClock(config,.06),reference=new ScheduleClock(config,.06),now=43.137;
    while(reference.nextTime<now-.025)reference.next();
    const expected=[];while(reference.nextTime<now+.12)expected.push(reference.next());
    const actual=fast.scheduleThrough(now+.12,now);
    assert.equal(actual.length,expected.length);
    actual.forEach((e,i)=>{assert.ok(Math.abs(e.time-expected[i].time)<1e-8);assert.equal(e.beat,expected[i].beat);assert.equal(e.part,expected[i].part);assert.equal(e.bar,expected[i].bar);});
    if(reference.practiceStartTime!==undefined)assert.ok(Math.abs(fast.practiceStartTime-reference.practiceStartTime)<1e-8);
  }
});

test('complete data replacement rejects nested duplicate IDs before opening storage',async()=>{
  const d=seedData();d.routines[0].blocks.push({...d.routines[0].blocks[0]});
  await assert.rejects(replaceData(d),/duplicate IDs/);
});
test('replacement validation rejects malformed tables even without a backup wrapper',async()=>{
  const d=seedData();d.settings.metronome.accents=[];await assert.rejects(replaceData(d),/accent count/);
});
test('replacement validation rejects duplicate dates before touching the database',()=>{
  const d=seedData(),base={id:'one',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),date:'2026-09-08',blocks:[]};
  d.dailyPlans=[base,{...base,id:'two'}];assert.throws(()=>v.validateData(d),/duplicate dates/);
});
test('exercise bounds, route-safe IDs and blank names are validated',()=>{
  const e=seedData().exercises[0];
  assert.throws(()=>v.validateExercise({...e,minBpm:200,maxBpm:80}),/minimum BPM/);
  for(const id of ['id/with/slashes','x#fragment','x?query','  '])assert.throws(()=>v.validateExercise({...e,id}),/identifier/);
  assert.throws(()=>v.validateExercise({...e,name:'   '}),/blank/);
});
test('a routine cannot claim to practice an exercise without a source identifier',()=>{
  assert.throws(()=>v.validateRoutineBlock({...free(),type:'exercise'}),/exercise ID/);
  assert.throws(()=>v.validateRoutineBlock({...free(),type:'song-section',songId:'song'}),/section ID/);
});
test('song-section IDs must be unique inside each song',()=>{
  const time=new Date().toISOString(),section={id:'intro',name:'Intro',notes:'',order:0};
  const song={id:'song',createdAt:time,updatedAt:time,title:'Original song',artist:'',bpm:80,meter:{beats:4,beatUnit:4},key:'',difficulty:1,status:'learning',notes:'',sections:[section,{...section}]};
  assert.throws(()=>v.validateSong(song),/duplicate IDs/);
});
test('goal validators require meaningful source records and possible BPMs',()=>{
  const time=new Date().toISOString(),g={id:'goal',createdAt:time,updatedAt:time,type:'bpm',title:'Clean tempo',description:'',targetValue:120,unit:'BPM',completed:false};
  assert.throws(()=>v.validateGoal(g),/exercise ID/);
  assert.throws(()=>v.validateGoal({...g,exerciseId:'x',targetValue:500}),/300/);
  assert.doesNotThrow(()=>v.validateGoal({...g,exerciseId:'x'}));
});
test('all seeded nested records still validate after hardening',()=>assert.deepEqual(v.validateData(seedData()).routines.map(r=>r.blocks.length),[4,4,5,5]));
test('put rejects invalid payloads before attempting a native transaction',async()=>{
  await assert.rejects(put('exercises',{...seedData().exercises[0],defaultBpm:900}),/300/);
});
test('insertActiveSession rejects completed records before storage access',async()=>{
  const s=session();s.status='completed';s.endedAt=s.startedAt;await assert.rejects(insertActiveSession(s),/must be active/);
});

test('critical transactions request strict durability',()=>{
  const calls=[],tx={};const db={transaction(...args){calls.push(args);return tx;}};
  assert.equal(writeTransaction(db,['sessions']),tx);assert.deepEqual(calls,[[['sessions'],'readwrite',{durability:'strict'}]]);
});
test('durability compatibility fallback handles only unsupported options',()=>{
  const calls=[],tx={};const db={transaction(...args){calls.push(args);if(args.length===3)throw new TypeError('Options not supported');return tx;}};
  assert.equal(writeTransaction(db,'sessions'),tx);assert.equal(calls.length,2);assert.deepEqual(calls[1],['sessions','readwrite']);
});
test('storage permission errors are not retried as weaker transactions',()=>{
  let calls=0;const denied=new DOMException('Storage denied','SecurityError');
  assert.throws(()=>writeTransaction({transaction(){calls++;throw denied;}},'sessions'),e=>e===denied);assert.equal(calls,1);
});

const {calendarScale,practiceTimeScale}=await import('../dist/app/domain/chart-data.js');
const {duration}=await import('../dist/app/domain/utils.js');
test('chart coordinates preserve unequal gaps between practice dates',()=>{
  const scale=calendarScale(['2026-09-01','2026-09-02','2026-09-10']);
  assert.deepEqual(scale.fractions,[0,1/9,1]);assert.equal(scale.days,10);
});
test('chart calendar spacing is unaffected by local daylight-saving transitions',()=>{
  assert.deepEqual(calendarScale(['2026-03-28','2026-03-29','2026-03-30']).fractions,[0,.5,1]);
});
test('a single chart point is centered and empty data stays empty',()=>{
  assert.deepEqual(calendarScale(['2026-09-08']),{fractions:[.5],days:1});assert.deepEqual(calendarScale([]),{fractions:[],days:0});
});
test('daily peak is actual data, independent of the chart axis minimum',()=>{
  assert.deepEqual(practiceTimeScale([{seconds:12}]),{peak:12,ceiling:60});
  assert.deepEqual(practiceTimeScale([{seconds:120},{seconds:600}]),{peak:600,ceiling:600});
});
test('positive subsecond practice is not labeled as zero time',()=>{
  assert.equal(duration(.3),'<1 sec');assert.equal(duration(.3,true),'<1s');assert.equal(duration(0),'0 sec');
});
