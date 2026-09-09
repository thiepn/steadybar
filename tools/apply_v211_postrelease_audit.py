from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace_once(path: str, old: str, new: str) -> None:
    file = ROOT / path
    text = file.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {text.count(old)}')
    file.write_text(text.replace(old, new, 1))

def append_before(path: str, marker: str, addition: str) -> None:
    replace_once(path, marker, addition + marker)

# 1. Keep remembered launch settings scoped to the lesson that supplied tempo,
# while allowing harmless course-level reuse of duration and vocal range.
replace_once('src/learning/types.ts',
"  active:boolean; createdAt:string; updatedAt:string; placement?:boolean[]; launchOptions?:LessonLaunchOptions; lessons:LessonRecord[];",
"  active:boolean; createdAt:string; updatedAt:string; placement?:boolean[]; launchOptions?:LessonLaunchOptions; launchLessonId?:string; lessons:LessonRecord[];")
replace_once('src/learning/validation.ts',
"const progress=obj({id,profileId:id,courseId:id,courseTitle:name,revision:num(1,10000,true),active:bool,createdAt:iso,updatedAt:iso,placement:optional(arr(bool,20)),launchOptions:optional(launchOptions),lessons:arr(record,300)});",
"const progress=obj({id,profileId:id,courseId:id,courseTitle:name,revision:num(1,10000,true),active:bool,createdAt:iso,updatedAt:iso,placement:optional(arr(bool,20)),launchOptions:optional(launchOptions),launchLessonId:optional(id),lessons:arr(record,300)});")
replace_once('src/learning/validation.ts',
"""  for(const l of p.lessons)for(const a of l.attempts){
    const lesson=course?.lessons.find(row=>row.id===l.lessonId);
    if(course&&a.revision===course.revision&&a.result==='passed'&&(!lesson||a.checks.length!==lesson.checks.length||a.answers.length!==lesson.questions.length||lesson.questions.some((q,i)=>q.answer!==a.answers[i])))fail(path,'the passing check does not match this lesson revision');
    if(a.evidence.kind==='session'&&!a.evidence.sessionId)fail(path,'session evidence needs a session ID');
    if(a.evidence.kind!=='session'&&a.evidence.sessionId)fail(path,'only session evidence can reference a session');
    if(a.result==='passed'&&(a.evidence.kind==='reflection'||a.evidence.seconds<30||!a.checks.length||!a.checks.every(Boolean)||a.answers.some(n=>n<0)))fail(path,'a pass needs practice evidence and completed checks');
    if(a.evidence.kind==='reflection'&&a.evidence.seconds!==0)fail(path,'a reflection is not timed practice');
  }
""",
"""  for(const l of p.lessons)for(const a of l.attempts){
    const lesson=course?.lessons.find(row=>row.id===l.lessonId);
    if(course&&a.revision===course.revision){
      if(!lesson||a.checks.length!==lesson.checks.length||a.answers.length!==lesson.questions.length)fail(path,'the review does not match this lesson revision');
      if(a.result==='passed'&&lesson.questions.some((q,i)=>q.answer!==a.answers[i]))fail(path,'the passing check does not match this lesson revision');
    }
    if(a.evidence.kind==='session'&&!a.evidence.sessionId)fail(path,'session evidence needs a session ID');
    if(a.evidence.kind!=='session'&&a.evidence.sessionId)fail(path,'only session evidence can reference a session');
    if(a.evidence.kind==='off-app'&&(a.evidence.seconds<30||a.evidence.seconds>7200))fail(path,'off-app evidence must represent 0.5–120 minutes of actual practice');
    if(a.result==='passed'&&(a.evidence.kind==='reflection'||a.evidence.seconds<30||!a.checks.length||!a.checks.every(Boolean)||a.answers.some(n=>n<0)))fail(path,'a pass needs practice evidence and completed checks');
    if(a.evidence.kind==='reflection'&&a.evidence.seconds!==0)fail(path,'a reflection is not timed practice');
  }
""")

