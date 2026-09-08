import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, confirmAction, empty, iconButton, link, pageHeader, progressBar } from '../ui/components.js';
import { editGoal } from '../ui/editors.js';
import { goalProgress } from '../domain/analytics.js';
import { formatDate, localDate, nowISO } from '../domain/utils.js';
export function goalsPage():Page{
  const data=store.view(),page=el('div',{class:'page'},pageHeader('','Goals','Targets for this profile, repertoire, and weekly practice.',[button('New goal',()=>editGoal(),'primary','plus')]));
  if(!data.goals.length){page.append(empty('No goals yet','Track a task result, prepare a part, or set a weekly practice target.',button('Create your first goal',()=>editGoal(),'primary','plus'),'goal'));return {node:page};}
  const list=el('div',{class:'goal-grid'});
  for(const goal of [...data.goals].sort((a,b)=>Number(goalProgress(a,store.snapshot()).done)-Number(goalProgress(b,store.snapshot()).done))){
    const p=goalProgress(goal,store.snapshot()),exercise=data.exercises.find(e=>e.id===goal.exerciseId),song=data.songs.find(s=>s.id===goal.songId);
    list.append(el('article',{class:`goal-card ${p.done?'goal-done':''}`},el('div',{class:'split'},badge(p.done?'Achieved':goal.type==='weekly-sessions'?'This week':'In progress',p.done?'accent':'neutral'),el('div',{class:'actions'},iconButton(`Edit ${goal.title}`,'edit',()=>editGoal(goal)),iconButton(`Delete ${goal.title}`,'trash',async()=>{if(await confirmAction('Delete this goal?','Only the goal is removed. Practice records will not change.','Delete goal',true))await store.delete('goals',goal.id);}))),el('h2',{},goal.title),goal.description?el('p',{class:'muted'},goal.description):null,el('strong',{class:'goal-value'},p.label),progressBar(p.fraction,goal.title),
      goal.type==='bpm'?el('p',{class:'field-hint'},'Tempo progress, not a percentage of musical mastery.'):null,
      el('div',{class:'split goal-footer'},exercise?link(exercise.name,`/library/${exercise.id}`):song?link(song.title,`/songs/${song.id}`):null,goal.deadline?el('span',{class:`small ${!p.done&&goal.deadline<localDate()?'warning-text':'muted'}`},`${goal.deadline<localDate()&&!p.done?'Target was':'Target'} ${formatDate(goal.deadline)}`):null),
      goal.type==='custom'?button(p.done?'Mark incomplete':'Mark complete',async()=>{await store.save('goals',{...goal,completed:!goal.completed,completedAt:goal.completed?undefined:nowISO()});},'secondary',p.done?'restart':'check'):null));
  }
  page.append(list);return {node:page};
}
