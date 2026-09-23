import { learningSummary } from '../ui/learning.js';
import { activeProfile } from '../domain/profiles.js';
import { exerciseProtocol } from '../domain/protocols.js';
import { protocolResults, summarizeResults } from '../domain/protocol-analytics.js';
import { buildPracticeDiagnostics, type DiagnosticInsight, type TrendDirection } from '../domain/practice-diagnostics.js';
import { observeCharts } from '../ui/charts.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, empty, field, link, pageHeader, progressBar, sectionHeader, stat } from '../ui/components.js';
import { buildTempoProgressionSeries, calculateAverageSessionLength, calculateBestCleanBpm, calculateHighestAttemptedBpm, calculatePracticeDistribution, calculateTotalPracticeTime, calculateWeeklySessionCount, exerciseAttempts, filterSessions, finishedSessions, goalProgress, practiceByDay, sessionTime } from '../domain/analytics.js';
import { duration, formatDate, localDate, titleCase } from '../domain/utils.js';
import { dayChart, lineChart } from '../ui/charts.js';

const trendLabel=(value:TrendDirection)=>value==='up'?'Higher':value==='down'?'Lower':value==='steady'?'Similar':'No comparison';
const trendClass=(value:TrendDirection)=>value==='up'?'trend-up':value==='down'?'trend-down':value==='steady'?'trend-steady':'trend-unavailable';

function comparisonCard(label:string,current:string,previous:string|undefined,trend:TrendDirection):HTMLElement{
  return el('div',{class:'diagnostic-comparison-card'},
    el('span',{class:'label'},label),
    el('strong',{},current),
    previous?el('span',{class:'muted small'},'Previous · '+previous):el('span',{class:'muted small'},'No equal-window comparison'),
    el('span',{class:`trend-label ${trendClass(trend)}`},trendLabel(trend)));
}
function insightCard(insight:DiagnosticInsight):HTMLElement{
  return el('article',{class:`diagnostic-insight diagnostic-${insight.tone}`},
    el('div',{class:'split'},el('strong',{},insight.title),badge(insight.tone==='positive'?'Positive signal':insight.tone==='attention'?'Needs attention':'Context',insight.tone==='positive'?'accent':'neutral')),
    el('p',{},insight.detail),el('p',{class:'muted small'},insight.evidence));
}

