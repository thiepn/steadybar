import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, link, pageHeader, progressBar, sectionHeader, stat } from '../ui/components.js';
import { duration, formatDate, isoWeekStart, localDate, metadata } from '../domain/utils.js';
import { calculateTotalPracticeTime, calculateWeeklySessionCount, filterSessions, finishedSessions, goalProgress, routineDuration, sessionTime } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { editBlock, editGoal, selectRoutineDialog } from '../ui/editors.js';
import { freeBlock, launchPractice, routineToday } from '../practice/launch.js';
import type { RoutineBlock } from '../domain/models.js';
export function todayPage():Page{
  const data=store.snapshot(),plan=data.dailyPlans.find(p=>p.date===localDate()),active=data.sessions.find(s=>s.status==='active');
  const today=new Date(),date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(today);
  const weekStart=isoWeekStart(),weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+6);
  const week=filterSessions(data.sessions,localDate(weekStart),localDate(weekEnd));
  const start=button('Start full session',()=>launchPractice(plan?.blocks||[],{planId:plan?.id}),'primary','play');start.disabled=!plan?.blocks.length;
  const savePlan=async(blocks:RoutineBlock[])=>store.save('dailyPlans',{...(plan||metadata()),date:localDate(),blocks});
  const page=el('div',{class:'page today-page'},pageHeader(date,'Make this practice count.','A clear plan. Focused practice. Progress you can trust.',[link('Free practice','/practice','button secondary','play')]));
  if(active)page.append(el('div',{class:'recovery-banner'},el('div',{},el('strong',{},'You have an unfinished session.'),el('span',{},active.blocks[active.activeBlockIndex]?.titleSnapshot||'Your practice is saved.')),link('Resume session','/practice/active','button primary','play')));
  page.append(el('div',{class:'stats-strip'},stat('This week',duration(calculateTotalPracticeTime(week))),stat('Completed sessions',calculateWeeklySessionCount(data.sessions),'Monday–Sunday'),stat('Today’s plan',duration(routineDuration(plan?.blocks||[]))),stat('Planned blocks',plan?.blocks.length||0)));
  const planPanel=el('section',{class:'panel plan-panel'},sectionHeader('Today’s plan',`${plan?.blocks.length||0} blocks · ${duration(routineDuration(plan?.blocks||[]))}`,[button('Use routine',()=>selectRoutineDialog(routineToday),'ghost','routine')]));
  if(plan?.blocks.length)planPanel.append(blockList(plan.blocks,savePlan,block=>launchPractice([block],{planId:plan.id})),el('div',{class:'plan-footer'},el('span',{class:'muted small'},'Your plan is saved on this device.'),start));
  else planPanel.append(empty('Give today a little structure.','Choose a starter routine or build a short plan around what needs your attention.',el('div',{class:'actions'},button('Choose a routine',()=>selectRoutineDialog(routineToday),'primary','routine'),button('Add a block',()=>editBlock(undefined,async block=>savePlan([block])),'secondary','plus'))));
  const quick=el('section',{class:'panel quiet-panel'},sectionHeader('Find your focus'),el('div',{class:'quick-links'},
    link('Open metronome','/metronome','quick-link','pulse'),link('Work on a rudiment','/library','quick-link','library'),link('Prepare a song','/songs','quick-link','song'),link('Browse routines','/routines','quick-link','routine')));
  const suggested=data.routines.filter(r=>!r.archived&&(r.scheduledDays.includes(today.getDay())||r.id==='routine-1')).slice(0,2);
  const side=el('aside',{class:'today-side'},quick);
  if(suggested.length)side.append(el('section',{class:'panel quiet-panel'},sectionHeader('Ready when you are'),suggested.map(r=>el('div',{class:'suggested-routine'},badge(r.scheduledDays.includes(today.getDay())?'Scheduled today':'Starter routine'),link(r.name,`/routines/${r.id}`),el('p',{class:'muted small'},`${r.blocks.length} blocks · ${duration(routineDuration(r.blocks))}`),button('Use this routine',()=>routineToday(r),'ghost','arrow')))));
  page.append(el('div',{class:'today-grid'},planPanel,side));
  const relevant=data.goals.filter(g=>!goalProgress(g,data).done).slice(0,3);
  const goals=el('section',{class:'panel'},sectionHeader('Working toward',undefined,[link('All goals','/goals','text-link','arrow')]));
  if(!relevant.length)goals.append(empty('Set a direction.','Choose a clean tempo, a song to prepare, or a sustainable weekly rhythm.',button('Create a goal',()=>editGoal(),'ghost','plus'),'goal'));
  else goals.append(...relevant.map(g=>{const p=goalProgress(g,data);return el('div',{class:'goal-summary'},el('strong',{},g.title),el('div',{class:'split muted small'},el('span',{},p.label),g.deadline?el('span',{},formatDate(g.deadline)):null),progressBar(p.fraction,g.title));}));
  const recent=finishedSessions(data.sessions).sort((a,b)=>b.startedAt.localeCompare(a.startedAt)).slice(0,3);
  const history=el('section',{class:'panel'},sectionHeader('Recent sessions',undefined,[link('View history','/history','text-link','arrow')]));
  if(!recent.length)history.append(empty('A fresh practice record.','Your sessions will appear here once you finish your first practice.',button('Start a short session',()=>launchPractice([freeBlock(300,data.settings.metronome.bpm)]),'ghost','play'),'history'));
  else history.append(...recent.map(s=>link(`${formatDate(s.startedAt)} · ${duration(sessionTime(s))} · ${s.blocks[0]?.titleSnapshot||'Practice'}`,`/history/${s.id}`,'recent-row','history')));
  page.append(el('div',{class:'two-column'},goals,history));return {node:page};
}
