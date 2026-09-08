import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { button, empty, link, pageHeader, progressBar, sectionHeader, stat } from '../ui/components.js';
import { duration, formatDate, isoWeekStart, localDate, metadata } from '../domain/utils.js';
import { calculateTotalPracticeTime, calculateWeeklySessionCount, filterSessions, finishedSessions, goalProgress, routineDuration, sessionTime } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { editBlock, editGoal, selectRoutineDialog } from '../ui/editors.js';
import { launchPractice, routineToday } from '../practice/launch.js';
import type { RoutineBlock } from '../domain/models.js';

export function todayPage(): Page {
  const data = store.snapshot();
  const plan = data.dailyPlans.find(p => p.date === localDate());
  const active = data.sessions.find(s => s.status === 'active');
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const weekStart = isoWeekStart(), weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const week = filterSessions(data.sessions, localDate(weekStart), localDate(weekEnd));
  const start = button('Start full session', () => launchPractice(plan?.blocks || [], { planId: plan?.id }), 'primary', 'play');
  start.disabled = !plan?.blocks.length;
  const savePlan = async (blocks: RoutineBlock[]) => store.save('dailyPlans', { ...(plan || metadata()), date: localDate(), blocks });
  const page = el('div', { class: 'page today-page' }, pageHeader('', 'Today', date, [
    link('Free practice', '/practice', 'button secondary'), ...(plan?.blocks.length ? [start] : []),
  ]));
  if (active) page.append(el('div', { class: 'recovery-banner' }, el('div', {},
    el('strong', {}, 'Unfinished session'), el('span', {}, active.blocks[active.activeBlockIndex]?.titleSnapshot || 'Saved practice')),
    link('Resume session', '/practice/active', 'button primary', 'play')));
  page.append(el('div', { class: 'stats-strip today-stats' },
    stat('Planned today', duration(routineDuration(plan?.blocks || []))),
    stat('Practice this week', duration(calculateTotalPracticeTime(week))),
    stat('Sessions this week', calculateWeeklySessionCount(data.sessions))));

  const planPanel = el('section', { class: 'panel plan-panel' }, sectionHeader('Today’s plan',
    `${plan?.blocks.length || 0} blocks`, [button('Use routine', () => selectRoutineDialog(routineToday), 'ghost', 'routine')]));
  if (plan?.blocks.length) planPanel.append(blockList(plan.blocks, savePlan, block => launchPractice([block], { planId: plan.id })));
  else planPanel.append(empty('No plan yet', 'Choose a routine or add your first practice block.', el('div', { class: 'actions' },
    button('Choose a routine', () => selectRoutineDialog(routineToday), 'primary', 'routine'),
    button('Add a block', () => editBlock(undefined, async block => savePlan([block])), 'secondary', 'plus'))));

  const weekday = new Date().getDay();
  const routines = data.routines.filter(r => !r.archived)
    .sort((a, b) => Number(b.scheduledDays.includes(weekday)) - Number(a.scheduledDays.includes(weekday))).slice(0, 4);
  const side = el('aside', { class: 'today-side' }, el('section', { class: 'panel quiet-panel routine-suggestions' },
    sectionHeader('Routines', undefined, [link('View all', '/routines', 'text-link')]),
    routines.length ? el('div', { class: 'suggestion-list' }, routines.map(r => el('div', { class: 'suggestion-row' },
      el('div', {}, link(r.name, `/routines/${r.id}`, 'suggestion-name'),
        el('p', { class: 'muted small' }, `${r.scheduledDays.includes(weekday) ? 'Scheduled today · ' : ''}${duration(routineDuration(r.blocks))} · ${r.blocks.length} blocks`)),
      button('Use', () => routineToday(r), 'secondary compact')))) : el('p', { class: 'muted small' }, 'Create a routine to reuse a plan.'),
    el('p', { class: 'field-hint' }, 'Use a routine, then adjust the blocks for today.')));
  page.append(el('div', { class: 'today-grid' }, planPanel, side));

  const relevant = data.goals.filter(g => !goalProgress(g, data).done).slice(0, 3);
  const goals = el('section', { class: 'panel overview-panel' }, sectionHeader('Goals', undefined, [link('All goals', '/goals', 'text-link')]));
  if (!relevant.length) goals.append(empty('No active goals', 'Set a tempo target, prepare a song, or choose a weekly practice goal.', button('Create a goal', () => editGoal(), 'ghost', 'plus')));
  else goals.append(...relevant.map(g => {
    const p = goalProgress(g, data);
    return el('div', { class: 'goal-summary' }, el('strong', {}, g.title),
      el('div', { class: 'split muted small' }, el('span', {}, p.label), g.deadline ? el('span', {}, formatDate(g.deadline)) : null), progressBar(p.fraction, g.title));
  }));
  const recent = finishedSessions(data.sessions).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3);
  const history = el('section', { class: 'panel overview-panel' }, sectionHeader('Recent sessions', undefined, [link('View history', '/history', 'text-link')]));
  if (!recent.length) history.append(empty('No sessions recorded', 'Completed sessions and notes will appear here.'));
  else history.append(...recent.map(s => link(`${formatDate(s.startedAt)} · ${duration(sessionTime(s))} · ${s.blocks[0]?.titleSnapshot || 'Practice'}`, `/history/${s.id}`, 'recent-row')));
  page.append(el('div', { class: 'two-column today-overview' }, goals, history));
  return { node: page };
}
