import { courseById, lessonLink } from '../learning/engine.js';
import { outcomeSummary } from '../domain/protocol-analytics.js';
import { protocolSummary } from '../domain/protocols.js';
import { activeProfile, profiles } from '../domain/profiles.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, formDialog, formNumber, formText, link, notify, pageHeader, sectionHeader, select, stat, textarea } from '../ui/components.js';
import { calculateBestCleanBpm, exerciseAttempts, finishedSessions, sessionTime } from '../domain/analytics.js';
import { duration, formatDate, nowISO, titleCase } from '../domain/utils.js';
import type { PracticeSession } from '../domain/models.js';
export function editSessionReview(session:PracticeSession):void{
  formDialog('Session review',[
    select('rating','How did the session feel?',[['','Not rated'],['1','1 · Difficult'],['2','2 · Below usual'],['3','3 · Solid'],['4','4 · Good focus'],['5','5 · Excellent focus']],session.sessionRating?String(session.sessionRating):''),textarea('notes','Session notes',session.sessionNotes,4),
    el('p',{class:'field-hint'},'Timing, attempts, and historical snapshots are preserved. This only updates your reflection.'),
  ],async data=>{
    const sessionRating=formText(data,'rating')?formNumber(data,'rating') as 1|2|3|4|5:undefined,sessionNotes=formText(data,'notes');
    await store.workspace(workspace=>{
      const current=workspace.sessions.find(item=>item.id===session.id);if(!current)throw new Error('This session no longer exists.');
      current.sessionRating=sessionRating;current.sessionNotes=sessionNotes;current.updatedAt=nowISO();return workspace;
    });
    notify('Session review saved.');
  },'Save review');
}
export function historyPage():Page{
  const data=store.snapshot(),selected=activeProfile(data),sessions=finishedSessions(data.sessions).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
  const page=el('div',{class:'page'},pageHeader('','History','Review saved sessions without changing the profile you are currently practicing.'));
  const search=el('input',{type:'search',placeholder:'Find a session by exercise, song, or note…','aria-label':'Search practice history'});
  const profileFilter=select('historyProfile','History profile',[
    ['selected',`Selected · ${selected.name}`],['all','All profiles'],
    ...profiles(data).filter(p=>p.id!==selected.id).map(p=>[`profile:${p.id}`,`${p.name}${p.attribution==='unresolved-history'?' · history only':p.archived?' · archived':''}`] as [string,string]),
  ],'selected');
  const filter=profileFilter.querySelector('select')!,list=el('div',{class:'history-list'});let visible=30;
  const more=button('Show more sessions',()=>{visible+=30;draw();},'secondary');
  const scoped=()=>filter.value==='all'?sessions:filter.value==='selected'?sessions.filter(s=>s.profileId===selected.id):sessions.filter(s=>s.profileId===filter.value.slice('profile:'.length));
  const draw=()=>{
    const query=search.value.toLowerCase(),filtered=scoped().filter(s=>`${s.profileNameSnapshot??''} ${s.sessionNotes} ${s.blocks.map(b=>`${b.titleSnapshot} ${b.notes}`).join(' ')}`.toLowerCase().includes(query));list.replaceChildren();
    for(const s of filtered.slice(0,visible))list.append(el('article',{class:'history-card'},el('div',{class:'history-date'},el('strong',{},formatDate(s.startedAt)),el('span',{class:'muted small'},new Date(s.startedAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}))),el('div',{class:'history-main'},el('h2',{},link(s.blocks[0]?.titleSnapshot||'Practice session',`/history/${s.id}`)),el('p',{class:'muted small'},s.profileNameSnapshot??'Earlier practice'),el('p',{class:'muted small'},s.blocks.slice(1,4).map(b=>b.titleSnapshot).join(' · ')||'Single-block session'),el('div',{class:'tag-row'},badge(s.status==='completed'?'Completed':'Ended early',s.status==='completed'?'accent':'neutral'),badge(`${s.blocks.length} blocks`),s.sessionRating?badge(`Reflection ${s.sessionRating}/5`):null),s.sessionNotes?el('p',{class:'muted small line-clamp'},s.sessionNotes):null),el('div',{class:'history-duration'},el('strong',{},duration(sessionTime(s))),link('Review',`/history/${s.id}`,'text-link','arrow'))));
    more.hidden=visible>=filtered.length;if(!filtered.length)list.append(empty(filter.value==='selected'?'No history for the selected profile.':'No matching sessions.',filter.value==='selected'?'Choose All profiles or another historical profile to review other sessions.':'Try another profile, exercise name, or phrase from your notes.',filter.value==='selected'?link('Start practice','/practice','button primary','play'):undefined));
  };
  search.addEventListener('input',()=>{visible=30;draw();});filter.addEventListener('change',()=>{visible=30;draw();});draw();
  page.append(el('div',{class:'library-toolbar history-toolbar'},search,profileFilter),list,el('div',{class:'page-footer'},more));return {node:page};
}
export function sessionPage(id:string,review=false):Page{
  const data=store.snapshot(),session=data.sessions.find(s=>s.id===id);if(!session)return {node:empty('Session not found.','This session may have been removed by a data restore.',link('History','/history','button primary'))};
  const clean=session.blocks.flatMap(b=>b.tempoAttempts).filter(a=>a.rating==='clean'||a.rating==='effortless');
  const page=el('div',{class:'page session-review'},link(review?'Back to today':'Practice history',review?'/':'/history','back-link'),pageHeader(review?'':formatDate(session.startedAt,true),review?'Session complete.':'Session details',review?'Review your time, attempts, and notes.':`${session.status==='completed'?'Completed':'Ended early'} · ${formatDate(session.startedAt,true)}${session.endedAt?` → ${new Date(session.endedAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}`:''}`,[button('Add reflection',()=>editSessionReview(session),'primary','note')]));
  page.append(el('div',{class:'stats-strip'},stat('Active practice',duration(sessionTime(session))),stat('Blocks completed',`${session.blocks.filter(b=>b.completed).length} / ${session.blocks.length}`),stat(clean.length?'Clean tempo attempts':'Task results',clean.length||session.blocks.reduce((n,b)=>n+(b.outcomes?.length??0),0)),stat('Session reflection',session.sessionRating?`${session.sessionRating} / 5`:'Not rated')));
  page.append(el('p',{class:'session-profile muted'},session.profileNameSnapshot??'Earlier practice'));
  const lessonKeys=new Set<string>();
  for(const block of session.blocks){
    const source=block.lessonSource;if(!source||!session.profileId)continue;
    const key=`${source.courseId}/${source.lessonId}`;if(lessonKeys.has(key))continue;lessonKeys.add(key);
    const course=courseById(source.courseId),lesson=course?.lessons.find(l=>l.id===source.lessonId);
    if(course&&lesson)page.append(el('section',{class:'learning-summary'},el('div',{},el('h2',{},'Review your learning'),el('p',{class:'muted small'},'Practice time does not automatically pass a lesson. Check the performance and understanding separately.')),link('Return to lesson: '+lesson.title,lessonLink(course,lesson,session.profileId),'button secondary')));
  }
  if(session.sessionNotes)page.append(el('section',{class:'panel'},sectionHeader('Reflection'),el('p',{class:'pre-line'},session.sessionNotes)));
  const records=el('section',{class:'panel'},sectionHeader('Practice blocks','Snapshots are kept even when source exercises or songs change.'));
  for(const [i,block] of session.blocks.entries()){
    const best=calculateBestCleanBpm(block.tempoAttempts),previous=block.sourceExerciseId?calculateBestCleanBpm([...exerciseAttempts(data.sessions.filter(s=>s.id!==id&&s.startedAt<session.startedAt),block.sourceExerciseId),...session.blocks.slice(0,i).filter(b=>b.sourceExerciseId===block.sourceExerciseId).flatMap(b=>b.tempoAttempts)]):undefined;
    records.append(el('article',{class:'review-block'},el('div',{class:'split'},el('div',{},el('div',{class:'eyebrow'},`BLOCK ${String(i+1).padStart(2,'0')} · ${titleCase(block.categorySnapshot)}`),el('h2',{},block.titleSnapshot)),badge(block.skipped?'Skipped':block.completed?'Completed':'Restarted / ended')),
      el('div',{class:'review-metrics'},el('strong',{},duration(block.actualActiveSeconds)),el('span',{class:'muted'},block.initialBpm===undefined?'No tempo target':`${block.initialBpm} → ${block.finalBpm??block.initialBpm} BPM`),el('span',{class:'muted'},`Planned ${duration(block.targetSeconds)}`)),
      best!==undefined?el('div',{class:'clean-highlight'},best>(previous||0)&&review?`New best clean tempo: ${best} BPM`:`Best clean in this block: ${best} BPM`):null,
      block.tempoAttempts.length?el('div',{class:'attempt-tags'},block.tempoAttempts.map(a=>badge(`${a.bpm} BPM · ${titleCase(a.rating)}`,a.rating==='clean'||a.rating==='effortless'?'accent':'neutral'))):null,
      block.protocolSnapshot?el('p',{class:'muted small'},protocolSummary(block.protocolSnapshot)):null,block.profileNameSnapshot?el('p',{class:'muted small'},block.profileNameSnapshot):null,
      block.outcomes?.length?el('ol',{class:'outcome-history'},block.outcomes.map(outcome=>el('li',{},el('span',{},outcomeSummary(outcome)),outcome.note?el('p',{class:'muted small'},outcome.note):null))):null,
      block.notes?el('p',{class:'pre-line'},block.notes):null));
  }
  page.append(records,el('div',{class:'page-footer'},link('Back to today','/','button primary','today'),link('See progress','/progress','button secondary','progress')));return {node:page};
}
