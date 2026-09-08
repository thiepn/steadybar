import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, empty, link, notify, pageHeader, sectionHeader } from '../ui/components.js';
import { duplicateRoutine, editRoutine } from '../ui/editors.js';
import { duration } from '../domain/utils.js';
import { routineDuration } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { launchPractice, routineToday } from '../practice/launch.js';
let showArchivedRoutines = false;
export function routinesPage(): Page {
  const data = store.view(), list = el('div', { class: 'routine-collection' });
  const archived = checkbox('archived', 'Show archived routines', showArchivedRoutines);
  const draw = () => {
    showArchivedRoutines = archived.querySelector('input')!.checked;
    const routines = data.routines.filter(r => showArchivedRoutines ? r.archived : !r.archived);
    list.replaceChildren();
    if (!routines.length) list.append(empty(showArchivedRoutines ? 'No archived routines.' : 'No routines yet', 'Build a sequence to use again.', button('New routine', () => editRoutine(), 'secondary', 'plus')));
    for (const r of routines) {
      const play = button('Practice', () => launchPractice(r.blocks, { routineId: r.id }), 'secondary compact', 'play');
      play.disabled = !r.blocks.length;
      list.append(el('article', { class: 'routine-card' },
        el('div', { class: 'routine-row' }, el('div', { class: 'routine-identity' },
          el('h2', {}, link(r.name, `/routines/${r.id}`)),
          el('p', { class: 'muted small' }, r.description || `${r.blocks.length} practice blocks`),
          el('p', { class: 'routine-schedule muted tiny' }, `${r.builtin ? 'Starter' : 'Custom'}${r.scheduledDays.length ? ` · ${r.scheduledDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}` : ''}`)),
          el('div', { class: 'routine-duration' }, el('strong', {}, duration(routineDuration(r.blocks))), el('span', { class: 'muted tiny' }, `${r.blocks.length} blocks`)), play),
        el('details', { class: 'routine-disclosure' }, el('summary', {}, 'Preview sequence'),
          el('ol', { class: 'routine-preview' }, r.blocks.map(b => el('li', {}, el('span', {}, b.title), el('span', { class: 'muted' }, `${duration(b.targetSeconds, true)} · ${b.bpm} BPM`)))),
          link('Open routine', `/routines/${r.id}`, 'text-link', 'arrow'))));
    }
  };
  archived.addEventListener('change', draw); draw();
  return { node: el('div', { class: 'page' }, pageHeader('', 'Routines', 'Reusable sequences for the time you have.', [button('New routine', () => editRoutine(), 'primary', 'plus')]), el('div', { class: 'filter-line' }, archived), list) };
}
export function routinePage(id:string):Page{
  const routine=store.view().routines.find(r=>r.id===id);if(!routine)return {node:empty('Routine not found.','Choose another routine from your library.',link('Routines','/routines','button primary'))};
  const start=button('Start routine',()=>launchPractice(routine.blocks,{routineId:id}),'primary','play');start.disabled=!routine.blocks.length;
  const page=el('div',{class:'page'},link('All routines','/routines','back-link'),pageHeader(routine.builtin?'':'',routine.name,routine.description,[button('Edit details',()=>editRoutine(routine),'secondary','edit'),start]));
  page.append(el('div',{class:'routine-summary'},badge(`${routine.blocks.length} blocks`),badge(duration(routineDuration(routine.blocks)),'accent'),routine.scheduledDays.length?el('span',{class:'muted'},`Scheduled: ${routine.scheduledDays.map(d=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`):el('span',{class:'muted'},'Not scheduled')));
  const panel=el('section',{class:'panel'},sectionHeader('Practice sequence','Changes are saved as you edit.',[button('Copy to today',()=>routineToday(routine),'secondary','today')]));
  if(!routine.blocks.length)panel.append(el('p',{class:'muted inset'},'Add your first exercise, song, or free-practice block.'));
  panel.append(blockList(routine.blocks,async blocks=>{await store.save('routines',{...routine,blocks});},block=>launchPractice([block],{routineId:id})));page.append(panel);
  page.append(el('div',{class:'page-footer'},button('Duplicate routine',()=>duplicateRoutine(routine),'secondary','routine'),button(routine.archived?'Restore routine':'Archive routine',async()=>{await store.save('routines',{...routine,archived:!routine.archived});notify(routine.archived?'Routine restored.':'Routine archived. Your history is unchanged.');},'ghost',routine.archived?'restart':'trash')));
  return {node:page};
}
