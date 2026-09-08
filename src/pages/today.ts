import { activeProfile, profileName } from '../domain/profiles.js';
import { prepareStarterPlan } from '../app/profiles.js';
import { confirmAction, select } from '../ui/components.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { button, empty, link, pageHeader, progressBar, sectionHeader } from '../ui/components.js';
import { duration, formatDate, isoWeekStart, localDate, metadata } from '../domain/utils.js';
import { calculateTotalPracticeTime, calculateWeeklySessionCount, filterSessions, finishedSessions, goalProgress, routineDuration, sessionTime } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { editBlock, editGoal, selectRoutineDialog } from '../ui/editors.js';
import { launchPractice, routineToday } from '../practice/launch.js';
import type { RoutineBlock } from '../domain/models.js';

export function todayPage(): Page {
  const snapshot=store.snapshot(),data=store.view(),profile=activeProfile(snapshot);
  const plan = data.dailyPlans.find(p => p.date === localDate());
  const active = snapshot.sessions.find(s => s.status === 'active');
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const weekStart = isoWeekStart(), weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const week = filterSessions(data.sessions, localDate(weekStart), localDate(weekEnd));
  const savePlan = async (blocks: RoutineBlock[]) => store.save('dailyPlans', { ...(plan || metadata()), profileId:profile.id,date: localDate(), blocks });
  const page = el('div', { class: 'page today-page' }, pageHeader('', 'Today', `${date} · ${profile.name}`));
  const budget=select('timeBudget','Session time',[['15','15 min'],['20','20 min'],['30','30 min'],['45','45 min'],['60','60 min']],String(profile.defaultSessionMinutes));
  const prepare=button('Build a plan',async()=>{if(plan?.blocks.length&&!await confirmAction('Replace today’s plan?','Use a profile-specific starter sequence for this time budget. Existing history is unchanged.','Build plan'))return;await prepareStarterPlan(Number(budget.querySelector('select')!.value));},'secondary');
  page.append(el('div',{class:'plan-builder'},budget,prepare,el('p',{class:'field-hint'},profile.instrumentType==='voice'?'Voice routines include rest and listening.':'Uses this profile’s saved starter routine; you can edit every block.')));
  if (active) page.append(el('div', { class: 'recovery-banner' }, el('div', {},
    el('strong', {}, `Unfinished ${profileName(snapshot,active.profileId)} session`), el('span', {}, active.blocks[active.activeBlockIndex]?.titleSnapshot || 'Saved practice')),
    link('Resume session', '/practice/active', 'button primary', 'play')));

  const start = button('Start full session', () => launchPractice(plan?.blocks || [], { planId: plan?.id }), 'primary', 'play');
  const total = routineDuration(plan?.blocks || []);
  const planPanel = el('section', { class: 'panel plan-panel', 'aria-label': 'Today’s practice plan' },
    sectionHeader('Today’s plan', plan?.blocks.length ? `${duration(total)} · ${plan.blocks.length} blocks` : 'Not planned',
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
