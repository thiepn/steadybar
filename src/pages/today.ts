import { learningSummary } from '../ui/learning.js';
import { activeProfile, profileName } from '../domain/profiles.js';
import { prepareStarterPlan } from '../app/profiles.js';
import { confirmAction, notify, select } from '../ui/components.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, link, pageHeader, progressBar, sectionHeader } from '../ui/components.js';
import { duration, formatDate, isoWeekStart, localDate, metadata } from '../domain/utils.js';
import { calculateTotalPracticeTime, calculateWeeklySessionCount, filterSessions, finishedSessions, goalProgress, routineDuration, sessionTime } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { editBlock, editGoal, selectRoutineDialog } from '../ui/editors.js';
import { addToday, launchPractice, routineToday } from '../practice/launch.js';
import { buildPracticeIntelligence } from '../domain/practice-intelligence.js';
import { recommendationBlock, recommendationHref } from '../app/practice-intelligence.js';
import { prepareAutopilotPlan } from '../app/autopilot.js';
import type { AutopilotSessionIntent } from '../domain/autopilot.js';
import type { RoutineBlock } from '../domain/models.js';
import { appliedScheduleDay } from '../domain/weekly-schedule.js';

export function todayPage(): Page {
  const snapshot=store.snapshot(),data=store.view(),profile=activeProfile(snapshot);
  const today=localDate(),plan = data.dailyPlans.find(p => p.date === today),scheduled=appliedScheduleDay(snapshot,profile.id,today);
  const active = snapshot.sessions.find(s => s.status === 'active');
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const weekStart = isoWeekStart(), weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const week = filterSessions(data.sessions, localDate(weekStart), localDate(weekEnd));
  const savePlan = async (blocks: RoutineBlock[]) => {
    const keepSetPrep=plan?.generation?.kind!=='set-prep'||(blocks.length>0&&blocks.every(block=>block.setPrep&&block.setPrep.setlistId===plan.generation?.setlistId&&block.setPrep.stage===plan.generation?.setPrepStage&&block.setPrep.mode===plan.generation?.setPrepMode));
    await store.save('dailyPlans',{...(plan||metadata()),profileId:profile.id,date:localDate(),blocks,...(!keepSetPrep?{generation:undefined}:{})});
  };
  const page = el('div', { class: 'page today-page' }, pageHeader('', 'Today', `${date} · ${profile.name}`,[link('Calendar','/calendar','button secondary','today')]));
  page.append(learningSummary());
  const intelligence=buildPracticeIntelligence(snapshot,{profileId:profile.id,recommendationLimit:5});
  const immediate=intelligence.recommendations.filter(row=>row.band==='now'||row.confidence!=='low').slice(0,3);
  if(immediate.length){
    const panel=el('section',{class:'panel today-intelligence'},sectionHeader('What matters now','Unified Practice Intelligence · evidence-driven next actions',[link('Why these?','/progress','text-link','arrow')]));
    for(const row of immediate){
      const targetBlock=recommendationBlock(snapshot,row),href=recommendationHref(row);
      const actions=el('div',{class:'actions wrap'});
      if(targetBlock)actions.append(button('Start',()=>launchPractice([targetBlock]),'secondary','play'),button('Add to Today',()=>addToday(targetBlock),'ghost','plus'));
      else if(href)actions.append(link(row.source==='lesson'?'Open lesson':'Open target',href,'button secondary','arrow'));
      panel.append(el('article',{class:'today-intelligence-row'},
        el('div',{},el('div',{class:'tag-row'},badge(row.band==='now'?'Now':'Soon',row.band==='now'?'accent':'neutral'),badge(({progress:'Progress',hold:'Hold',consolidate:'Consolidate',regress:'Regress'} as Record<string,string>)[row.decision]??row.decision)),el('strong',{},row.label),
          row.reasons[0]?el('p',{class:'muted small'},row.reasons[0]):null),
        actions));
    }
    panel.append(el('p',{class:'field-hint'},'Recommendations are deterministic suggestions from recorded evidence, explicit goals/priorities, review timing and repertoire context. They never auto-start practice or change your goals.'));
    page.append(panel);
  }
  if(scheduled){
    const {schedule,day}=scheduled,calendar='/calendar/'+schedule.weekStart;
    page.append(el('section',{class:`panel today-schedule today-schedule-${day.kind}`},sectionHeader('Calendar',day.kind==='rest'?'Rest day':day.kind==='optional'?'Optional practice':`Planned practice · ${day.plannedMinutes} min`,[link('Open week',calendar,'text-link','arrow')]),
      day.kind==='rest'?el('p',{class:'muted'},'No practice time is planned today. The practice controls below remain available if you choose to practice anyway.'):el('p',{},`${day.plannedMinutes} min · ${day.intent.replace(/^./,c=>c.toUpperCase())} emphasis. Today’s builder is prefilled from this applied schedule, but you can change it before building.`),
      day.note?el('p',{class:'muted small pre-line'},day.note):null));
  }
  if(profile.instrumentType==='voice'){
    const scheduledMinutes=scheduled&&scheduled.day.kind!=='rest'?scheduled.day.plannedMinutes:undefined;
    const voiceAllowed=[...new Set([15,30,45,60,...(scheduledMinutes?[scheduledMinutes]:[])])].sort((a,b)=>a-b),defaultMinutes=scheduledMinutes??voiceAllowed.reduce((best,value)=>Math.abs(value-profile.defaultSessionMinutes)<Math.abs(best-profile.defaultSessionMinutes)?value:best,15);
    const budget=select('timeBudget','Session time',voiceAllowed.map(value=>[String(value),value+' min'] as [string,string]),String(defaultMinutes));
    const prepare=button('Build voice plan',async()=>{
      if(plan?.blocks.length&&!await confirmAction('Replace today’s plan?','Use a voice routine that preserves planned rest and listening. Practice history is unchanged.','Build voice plan'))return;
      await prepareStarterPlan(Number(budget.querySelector('select')!.value));notify('Voice plan ready.');
    },'secondary');
    page.append(el('div',{class:'plan-builder'},budget,prepare,el('p',{class:'field-hint'},'Autopilot is not used for voice yet. This keeps the existing rest-aware voice routine with listening and recovery time.')));
  }else{
    const scheduledMinutes=scheduled&&scheduled.day.kind!=='rest'?scheduled.day.plannedMinutes:undefined;
    const allowed=[...new Set([5,10,15,20,30,45,60,...(scheduledMinutes?[scheduledMinutes]:[])])].sort((a,b)=>a-b),defaultMinutes=scheduledMinutes??allowed.reduce((best,value)=>Math.abs(value-profile.defaultSessionMinutes)<Math.abs(best-profile.defaultSessionMinutes)?value:best,15);
    const budget=select('timeBudget','Session time',allowed.map(value=>[String(value),value+' min'] as [string,string]),String(defaultMinutes));
    const intent=select('autopilotIntent','Practice emphasis',[['balanced','Balanced'],['songs','Songs'],['timing','Timing'],['technique','Technique']],scheduled&&scheduled.day.kind!=='rest'?scheduled.day.intent:'balanced');
    const generate=async(startNow:boolean)=>{
      if(startNow&&await store.activeSession()){await launchPractice([]);return;}
      if(plan?.blocks.length&&!await confirmAction('Replace today’s plan?','Autopilot will rebuild today from your current priorities, review schedule and repertoire. Practice history is unchanged.',startNow?'Replace & start':'Build plan'))return;
      const minutes=Number(budget.querySelector('select')!.value),sessionIntent=intent.querySelector('select')!.value as AutopilotSessionIntent;
      const generated=await prepareAutopilotPlan(minutes,sessionIntent);
      if(startNow)await launchPractice(generated.blocks,{planId:generated.id});
      else notify('Autopilot plan ready.');
    };
    const startAutopilot=button('Start Autopilot',()=>generate(true),'primary','play');
    const prepare=button('Build plan',()=>generate(false),'secondary');
    page.append(el('div',{class:'plan-builder'},budget,intent,startAutopilot,prepare,el('p',{class:'field-hint'},'Autopilot uses goals, current priorities, due reviews, recent practice and repertoire urgency. You can still edit every generated block.')));
  }
  if (active) page.append(el('div', { class: 'recovery-banner' }, el('div', {},
    el('strong', {}, `Unfinished ${profileName(snapshot,active.profileId)} session`), el('span', {}, active.blocks[active.activeBlockIndex]?.titleSnapshot || 'Saved practice')),
    link('Resume session', '/practice/active', 'button primary', 'play')));

  const start = button('Start full session', () => launchPractice(plan?.blocks || [], { planId: plan?.id }), 'primary', 'play');
  const total = routineDuration(plan?.blocks || []);
  const planPanel = el('section', { class: 'panel plan-panel', 'aria-label': 'Today’s practice plan' },
    sectionHeader('Today’s plan', plan?.blocks.length ? `${duration(total)} · ${plan.blocks.length} blocks${plan.generation?.kind==='autopilot'?' · Autopilot':plan.generation?.kind==='set-prep'?` · Set prep · ${plan.generation.setPrepStage?.replaceAll('-',' ')??'prep'}`:''}` : 'Not planned',
      plan?.blocks.length ? [start] : []));
  if (plan?.blocks.length) {
    planPanel.append(blockList(plan.blocks, savePlan, block => launchPractice([block], { planId: plan.id })),
      el('div', { class: 'plan-footer' }, button('Use routine', () => selectRoutineDialog(routineToday), 'ghost', 'routine'),
        link('Free practice', '/practice', 'text-link')));
  } else {
    planPanel.append(empty('What are you practicing?', 'Use a saved routine or build a sequence.',
      el('div', { class: 'actions' }, button('Choose a routine', () => selectRoutineDialog(routineToday), 'primary'),
        button('Add a block', () => editBlock(undefined, async block => savePlan([block])), 'secondary', 'plus'))),
      el('div', { class: 'plan-footer' }, link('Start free practice instead', '/practice', 'text-link', 'play')));
  }

  const weekday = new Date().getDay();
  const routines = data.routines.filter(r => !r.archived)
    .sort((a, b) => Number(b.scheduledDays.includes(weekday)) - Number(a.scheduledDays.includes(weekday))).slice(0, 4);
  const side = el('aside', { class: 'today-side' },
    el('section', { class: 'routine-suggestions' }, sectionHeader('Saved routines', undefined, [link('All routines', '/routines', 'text-link')]),
      routines.length ? el('div', { class: 'suggestion-list' }, routines.map(r => el('div', { class: 'suggestion-row' },
        el('div', {}, link(r.name, `/routines/${r.id}`, 'suggestion-name'),
          el('p', { class: 'muted small' }, `${duration(routineDuration(r.blocks))} · ${r.blocks.length} blocks${r.scheduledDays.includes(weekday) ? ' · Today' : ''}`)),
        button('Use', () => routineToday(r), 'secondary compact')))) : link('Create a routine', '/routines', 'text-link')),
    el('section', { class: 'week-summary' }, sectionHeader('This week'),
      el('p', {}, el('strong', { class: 'week-time' }, duration(calculateTotalPracticeTime(week))), el('span', { class: 'muted small' }, ' active practice')),
      el('p', { class: 'muted small' }, `${calculateWeeklySessionCount(data.sessions)} completed sessions`),
      link('View progress', '/progress', 'text-link')));
  page.append(el('div', { class: 'today-grid' }, planPanel, side));

  const relevant = data.goals.filter(g => !goalProgress(g, store.snapshot()).done).slice(0, 3);
  const goals = el('section', { class: 'overview-panel' }, sectionHeader('Current goals', undefined,
    [relevant.length ? link('All goals', '/goals', 'text-link') : button('Create a goal', () => editGoal(), 'ghost compact', 'plus')]));
  if (!relevant.length) goals.append(el('p', { class: 'muted small' }, 'No active targets.'));
  else goals.append(...relevant.map(g => {
    const progress = goalProgress(g, store.snapshot());
    return el('div', { class: 'goal-summary' }, el('strong', {}, g.title),
      el('div', { class: 'split muted small' }, el('span', {}, progress.label), g.deadline ? el('span', {}, formatDate(g.deadline)) : null),
      progressBar(progress.fraction, g.title));
  }));
  const recent = finishedSessions(data.sessions).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
  const history = el('section', { class: 'overview-panel' }, sectionHeader('Recent sessions', undefined, [link('History', '/history', 'text-link')]));
  if (!recent.length) history.append(el('p', { class: 'muted small' }, 'Your completed sessions will appear here.'));
  else history.append(...recent.map(s => link(`${formatDate(s.startedAt)} · ${duration(sessionTime(s))} · ${s.blocks[0]?.titleSnapshot || 'Practice'}`, `/history/${s.id}`, 'recent-row')));
  page.append(el('div', { class: 'two-column today-overview' }, goals, history));
  return { node: page };
}
