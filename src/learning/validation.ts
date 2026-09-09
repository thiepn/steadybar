import { COURSES } from './catalog.js';
import type { CourseProgress, LessonSource } from './types.js';
import { arr, bool, id, iso, name, num, obj, one, optional, text, uniqueIds, fail, type Validator } from '../domain/schema.js';
export const validateLessonSource:Validator<LessonSource>=obj({courseId:id,lessonId:id,taskId:id,revision:num(1,10000,true)});
const attempt=obj({id,at:iso,revision:num(1,10000,true),result:one('passed','needs-work'),checks:arr(bool,20),answers:arr(num(-1,20,true),20),confidence:one(1,2,3,4,5),notes:text(4000),evidence:obj({kind:one('session','off-app','reflection'),seconds:num(0,86400),sessionId:optional(id)})});
const record=obj({lessonId:id,notes:text(4000),attempts:arr(attempt,1000)});
const launchOptions=obj({minutes:num(5,30,true),tempo:optional(num(20,300,true)),voice:optional(obj({startMidi:num(36,96,true),lowMidi:num(36,96,true),highMidi:num(36,96,true)}))});
const progress=obj({id,profileId:id,courseId:id,courseTitle:name,revision:num(1,10000,true),active:bool,createdAt:iso,updatedAt:iso,placement:optional(arr(bool,20)),launchOptions:optional(launchOptions),lessons:arr(record,300)});
export const validateCourseProgress:Validator<CourseProgress>=(value,path='Course progress')=>{
  const p=progress(value,path);
  if(new Set(p.lessons.map(l=>l.lessonId)).size!==p.lessons.length)fail(path,'duplicate lesson records');
  uniqueIds(p.lessons.flatMap(l=>l.attempts),`${path}.attempts`);
  const course=COURSES.find(c=>c.id===p.courseId),range=p.launchOptions?.voice;
  if(range&&(range.lowMidi>range.startMidi||range.startMidi>range.highMidi))fail(path,'invalid remembered vocal range');
  if(course?.instrument==='voice'&&p.launchOptions&&p.launchOptions.minutes>10)fail(path,'voice lesson budgets are at most ten minutes including rests');
  for(const l of p.lessons)for(const a of l.attempts){
    const lesson=course?.lessons.find(row=>row.id===l.lessonId);
    if(course&&a.revision===course.revision&&a.result==='passed'&&(!lesson||a.checks.length!==lesson.checks.length||a.answers.length!==lesson.questions.length||lesson.questions.some((q,i)=>q.answer!==a.answers[i])))fail(path,'the passing check does not match this lesson revision');
    if(a.evidence.kind==='session'&&!a.evidence.sessionId)fail(path,'session evidence needs a session ID');
    if(a.evidence.kind!=='session'&&a.evidence.sessionId)fail(path,'only session evidence can reference a session');
    if(a.result==='passed'&&(a.evidence.kind==='reflection'||a.evidence.seconds<30||!a.checks.length||!a.checks.every(Boolean)||a.answers.some(n=>n<0)))fail(path,'a pass needs practice evidence and completed checks');
    if(a.evidence.kind==='reflection'&&a.evidence.seconds!==0)fail(path,'a reflection is not timed practice');
  }
  return p;
};
