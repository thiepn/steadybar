import { store } from '../app/store.js';
import { navigate, type Page } from '../app/navigation.js';
import { switchProfile } from '../app/profiles.js';
import { reference } from '../audio/reference.js';
import { audio } from '../audio/engine.js';
import { activeProfile, isPracticeProfile } from '../domain/profiles.js';
import { noteName } from '../domain/protocols.js';
import { duration, formatDate, uuid } from '../domain/utils.js';
import type { Course, CourseProgress, Lesson } from '../learning/types.js';
import { LEARNING_SOURCES as SOURCES } from '../learning/sources.js';
import { checkedCount, courseById, courseComplete, coursesFor, dueAt, eligibleSessions, enroll, evidenceSeconds, lessonLink, lessonStatus, nextLesson, progressFor, recordFor, reviewLesson, saveLessonNote, savePlacement, stageName } from '../learning/engine.js';
import { el } from '../ui/dom.js';
import { button, checkbox, empty, field, formDialog, formNumber, formText, input, link, pageHeader, progressBar, sectionHeader, select, textarea } from '../ui/components.js';
import { learningSummary, openLessonSetup } from '../ui/learning.js';

function sources(course:Course):HTMLElement{
  return el('details',{class:'course-sources'},el('summary',{},'Sources, scope and teaching limits'),
    el('p',{},'These original lessons use educator curricula as coverage benchmarks. They are not licensed copies, endorsed courses, examination grades or a substitute for instrument-specific teaching. All teaching text and examples work offline; external references need internet.'),
    ...course.sourceIds.map(id=>{const s=SOURCES.find(source=>source.id===id)!;return el('p',{},el('a',{href:s.url,target:'_blank',rel:'noopener noreferrer',class:'text-link'},`${s.publisher}: ${s.title}`),el('span',{class:'muted small'},` — ${s.purpose}`));}),
    el('p',{class:'field-hint'},'Review suggestions use a flexible 1 / 3 / 7 / 14-day organizational heuristic. Research on spacing and interleaving in music is task-dependent, not a universal prescription. Self-checks never measure your physical technique or microphone audio.'),
    ...SOURCES.filter(s=>['interleaving','spacing'].includes(s.id)&&!course.sourceIds.includes(s.id)).map(s=>el('p',{},el('a',{href:s.url,target:'_blank',rel:'noopener noreferrer',class:'text-link'},s.title))));
}
function courseCard(course:Course,profileId:string):HTMLElement{
  const progress=progressFor(store.snapshot(),profileId,course.id),count=checkedCount(course,progress);
  return el('article',{class:'course-card'},el('p',{class:'eyebrow'},`${stageName(course.stage)} · ${course.lessons.length} lessons${progress?.active?' · Selected':''}`),
    el('h2',{},link(course.title,`/courses/${course.id}`)),el('p',{},course.summary),
    el('p',{class:'field-hint'},`Entry: ${course.prerequisites}`),
    progressBar(count/course.lessons.length,`${course.title} lessons self-checked`),el('p',{class:'muted small'},`${count} / ${course.lessons.length} self-checked`),
    link('View course',`/courses/${course.id}`,'button secondary'));
}
function lessonList(course:Course,profileId:string,progress?:CourseProgress,currentId?:string):HTMLElement{
  return el('ol',{class:'course-lesson-list'},course.lessons.map((l,i)=>{
    const a=link(l.title,lessonLink(course,l,profileId),'course-lesson-link');if(l.id===currentId)a.setAttribute('aria-current','page');
    return el('li',{},el('span',{class:'lesson-number','aria-hidden':'true'},String(i+1).padStart(2,'0')),el('div',{},a,el('p',{class:'muted small'},lessonStatus(course,recordFor(progress,l.id)))));
  }));
}
function placement(course:Course,profileId:string):void{
  const saved=progressFor(store.snapshot(),profileId,course.id)?.placement;
  formDialog('Choose an entry point',[el('p',{},'This is an optional self-report, not an examination. It suggests where to begin without marking lessons complete or locking later material.'),...course.placement.map((q,i)=>checkbox(`placement${i}`,q,saved?.[i]??false))],async form=>{
    await store.workspace(data=>savePlacement(data,profileId,course.id,course.placement.map((_,i)=>form.get(`placement${i}`)==='on')));
  },'Save entry checklist');
}
function review(course:Course,lesson:Lesson,profileId:string):void{
  const sessions=eligibleSessions(store.snapshot(),profileId,course,lesson),attemptId=uuid();
  const evidence=select('evidence','Practice evidence',[
    ['reflection','Reflection only — not a passing check'],...sessions.map(s=>[`session:${s.id}`,`${formatDate(s.endedAt??s.updatedAt)} · ${duration(evidenceSeconds(s,profileId,course,lesson))} lesson evidence`] as [string,string]),['off-app','I practiced both tasks outside this guided session']
  ],sessions.length?`session:${sessions[0]!.id}`:'reflection');
  const outside=el('div',{class:'off-app-evidence'},input('minutes','Actual off-app minutes',5,'number',{min:.5,max:120,step:.5}),checkbox('performed','I actually practiced both lesson tasks; these are not invented or duplicated app minutes.',false));
  const show=()=>{outside.hidden=evidence.querySelector('select')!.value!=='off-app';};evidence.addEventListener('change',show);show();
  const checks=el('fieldset',{class:'lesson-checks'},el('legend',{},'Observed performance — self-report'),...lesson.checks.map((q,i)=>checkbox(`check${i}`,q,false)));
  formDialog('Review this lesson',[
    el('p',{class:'field-hint'},'A passing self-check needs actual practice evidence, every performance criterion and a correct knowledge answer. Confidence is recorded separately. Unchecked criteria or reflection save a “Practice again” result, not a failure penalty.'),
    checks,...lesson.questions.map((q,i)=>select(`answer${i}`,q.prompt,[['-1','Choose an answer'],...q.options.map((text,j)=>[String(j),text] as [string,string])],'-1')),
    evidence,outside,select('confidence','Confidence in this self-check',['1','2','3','4','5'],'3','1 = uncertain; 5 = confident. This is not a performance score.'),textarea('observation','What worked, and what needs repair?','',3)
  ],async form=>{
    const value=formText(form,'evidence');
    const type=value.startsWith('session:')?'session':value==='off-app'?'off-app':'reflection';
    await store.workspace(data=>reviewLesson(data,profileId,course.id,lesson.id,{id:attemptId,checks:lesson.checks.map((_,i)=>form.get(`check${i}`)==='on'),answers:lesson.questions.map((_,i)=>formNumber(form,`answer${i}`)),confidence:formNumber(form,'confidence') as 1|2|3|4|5,notes:formText(form,'observation'),evidence:{kind:type,...(type==='session'?{sessionId:value.slice(8)}:{}),...(type==='off-app'?{minutes:formNumber(form,'minutes'),confirmed:form.get('performed')==='on'}:{})}}));
  },'Save lesson review');
}
function example(course:Course,lesson:Lesson):HTMLElement{
  const e=lesson.example,section=el('section',{class:'lesson-example'},el('h2',{},'Worked example'),el('p',{class:'field-hint'},e.caption),el('pre',{class:'lesson-score'},e.text));
  if(e.rhythm){
    const grid=e.rhythm;
    section.append(el('div',{class:'score-scroll',tabindex:0,'aria-label':'Rhythm grid; scroll horizontally if needed'},el('table',{class:'lesson-rhythm'},
      el('caption',{},'Read each column together. x = attack; – = no new attack.'),el('thead',{},el('tr',{},el('th',{scope:'col'},'Part'),...grid.counts.map(c=>el('th',{scope:'col'},c)))),el('tbody',{},...grid.rows.map(r=>el('tr',{},el('th',{scope:'row'},r.label),...r.hits.map(h=>el('td',{},h))))))));
  }
  if(e.chords){
    section.append(el('p',{class:'field-hint'},'Guitar fret diagrams: strings run low E → A → D → G → B → high e. × = do not sound; 0 = open; numbers = frets, not finger numbers.'),
      el('div',{class:'lesson-chords'},e.chords.map(ch=>el('figure',{class:'lesson-chord'},el('figcaption',{},ch.name),el('table',{'aria-label':`${ch.name} guitar frets, low to high`},el('thead',{},el('tr',{},...['E','A','D','G','B','e'].map(s=>el('th',{scope:'col'},s)))),el('tbody',{},el('tr',{},...ch.frets.map(f=>el('td',{},f===null?'×':String(f))))))))));
  }
  if(e.notes){
    const root=el('select',{'aria-label':'Listening reference starting note'},...Array.from({length:49},(_,i)=>el('option',{value:i+36,selected:i+36===e.notes![0]},noteName(i+36))));
    const label=el('span',{class:'muted small'},noteName(e.notes[0]!));root.addEventListener('input',()=>{label.textContent=Number.isInteger(Number(root.value))&&Number(root.value)>=36&&Number(root.value)<=84?noteName(Number(root.value)):'Choose 36–84.';});
    section.append(el('p',{class:'field-hint'},'Optional local sine-tone reference. Notes play at equal durations: this demonstrates pitch order, NOT the written rhythm, instrument tone or assessed performance.'),
      course.instrument==='voice'?el('p',{class:'learning-safety'},'Listening example only. Do not sing along to an unsuitable pitch; choose your own comfortable starting note/range before guided singing.'):el('span',{hidden:true}),
      course.instrument==='voice'?el('div',{class:'reference-root'},field('Listening reference starting note',root),label):el('span',{hidden:true}),
      el('div',{class:'actions'},button('Hear pitch sequence',async()=>{
        if(audio.running||store.snapshot().sessions.some(s=>s.status==='active'&&['running','countin'].includes(s.runtime.phase)))throw new Error('Pause active practice or the metronome before playing a lesson reference.');
        const delta=course.instrument==='voice'?Number(root.value)-e.notes![0]!:0;
        if(course.instrument==='voice'&&!root.reportValidity())return;
        await reference.play(e.notes!.map(n=>n+delta),.55,.12);
      },'secondary','play'),button('Stop lesson reference',()=>reference.stop(),'ghost')));
    if(course.instrument==='piano'){
      const pitchClasses=new Set(e.notes.map(n=>n%12));
      section.append(el('div',{class:'lesson-keyboard',role:'img','aria-label':`Pitch classes in this example: ${[...pitchClasses].map(n=>noteName(n+60).replace(/\d+/,'' )).join(', ')}.`},...Array.from({length:12},(_,n)=>el('span',{class:`lesson-key ${[1,3,6,8,10].includes(n)?'accidental':''} ${pitchClasses.has(n)?'used':''}`,'aria-hidden':'true'},noteName(n+60).replace(/\d+/,'')))));
    }
  }
  return section;
}
export function coursesPage(courseId?:string,lessonId?:string,ownerId?:string):Page{
  const data=store.snapshot(),selected=activeProfile(data),owner=ownerId?data.profiles?.find(p=>p.id===ownerId):selected;
  const course=courseId?courseById(courseId):undefined;
  const page=el('div',{class:'page learning-page'});
  const done=():Page=>({node:page,cleanup:()=>reference.stop()});
  if(!owner||courseId&&(!course||course.instrument!==owner.instrumentType)){
    page.append(empty('Course unavailable for this profile','The link may refer to another instrument or a course not installed in this version.',link('Open your courses','/courses','button secondary')));return done();
  }
  if(owner.id!==selected.id||!isPracticeProfile(owner)){
    page.append(pageHeader('',course?.title??'Guided learning',`This learning record belongs to ${owner.name}, not the selected workspace.`),el('p',{},'Browsing a session link does not reassign its learning history. Switch to its owning profile to continue.'),
      isPracticeProfile(owner)?button(`Switch to ${owner.name}`,async()=>{await switchProfile(owner.id);navigate(`/courses/${courseId??''}${lessonId?`/${lessonId}`:''}`);},'primary'):link('Restore profile in profile management','/profiles','button secondary'));
    return done();
  }
  const profileId=owner.id;
  if(!course){
    page.append(pageHeader('','Learn',`${owner.name} · Read, practice, apply, self-check and revisit. Courses are self-paced; no lesson is locked.`),learningSummary());
    if(owner.instrumentType==='custom')page.append(el('p',{class:'learning-safety'},'This is a custom-instrument practice-method course. It does not pretend to provide bespoke technique tuition for every instrument; choose appropriate teacher-approved material.'));
    page.append(el('div',{class:'course-grid'},coursesFor(owner).map(c=>courseCard(c,profileId))),el('p',{class:'learning-footnote'},'All lesson teaching and examples are available offline. “Self-checked” is a personal report, not automatic mastery, a grade or a microphone analysis. Course stages are not equivalent to examination levels.'));
    const unavailable=(data.courseProgress??[]).filter(p=>p.profileId===profileId&&!courseById(p.courseId));
    if(unavailable.length)page.append(el('p',{class:'learning-safety'},`${unavailable.length} earlier course record(s) remain safely in your backup but their teaching content is not installed in this version.`));
    return done();
  }
  const progress=progressFor(data,profileId,course.id),count=checkedCount(course,progress);
  const lesson=lessonId?course.lessons.find(l=>l.id===lessonId):undefined;
  if(lessonId&&!lesson){page.append(empty('Lesson not found','The earlier learning record is kept; this lesson is not present in the installed course.',link('Course overview',`/courses/${course.id}`,'button secondary')));return done();}
  if(!lesson){
    page.append(link('All courses','/courses','back-link'),pageHeader(stageName(course.stage),course.title,course.summary),
      el('section',{class:'course-overview'},el('h2',{},'Before you begin'),el('p',{},course.prerequisites),el('ul',{},course.outcomes.map(text=>el('li',{},text))),
        el('div',{class:'actions'},button(progress?.active?'Keep this course selected':'Select this course',async()=>{await store.workspace(d=>enroll(d,profileId,course.id));},'secondary'),button('Check my entry point',()=>placement(course,profileId),'secondary'),link('Continue to a lesson',lessonLink(course,nextLesson(course,progress),profileId),'button primary')),
        progress?.placement?el('p',{class:'learning-placement',role:'status'},progress.placement.every(Boolean)?'You report meeting these entry skills. Browse the lessons or choose the next course stage; no lessons have been marked complete by this checklist.':'Begin with the earlier lessons or simplify the tasks where an entry skill is uncertain. The checklist is guidance, not a lock.'):null),
      el('section',{class:'course-overview'},sectionHeader('Your learning record',`${count} / ${course.lessons.length} lessons self-checked`),progressBar(count/course.lessons.length,'Course lessons self-checked'),el('p',{class:'field-hint'},'Later reviews remain available after every lesson has been self-checked. Repeating the same old session does not establish retention on another day.')),
      lessonList(course,profileId,progress),sources(course));
    if(courseComplete(course,progress)){
      const available=coursesFor(owner),next=available[available.indexOf(course)+1];
      page.append(el('section',{class:'course-overview'},el('h2',{},'Every lesson has a passing self-check'),el('p',{},'This records your reported learning, not a professional proficiency certificate. Revisit suggested reviews and seek feedback where you are uncertain.'),next?link('Explore '+stageName(next.stage),`/courses/${next.id}`,'button secondary'):link('Keep applying your skills','/practice','button secondary')));
    }
    return done();
  }
  const index=course.lessons.indexOf(lesson),record=recordFor(progress,lesson.id),latest=record?.attempts.at(-1),state=lessonStatus(course,record);
  page.append(link(course.title,`/courses/${course.id}`,'back-link'),pageHeader(`${stageName(course.stage)} · Lesson ${index+1} of ${course.lessons.length}`,lesson.title,lesson.objective));
  const main=el('article',{class:'lesson-body'},el('p',{class:'lesson-state',role:'status'},state),
    el('section',{},el('h2',{},'Understand the task'),...lesson.teaching.map(p=>el('p',{},p))),example(course,lesson));
  main.append(el('section',{class:'lesson-guided'},el('h2',{},'Put it into practice'),...lesson.tasks.map((t,i)=>el('div',{class:'lesson-task'},el('h3',{},`${i+1}. ${t.title}`),el('p',{},t.instructions))),
    el('div',{class:'actions'},button('Practice this lesson',()=>openLessonSetup(course,lesson,profileId,'practice'),'primary','play'),button('Add lesson to Today',()=>openLessonSetup(course,lesson,profileId,'plan'),'secondary')),
    el('p',{class:'field-hint'},'Both tasks keep this lesson’s identity in practice history. Time is evidence of practice, never a musical grade. Existing plans are appended to, not replaced.')));
  const unfinished=data.sessions.find(s=>s.status==='active');
  if(unfinished)main.append(el('div',{class:'learning-safety'},el('p',{},`An unfinished ${unfinished.profileNameSnapshot??'practice'} session exists. Resume or finish it before starting another lesson.`),link('Resume unfinished session','/practice/active','button secondary')));
  main.append(el('section',{class:'lesson-adjustments'},el('h2',{},'Adjust and repair'),
    el('h3',{},'Make it easier'),el('p',{},lesson.easier),el('h3',{},'Extend only when ready'),el('p',{},lesson.harder),el('h3',{},'Common mistake and correction'),el('p',{},lesson.mistake),el('h3',{},'Use it beyond the exercise'),el('p',{},lesson.transfer)),
    el('section',{class:'lesson-assessment'},el('h2',{},'Check the actual performance'),el('ul',{},lesson.checks.map(c=>el('li',{},c))),
      el('p',{class:'field-hint'},'A complete review also asks a short knowledge question. Self-reported off-app practice stays separate from timed app practice totals.'),button('Review this lesson',()=>review(course,lesson,profileId),'primary'),
      latest?el('div',{class:'latest-lesson-review'},el('h3',{},'Latest review'),el('p',{},`${formatDate(latest.at)} · Revision ${latest.revision} · ${latest.result==='passed'?'Passing self-check':'Practice again'} · ${latest.evidence.kind} · Confidence ${latest.confidence}/5`),el('p',{},latest.notes||'No observation written.'),
        ...(latest.revision===course.revision?lesson.questions.map((q,i)=>el('p',{class:'field-hint'},`${latest.answers[i]===q.answer?'Knowledge check correct.':'Knowledge check to revisit.'} ${q.explanation}`)):[el('p',{class:'field-hint'},'This review belongs to another course revision. Its history is kept but it does not pass the installed lesson.')]),
        dueAt(course,record)?el('p',{class:'field-hint'},`Suggested review: ${formatDate(dueAt(course,record)!.toISOString())}. Adjust this rhythm to your actual learning; no streak penalties.`):null):null),
    el('details',{class:'course-sources'},el('summary',{},`Review history (${record?.attempts.length??0})`),
      ...(record?.attempts??[]).slice().reverse().map(a=>el('div',{class:'lesson-attempt'},el('p',{},`${formatDate(a.at,true)} · Revision ${a.revision} · ${a.result==='passed'?'Passing self-check':'Practice again'} · ${a.evidence.kind} · ${duration(a.evidence.seconds)}`),el('p',{},a.notes||'No observation written.'),a.evidence.sessionId?link('View supporting session',`/history/${a.evidence.sessionId}`,'text-link'):null))),
    el('section',{class:'lesson-notes'},el('h2',{},'Your lesson note'),el('p',{class:'pre-line'},record?.notes||'Keep your chosen material, teacher feedback, fingerings or next repair here.'),button('Edit lesson note',()=>formDialog('Lesson note',[textarea('note','Material, feedback and next repair',recordFor(progressFor(store.snapshot(),profileId,course.id),lesson.id)?.notes??'',5)],async form=>{await store.workspace(d=>saveLessonNote(d,profileId,course.id,lesson.id,formText(form,'note')));},'Save lesson note'),'secondary')),
    sources(course),el('nav',{class:'lesson-pagination','aria-label':'Adjacent lessons'},index>0?link('Previous lesson',lessonLink(course,course.lessons[index-1]!,profileId),'button secondary'):null,index<course.lessons.length-1?link('Next lesson',lessonLink(course,course.lessons[index+1]!,profileId),'button secondary'):link('Course overview',`/courses/${course.id}`,'button secondary')));
  const outline=el('details',{class:'lesson-outline',open:window.matchMedia('(min-width: 961px)').matches},el('summary',{},'Course lessons'),lessonList(course,profileId,progress,lesson.id));
  page.append(el('div',{class:'lesson-layout'},main,el('aside',{'aria-label':'Course outline'},outline)));
  return done();
}
