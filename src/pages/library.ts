import { activeProfile, definition, protocolDefinition, skillLabel } from '../domain/profiles.js';
import { exerciseBpm, exerciseProtocol, protocolSummary } from '../domain/protocols.js';
import { protocolResults, summarizeResults, outcomeSummary } from '../domain/protocol-analytics.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, iconButton, link, notify, pageHeader, sectionHeader, stat } from '../ui/components.js';
import { editExercise, trainerDialog } from '../ui/editors.js';
import { buildCleanTempoIndex, calculateBestCleanBpm, calculateHighestAttemptedBpm, exerciseAttempts, buildTempoProgressionSeries, finishedSessions, latestSuccessfulBpm } from '../domain/analytics.js';
import { duration, formatDate } from '../domain/utils.js';
import { addToday, exerciseBlock, launchPractice } from '../practice/launch.js';
import { lineChart } from '../ui/charts.js';
// Keep collection context when opening an item and returning, or saving elsewhere.
const libraryViews=new Map<string,{query:string;category:string;source:string;sort:string;mode:string;visible:number;scope:string}>();
export function libraryPage(): Page {
  const data=store.snapshot(),profile=activeProfile(data);
  let libraryView=libraryViews.get(profile.id);if(!libraryView){libraryView={query:'',category:'',source:'all',sort:'name',mode:'list',visible:60,scope:'current'};libraryViews.set(profile.id,libraryView);}const view=libraryView;
  const clean = buildCleanTempoIndex(data.sessions);
  const indexed = data.exercises.map(exercise => ({ exercise, text: `${exercise.name} ${exercise.tags.join(' ')} ${exercise.description}`.toLocaleLowerCase() }));
  const search = el('input', { type: 'search', value: view.query, placeholder: 'Search exercises…', 'aria-label': 'Search exercises' });
  const category = el('select', { 'aria-label': 'Filter category' }, el('option', { value: '' }, 'All categories'), [...new Set([...definition(profile.instrumentType).skills,...data.exercises.filter(e=>e.profileId===profile.id).map(e=>e.skillArea??e.category)])].map(c => el('option', { value: c }, skillLabel(c))));
  const scope=el('select',{'aria-label':'Library profiles'},el('option',{value:'current'},'Current profile'),el('option',{value:'all'},'All profiles'));scope.value=view.scope;
  const source = el('select', { 'aria-label': 'Filter source' }, [['all', 'All exercises'], ['builtin', 'Built-in'], ['custom', 'My exercises'], ['archived', 'Archived']].map(([v, l]) => el('option', { value: v }, l)));
  const sort = el('select', { 'aria-label': 'Sort exercises' }, [['name', 'Name A–Z'], ['category', 'Category'], ['clean', 'Best clean BPM']].map(([v, l]) => el('option', { value: v }, l)));
  category.value = view.category; source.value = view.source; sort.value = view.sort;
  const results = el('div'), count = el('span', { class: 'muted small', role: 'status' });
  const more = button('Show more exercises', () => { view.visible += 60; render(); }, 'secondary');
  const render = () => {
    Object.assign(view, { query: search.value, category: category.value, source: source.value, sort: sort.value,scope:scope.value });
    const q = search.value.toLocaleLowerCase().trim();
    const exercises = indexed.filter(({ exercise: e, text }) =>
      (scope.value==='all'||e.profileId===profile.id) && (source.value === 'archived' ? e.archived : !e.archived) && (!category.value || (e.skillArea??e.category) === category.value) &&
      (source.value !== 'builtin' || e.builtin) && (source.value !== 'custom' || !e.builtin) && text.includes(q)).map(item => item.exercise);
    exercises.sort((a, b) => sort.value === 'clean' ? (clean.get(b.id) || 0) - (clean.get(a.id) || 0) || a.name.localeCompare(b.name)
      : sort.value === 'category' ? (a.skillArea??a.category).localeCompare(b.skillArea??b.category) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    count.textContent = `${exercises.length} exercises${exercises.length > view.visible ? ` · showing ${view.visible}` : ''}`;
    results.className = view.mode === 'grid' ? 'exercise-grid' : 'exercise-list';
    more.hidden = exercises.length <= view.visible;
    const rows: HTMLElement[] = [];
    if (!exercises.length) rows.push(empty('No matching exercises', 'Change a filter or add an exercise.', button('New exercise', () => editExercise(), 'secondary', 'plus')));
    for (const e of exercises.slice(0, view.visible)) {
      const best = clean.get(e.id),protocol=exerciseProtocol(e),tempo=exerciseBpm(e);
      rows.push(el('article', { class: 'exercise-card' },
        el('div', { class: 'exercise-card-top' }, badge(skillLabel(e.skillArea??e.category)), el('span', { class: 'muted tiny' }, e.archived ? 'Archived' : e.builtin ? 'Built-in' : 'Custom')),
        el('h2', {}, link(e.name, `/library/${e.id}`)),
        protocol.kind==='tempo'&&protocol.sticking ? el('p', { class: 'sticking small-sticking' }, protocol.sticking) : el('p', { class: 'muted exercise-description' }, protocolSummary(protocol)),
        el('div', { class: 'exercise-card-bottom' }, el('div', {}, el('span', { class: 'muted tiny' }, tempo!==undefined?(best ? 'Best clean' : 'Starting tempo'):protocolDefinition(protocol.kind).label),
          el('strong', {}, tempo!==undefined?`${best??tempo} BPM`:scope.value==='all'?(data.profiles?.find(p=>p.id===e.profileId)?.name??'Earlier practice'):'Self-paced')), iconButton(`Practice ${e.name}`, 'play', () => launchPractice([exerciseBlock(e)])))));
    }
    results.replaceChildren(...rows);
  };
  for (const control of [search, category, source, sort,scope]) control.addEventListener(control === search ? 'input' : 'change', () => { view.visible = 60; render(); });
  const viewButtons = ['List', 'Grid'].map(label => {
    const b = button(label, () => {
      view.mode = label.toLowerCase();
      viewButtons.forEach(x => { x.setAttribute('aria-pressed', String(x.dataset.view === view.mode)); });
      render();
    }, 'segmented-button');
    b.dataset.view = label.toLowerCase(); b.setAttribute('aria-pressed', String(view.mode === b.dataset.view)); return b;
  });
  render();
  return { node: el('div', { class: 'page library-page' }, pageHeader('', 'Exercise library', `${profile.name} · ${definition(profile.instrumentType).summary}`, [button('New exercise', () => editExercise(), 'primary', 'plus')]),
    el('div', { class: 'library-toolbar' }, el('div', { class: 'search-field' }, search), scope,category, source, sort),
    el('div', { class: 'split result-meta' }, count, el('div', { class: 'segmented', role: 'group', 'aria-label': 'Exercise view' }, viewButtons)), results,
    el('div', { class: 'page-footer' }, more)) };
}
export function exercisePage(id:string):Page{
  const data=store.snapshot(),exercise=data.exercises.find(e=>e.id===id);
  if(!exercise)return {node:empty('Exercise not found.','It may have been removed by a restore. Your historical session snapshots are independent.',link('Back to library','/library','button primary'))};
  const protocol=exerciseProtocol(exercise),hasTempo=protocol.kind==='tempo';
  const attempts=exerciseAttempts(data.sessions,id),best=calculateBestCleanBpm(attempts),highest=calculateHighestAttemptedBpm(attempts),latest=latestSuccessfulBpm(attempts);
  const history=finishedSessions(data.sessions).flatMap(s=>s.blocks.filter(b=>b.sourceExerciseId===id).map(b=>({session:s,block:b}))).sort((a,b)=>b.session.startedAt.localeCompare(a.session.startedAt));
  const target=el('input',{type:'number',value:exercise.targetBpm||'',min:20,max:300,step:1,placeholder:'Set target','aria-label':'Target clean BPM',class:'target-input'});
  target.addEventListener('change',async()=>{if(!target.reportValidity())return;try{await store.save('exercises',{...exercise,targetBpm:target.value?Number(target.value):undefined});notify('Clean-BPM target saved.');}catch(e){notify(e instanceof Error?e.message:'Target could not be saved.','error');}});
  const page=el('div',{class:'page'},link('Exercise library','/library','back-link'),pageHeader(`${skillLabel(exercise.skillArea??exercise.category)} · ${data.profiles?.find(p=>p.id===exercise.profileId)?.name??exercise.instrument}`,exercise.name,exercise.description,[button('Edit',()=>editExercise(exercise),'secondary','edit'),button('Start practice',()=>launchPractice([exerciseBlock(exercise)]),'primary','play')]));
  if(exercise.archived)page.append(el('div',{class:'info-banner'},'This exercise is archived. Its practice history is preserved.',button('Restore to library',async()=>{await store.save('exercises',{...exercise,archived:false});},'ghost')));
  if(protocol.kind==='tempo'&&protocol.sticking)page.append(el('section',{class:'sticking-panel'},el('div',{class:'label'},'STICKING'),el('div',{class:'sticking'},protocol.kind==='tempo'?protocol.sticking:''),el('p',{class:'muted small'},'R = right · L = left · K = kick · lowercase = grace stroke. Sticking describes hand order, not full rhythmic notation.')));
  if(hasTempo)page.append(el('div',{class:'stats-strip'},stat('Best clean',best?`${best} BPM`:'—','Clean or effortless'),el('div',{class:'stat'},el('span',{class:'label'},'Target clean BPM'),target),stat('Highest attempted',highest?`${highest} BPM`:'—'),stat('Practice time',duration(history.reduce((s,h)=>s+h.block.actualActiveSeconds,0)))));
  page.append(el('div',{class:'detail-actions'},button('Add to today',()=>addToday(exerciseBlock(exercise)),'secondary','plus'),hasTempo?button('Start tempo trainer',()=>trainerDialog(undefined,async config=>launchPractice([{...exerciseBlock(exercise),tempoTrainer:config,targetSeconds:config.mode==='endurance'?config.seconds:600}]),exerciseBpm(exercise)),'secondary','progress'):null,el('span',{class:'muted small'},history[0]?`Last practiced ${formatDate(history[0].session.startedAt)}`:'No practice recorded yet')));
  page.append(el('div',{class:'two-column wide-left'},hasTempo?el('section',{class:'panel'},sectionHeader('Clean tempo progression'),lineChart(buildTempoProgressionSeries(attempts))):el('section',{class:'panel'},sectionHeader(protocolDefinition(protocol.kind).label),el('p',{class:'pre-line'},protocolSummary(protocol)),el('p',{class:'field-hint'},protocolDefinition(protocol.kind).description)),el('section',{class:'panel'},sectionHeader('Practice cues'),el('p',{class:'pre-line'},exercise.instructions||'Set a comfortable tempo and prioritize a controlled, repeatable motion.'),exercise.accents?el('p',{class:'pre-line'},exercise.accents):null,latest?el('p',{class:'muted small'},`Latest successful attempt: ${latest} BPM. Includes acceptable, clean, and effortless.`):null,el('div',{class:'tag-row'},exercise.tags.map(t=>badge(t))))));
  const metrics=summarizeResults(protocolResults(data.sessions,id));if(metrics.length)page.append(el('section',{class:'protocol-summary'},sectionHeader('Task results'),...metrics.map(m=>el('div',{class:'metric-row'},el('strong',{},m.label),el('span',{},m.value),el('p',{class:'field-hint'},m.detail)))));
  const historySection=el('section',{class:'panel'},sectionHeader('Practice history',`${history.length} recorded blocks`));
  if(!history.length)historySection.append(empty('No practice history yet.','Finish a practice session and record an attempt to see it here.',button('Practice this exercise',()=>launchPractice([exerciseBlock(exercise)]),'ghost','play'),'history'));
  else historySection.append(...history.slice(0,50).map(({session,block})=>el('div',{class:'history-block-row'},link(formatDate(session.startedAt),`/history/${session.id}`),el('span',{},duration(block.actualActiveSeconds)),el('span',{},block.initialBpm===undefined?'Self-paced':`${block.finalBpm} BPM`),el('div',{class:'attempt-tags'},block.tempoAttempts.slice(-4).map(a=>badge(`${a.bpm} · ${a.rating}`,a.rating==='clean'||a.rating==='effortless'?'accent':'neutral'))),block.outcomes?.length?el('p',{class:'muted small pre-line'},block.outcomes.slice(-2).map(outcomeSummary).join('\n')):null,block.notes?el('p',{class:'muted small pre-line'},block.notes):null)));
  page.append(historySection);
  if(exercise.notes)page.append(el('section',{class:'panel'},sectionHeader('Personal notes'),el('p',{class:'pre-line'},exercise.notes)));
  page.append(el('div',{class:'page-footer'},button(exercise.archived?'Restore exercise':'Archive exercise',async()=>{await store.save('exercises',{...exercise,archived:!exercise.archived});notify(exercise.archived?'Exercise restored.':'Exercise archived. Practice history is unchanged.');},'ghost',exercise.archived?'restart':'trash')));
  return {node:page};
}
