import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, empty, iconButton, link, notify, pageHeader, sectionHeader, stat } from '../ui/components.js';
import { editExercise, trainerDialog } from '../ui/editors.js';
import { CATEGORIES } from '../domain/models.js';
import { calculateBestCleanBpm, calculateHighestAttemptedBpm, exerciseAttempts, buildTempoProgressionSeries, finishedSessions, latestSuccessfulBpm } from '../domain/analytics.js';
import { duration, formatDate, titleCase } from '../domain/utils.js';
import { addToday, exerciseBlock, launchPractice } from '../practice/launch.js';
import { lineChart } from '../ui/charts.js';
export function libraryPage():Page{
  const data=store.snapshot();const search=el('input',{type:'search',placeholder:'Search exercises or tags…','aria-label':'Search exercises'});
  const category=el('select',{'aria-label':'Filter category'},el('option',{value:''},'All categories'),CATEGORIES.map(c=>el('option',{value:c},titleCase(c))));
  const source=el('select',{'aria-label':'Filter source'},[['all','All exercises'],['builtin','Built-in'],['custom','My exercises'],['archived','Archived']].map(([v,l])=>el('option',{value:v},l)));
  const sort=el('select',{'aria-label':'Sort exercises'},[['name','Name A–Z'],['category','Category'],['clean','Best clean BPM']].map(([v,l])=>el('option',{value:v},l)));
  const results=el('div',{class:'exercise-grid'}),count=el('span',{class:'muted small'});let mode='grid';
  const render=()=>{
    const query=search.value.toLowerCase().trim();
    const exercises=data.exercises.filter(e=>(source.value==='archived'?e.archived:!e.archived)&&(!category.value||e.category===category.value)&&(source.value!=='builtin'||e.builtin)&&(source.value!=='custom'||!e.builtin)&&`${e.name} ${e.tags.join(' ')} ${e.description}`.toLowerCase().includes(query));
    exercises.sort((a,b)=>sort.value==='clean'?(calculateBestCleanBpm(exerciseAttempts(data.sessions,b.id))||0)-(calculateBestCleanBpm(exerciseAttempts(data.sessions,a.id))||0):sort.value==='category'?a.category.localeCompare(b.category)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
    count.textContent=`${exercises.length} exercises`;results.className=mode==='grid'?'exercise-grid':'exercise-list';results.replaceChildren();
    if(!exercises.length){results.append(empty('No exercises match.','Try another filter, or create an exercise for what you are working on.',button('New exercise',()=>editExercise(),'primary','plus'),'library'));return;}
    for(const e of exercises){const best=calculateBestCleanBpm(exerciseAttempts(data.sessions,e.id));results.append(el('article',{class:'exercise-card'},
      el('div',{class:'exercise-card-top'},badge(titleCase(e.category)),el('span',{class:'muted tiny'},e.builtin?'BUILT-IN':'CUSTOM')),
      el('h2',{},link(e.name,`/library/${e.id}`)),e.sticking?el('p',{class:'sticking small-sticking'},e.sticking):el('p',{class:'muted exercise-description'},e.description),
      el('div',{class:'exercise-card-bottom'},el('div',{},el('span',{class:'muted tiny'},'BEST CLEAN'),el('strong',{},best?`${best} BPM`:'Not recorded')),
        iconButton(`Practice ${e.name}`,'play',()=>launchPractice([exerciseBlock(e)])))));}
  };
  for(const control of [search,category,source,sort])control.addEventListener(control===search?'input':'change',render);
  const grid=button('Grid',()=>{mode='grid';render();grid.classList.add('selected');list.classList.remove('selected');},'segmented-button selected');
  const list=button('List',()=>{mode='list';render();list.classList.add('selected');grid.classList.remove('selected');},'segmented-button');
  render();return {node:el('div',{class:'page'},pageHeader('THE WORKBENCH','Exercise library','Build control before speed. Find the next thing worth practicing.',[button('New exercise',()=>editExercise(),'primary','plus')]),el('div',{class:'library-toolbar'},el('div',{class:'search-field'},search),category,source,sort),el('div',{class:'split result-meta'},count,el('div',{class:'segmented'},grid,list)),results)};
}
export function exercisePage(id:string):Page{
  const data=store.snapshot(),exercise=data.exercises.find(e=>e.id===id);
  if(!exercise)return {node:empty('Exercise not found.','It may have been removed by a restore. Your historical session snapshots are independent.',link('Back to library','/library','button primary'))};
  const attempts=exerciseAttempts(data.sessions,id),best=calculateBestCleanBpm(attempts),highest=calculateHighestAttemptedBpm(attempts),latest=latestSuccessfulBpm(attempts);
  const history=finishedSessions(data.sessions).flatMap(s=>s.blocks.filter(b=>b.sourceExerciseId===id).map(b=>({session:s,block:b}))).sort((a,b)=>b.session.startedAt.localeCompare(a.session.startedAt));
  const target=el('input',{type:'number',value:exercise.targetBpm||'',min:20,max:300,step:1,placeholder:'Set target','aria-label':'Target clean BPM',class:'target-input'});
  target.addEventListener('change',async()=>{if(!target.reportValidity())return;try{await store.save('exercises',{...exercise,targetBpm:target.value?Number(target.value):undefined});notify('Clean-BPM target saved.');}catch(e){notify(e instanceof Error?e.message:'Target could not be saved.','error');}});
  const page=el('div',{class:'page'},link('Exercise library','/library','back-link'),pageHeader(`${titleCase(exercise.category)} · ${exercise.instrument}`,exercise.name,exercise.description,[button('Edit',()=>editExercise(exercise),'secondary','edit'),button('Start practice',()=>launchPractice([exerciseBlock(exercise)]),'primary','play')]));
  if(exercise.archived)page.append(el('div',{class:'info-banner'},'This exercise is archived. Its practice history is preserved.',button('Restore to library',async()=>{await store.save('exercises',{...exercise,archived:false});},'ghost')));
  if(exercise.sticking)page.append(el('section',{class:'sticking-panel'},el('div',{class:'label'},'STICKING'),el('div',{class:'sticking'},exercise.sticking),el('p',{class:'muted small'},'R = right · L = left · K = kick · lowercase = grace stroke. Sticking describes hand order, not full rhythmic notation.')));
  page.append(el('div',{class:'stats-strip'},stat('Best clean',best?`${best} BPM`:'—','Clean or effortless'),el('div',{class:'stat'},el('span',{class:'label'},'Target clean BPM'),target),stat('Highest attempted',highest?`${highest} BPM`:'—'),stat('Practice time',duration(history.reduce((s,h)=>s+h.block.actualActiveSeconds,0)))));
  page.append(el('div',{class:'detail-actions'},button('Add to today',()=>addToday(exerciseBlock(exercise)),'secondary','plus'),button('Start tempo trainer',()=>trainerDialog(undefined,async config=>launchPractice([{...exerciseBlock(exercise),tempoTrainer:config,targetSeconds:config.mode==='endurance'?config.seconds:600}]),exercise.defaultBpm),'secondary','progress'),el('span',{class:'muted small'},history[0]?`Last practiced ${formatDate(history[0].session.startedAt)}`:'No practice recorded yet')));
  page.append(el('div',{class:'two-column wide-left'},el('section',{class:'panel'},sectionHeader('Clean tempo progression'),lineChart(buildTempoProgressionSeries(attempts))),el('section',{class:'panel'},sectionHeader('Practice cues'),el('p',{class:'pre-line'},exercise.instructions||'Set a comfortable tempo and prioritize a controlled, repeatable motion.'),exercise.accents?el('p',{class:'pre-line'},exercise.accents):null,latest?el('p',{class:'muted small'},`Latest successful attempt: ${latest} BPM. Includes acceptable, clean, and effortless.`):null,el('div',{class:'tag-row'},exercise.tags.map(t=>badge(t))))));
  const historySection=el('section',{class:'panel'},sectionHeader('Practice history',`${history.length} recorded blocks`));
  if(!history.length)historySection.append(empty('Your baseline starts here.','Finish a practice session and record an attempt to see it here.',button('Practice this exercise',()=>launchPractice([exerciseBlock(exercise)]),'ghost','play'),'history'));
  else historySection.append(...history.slice(0,50).map(({session,block})=>el('div',{class:'history-block-row'},link(formatDate(session.startedAt),`/history/${session.id}`),el('span',{},duration(block.actualActiveSeconds)),el('span',{},`${block.finalBpm} BPM`),el('div',{class:'attempt-tags'},block.tempoAttempts.slice(-4).map(a=>badge(`${a.bpm} · ${a.rating}`,a.rating==='clean'||a.rating==='effortless'?'accent':'neutral'))),block.notes?el('p',{class:'muted small pre-line'},block.notes):null)));
  page.append(historySection);
  if(exercise.notes)page.append(el('section',{class:'panel'},sectionHeader('Personal notes'),el('p',{class:'pre-line'},exercise.notes)));
  page.append(el('div',{class:'page-footer'},button(exercise.archived?'Restore exercise':'Archive exercise',async()=>{await store.save('exercises',{...exercise,archived:!exercise.archived});notify(exercise.archived?'Exercise restored.':'Exercise archived. Practice history is unchanged.');},'ghost',exercise.archived?'restart':'trash')));
  return {node:page};
}
