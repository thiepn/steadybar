/** Original curriculum contracts and learning state. Browser/native gates are separate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../dist/app/learning/catalog.js';
import { LEARNING_SOURCES } from '../dist/app/learning/sources.js';
import * as learn from '../dist/app/learning/engine.js';
import { validateCourseProgress, validateLessonSource } from '../dist/app/learning/validation.js';
import { definition, profileView } from '../dist/app/domain/profiles.js';
import { validateData, validateBackup, validateRoutineBlock, validateSession } from '../dist/app/domain/validation.js';
import { validateProtocol, assertProtocolCompatible } from '../dist/app/domain/practice-validation.js';
import { protocolPulse } from '../dist/app/domain/protocols.js';
import { seedData } from '../dist/app/db/seed.js';
import { migratePracticeData } from '../dist/app/db/profile-migration.js';
import { createBackup, parseBackup } from '../dist/app/db/backup.js';
import { createSession, finishBlock, restartBlock } from '../dist/app/practice/logic.js';
const at='2026-09-09T12:00:00.000Z';
const profile=(type,id='p-'+type)=>({id,name:type,instrumentType:type,family:definition(type).family,level:'beginner',focusAreas:[],defaultSessionMinutes:15,archived:false,attribution:'selected',createdAt:at,updatedAt:at});
const dataset=(type='drums')=>{const d=migratePracticeData(seedData(at)),p=profile(type);return validateData({...d,profiles:[p],courseProgress:[],exercises:[],routines:[],dailyPlans:[],sessions:[],goals:[],settings:{...d.settings,activeProfileId:p.id,primaryProfileId:p.id,instrument:type}});};
const setup=type=>{const data=dataset(type),p=data.profiles[0],course=learn.coursesFor(p)[0],lesson=course.lessons[0];return {data,p,course,lesson};};
const options={minutes:5,voice:{startMidi:60,lowMidi:48,highMidi:84}};
const review=(lesson,extra={})=>({id:'review1',checks:lesson.checks.map(()=>true),answers:lesson.questions.map(q=>q.answer),confidence:4,notes:'Observed an actual complete take.',evidence:{kind:'off-app',minutes:5,confirmed:true},...extra});
function completed(data,p,course,lesson){let s=createSession(learn.lessonBlocks(course,lesson,p,options),data);for(let i=0;i<lesson.tasks.length;i++){s.blocks[i].startedAt=at;s.blocks[i].actualActiveSeconds=20;s=finishBlock(s,false,Date.parse(at)+60000+i*20000);}return validateSession(s);}

test('catalog has three genuinely separate courses per principal instrument and one honest custom method course',()=>{
 assert.equal(COURSES.length,16);assert.equal(COURSES.reduce((n,c)=>n+c.lessons.length,0),94);
 assert.equal(new Set(COURSES.map(c=>c.id)).size,COURSES.length);
 for(const type of ['drums','guitar','bass','piano','voice']){const courses=learn.coursesFor(profile(type));assert.deepEqual(courses.map(c=>c.stage),['foundation','development','ensemble']);assert.equal(courses.reduce((n,c)=>n+c.lessons.length,0),18);}
 assert.equal(learn.coursesFor(profile('custom')).length,1);assert.match(learn.coursesFor(profile('custom'))[0].summary,/not fabricated/);
 assert.equal(learn.coursesFor({...profile('custom'),attribution:'unresolved-history'}).length,0);
 assert.ok(new Set(COURSES.flatMap(c=>c.lessons.map(l=>l.objective))).size>90);
});
for(const c of COURSES)for(const l of c.lessons)test(`${c.id}/${l.id}: complete teaching, original example, executable tasks and criterion-specific check`,()=>{
 const p=profile(c.instrument);assert.ok(l.teaching.length>=2);assert.ok(l.teaching.join(' ').length>=250);
 for(const key of ['objective','easier','harder','mistake','transfer'])assert.ok(l[key].length>=25,key);
 assert.ok(l.example.text.length>45);assert.ok(l.tasks.length>=2);assert.equal(new Set(l.tasks.map(t=>t.id)).size,l.tasks.length);
 assert.ok(l.checks.length>=3);assert.ok(l.questions.length>=1);
 for(const q of l.questions){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length);assert.ok(q.explanation.length>35);}
 for(const id of c.sourceIds)assert.ok(LEARNING_SOURCES.some(s=>s.id===id));
 const before=JSON.stringify(l),blocks=learn.lessonBlocks(c,l,p,options);
 assert.equal(JSON.stringify(l),before);assert.equal(blocks.reduce((n,b)=>n+b.targetSeconds,0),300);
 for(const b of blocks){validateRoutineBlock(b);validateProtocol(b.protocol);assertProtocolCompatible(b.protocol,p);validateLessonSource(b.lessonSource);assert.equal(b.profileId,p.id);assert.equal(b.lessonSource.lessonId,l.id);assert.ok(b.notes.includes(l.example.text));}
 const a=protocolPulse(l.tasks[0].protocol),b=protocolPulse(l.tasks[1].protocol);if(a&&b)assert.equal(a.beatUnit,b.beatUnit);
 if(l.example.notes)for(const n of l.example.notes)assert.ok(Number.isInteger(n)&&n>=21&&n<=108);
 if(l.example.rhythm)for(const row of l.example.rhythm.rows)assert.equal(row.hits.length,l.example.rhythm.counts.length);
 if(l.example.chords)for(const chord of l.example.chords){assert.equal(chord.frets.length,6);assert.ok(chord.frets.every(n=>n===null||Number.isInteger(n)&&n>=0&&n<=24));}
 if(c.instrument==='voice')assert.ok(l.checks.some(t=>/pain, hoarseness/.test(t)));
 const d=dataset(c.instrument);d.profiles=[p];const s=completed(d,p,c,l);assert.equal(learn.evidenceSeconds(s,p.id,c,l),40);
});

test('course selection is per stable profile and never relabels sessions or other profiles',()=>{
 const {data,p,course,lesson}=setup('drums'),other=profile('guitar');data.profiles.push(other);data.sessions=[completed(data,p,course,lesson)];const history=structuredClone(data.sessions);
 learn.enroll(data,p.id,course.id,at);learn.enroll(data,other.id,'guitar-development',at);
 assert.equal(data.courseProgress.length,2);assert.ok(data.courseProgress.every(p=>p.active));assert.deepEqual(data.sessions,history);assert.equal(data.settings.activeProfileId,p.id);
 learn.enroll(data,p.id,'drums-development',at);assert.equal(data.courseProgress.filter(row=>row.profileId===p.id&&row.active).length,1);validateData(data);
 assert.equal(profileView(data,p.id).courseProgress.length,2);assert.equal(profileView(data,other.id).courseProgress.length,1);
});
test('invalid, archived, historical and foreign course mutations fail',()=>{
 const {data,p,course,lesson}=setup('bass');assert.throws(()=>learn.enroll(data,p.id,'guitar-foundation'),/instrument/);assert.throws(()=>learn.enroll(data,'missing',course.id));
 data.profiles[0].archived=true;assert.throws(()=>learn.enroll(data,p.id,course.id),/available/);
 assert.throws(()=>learn.lessonBlocks(course,lesson,{...p,attribution:'unresolved-history'},options));
});
test('placement suggestions never award a lesson or modify performance history',()=>{
 const {data,p,course}=setup('piano');learn.savePlacement(data,p.id,course.id,course.placement.map(()=>true),at);
 const progress=learn.progressFor(data,p.id,course.id);assert.equal(learn.checkedCount(course,progress),0);assert.deepEqual(data.sessions,[]);assert.equal(learn.nextLesson(course,progress).id,course.lessons[0].id);
});
test('timer completion without started tasks is not evidence',()=>{
 const {data,p,course,lesson}=setup('drums');let s=createSession(learn.lessonBlocks(course,lesson,p,options),data);s=finishBlock(finishBlock(s));data.sessions.push(s);
 assert.equal(learn.eligibleSessions(data,p.id,course,lesson).length,0);
 assert.throws(()=>learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{evidence:{kind:'session',sessionId:s.id}}),at),/Finish both/);
});
test('evidence excludes active, skipped, too brief, partial, other-profile and other-revision sessions',()=>{
 const {data,p,course,lesson}=setup('drums'),s=completed(data,p,course,lesson);assert.ok(learn.evidenceSeconds(s,p.id,course,lesson));
 for(const alter of [x=>x.status='active',x=>x.profileId='another',x=>x.blocks[1].skipped=true,x=>x.blocks[0].completed=false,x=>x.blocks.forEach(b=>b.actualActiveSeconds=6),x=>delete x.blocks[1].lessonSource,x=>x.blocks[1].lessonSource.revision=99,x=>delete x.blocks[1].startedAt]){const copy=structuredClone(s);alter(copy);assert.equal(learn.evidenceSeconds(copy,p.id,course,lesson),0);}
});
test('a passing self-check needs correct knowledge, all performance checks and actual evidence',()=>{
 const {data,p,course,lesson}=setup('drums');
 for(const extra of [{evidence:{kind:'reflection'}},{checks:lesson.checks.map(()=>false)},{answers:lesson.questions.map(q=>(q.answer+1)%q.options.length)}]){
  const d=structuredClone(data);learn.reviewLesson(d,p.id,course.id,lesson.id,review(lesson,extra),at);assert.equal(learn.checkedCount(course,d.courseProgress[0]),0);assert.equal(d.courseProgress[0].lessons[0].attempts[0].result,'needs-work');
 }
 learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);assert.equal(learn.checkedCount(course,data.courseProgress[0]),1);assert.deepEqual(data.sessions,[]);
});
test('actual session evidence is derived from committed blocks, not caller minutes',()=>{
 const {data,p,course,lesson}=setup('guitar'),s=completed(data,p,course,lesson);data.sessions.push(s);
 learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{evidence:{kind:'session',sessionId:s.id,minutes:900}}),at);
 assert.deepEqual(data.courseProgress[0].lessons[0].attempts[0].evidence,{kind:'session',seconds:40,sessionId:s.id});
});
test('old passing session evidence cannot create a new retention claim; repeated submits are idempotent',()=>{
 const {data,p,course,lesson}=setup('drums'),s=completed(data,p,course,lesson);data.sessions.push(s);const value=review(lesson,{evidence:{kind:'session',sessionId:s.id}});
 learn.reviewLesson(data,p.id,course.id,lesson.id,value,at);learn.reviewLesson(data,p.id,course.id,lesson.id,value,at);assert.equal(data.courseProgress[0].lessons[0].attempts.length,1);
 assert.throws(()=>learn.reviewLesson(data,p.id,course.id,lesson.id,{...value,id:'later'},'2026-09-12T12:00:00Z'),/already supports/);
});
test('off-app evidence requires explicit confirmation and finite reasonable duration',()=>{
 const {data,p,course,lesson}=setup('drums');
 for(const evidence of [{kind:'off-app',minutes:5},{kind:'off-app',minutes:NaN,confirmed:true},{kind:'off-app',minutes:0,confirmed:true},{kind:'off-app',minutes:121,confirmed:true}])assert.throws(()=>learn.reviewLesson(structuredClone(data),p.id,course.id,lesson.id,review(lesson,{evidence}),at),/off-app/);
});
test('notes merge with the current lesson record without erasing reviews',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);const before=structuredClone(data.courseProgress[0].lessons[0].attempts);
 learn.saveLessonNote(data,p.id,course.id,lesson.id,'Teacher feedback',at);assert.deepEqual(data.courseProgress[0].lessons[0].attempts,before);assert.equal(data.courseProgress[0].lessons[0].notes,'Teacher feedback');
});
test('review schedule uses separate local days; same-day clicks do not establish retention',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);let r=data.courseProgress[0].lessons[0];
 assert.equal(learn.lessonStatus(course,r,new Date(at)),'Self-checked');assert.equal(learn.dueAt(course,r).getDate(),new Date(at).getDate()+1);
 learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{id:'again'}),at);assert.equal(learn.lessonStatus(course,r,new Date(at)),'Self-checked');
 const later='2026-09-11T12:00:00.000Z';learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{id:'later'}),later);assert.equal(learn.lessonStatus(course,r,new Date(later)),'Checked on separate days');
 assert.equal(learn.dueAt(course,r).getDate(),14);assert.equal(learn.lessonStatus(course,r,new Date('2026-09-15T12:00:00Z')),'Review suggested');
});
test('a weak later review suggests repair without deleting earlier self-checks',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{id:'weak',checks:lesson.checks.map(()=>false)}),'2026-09-10T12:00:00Z');
 assert.equal(learn.lessonStatus(course,data.courseProgress[0].lessons[0]),'Practice again');assert.equal(learn.checkedCount(course,data.courseProgress[0]),1);assert.equal(learn.nextLesson(course,data.courseProgress[0],new Date('2026-09-11')).id,lesson.id);
});
test('planning appends both tasks, preserves existing blocks and rejects duplicates',()=>{
 const {data,p,course,lesson}=setup('drums');data.dailyPlans=[{id:'plan',profileId:p.id,date:'2026-09-09',createdAt:at,updatedAt:at,blocks:[{id:'existing',profileId:p.id,type:'free',title:'Personal warmup',targetSeconds:60,notes:'Keep this',order:0,protocol:{kind:'free',focus:'My warmup'}}]}];const before=structuredClone(data.dailyPlans[0].blocks[0]);
 learn.addLessonToToday(data,p.id,course.id,lesson.id,options,'2026-09-09');assert.equal(data.dailyPlans[0].blocks.length,3);assert.deepEqual(data.dailyPlans[0].blocks[0],before);assert.deepEqual(data.dailyPlans[0].blocks.map(b=>b.order),[0,1,2]);
 assert.throws(()=>learn.addLessonToToday(data,p.id,course.id,lesson.id,options,'2026-09-09'),/already/);validateData(data);
});
test('snapshots keep immutable source identity and task instructions through restart and backup',()=>{
 const {data,p,course,lesson}=setup('guitar'),blocks=learn.lessonBlocks(course,lesson,p,options);let s=createSession(blocks,data);const source=structuredClone(s.blocks[0].lessonSource);blocks[0].lessonSource.lessonId='changed';assert.deepEqual(s.blocks[0].lessonSource,source);
 s.blocks[0].actualActiveSeconds=15;s=restartBlock(s);assert.deepEqual(s.blocks[0].lessonSource,source);assert.deepEqual(s.blocks[1].lessonSource,source);data.sessions.push(s);
 const restored=parseBackup(JSON.stringify(createBackup(data))).data;assert.deepEqual(restored.sessions[0].blocks,validateSession(s).blocks);
});
test('lesson budgets and meter overrides are exact without auto-raising tempo',()=>{
 const p=profile('drums'),course=learn.courseById('drums-development'),lesson=course.lessons.find(l=>l.id==='compound');assert.ok(lesson);
 for(const minutes of [5,10,15,20,30]){const blocks=learn.lessonBlocks(course,lesson,p,{minutes,tempo:72});assert.equal(blocks.reduce((n,b)=>n+b.targetSeconds,0),minutes*60);for(const b of blocks){assert.equal(b.protocol.pulse.beatUnit,8);assert.equal(b.protocol.pulse.beats,6);assert.equal(b.protocol.pulse.bpm,72);}}
 for(const minutes of [0,4,31,NaN,5.5])assert.throws(()=>learn.lessonBlocks(course,lesson,p,{minutes}));
});
test('vocal practice cannot silently accept a missing or unsuitable personally chosen range',()=>{
 const {p,course}=setup('voice'),lesson=course.lessons.find(l=>l.id==='hum');
 for(const options of [{minutes:5},{minutes:15,voice:{startMidi:60,lowMidi:55,highMidi:67}},{minutes:5,voice:{startMidi:65,lowMidi:60,highMidi:67}},{minutes:5,voice:{startMidi:NaN,lowMidi:55,highMidi:67}}])assert.throws(()=>learn.lessonBlocks(course,lesson,p,options));
 const blocks=learn.lessonBlocks(course,lesson,p,{minutes:5,voice:{startMidi:55,lowMidi:53,highMidi:60}});assert.equal(blocks[0].protocol.startMidi,55);assert.equal(blocks[0].protocol.highMidi,60);assert.equal(blocks[0].bpm,undefined);
});
test('backup v3 round trip retains learning and rejects tampered known-revision passes',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);learn.saveLessonNote(data,p.id,course.id,lesson.id,'Material and feedback',at);
 const b=createBackup(data);assert.equal(b.version,3);assert.deepEqual(parseBackup(JSON.stringify(b)).data,data);
 const corrupt=structuredClone(b);corrupt.data.courseProgress[0].lessons[0].attempts[0].answers[0]=(lesson.questions[0].answer+1)%3;assert.throws(()=>validateBackup(corrupt),/passing check/);
 delete corrupt.data.courseProgress;assert.throws(()=>validateBackup(corrupt),/course progress/);
});
test('v1 and v2 backups remain accepted; future formats stay rejected',()=>{
 const old=createBackup(seedData(at));assert.equal(old.version,1);validateBackup(old);
 const d=dataset();delete d.courseProgress;const v2={format:'music-practice-os',version:2,exportedAt:at,data:d};assert.equal(validateBackup(v2).version,2);
 assert.throws(()=>validateBackup({...v2,version:4}),/unsupported/);
});
test('unknown course revisions are retained but cannot count as current learning',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);const progress=data.courseProgress[0];progress.lessons[0].attempts[0].revision=999;
 validateData(data);assert.equal(learn.checkedCount(course,progress),0);assert.equal(learn.dueAt(course,progress.lessons[0]),undefined);
 const unknown=structuredClone(progress);unknown.id='unknown';unknown.courseId='retired-custom-course';unknown.active=false;data.courseProgress.push(unknown);assert.equal(parseBackup(JSON.stringify(createBackup(data))).data.courseProgress.length,2);
});
test('duplicate course records, multiple active courses and profile-incompatible progress are rejected',()=>{
 const {data,p,course}=setup('drums');learn.enroll(data,p.id,course.id,at);
 for(const change of [d=>d.courseProgress.push({...d.courseProgress[0],id:'duplicate'}),d=>d.courseProgress.push({...d.courseProgress[0],id:'second',courseId:'drums-development'}),d=>d.courseProgress[0].courseId='voice-foundation',d=>d.courseProgress[0].profileId='missing']){const copy=structuredClone(data);change(copy);assert.throws(()=>validateData(copy));}
});

test('current-revision session evidence must match the actual supporting session',()=>{
 const {data,p,course,lesson}=setup('guitar'),s=completed(data,p,course,lesson);data.sessions.push(s);
 learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson,{evidence:{kind:'session',sessionId:s.id}}),at);assert.doesNotThrow(()=>validateData(data));
 const orphan=structuredClone(data);orphan.sessions=[];assert.throws(()=>validateData(orphan),/supporting guided session/);
 const changed=structuredClone(data);changed.courseProgress[0].lessons[0].attempts[0].evidence.seconds+=1;assert.throws(()=>validateData(changed),/supporting guided session/);
 const historical=structuredClone(data);historical.courseProgress[0].lessons[0].attempts[0].revision=999;historical.sessions=[];assert.doesNotThrow(()=>validateData(historical));
});
test('imported off-app evidence obeys the same 0.5–120 minute bounds as live reviews',()=>{
 const {data,p,course,lesson}=setup('drums');learn.reviewLesson(data,p.id,course.id,lesson.id,review(lesson),at);const backup=createBackup(data);
 for(const seconds of [29,7201]){const corrupt=structuredClone(backup);corrupt.data.courseProgress[0].lessons[0].attempts[0].evidence.seconds=seconds;assert.throws(()=>parseBackup(JSON.stringify(corrupt)),/0.5–120/);}
});
test('remembered launch setup records the lesson that supplied its tempo',()=>{
 const {data,p,course,lesson}=setup('drums');learn.rememberSetup(data,p.id,course.id,lesson.id,{minutes:10,tempo:299});const progress=learn.progressFor(data,p.id,course.id);
 assert.equal(progress.launchLessonId,lesson.id);assert.equal(progress.launchOptions.tempo,299);validateData(data);
});

test('displayed course reading examples never claim to be unseen first reads',()=>{
 const tasks=COURSES.flatMap(c=>c.lessons.flatMap(l=>l.tasks)).filter(t=>t.protocol.kind==='sight-reading');assert.ok(tasks.length>0);for(const t of tasks)assert.equal(t.protocol.firstRead,false);
});
test('vocal interval endpoints stay inside the personally chosen range',()=>{
 // Synthetic compatible interval task covers future course revisions as well as patterns.
 const p=profile('voice'),c=structuredClone(COURSES.find(c=>c.instrument==='voice')),l=c.lessons[0];l.tasks[0].protocol={kind:'pitch-match',rootMidi:60,interval:4,target:5};
 assert.throws(()=>learn.lessonBlocks(c,l,p,{minutes:5,voice:{startMidi:60,lowMidi:58,highMidi:60}}),/whole interval/);
 assert.doesNotThrow(()=>learn.lessonBlocks(c,l,p,{minutes:5,voice:{startMidi:60,lowMidi:58,highMidi:72}}));
});
