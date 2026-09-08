import { activeProfile } from '../domain/profiles.js';
import { exerciseProtocol } from '../domain/protocols.js';
import { protocolResults, summarizeResults } from '../domain/protocol-analytics.js';
import { observeCharts } from '../ui/charts.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { empty, field, link, pageHeader, progressBar, sectionHeader, stat } from '../ui/components.js';
import { buildTempoProgressionSeries, calculateAverageSessionLength, calculateBestCleanBpm, calculateHighestAttemptedBpm, calculatePracticeDistribution, calculateTotalPracticeTime, calculateWeeklySessionCount, exerciseAttempts, filterSessions, finishedSessions, goalProgress, practiceByDay, sessionTime } from '../domain/analytics.js';
import { duration, localDate, titleCase } from '../domain/utils.js';
import { dayChart, lineChart } from '../ui/charts.js';
export function progressPage():Page{
  let chartCleanup=()=>{},drawVersion=0,disposed=false;
  const data=store.view(),profile=activeProfile(store.snapshot()),page=el('div',{class:'page'},pageHeader('','Progress',`${profile.name} · Practice time, task results and reflection.`));
  if(!finishedSessions(data.sessions).length){page.append(empty('No practice data yet','Finish a session to see your practice time and recorded attempts here.',link('Start practice','/practice','button primary','play'),'progress'));return {node:page,cleanup:()=>{disposed=true;chartCleanup();}};}
  const range=el('select',{'aria-label':'Progress date range'},[['7','7 days'],['30','30 days'],['90','3 months'],['365','1 year'],['all','All time'],['custom','Custom range']].map(([v,l])=>el('option',{value:v,selected:v==='30'},l)));
  const from=el('input',{type:'date','aria-label':'From date',value:localDate()}),to=el('input',{type:'date','aria-label':'To date',value:localDate()}),custom=el('div',{class:'actions',hidden:true},field('From',from),field('To',to));
  const exercise=el('select',{'aria-label':'Progress exercise'},data.exercises.filter(e=>exerciseProtocol(e).kind==='tempo').map(e=>el('option',{value:e.id},e.name)));
  const recorded=data.exercises.find(e=>exerciseAttempts(data.sessions,e.id).length>0);if(recorded)exercise.value=recorded.id;
  const content=el('div');
  const draw=()=>{
    const version=++drawVersion;chartCleanup();
    queueMicrotask(()=>{if(!disposed&&version===drawVersion)chartCleanup=observeCharts(content);});
    let start:string|undefined,end:string|undefined=localDate();custom.hidden=range.value!=='custom';
    if(range.value==='custom'){start=from.value||undefined;end=to.value||undefined;}
    else if(range.value!=='all'){const date=new Date();date.setDate(date.getDate()-Number(range.value)+1);start=localDate(date);}
    else end=undefined;
    content.replaceChildren();if(start&&end&&start>end){content.append(el('p',{class:'form-error',role:'alert'},'The start date must come before the end date.'));return;}
    const sessions=filterSessions(data.sessions,start,end),total=calculateTotalPracticeTime(sessions),days=practiceByDay(sessions).filter(d=>d.seconds>0),distribution=calculatePracticeDistribution(sessions),attempts=exerciseAttempts(sessions,exercise.value),best=calculateBestCleanBpm(attempts),highest=calculateHighestAttemptedBpm(attempts);
    content.append(el('div',{class:'stats-strip'},stat('Active practice',duration(total)),stat('Recorded sessions',sessions.length),stat('Average session',duration(calculateAverageSessionLength(sessions))),stat('Active days',days.length)));
    if(!sessions.length){content.append(empty('No sessions in this range.','Choose a wider date range or start a session today.',link('Practice','/practice','button secondary','play')));return;}
    const time=el('section',{class:'panel'},sectionHeader('Practice time'),dayChart(days));
    const mix=el('section',{class:'panel'},sectionHeader('Practice distribution'));
    for(const item of distribution)mix.append(el('div',{class:'distribution-row'},el('div',{class:'split'},el('strong',{},titleCase(item.category)),el('span',{class:'muted small'},`${duration(item.seconds)} · ${item.percent.toFixed(1)}%`)),progressBar(item.percent/100,`${item.category} practice`)));
    if(!distribution.length)mix.append(el('p',{class:'muted'},'These sessions have no recorded active time.'));
    content.append(el('div',{class:'two-column wide-left'},time,mix));
    const tempo=el('section',{class:'panel'},sectionHeader('Tempo progression','Selected date range'),el('div',{class:'tempo-chart-header'},field('Exercise',exercise),el('div',{class:'tempo-chart-stats'},stat('Best clean',best?`${best} BPM`:'—'),stat('Highest attempted',highest?`${highest} BPM`:'—'))),lineChart(buildTempoProgressionSeries(attempts)));
    const series=buildTempoProgressionSeries(attempts);
    if(series.length)tempo.append(el('details',{class:'data-details'},el('summary',{},'View tempo data'),el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},'Date'),el('th',{scope:'col'},'Best clean BPM'))),el('tbody',{},series.map(p=>el('tr',{},el('td',{},p.date),el('td',{},p.bpm)))))));
    if(data.exercises.some(e=>exerciseAttempts(sessions,e.id).length))content.append(tempo);
    const metrics=summarizeResults(protocolResults(sessions));if(metrics.length)content.append(el('section',{class:'panel task-metrics'},sectionHeader(`${profile.name} task results`),...metrics.map(m=>el('div',{class:'metric-row'},el('strong',{},m.label),el('span',{},m.value),el('p',{class:'field-hint'},m.detail)))));
    const first=start||days[0]?.date||localDate(),last=end||localDate();const numberOfDays=Math.max(1,Math.round((new Date(`${last}T12:00:00`).getTime()-new Date(`${first}T12:00:00`).getTime())/86400000)+1);
    const consistency=el('section',{class:'panel'},sectionHeader('Practice frequency'),el('div',{class:'stats-strip inset-stats'},stat('Completed this week',calculateWeeklySessionCount(data.sessions)),stat('Avg. sessions / week',(sessions.filter(s=>s.status==='completed').length/(numberOfDays/7)).toFixed(1)),stat('Time per active day',duration(days.length?total/days.length:0))),el('p',{class:'field-hint'},'Weekly sessions are completed sessions, grouped Monday–Sunday in your local timezone. Time totals also retain practice from sessions ended early.'));
    const goals=el('section',{class:'panel'},sectionHeader('Goal progress','Current status, independent of chart range'));
    if(!data.goals.length)goals.append(el('p',{class:'muted'},'Create a goal to connect these results to your next step.'),link('Create a goal','/goals','text-link','arrow'));
    else for(const g of data.goals.slice(0,5)){const p=goalProgress(g,store.snapshot());goals.append(el('div',{class:'goal-summary'},el('strong',{},g.title),el('p',{class:'small muted'},p.label),progressBar(p.fraction,g.title)));}
    content.append(el('div',{class:'two-column'},consistency,goals),el('details',{class:'data-details'},el('summary',{},'View session totals'),el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},'Session date'),el('th',{scope:'col'},'Active time'),el('th',{scope:'col'},'Status'))),el('tbody',{},sessions.map(s=>el('tr',{},el('td',{},link(localDate(s.startedAt),`/history/${s.id}`)),el('td',{},duration(sessionTime(s))),el('td',{},s.status)))))));
  };
  range.addEventListener('change',draw);from.addEventListener('change',draw);to.addEventListener('change',draw);exercise.addEventListener('change',draw);draw();
  page.append(el('div',{class:'range-toolbar'},field('Date range',range),custom),content);return {node:page,cleanup:()=>{disposed=true;chartCleanup();}};
}