(ROOT / 'src/learning/evidence.ts').write_text("""import type { PracticeSession } from '../domain/models.js';
import type { Course, Lesson } from './types.js';

/**
 * Derive eligible lesson practice from immutable session provenance.
 * This is evidence that both guided tasks were actually run, not a proficiency score.
 */
export function sessionEvidenceSeconds(session:PracticeSession,profileId:string,course:Course,lesson:Lesson):number{
  if(session.status==='active'||session.profileId!==profileId)return 0;
  const blocks=session.blocks.filter(b=>b.profileId===profileId&&b.lessonSource?.courseId===course.id&&b.lessonSource.lessonId===lesson.id&&b.lessonSource.revision===course.revision&&b.completed&&!b.skipped&&b.startedAt&&b.endedAt&&b.actualActiveSeconds>=5);
  if(!lesson.tasks.every(task=>blocks.some(b=>b.lessonSource?.taskId===task.id)))return 0;
  const seconds=blocks.reduce((n,b)=>n+b.actualActiveSeconds,0);
  return seconds>=30?seconds:0;
}
""")
replace_once('src/learning/engine.ts',
"import { COURSES } from './catalog.js';\n",
"import { COURSES } from './catalog.js';\nimport { sessionEvidenceSeconds } from './evidence.js';\n")
replace_once('src/learning/engine.ts',
"""export function evidenceSeconds(session:PracticeSession,profileId:string,course:Course,lesson:Lesson):number{
  if(session.status==='active'||session.profileId!==profileId)return 0;
  const blocks=session.blocks.filter(b=>b.profileId===profileId&&b.lessonSource?.courseId===course.id&&b.lessonSource.lessonId===lesson.id&&b.lessonSource.revision===course.revision&&b.completed&&!b.skipped&&b.startedAt&&b.actualActiveSeconds>=5);
  if(!lesson.tasks.every(task=>blocks.some(b=>b.lessonSource?.taskId===task.id)))return 0;
  const seconds=blocks.reduce((n,b)=>n+b.actualActiveSeconds,0);return seconds>=30?seconds:0;
}
""",
"export const evidenceSeconds=sessionEvidenceSeconds;\n")
replace_once('src/learning/engine.ts',
"  for(const p of data.courseProgress??[])if(p.profileId===profileId){p.active=p.id===progress.id;p.updatedAt=at;}\n",
"  for(const p of data.courseProgress??[])if(p.profileId===profileId){const active=p.id===progress.id;if(p.active!==active){p.active=active;p.updatedAt=at;}}\n")
replace_once('src/learning/engine.ts',
"  const progress=mutableProgress(data,profileId,course,new Date().toISOString());progress.launchOptions=structuredClone(options);\n",
"  const progress=mutableProgress(data,profileId,course,new Date().toISOString());progress.launchOptions=structuredClone(options);progress.launchLessonId=lesson.id;\n")

replace_once('src/ui/learning.ts',
"  const saved=progressFor(store.snapshot(),profileId,course.id)?.launchOptions;\n",
"  const progress=progressFor(store.snapshot(),profileId,course.id),saved=progress?.launchOptions,sameLesson=progress?.launchLessonId===lesson.id;\n")
replace_once('src/ui/learning.ts',
"saved?.tempo??first.bpm",
"(sameLesson?saved?.tempo:undefined)??first.bpm")

