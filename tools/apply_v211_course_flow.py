from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def repl(path,old,new):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=1:raise SystemExit(f'{path}: expected one match, found {n}')
    p.write_text(s.replace(old,new,1))

def before(path,marker,text):repl(path,marker,text+marker)

repl('src/learning/engine.ts',
"""export function selectedCourse(data:Data,profile:PracticeProfile):Course|undefined{
  const available=coursesFor(profile),selected=data.courseProgress?.find(p=>p.profileId===profile.id&&p.active);
  return available.find(c=>c.id===selected?.courseId)??available[0];
}
""",
"""export function selectedCourse(data:Data,profile:PracticeProfile):Course|undefined{
  const available=coursesFor(profile),selected=data.courseProgress?.find(p=>p.profileId===profile.id&&p.active);
  return available.find(c=>c.id===selected?.courseId)??available[0];
}
export interface LearningTarget {course:Course;lesson:Lesson;nextStage:boolean;allStagesComplete:boolean}
/** Choose actionable learning, advancing a finished quiet stage instead of falling back to lesson one. */
export function learningTarget(data:Data,profile:PracticeProfile,now=new Date()):LearningTarget|undefined{
  const course=selectedCourse(data,profile);if(!course)return undefined;
  const progress=progressFor(data,profile.id,course.id),lesson=nextLesson(course,progress,now),status=lessonStatus(course,recordFor(progress,lesson.id),now);
  const settled=courseComplete(course,progress)&&status!=='Practice again'&&status!=='Review suggested';
  if(!settled)return {course,lesson,nextStage:false,allStagesComplete:false};
  const available=coursesFor(profile),next=available[available.indexOf(course)+1];
  if(next)return {course:next,lesson:nextLesson(next,progressFor(data,profile.id,next.id),now),nextStage:true,allStagesComplete:false};
  return {course,lesson,nextStage:false,allStagesComplete:true};
}
""")

repl('src/ui/learning.ts',
"import { addLessonToToday, checkedCount, enroll, lessonBlocks, lessonLink, nextLesson, progressFor, rememberSetup, selectedCourse } from '../learning/engine.js';",
"import { addLessonToToday, checkedCount, enroll, learningTarget, lessonBlocks, lessonLink, progressFor, rememberSetup, selectedCourse } from '../learning/engine.js';")
repl('src/ui/learning.ts',
"""  const data=store.snapshot(),profile=activeProfile(data),course=selectedCourse(data,profile);
  if(!course)return el('div');
  const progress=progressFor(data,profile.id,course.id),lesson=nextLesson(course,progress),count=checkedCount(course,progress);
  return el('section',{class:'learning-summary','aria-label':'Guided learning'},
    el('div',{},el('p',{class:'eyebrow'},`${profile.name} · Guided learning`),el('h2',{},course.title),
      el('p',{class:'muted small'},`${count} of ${course.lessons.length} lessons self-checked · ${lesson.title}`),
      progressBar(count/course.lessons.length,'Course lessons self-checked')),
    el('div',{class:'actions'},link(progress?'Continue learning':'Open first lesson',lessonLink(course,lesson,profile.id),'button primary'),link('All courses','/courses','button secondary')));
""",
"""  const data=store.snapshot(),profile=activeProfile(data),selected=selectedCourse(data,profile),target=learningTarget(data,profile);
  if(!selected||!target)return el('div');
  if(target.allStagesComplete)return el('section',{class:'learning-summary','aria-label':'Guided learning'},
    el('div',{},el('p',{class:'eyebrow'},`${profile.name} · Guided learning`),el('h2',{},'All guided stages self-checked'),
      el('p',{class:'muted small'},'No review is due right now. Keep applying the material or revisit any lesson without losing your learning record.')),
    el('div',{class:'actions'},link('Review courses','/courses','button secondary'),link('Open practice','/practice','button primary')));
  const progress=progressFor(data,profile.id,target.course.id),count=checkedCount(target.course,progress);
  const detail=target.nextStage?`Next stage · ${target.lesson.title}`:`${count} of ${target.course.lessons.length} lessons self-checked · ${target.lesson.title}`;
  return el('section',{class:'learning-summary','aria-label':'Guided learning'},
    el('div',{},el('p',{class:'eyebrow'},`${profile.name} · Guided learning`),el('h2',{},target.course.title),el('p',{class:'muted small'},detail),
      progressBar(count/target.course.lessons.length,'Course lessons self-checked')),
    el('div',{class:'actions'},link(target.nextStage?'Open next stage':progress?'Continue learning':'Open first lesson',lessonLink(target.course,target.lesson,profile.id),'button primary'),link('All courses','/courses','button secondary')));
""")

before('tests/courses.test.mjs',
"test('current-revision session evidence must match the actual supporting session',()=>{",
"""test('learning target advances completed stages but never skips a due repair',()=>{
 const data=dataset('drums'),p=data.profiles[0],courses=learn.coursesFor(p),foundation=courses[0],development=courses[1];
 foundation.lessons.forEach((lesson,i)=>learn.reviewLesson(data,p.id,foundation.id,lesson.id,{...review(lesson),id:`stage-pass-${i}`},'2026-09-09T12:00:00.000Z'));
 let target=learn.learningTarget(data,p,new Date('2026-09-09T12:00:01.000Z'));
 assert.equal(target.course.id,development.id);assert.equal(target.nextStage,true);assert.equal(target.lesson.id,development.lessons[0].id);
 const repair=foundation.lessons.at(-1);learn.reviewLesson(data,p.id,foundation.id,repair.id,{...review(repair),id:'stage-repair',checks:repair.checks.map(()=>false),evidence:{kind:'reflection'}},'2026-09-09T12:00:02.000Z');
 target=learn.learningTarget(data,p,new Date('2026-09-09T12:00:03.000Z'));
 assert.equal(target.course.id,foundation.id);assert.equal(target.lesson.id,repair.id);assert.equal(target.nextStage,false);
});
test('learning target reports completion after the final stage when nothing needs attention',()=>{
 const data=dataset('bass'),p=data.profiles[0],courses=learn.coursesFor(p);let n=0;
 for(const course of courses){learn.enroll(data,p.id,course.id,'2026-09-09T12:00:00.000Z');for(const lesson of course.lessons)learn.reviewLesson(data,p.id,course.id,lesson.id,{...review(lesson),id:`all-stage-${n++}`},'2026-09-09T12:00:00.000Z');}
 const target=learn.learningTarget(data,p,new Date('2026-09-09T12:00:01.000Z'));assert.equal(target.course.id,courses.at(-1).id);assert.equal(target.allStagesComplete,true);assert.equal(target.nextStage,false);
});

""")
print('Applied completed-course navigation fix.')
