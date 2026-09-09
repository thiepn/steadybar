import type { Data, PracticeSession, RoutineBlock } from '../domain/models.js';
import type { PracticeProfile } from '../domain/practice-types.js';
import { isPracticeProfile } from '../domain/profiles.js';
import { assertProtocolCompatible, validateProtocol } from '../domain/practice-validation.js';
import { patternFits, protocolPulse } from '../domain/protocols.js';
import { localDate, metadata, uuid } from '../domain/utils.js';
import { COURSES } from './catalog.js';
import type { Course, CourseProgress, Lesson, LessonAttempt, LessonLaunchOptions, LessonRecord } from './types.js';
import { validateCourseProgress } from './validation.js';

export const stageName=(stage:Course['stage']):string=>({foundation:'Foundations',development:'Skill development',ensemble:'Ensemble application'})[stage];
export function coursesFor(profile:PracticeProfile):readonly Course[]{return profile.attribution==='unresolved-history'?[]:COURSES.filter(c=>c.instrument===profile.instrumentType);}
export const courseById=(id:string):Course|undefined=>COURSES.find(c=>c.id===id);
export const progressFor=(data:Data,profileId:string,courseId:string):CourseProgress|undefined=>data.courseProgress?.find(p=>p.profileId===profileId&&p.courseId===courseId);
export const recordFor=(p:CourseProgress|undefined,id:string):LessonRecord|undefined=>p?.lessons.find(l=>l.lessonId===id);
export function passes(course:Course,record?:LessonRecord):LessonAttempt[]{return (record?.attempts??[]).filter(a=>a.revision===course.revision&&a.result==='passed');}
export function checkedCount(course:Course,progress?:CourseProgress):number{return course.lessons.filter(l=>passes(course,recordFor(progress,l.id)).length>0).length;}
export function courseComplete(course:Course,progress?:CourseProgress):boolean{return checkedCount(course,progress)===course.lessons.length;}
/** Calendar-day heuristic, not a claim of a universally validated music practice schedule. */
export function dueAt(course:Course,record?:LessonRecord):Date|undefined{
  const attempts=(record?.attempts??[]).filter(a=>a.revision===course.revision),latest=attempts.at(-1);
  if(!latest)return undefined;
  const date=new Date(latest.at);
  if(latest.result==='needs-work')return date;
  const days=new Set(passes(course,record).map(a=>localDate(new Date(a.at)))).size;
  date.setDate(date.getDate()+(latest.confidence<3?1:([1,3,7,14][Math.min(3,days-1)]??1)));
  return date;
}
export function lessonStatus(course:Course,record?:LessonRecord,now=new Date()):string{
  const latest=record?.attempts.filter(a=>a.revision===course.revision).at(-1);
  if(!latest)return record?.attempts.length?'Other revision':'Not checked';
  if(latest.result==='needs-work')return 'Practice again';
  if((dueAt(course,record)?.getTime()??Infinity)<=now.getTime())return 'Review suggested';
  const days=new Set(passes(course,record).map(a=>localDate(new Date(a.at)))).size;
  return days>=2?'Checked on separate days':'Self-checked';
}
export function nextLesson(course:Course,progress?:CourseProgress,now=new Date()):Lesson{
  // A failed or due review is visible, not a hard access restriction.
  const due=course.lessons.map(l=>({lesson:l,due:dueAt(course,recordFor(progress,l.id))})).filter(x=>x.due&&x.due<=now).sort((a,b)=>a.due!.getTime()-b.due!.getTime());
  return due[0]?.lesson??course.lessons.find(l=>!passes(course,recordFor(progress,l.id)).length)??course.lessons[0]!;
}
export function selectedCourse(data:Data,profile:PracticeProfile):Course|undefined{
  const available=coursesFor(profile),selected=data.courseProgress?.find(p=>p.profileId===profile.id&&p.active);
  return available.find(c=>c.id===selected?.courseId)??available[0];
}
export function lessonLink(course:Course,lesson:Lesson,profileId:string):string{return `/courses/${course.id}/${lesson.id}/${profileId}`;}
function requireCourse(data:Data,profileId:string,courseId:string):{profile:PracticeProfile;course:Course}{
  const profile=data.profiles?.find(p=>p.id===profileId),course=courseById(courseId);
  if(!profile||!isPracticeProfile(profile))throw new Error('Select or restore an available practice profile first.');
  if(!course||course.instrument!==profile.instrumentType)throw new Error('This course does not belong to that instrument profile.');
  return {profile,course};
}
function mutableProgress(data:Data,profileId:string,course:Course,at:string):CourseProgress{
  data.courseProgress??=[];
  let progress=progressFor(data,profileId,course.id);
  if(!progress){progress={id:uuid(),profileId,courseId:course.id,courseTitle:course.title,revision:course.revision,active:false,createdAt:at,updatedAt:at,lessons:[]};data.courseProgress.push(progress);}
  progress.courseTitle=course.title;progress.revision=course.revision;progress.updatedAt=at;
  return progress;
}
function mutableRecord(progress:CourseProgress,lesson:Lesson):LessonRecord{
  let record=recordFor(progress,lesson.id);
  if(!record){record={lessonId:lesson.id,notes:'',attempts:[]};progress.lessons.push(record);}
  return record;
}
/** Mutates the fresh transactional copy, never a cached page snapshot. */
export function enroll(data:Data,profileId:string,courseId:string,at=new Date().toISOString()):Data{
  const {course}=requireCourse(data,profileId,courseId),progress=mutableProgress(data,profileId,course,at);
  for(const p of data.courseProgress??[])if(p.profileId===profileId){p.active=p.id===progress.id;p.updatedAt=at;}
  return data;
}
export function savePlacement(data:Data,profileId:string,courseId:string,checks:boolean[],at=new Date().toISOString()):Data{
  const {course}=requireCourse(data,profileId,courseId);
  if(checks.length!==course.placement.length||checks.some(c=>typeof c!=='boolean'))throw new Error('Complete the course placement checklist.');
  mutableProgress(data,profileId,course,at).placement=[...checks];return data;
}
export function saveLessonNote(data:Data,profileId:string,courseId:string,lessonId:string,note:string,at=new Date().toISOString()):Data{
  const {course}=requireCourse(data,profileId,courseId),lesson=course.lessons.find(l=>l.id===lessonId);
  if(!lesson)throw new Error('Lesson unavailable.');
  if(note.length>4000)throw new Error('Keep the lesson note below 4,000 characters.');
  mutableRecord(mutableProgress(data,profileId,course,at),lesson).notes=note.trim();return data;
}
export function evidenceSeconds(session:PracticeSession,profileId:string,course:Course,lesson:Lesson):number{
  if(session.status==='active'||session.profileId!==profileId)return 0;
  const blocks=session.blocks.filter(b=>b.profileId===profileId&&b.lessonSource?.courseId===course.id&&b.lessonSource.lessonId===lesson.id&&b.lessonSource.revision===course.revision&&b.completed&&!b.skipped&&b.startedAt&&b.actualActiveSeconds>=5);
  if(!lesson.tasks.every(task=>blocks.some(b=>b.lessonSource?.taskId===task.id)))return 0;
  const seconds=blocks.reduce((n,b)=>n+b.actualActiveSeconds,0);return seconds>=30?seconds:0;
}
export function eligibleSessions(data:Data,profileId:string,course:Course,lesson:Lesson):PracticeSession[]{
  return data.sessions.filter(s=>evidenceSeconds(s,profileId,course,lesson)>0).sort((a,b)=>(b.endedAt??b.updatedAt).localeCompare(a.endedAt??a.updatedAt));
}
export interface ReviewInput {id:string;checks:boolean[];answers:number[];confidence:1|2|3|4|5;notes:string;evidence:{kind:'session'|'off-app'|'reflection';sessionId?:string;minutes?:number;confirmed?:boolean}}
export function reviewLesson(data:Data,profileId:string,courseId:string,lessonId:string,input:ReviewInput,at=new Date().toISOString()):Data{
  const {course}=requireCourse(data,profileId,courseId),lesson=course.lessons.find(l=>l.id===lessonId);
  if(!lesson)throw new Error('Lesson unavailable.');
  if(input.checks.length!==lesson.checks.length||input.checks.some(c=>typeof c!=='boolean')||input.answers.length!==lesson.questions.length)throw new Error('Review each performance check and knowledge question.');
  if(input.answers.some((n,i)=>!Number.isInteger(n)||n< -1||n>=lesson.questions[i]!.options.length))throw new Error('Choose a listed answer.');
  const progress=mutableProgress(data,profileId,course,at),record=mutableRecord(progress,lesson);
  if(record.attempts.some(a=>a.id===input.id))return data; // Idempotent repeated submit.
  let evidence:LessonAttempt['evidence']={kind:'reflection',seconds:0};
  if(input.evidence.kind==='session'){
    const session=data.sessions.find(s=>s.id===input.evidence.sessionId),seconds=session?evidenceSeconds(session,profileId,course,lesson):0;
    if(!session||!seconds)throw new Error('Finish both guided tasks for this lesson first, or explicitly record actual off-app practice.');
    evidence={kind:'session',seconds,sessionId:session.id};
  }else if(input.evidence.kind==='off-app'){
    const minutes=input.evidence.minutes;
    if(!input.evidence.confirmed||typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<.5||minutes>120)throw new Error('Confirm actual off-app practice and enter 0.5–120 minutes.');
    evidence={kind:'off-app',seconds:minutes*60};
  }else if(input.evidence.kind!=='reflection')throw new Error('Choose a supported evidence type.');
  const passed=evidence.kind!=='reflection'&&input.checks.every(Boolean)&&lesson.questions.every((q,i)=>input.answers[i]===q.answer);
  if(passed&&evidence.kind==='session'&&record.attempts.some(a=>a.revision===course.revision&&a.result==='passed'&&a.evidence.sessionId===evidence.sessionId))throw new Error('This practice session already supports a passing check. Practice again for a new review; old evidence cannot establish later retention.');
  record.attempts.push({id:input.id,at,revision:course.revision,result:passed?'passed':'needs-work',checks:[...input.checks],answers:[...input.answers],confidence:input.confidence,notes:input.notes.trim(),evidence});
  validateCourseProgress(progress);return data;
}
export function lessonBlocks(course:Course,lesson:Lesson,profile:PracticeProfile,options:LessonLaunchOptions):RoutineBlock[]{
  if(course.instrument!==profile.instrumentType||!isPracticeProfile(profile)||!course.lessons.some(l=>l.id===lesson.id))throw new Error('Choose a lesson for the available profile.');
  const max=profile.instrumentType==='voice'?10:30;
  if(!Number.isInteger(options.minutes)||options.minutes<5||options.minutes>max)throw new Error(`Choose a lesson budget from 5 to ${max} minutes.`);
  if(options.tempo!==undefined&&(!Number.isInteger(options.tempo)||options.tempo<20||options.tempo>300))throw new Error('Choose a whole-number tempo between 20 and 300.');
  const total=options.minutes*60,weight=lesson.tasks.reduce((n,t)=>n+t.weight,0);let used=0;
  return lesson.tasks.map((task,i)=>{
    const protocol=structuredClone(task.protocol);
    if(profile.instrumentType==='voice'){
      const range=options.voice;
      if(!range||![range.startMidi,range.lowMidi,range.highMidi].every(n=>Number.isInteger(n)&&n>=36&&n<=96)||range.lowMidi>range.startMidi||range.startMidi>range.highMidi)throw new Error('Choose your own comfortable starting pitch and range.');
      if(protocol.kind==='vocal-pattern'){
        Object.assign(protocol,range);
        if(!patternFits(protocol,range.startMidi))throw new Error('The whole pattern must fit inside your chosen comfortable range. Change the root/range or use listening-only work.');
      }
      if(protocol.kind==='pitch-match'){
        protocol.rootMidi=range.startMidi;
        if(range.startMidi+protocol.interval<range.lowMidi||range.startMidi+protocol.interval>range.highMidi)throw new Error('The whole interval must fit inside your chosen comfortable range. Change the root/range or use listening-only work.');
      }
    }
    const timing=protocolPulse(protocol);if(timing&&options.tempo!==undefined)timing.bpm=options.tempo;
    const validated=validateProtocol(protocol);assertProtocolCompatible(validated,profile);
    const seconds=i===lesson.tasks.length-1?total-used:Math.floor(total*task.weight/weight);used+=seconds;
    return {id:uuid(),type:'free',profileId:profile.id,protocol:validated,title:task.title,targetSeconds:seconds,bpm:protocolPulse(validated)?.bpm,notes:[lesson.objective,task.instructions,lesson.example.text,'Self-check: '+lesson.checks.join(' ')].join('\n\n'),order:i,lessonSource:{courseId:course.id,lessonId:lesson.id,taskId:task.id,revision:course.revision}};
  });
}
export function rememberSetup(data:Data,profileId:string,courseId:string,lessonId:string,options:LessonLaunchOptions):Data{
  const {profile,course}=requireCourse(data,profileId,courseId),lesson=course.lessons.find(l=>l.id===lessonId);
  if(!lesson)throw new Error('Lesson unavailable.');
  lessonBlocks(course,lesson,profile,options); // Revalidate remembered settings against this task.
  const progress=mutableProgress(data,profileId,course,new Date().toISOString());progress.launchOptions=structuredClone(options);
  return data;
}
export function addLessonToToday(data:Data,profileId:string,courseId:string,lessonId:string,options:LessonLaunchOptions,date=localDate()):Data{
  const {course,profile}=requireCourse(data,profileId,courseId),lesson=course.lessons.find(l=>l.id===lessonId);
  if(!lesson)throw new Error('Lesson unavailable.');
  let plan=data.dailyPlans.find(p=>p.profileId===profileId&&p.date===date);
  if(plan?.blocks.some(b=>b.lessonSource?.courseId===course.id&&b.lessonSource.lessonId===lesson.id))throw new Error('This lesson is already in today’s plan. Remove its existing blocks before planning it again.');
  const blocks=lessonBlocks(course,lesson,profile,options);
  if(!plan){plan={...metadata(),profileId,date,blocks:[]};data.dailyPlans.push(plan);}
  if(plan.blocks.length+blocks.length>200)throw new Error('Today’s plan has reached its block limit. Remove a block before adding this lesson.');
  plan.blocks.push(...blocks.map((b,i)=>({...b,order:plan!.blocks.length+i})));plan.updatedAt=new Date().toISOString();
  enroll(data,profileId,courseId);rememberSetup(data,profileId,courseId,lessonId,options);return data;
}
