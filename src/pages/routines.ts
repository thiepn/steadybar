import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, empty, link, notify, pageHeader, sectionHeader } from '../ui/components.js';
import { duplicateRoutine, editRoutine } from '../ui/editors.js';
import { duration } from '../domain/utils.js';
import { routineDuration } from '../domain/analytics.js';
import { blockList } from '../ui/block-list.js';
import { launchPractice, routineToday } from '../practice/launch.js';
export function routinesPage():Page{
  const data=store.snapshot(),list=el('div',{class:'routine-grid'}),archived=checkbox('archived','Show archived routines');
  const draw=()=>{
    const show=archived.querySelector('input')!.checked;const routines=data.routines.filter(r=>show?r.archived:!r.archived);list.replaceChildren();
    if(!routines.length)list.append(empty(show?'No archived routines.':'No routines yet','Create a reusable sequence of exercises, songs, and free-practice blocks.',button('New routine',()=>editRoutine(),'primary','plus')));
    for(const r of routines)list.append(el('article',{class:'routine-card'},el('div',{class:'split'},badge(r.builtin?'Starter':'Custom'),el('span',{class:'routine-time'},duration(routineDuration(r.blocks)))),el('h2',{},link(r.name,`/routines/${r.id}`)),el('p',{class:'muted'},r.description||'A reusable practice session.'),el('ol',{class:'routine-preview'},r.blocks.slice(0,5).map(b=>el('li',{},el('span',{},b.title),el('span',{class:'muted'},duration(b.targetSeconds,true))))),el('div',{class:'routine-card-footer'},link('Open routine',`/routines/${r.id}`,'text-link','arrow'),button('Practice',()=>launchPractice(r.blocks,{routineId:r.id}),'primary compact','play'))));
  };archived.addEventListener('change',draw);draw();
  return {node:el('div',{class:'page'},pageHeader('REPEAT WHAT WORKS','Practice routines','Reusable plans for your practice sessions.',[button('New routine',()=>editRoutine(),'primary','plus')]),el('div',{class:'filter-line'},archived),list)};
}
export function routinePage(id:string):Page{
  const routine=store.snapshot().routines.find(r=>r.id===id);if(!routine)return {node:empty('Routine not found.','Choose another routine from your library.',link('Routines','/routines','button primary'))};
  const start=button('Start routine',()=>launchPractice(routine.blocks,{routineId:id}),'primary','play');start.disabled=!routine.blocks.length;
  const page=el('div',{class:'page'},link('All routines','/routines','back-link'),pageHeader(routine.builtin?'STARTER TEMPLATE':'YOUR ROUTINE',routine.name,routine.description,[button('Edit details',()=>editRoutine(routine),'secondary','edit'),start]));
  page.append(el('div',{class:'routine-summary'},badge(`${routine.blocks.length} blocks`),badge(duration(routineDuration(routine.blocks)),'accent'),routine.scheduledDays.length?el('span',{class:'muted'},`Scheduled: ${routine.scheduledDays.map(d=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`):el('span',{class:'muted'},'Not scheduled')));
  const panel=el('section',{class:'panel'},sectionHeader('Practice sequence','Changes are saved as you edit.',[button('Copy to today',()=>routineToday(routine),'secondary','today')]));
  if(!routine.blocks.length)panel.append(el('p',{class:'muted inset'},'Add your first exercise, song, or free-practice block.'));
  panel.append(blockList(routine.blocks,async blocks=>{await store.save('routines',{...routine,blocks});},block=>launchPractice([block],{routineId:id})));page.append(panel);
  page.append(el('div',{class:'page-footer'},button('Duplicate routine',()=>duplicateRoutine(routine),'secondary','routine'),button(routine.archived?'Restore routine':'Archive routine',async()=>{await store.save('routines',{...routine,archived:!routine.archived});notify(routine.archived?'Routine restored.':'Routine archived. Your history is unchanged.');},'ghost',routine.archived?'restart':'trash')));
  return {node:page};
}