# 2. Imported/current learning records must agree with their actual supporting session.
replace_once('src/domain/validation.ts',
"import { COURSES } from '../learning/catalog.js';\n",
"import { COURSES } from '../learning/catalog.js';\nimport { sessionEvidenceSeconds } from '../learning/evidence.js';\n")
replace_once('src/domain/validation.ts',
"""    for(const row of learning){
      const p=requireProfile(row.profileId),course=COURSES.find(c=>c.id===row.courseId);
      if(p.attribution==='unresolved-history')fail('Course progress','historical attribution buckets cannot learn new courses');
      if(course&&course.instrument!==p.instrumentType)fail('Course progress','course belongs to a different instrument');
    }
    const exercises=new Map(d.exercises.map(e=>[e.id,e])),songs=new Map(d.songs.map(s=>[s.id,s]));
""",
"""    const sessionsById=new Map(d.sessions.map(s=>[s.id,s]));
    for(const row of learning){
      const p=requireProfile(row.profileId),course=COURSES.find(c=>c.id===row.courseId);
      if(p.attribution==='unresolved-history')fail('Course progress','historical attribution buckets cannot learn new courses');
      if(course&&course.instrument!==p.instrumentType)fail('Course progress','course belongs to a different instrument');
      if(!course)continue;
      for(const record of row.lessons){
        const lesson=course.lessons.find(l=>l.id===record.lessonId);
        for(const attempt of record.attempts){
          if(attempt.revision!==course.revision||attempt.evidence.kind!=='session')continue;
          if(!lesson)fail('Course progress','current-revision session evidence refers to an unavailable lesson');
          const session=sessionsById.get(attempt.evidence.sessionId??''),seconds=session?sessionEvidenceSeconds(session,row.profileId,course,lesson):0;
          if(!session||!seconds||seconds!==attempt.evidence.seconds)fail('Course progress','session evidence does not match its supporting guided session');
        }
      }
    }
    const exercises=new Map(d.exercises.map(e=>[e.id,e])),songs=new Map(d.songs.map(s=>[s.id,s]));
""")

# 3. Generic repository session APIs must uphold whole-workspace invariants too.
replace_once('src/db/database.ts',
"""    if(name==='settings')data.settings=validateSettings(validated);
    else if(name==='sessions')data.sessions=[validateSession(validated)];
    else {
""",
"""    if(name==='settings')data.settings=validateSettings(validated);
    else if(name==='sessions'){
      const current=await request(tx.objectStore('sessions').getAll()) as PracticeSession[],session=validateSession(validated as PracticeSession);
      data.sessions=[...current.filter(row=>row.id!==session.id),session];
    }else {
""")
replace_once('src/db/database.ts',
"  if(name==='sessions'){await write('sessions',tx=>{tx.objectStore(name).delete(id);});return;}\n",
"""  if(name==='sessions'){
    await write([...STORES],async tx=>{
      const data=await referenceSnapshot(tx),sessions=await request(tx.objectStore('sessions').getAll()) as PracticeSession[];
      data.sessions=sessions.filter(session=>session.id!==id);if(data.schemaVersion===2)validateData(data);tx.objectStore(name).delete(id);
    });return;
  }
""")

# 4. Present the amount of evidence actually attributable to this lesson, not unrelated blocks in the same session.
replace_once('src/pages/courses.ts',
"import { checkedCount, courseById, courseComplete, coursesFor, dueAt, eligibleSessions, enroll, lessonLink, lessonStatus, nextLesson, progressFor, recordFor, reviewLesson, saveLessonNote, savePlacement, stageName } from '../learning/engine.js';",
"import { checkedCount, courseById, courseComplete, coursesFor, dueAt, eligibleSessions, enroll, evidenceSeconds, lessonLink, lessonStatus, nextLesson, progressFor, recordFor, reviewLesson, saveLessonNote, savePlacement, stageName } from '../learning/engine.js';")
replace_once('src/pages/courses.ts',
"`${formatDate(s.endedAt??s.updatedAt)} · ${duration(s.blocks.reduce((n,b)=>n+b.actualActiveSeconds,0))} guided session`",
"`${formatDate(s.endedAt??s.updatedAt)} · ${duration(evidenceSeconds(s,profileId,course,lesson))} lesson evidence`")