export function progressPage():Page{
  let chartCleanup=()=>{},drawVersion=0,disposed=false;
  const data=store.view(),profile=activeProfile(store.snapshot()),page=el('div',{class:'page'},pageHeader('','Progress',`${profile.name} · Practice time, evidence trends and explainable diagnostics.`,[link('Weekly Review','/review','button secondary','progress'),link('Timing Lab','/timing-lab','button secondary','pulse'),link('MIDI Lab','/midi-lab','button secondary','pulse')]));
  page.append(learningSummary());
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
    const diagnostics=buildPracticeDiagnostics(data,{from:start,to:end});
    content.append(el('div',{class:'stats-strip'},stat('Active practice',duration(total)),stat('Recorded sessions',sessions.length),stat('Average session',duration(calculateAverageSessionLength(sessions))),stat('Active days',days.length)));
    if(!sessions.length){content.append(empty('No sessions in this range.','Choose a wider date range or start a session today.',link('Practice','/practice','button secondary','play')));return;}

    const comparison=el('section',{class:'panel diagnostic-panel'},sectionHeader('Trend comparison',diagnostics.comparison.previous?'Against the immediately preceding equal-length window':'Select a bounded range to compare with the previous period'));
    comparison.append(el('div',{class:'diagnostic-comparison-grid'},
      comparisonCard('Active practice',duration(diagnostics.comparison.current.activeSeconds),diagnostics.comparison.previous?duration(diagnostics.comparison.previous.activeSeconds):undefined,diagnostics.comparison.activeTimeTrend),
      comparisonCard('Active days',String(diagnostics.comparison.current.activeDays),diagnostics.comparison.previous?String(diagnostics.comparison.previous.activeDays):undefined,diagnostics.comparison.activeDayTrend),
      comparisonCard('Solid result share',diagnostics.comparison.current.evaluations.total?`${diagnostics.comparison.current.evaluations.solid} / ${diagnostics.comparison.current.evaluations.total} evaluated`:'No evaluated blocks',diagnostics.comparison.previous?(diagnostics.comparison.previous.evaluations.total?`${diagnostics.comparison.previous.evaluations.solid} / ${diagnostics.comparison.previous.evaluations.total} evaluated`:'No evaluated blocks'):undefined,diagnostics.comparison.solidShareTrend),
      comparisonCard('Not Yet share',`${diagnostics.comparison.current.evaluations.notYet} / ${diagnostics.comparison.current.evaluations.total||'—'} evaluated`,diagnostics.comparison.previous?`${diagnostics.comparison.previous.evaluations.notYet} / ${diagnostics.comparison.previous.evaluations.total||'—'} evaluated`:undefined,diagnostics.comparison.notYetShareTrend)));
    comparison.append(el('p',{class:'field-hint'},'Higher/lower labels describe change only. They are not a quality score; interpretation depends on what you practiced and how difficult it was.'));

    const insights=el('section',{class:'panel diagnostic-panel'},sectionHeader('Diagnostics','Deterministic signals from recorded evidence; no hidden score.'));
    if(diagnostics.insights.length)insights.append(el('div',{class:'diagnostic-insight-list'},diagnostics.insights.map(insightCard)));
    else insights.append(el('p',{class:'muted'},'No diagnostic pattern crosses the current evidence thresholds in this range.'));
    content.append(el('div',{class:'two-column wide-left diagnostics-top'},comparison,insights));

    const time=el('section',{class:'panel'},sectionHeader('Practice time'),dayChart(days));
    const mix=el('section',{class:'panel'},sectionHeader('Practice distribution'));
    for(const item of distribution)mix.append(el('div',{class:'distribution-row'},el('div',{class:'split'},el('strong',{},titleCase(item.category)),el('span',{class:'muted small'},`${duration(item.seconds)} · ${item.percent.toFixed(1)}%`)),progressBar(item.percent/100,`${item.category} practice`)));
    if(!distribution.length)mix.append(el('p',{class:'muted'},'These sessions have no recorded active time.'));
    content.append(el('div',{class:'two-column wide-left'},time,mix));

    const mastery=el('section',{class:'panel diagnostic-panel'},sectionHeader('Current mastery state','Current state snapshot; independent of the selected chart range.'));
    const masteryTotal=diagnostics.mastery.reduce((sum,row)=>sum+row.count,0);
    if(!masteryTotal)mastery.append(el('p',{class:'muted'},'No current practice-state evidence is available.'));
    else for(const row of diagnostics.mastery)mastery.append(el('div',{class:'mastery-row'},el('div',{class:'split'},el('strong',{},titleCase(row.mastery)),el('span',{class:'muted small'},`${row.count} target${row.count===1?'':'s'}`)),progressBar(row.count/masteryTotal,`${row.mastery} mastery state`)));

    const retention=el('section',{class:'panel diagnostic-panel'},sectionHeader('Retention & tempo reliability',`${diagnostics.dueReviews.length} due review${diagnostics.dueReviews.length===1?'':'s'} · ${diagnostics.tempoGaps.length} tempo gap${diagnostics.tempoGaps.length===1?'':'s'}`));
    if(!diagnostics.dueReviews.length&&!diagnostics.tempoGaps.length)retention.append(el('p',{class:'muted'},'No due reviews or meaningful Peak/Working/Cold tempo gaps are currently detected.'));
    else{
      if(diagnostics.dueReviews.length)retention.append(el('h3',{class:'diagnostic-subheading'},'Reviews due'),...diagnostics.dueReviews.slice(0,6).map(row=>el('div',{class:'diagnostic-row'},el('strong',{},row.label),el('span',{class:'muted small'},`${titleCase(row.mastery)} · due ${formatDate(row.nextReviewAt)}${row.latestResult?` · last ${titleCase(row.latestResult)}`:''}`))));
      if(diagnostics.tempoGaps.length)retention.append(el('h3',{class:'diagnostic-subheading'},'Tempo reliability gaps'),...diagnostics.tempoGaps.slice(0,6).map(row=>el('div',{class:'diagnostic-row'},el('strong',{},row.label),el('span',{class:'muted small'},`Peak ${row.peak} BPM${row.working!==undefined?` · Working ${row.working}`:''}${row.cold!==undefined?` · Cold ${row.cold}`:''}`))));
    }
    content.append(el('div',{class:'two-column diagnostics-state'},mastery,retention));

    const limitations=el('section',{class:'panel diagnostic-panel'},sectionHeader('Recurring limitations','Selected date range'));
    if(!diagnostics.limitations.length)limitations.append(el('p',{class:'muted'},'No limitation tags were recorded in this range.'));
    else for(const row of diagnostics.limitations.slice(0,8))limitations.append(el('div',{class:'diagnostic-row'},el('strong',{},titleCase(row.tag)),el('span',{class:'muted small'},`${row.count} current${diagnostics.comparison.previous?` · ${row.previousCount} previous`:''} · ${row.evaluatedBlocks} evaluated blocks`)));

    const progression=el('section',{class:'panel diagnostic-panel'},sectionHeader('Progression outcomes','Generated Phase 8 challenge blocks in this range'));
    if(!diagnostics.progression.length)progression.append(el('p',{class:'muted'},'No progression-engine blocks were evaluated in this range.'));
    else for(const row of diagnostics.progression.slice(0,8))progression.append(el('div',{class:'diagnostic-row'},el('strong',{},titleCase(row.dimension)),el('span',{class:'muted small'},`${row.blocks} blocks · ${row.solid} Solid · ${row.usable} Usable · ${row.notYet} Not Yet`)));
    content.append(el('div',{class:'two-column diagnostics-state'},limitations,progression));

    if(diagnostics.comparison.current.generated.blocks){
      const generated=diagnostics.comparison.current.generated;
      content.append(el('section',{class:'panel diagnostic-panel generated-follow-through'},sectionHeader('Generated practice follow-through','Autopilot + Set Prep in the selected range'),el('div',{class:'stats-strip inset-stats'},stat('Generated blocks',generated.blocks),stat('Completed',generated.completed),stat('Skipped',generated.skipped)),el('p',{class:'field-hint'},`${generated.endedEarly} generated block${generated.endedEarly===1?'':'s'} ended with the session without being completed or explicitly skipped. Scheduling behavior is shown separately from mastery.`)));
    }

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
    content.append(el('div',{class:'two-column'},consistency,goals));

    const evidenceTable=el('details',{class:'data-details diagnostic-evidence'},el('summary',{},`Inspect current evidence state · ${diagnostics.states.length} targets`));
    if(diagnostics.states.length)evidenceTable.append(el('div',{class:'table-scroll'},el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},'Target'),el('th',{scope:'col'},'Mastery'),el('th',{scope:'col'},'Latest'),el('th',{scope:'col'},'Evidence'),el('th',{scope:'col'},'Last practiced'),el('th',{scope:'col'},'Review'),el('th',{scope:'col'},'Tempo'))),el('tbody',{},diagnostics.states.slice(0,100).map(row=>el('tr',{},el('td',{},row.label),el('td',{},titleCase(row.mastery)),el('td',{},row.latestResult?titleCase(row.latestResult):'—'),el('td',{},String(row.evidenceCount)),el('td',{},row.lastPracticedAt?formatDate(row.lastPracticedAt):'—'),el('td',{},row.reviewDue?'Due':row.nextReviewAt?formatDate(row.nextReviewAt):'—'),el('td',{},row.peak===undefined?'—':[`Peak ${row.peak}`,row.working!==undefined?`Working ${row.working}`:'',row.cold!==undefined?`Cold ${row.cold}`:''].filter(Boolean).join(' · '))))))));
    content.append(evidenceTable,el('details',{class:'data-details'},el('summary',{},'View session totals'),el('table',{},el('thead',{},el('tr',{},el('th',{scope:'col'},'Session date'),el('th',{scope:'col'},'Active time'),el('th',{scope:'col'},'Status'))),el('tbody',{},sessions.map(s=>el('tr',{},el('td',{},link(localDate(s.startedAt),`/history/${s.id}`)),el('td',{},duration(sessionTime(s))),el('td',{},s.status)))))));
  };
  range.addEventListener('change',draw);from.addEventListener('change',draw);to.addEventListener('change',draw);exercise.addEventListener('change',draw);draw();
  page.append(el('div',{class:'range-toolbar'},field('Date range',range),custom),content);return {node:page,cleanup:()=>{disposed=true;chartCleanup();}};
}
