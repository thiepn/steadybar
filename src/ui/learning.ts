import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { noteName, protocolPulse } from '../domain/protocols.js';
import { launchPractice } from '../practice/launch.js';
import { addLessonToToday, checkedCount, enroll, lessonBlocks, lessonLink, nextLesson, progressFor, rememberSetup, selectedCourse } from '../learning/engine.js';
import type { Course, Lesson, LessonLaunchOptions } from '../learning/types.js';
import { el } from './dom.js';
import { checkbox, formDialog, formNumber, input, link, notify, progressBar, select } from './components.js';

export function learningSummary():HTMLElement{
  const data=store.snapshot(),profile=activeProfile(data),course=selectedCourse(data,profile);
  if(!course)return el('div');
  const progress=progressFor(data,profile.id,course.id),lesson=nextLesson(course,progress),count=checkedCount(course,progress);
  return el('section',{class:'learning-summary','aria-label':'Guided learning'},
    el('div',{},el('p',{class:'eyebrow'},`${profile.name} · Guided learning`),el('h2',{},course.title),
      el('p',{class:'muted small'},`${count} of ${course.lessons.length} lessons self-checked · ${lesson.title}`),
      progressBar(count/course.lessons.length,'Course lessons self-checked')),
    el('div',{class:'actions'},link(progress?'Continue learning':'Open first lesson',lessonLink(course,lesson,profile.id),'button primary'),link('All courses','/courses','button secondary')));
}
export function openLessonSetup(course:Course,lesson:Lesson,profileId:string,mode:'practice'|'plan'):void{
  const profile=store.snapshot().profiles?.find(p=>p.id===profileId);if(!profile)throw new Error('Profile unavailable.');
  const vocal=profile.instrumentType==='voice',first=lesson.tasks.map(t=>protocolPulse(t.protocol)).find(Boolean);
  const progress=progressFor(store.snapshot(),profileId,course.id),saved=progress?.launchOptions,sameLesson=progress?.launchLessonId===lesson.id;
  const times=vocal?['5','10']:['5','10','15','20','30'];
  const children:HTMLElement[]=[el('p',{class:'field-hint'},vocal?'This is a total lesson budget, including listening, rests and reflection—not continuous singing. Stop if your voice becomes uncomfortable.':'The session contains the isolation task and its musical application. A finished timer does not automatically pass a lesson.'),
    select('minutes','Lesson budget',times.map(n=>[n,`${n} minutes`] as [string,string]),String(saved?.minutes??(vocal?5:10))),
    el('ol',{class:'lesson-setup-tasks'},lesson.tasks.map(t=>el('li',{},el('strong',{},t.title),el('p',{},t.instructions))))];
  if(first)children.push(input('tempo',`Reference tempo · ${first.beatUnit===8?'eighth':'quarter'} notes per minute`,(sameLesson?saved?.tempo:undefined)??first.bpm,'number',{min:20,max:300,step:1,required:true}),el('p',{class:'field-hint'},`${first.beats}/${first.beatUnit} meter. Tempo is optional progression: keep it comfortable; the course never raises it automatically.`));
  if(vocal){
    const notes=Array.from({length:61},(_,i)=>[String(i+36),noteName(i+36)] as [string,string]);
    children.push(el('p',{class:'learning-safety'},'Set these for your own voice. C4 and the displayed range are examples, not a prescription. The app cannot determine vocal health or your safe range.'),
      select('startMidi','Your comfortable starting note',notes,String(saved?.voice?.startMidi??60)),select('lowMidi','Your comfortable lowest note',notes,String(saved?.voice?.lowMidi??55)),select('highMidi','Your comfortable highest note',notes,String(saved?.voice?.highMidi??67)),
      checkbox('comfortable','I chose a comfortable range for today and will stop for pain, hoarseness or increasing fatigue.',false));
  }
  formDialog(mode==='plan'?'Plan this lesson':'Prepare guided practice',children,async form=>{
    const options:LessonLaunchOptions={minutes:formNumber(form,'minutes'),...(first?{tempo:formNumber(form,'tempo')}:{})};
    if(vocal){if(form.get('comfortable')!=='on')throw new Error('Choose and confirm a comfortable range before planning singing. Listening-only work does not require starting a singing session.');options.voice={startMidi:formNumber(form,'startMidi'),lowMidi:formNumber(form,'lowMidi'),highMidi:formNumber(form,'highMidi')};}
    const current=store.snapshot().profiles?.find(p=>p.id===profileId);if(!current)throw new Error('Profile unavailable.');
    const blocks=lessonBlocks(course,lesson,current,options);
    if(mode==='plan'){
      await store.workspace(data=>addLessonToToday(data,profileId,course.id,lesson.id,options));
      notify('Both lesson tasks were added without replacing your existing plan.');
    }else{
      if(await store.activeSession())throw new Error('An unfinished session already exists. Close this dialog and finish or resume it before starting a different lesson.');
      await store.workspace(data=>rememberSetup(enroll(data,profileId,course.id),profileId,course.id,lesson.id,options),false);
      await launchPractice(blocks,{profileId});
    }
  },mode==='plan'?'Add both tasks to Today':'Start guided practice');
}