# Regression tests for all newly discovered defects.
append_before('tests/courses.test.mjs',
"test('displayed course reading examples never claim to be unseen first reads',()=>{",
"""test('current-revision session evidence must match the actual supporting session',()=>{
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

""")
append_before('tests/database.test.mjs',
"test('session updates serialize against the newest committed record',async()=>{",
"""test('generic session writes cannot bypass the one-active-session invariant',async()=>{
  await db.initializeDatabase();const first=active(),second=active();await db.put('sessions',first);
  await assert.rejects(db.put('sessions',second),/one active session/);assert.deepEqual((await db.all('sessions')).map(s=>s.id),[first.id]);
});
""")
append_before('tests/database.test.mjs',
"test('backup round trip retains learning history and reset clears it only when requested',async()=>{",
"""test('generic session deletion cannot orphan current guided-learning evidence',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES.find(c=>c.id==='drums-foundation'),l=c.lessons[0],p=d.profiles.find(p=>p.id===pid);
 let s=createSession(learning.lessonBlocks(c,l,p,{minutes:5}),d);for(let i=0;i<l.tasks.length;i++){s.blocks[i].startedAt='2026-09-09T12:00:00.000Z';s.blocks[i].actualActiveSeconds=20;s=finishBlock(s,false,Date.parse('2026-09-09T12:01:00.000Z')+i*20000);}d.sessions=[s];
 learning.reviewLesson(d,pid,c.id,l.id,{id:'linked-session-review',checks:l.checks.map(()=>true),answers:l.questions.map(q=>q.answer),confidence:3,notes:'Keep this evidence',evidence:{kind:'session',sessionId:s.id}},'2026-09-09T12:05:00.000Z');await db.replaceData(d);
 await assert.rejects(db.remove('sessions',s.id),/supporting guided session/);assert.ok(await db.get('sessions',s.id));
});
""")

# Browser regression: same lesson remembers tempo; another lesson returns to authored default.
append_before('tests/courses.py',
"    def test_89_native_v3_backup_restore_and_offline_learning(self):",
"""    def test_89_cross_lesson_tempo_defaults_do_not_leak(self):
        self.begin('drums')
        timed=self.read(\"\"\"(()=>{const c=load('learning/catalog.js').COURSES.find(c=>c.id==='drums-foundation'),pulse=load('domain/protocols.js').protocolPulse;return c.lessons.map(l=>({id:l.id,bpm:l.tasks.map(t=>pulse(t.protocol)).find(Boolean)?.bpm})).filter(x=>Number.isInteger(x.bpm)).slice(0,2);})()\"\"\")
        self.assertEqual(len(timed),2)
        first=next(l for l in self.course['lessons'] if l['id']==timed[0]['id']);second=next(l for l in self.course['lessons'] if l['id']==timed[1]['id'])
        self.lesson=first;self.open_lesson();self.page.get_by_role('button',name='Add lesson to Today',exact=True).click();tempo=self.page.locator('dialog[open] input[name=tempo]');expect(tempo).to_have_value(str(timed[0]['bpm']));tempo.fill('299');self.save_dialog('Add both tasks to Today')
        self.open_lesson();self.page.get_by_role('button',name='Practice this lesson',exact=True).click();expect(self.page.locator('dialog[open] input[name=tempo]')).to_have_value('299');self.page.get_by_role('button',name='Close dialog',exact=True).click()
        self.lesson=second;self.open_lesson();self.page.get_by_role('button',name='Practice this lesson',exact=True).click();expect(self.page.locator('dialog[open] input[name=tempo]')).to_have_value(str(timed[1]['bpm']));self.page.get_by_role('button',name='Close dialog',exact=True).click()

""")

# Version and release notes.
replace_once('package.json','\"version\": \"2.1.0\"','\"version\": \"2.1.1\"')
lock=ROOT/'package-lock.json';lock.write_text(lock.read_text().replace('\"version\": \"2.1.0\"','\"version\": \"2.1.1\"',2))
replace_once('CHANGELOG.md',
"# Changelog\n\n",
"""# Changelog

## 2.1.1 — Post-release integrity audit — 2026-09-09

- Scope remembered lesson tempo to the lesson that supplied it, preventing a custom tempo from silently leaking into another lesson while retaining safe duration and vocal-range convenience.
- Derive current-revision session evidence from the immutable supporting session during whole-workspace validation; reject orphaned or altered evidence while retaining unknown historical course revisions.
- Apply the same 0.5–120 minute limits to imported off-app evidence that live review entry already enforces, and validate current-revision review shapes even when the outcome is “Practice again”.
- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller.
- Show lesson-attributable evidence time in the review picker instead of total time from unrelated blocks in the same session.
- Avoid rewriting every inactive course record's timestamp when selecting another course.
- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.

""")

print('Applied Steadybar 2.1.1 post-release audit fixes.')
