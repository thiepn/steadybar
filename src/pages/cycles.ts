import { activatePlan, archivePlan, completePlan, createTrainingPlan, editTrainingPhase, pausePlan, rebuildTrainingPlan } from '../app/training-plans.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { activeTrainingContext, trainingPhaseForDate, trainingPlanProgress } from '../domain/training-plan.js';
import type { TrainingEmphasis, TrainingPhase, TrainingPhaseKind, TrainingPlan } from '../domain/models.js';
import { skillDefinition, skillDefinitionsFor } from '../domain/skill-graph.js';
import { calculateTotalPracticeTime, filterSessions, goalProgress } from '../domain/analytics.js';
import type { Page } from '../app/navigation.js';
import { navigate } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, formDialog, formNumber, formText, input, link, notify, pageHeader, progressBar, sectionHeader, select, stat, textarea } from '../ui/components.js';
import { formatDate, localDate, titleCase } from '../domain/utils.js';

const phaseKinds:[TrainingPhaseKind,string][]=[
  ['foundation','Foundation'],['build','Build'],['deload','Reduced-load consolidation'],['integrate','Integrate'],
  ['simulate','Simulate'],['taper','Taper'],['consolidate','Consolidate'],['custom','Custom'],
];
const emphases:[TrainingEmphasis,string][]=[['balanced','Balanced'],['songs','Songs'],['timing','Timing'],['technique','Technique']];

function addDays(value:string,days:number):string{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+days);return localDate(d);}
function monday(date=new Date()):string{const d=new Date(date),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return localDate(d);}
function futureTarget(data=store.view()):string{
  const today=localDate(),dates=[
    ...data.goals.filter(goal=>!goal.completed&&goal.deadline&&goal.deadline>=today).map(goal=>goal.deadline!),
    ...data.setlists.filter(setlist=>setlist.date&&setlist.date>=today).map(setlist=>setlist.date!),
  ].sort();
  return dates[0]??addDays(today,55);
}
function recentWeeklyMinutes(data=store.view()):number{
  const to=localDate(),from=addDays(to,-27),seconds=calculateTotalPracticeTime(filterSessions(data.sessions,from,to)),profile=activeProfile(store.snapshot());
  if(seconds>0)return Math.max(15,Math.round((seconds/60/4)/15)*15);
  return Math.max(30,Math.round((profile.defaultSessionMinutes*3)/15)*15);
}
function statusVariant(plan:TrainingPlan):'accent'|'neutral'{return plan.status==='active'?'accent':'neutral';}
function focusText(phase:TrainingPhase):string{
  return phase.focuses.map(focus=>skillDefinition(focus.skillId)?.label??focus.skillId).join(' · ')||'No skill focus';
}
function currentPhaseLabel(plan:TrainingPlan):string{
  const today=localDate(),phase=trainingPhaseForDate(plan,today);
  if(phase)return phase.name;
  if(today<plan.startOn)return 'Starts '+formatDate(plan.startOn);
  if(today>plan.endOn)return 'Cycle window ended';
  return 'No current phase';
}

function linkedSelectors(plan:TrainingPlan|undefined,goalIds:string[],setlistIds:string[]):HTMLElement[]{
  const data=store.view(),goals=data.goals.filter(goal=>!goal.completed||goalIds.includes(goal.id)),setlists=data.setlists.filter(setlist=>!setlist.date||setlist.date>=localDate()||setlistIds.includes(setlist.id));
  return [
    el('fieldset',{class:'training-link-picker'},el('legend',{},'Linked goals'),
      goals.length?goals.map(goal=>checkbox('goal-'+goal.id,goal.title,goalIds.includes(goal.id))):el('p',{class:'muted small'},'No active goals available.')),
    el('fieldset',{class:'training-link-picker'},el('legend',{},'Linked setlists'),
      setlists.length?setlists.map(setlist=>checkbox('setlist-'+setlist.id,`${setlist.name}${setlist.date?` · ${formatDate(setlist.date)}`:''}`,setlistIds.includes(setlist.id))):el('p',{class:'muted small'},'No setlists available.')),
    plan?el('p',{class:'field-hint'},'Regenerating replaces the phase schedule and phase edits, but keeps this plan’s identity and status.'):el('p',{class:'field-hint'},'The generated plan is saved as a draft. Nothing affects Priority or Autopilot until you explicitly activate it.'),
  ];
}
function planDialog(plan?:TrainingPlan):void{
  const data=store.view(),today=localDate(),start=plan?.startOn??today,end=plan?.endOn??futureTarget(data),baseline=plan?.baselineWeeklyMinutes??recentWeeklyMinutes(data);
  const goals=plan?.goalIds??data.goals.filter(goal=>!goal.completed&&(!goal.deadline||goal.deadline<=end)).map(goal=>goal.id);
  const setlists=plan?.setlistIds??data.setlists.filter(setlist=>setlist.date&&setlist.date>=start&&setlist.date<=end).map(setlist=>setlist.id);
  formDialog(plan?'Regenerate training cycle':'New training cycle',[
    input('name','Plan name',plan?.name??'Development cycle','text',{required:true,maxlength:200}),
    input('startOn','Start date',start,'date',{required:true}),
    input('endOn','Target / end date',end,'date',{required:true}),
    input('baselineWeeklyMinutes','Baseline weekly minutes',baseline,'number',{min:15,max:10000,step:15,required:true}),
    textarea('notes','Plan notes',plan?.notes??''),
    ...linkedSelectors(plan,goals,setlists),
  ],async form=>{
    const startOn=formText(form,'startOn'),endOn=formText(form,'endOn');
    if(endOn<startOn)throw new Error('The end date must be after the start date.');
    const goalIds=data.goals.filter(goal=>form.has('goal-'+goal.id)).map(goal=>goal.id),setlistIds=data.setlists.filter(setlist=>form.has('setlist-'+setlist.id)).map(setlist=>setlist.id);
    const options={profileId:activeProfile(store.snapshot()).id,name:formText(form,'name'),startOn,endOn,baselineWeeklyMinutes:formNumber(form,'baselineWeeklyMinutes'),goalIds,setlistIds,notes:formText(form,'notes')};
    if(plan){
      await rebuildTrainingPlan(plan.id,options);notify('Training cycle regenerated.');
    }else{
      const created=await createTrainingPlan(options);notify('Training cycle created as a draft.');navigate('/cycles/'+created.id);
    }
  },plan?'Regenerate phases':'Create draft');
}

function phaseDialog(plan:TrainingPlan,phase:TrainingPhase):void{
  const profile=activeProfile(store.snapshot()),skills=[...skillDefinitionsFor(profile.instrumentType)],ordered=[...phase.focuses].sort((a,b)=>b.weight-a.weight),byWeight=(weight:number)=>ordered.find(row=>row.weight===weight)?.skillId??'';
  const options:[string,string][]=[['','None'],...skills.map(skill=>[skill.id,skill.label] as [string,string])];
  formDialog('Edit training phase',[
    input('name','Phase name',phase.name,'text',{required:true,maxlength:200}),
    select('kind','Phase type',phaseKinds,phase.kind),
    input('weeklyMinutes','Weekly minute target',phase.weeklyMinutes,'number',{min:15,max:10000,step:15,required:true}),
    select('emphasis','Suggested Autopilot emphasis',emphases,phase.emphasis),
    select('primary','Primary skill focus',options,byWeight(3)),
    select('secondary','Secondary skill focus',options,byWeight(2)),
    select('support','Support skill focus',options,byWeight(1)),
    textarea('notes','Phase notes',phase.notes),
    el('p',{class:'field-hint'},`Dates are fixed at ${formatDate(phase.startOn)} → ${formatDate(phase.endOn)} so the cycle remains contiguous. Regenerate the whole cycle to change phase boundaries.`),
  ],async form=>{
    const rows:[string,1|2|3][]=[['primary',3],['secondary',2],['support',1]],focuses=rows.flatMap(([name,weight])=>{const skillId=formText(form,name);return skillId?[{skillId,weight,note:''}]:[];});
    if(new Set(focuses.map(row=>row.skillId)).size!==focuses.length)throw new Error('Choose each phase focus at most once.');
    await editTrainingPhase(plan.id,phase.id,{name:formText(form,'name'),kind:formText(form,'kind') as TrainingPhaseKind,weeklyMinutes:formNumber(form,'weeklyMinutes'),emphasis:formText(form,'emphasis') as TrainingEmphasis,focuses,notes:formText(form,'notes')});
    notify('Training phase updated.');
  },'Save phase');
}

function phaseCard(plan:TrainingPlan,phase:TrainingPhase,index:number):HTMLElement{
  const today=localDate(),current=phase.startOn<=today&&phase.endOn>=today,past=phase.endOn<today;
  return el('article',{class:`training-phase-card ${current?'current':''} ${past?'past':''}`},
    el('div',{class:'training-phase-number'},String(index+1).padStart(2,'0')),
    el('div',{class:'training-phase-body'},
      el('div',{class:'split'},el('div',{},el('span',{class:'eyebrow'},titleCase(phase.kind)),el('h3',{},phase.name)),badge(current?'Current':past?'Completed window':'Upcoming',current?'accent':'neutral')),
      el('p',{class:'muted small'},`${formatDate(phase.startOn)} → ${formatDate(phase.endOn)}`),
      el('div',{class:'training-phase-metrics'},badge(`${phase.weeklyMinutes} min / week`),badge(titleCase(phase.emphasis)),badge(focusText(phase))),
      phase.notes?el('p',{class:'small'},phase.notes):null),
    button('Edit phase',()=>phaseDialog(plan,phase),'secondary compact','edit'));
}

function planActions(plan:TrainingPlan):HTMLElement[]{
  const actions:HTMLElement[]=[];
  if(plan.status!=='active'&&plan.status!=='archived')actions.push(button('Activate',async()=>{
    const current=activeTrainingContext(store.snapshot(),plan.profileId);
    if(current&&current.plan.id!==plan.id&&!await confirmAction('Activate this training cycle?',`“${current.plan.name}” will be paused and kept. This plan will begin influencing Priority and Weekly Review.`,'Activate cycle'))return;
    await activatePlan(plan.id);notify('Training cycle activated.');
  },'primary','play'));
  if(plan.status==='active')actions.push(button('Pause',async()=>{await pausePlan(plan.id);notify('Training cycle paused.');},'secondary'));
  if(!['completed','archived'].includes(plan.status))actions.push(button('Mark complete',async()=>{
    if(await confirmAction('Complete this training cycle?','The plan and its phases remain in history and stop influencing Priority.','Complete cycle')){await completePlan(plan.id);notify('Training cycle completed.');}
  },'secondary','check'));
  actions.push(button('Regenerate',()=>planDialog(plan),'ghost','restart'));
  if(plan.status!=='active'&&plan.status!=='archived')actions.push(button('Archive',async()=>{
    if(await confirmAction('Archive this training cycle?','The plan remains stored but is removed from active planning views.','Archive cycle')){await archivePlan(plan.id);notify('Training cycle archived.');}
  },'ghost'));
  return actions;
}

export function trainingPlansPage():Page{
  const data=store.view(),profile=activeProfile(store.snapshot()),plans=[...(data.trainingPlans??[])].filter(plan=>plan.status!=='archived').sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')||b.updatedAt.localeCompare(a.updatedAt));
  const page=el('div',{class:'page'},pageHeader('Long-term planning','Training Cycles',`${profile.name} · Multi-week goals, phases and workload targets that guide—but never silently control—weekly practice.`,[button('New cycle',()=>planDialog(),'primary','plus')]));
  if(!plans.length){page.append(empty('No training cycles yet','Create a two-week to one-year draft from your current goals and performance dates. It will not influence practice until activated.',button('Create training cycle',()=>planDialog(),'primary','plus'),'goal'));return {node:page};}
  const active=plans.find(plan=>plan.status==='active');
  if(active){
    const phase=trainingPhaseForDate(active,localDate()),progress=trainingPlanProgress(active);
    page.append(el('section',{class:'panel training-active'},sectionHeader('Active cycle',currentPhaseLabel(active),[link('Open cycle','/cycles/'+active.id,'button secondary','arrow')]),
      el('h2',{},active.name),el('p',{class:'muted'},`${formatDate(active.startOn)} → ${formatDate(active.endOn)}`),
      el('div',{class:'stats-strip'},stat('Current phase',phase?.name??'Outside phase window'),stat('Phase target',phase?`${phase.weeklyMinutes} min/week`:'—'),stat('Emphasis',phase?titleCase(phase.emphasis):'—'),stat('Cycle progress',`${progress.elapsedDays}/${progress.totalDays} days`)),
      progressBar(progress.fraction,active.name+' calendar progress'),
      el('p',{class:'field-hint'},'Calendar progress and minute targets are planning context, not a musicianship score.')));
  }
  page.append(el('section',{class:'training-plan-grid'},plans.map(plan=>el('article',{class:'training-plan-card'},
    el('div',{class:'split'},badge(titleCase(plan.status),statusVariant(plan)),badge(currentPhaseLabel(plan))),
    el('h2',{},link(plan.name,'/cycles/'+plan.id)),el('p',{class:'muted small'},`${formatDate(plan.startOn)} → ${formatDate(plan.endOn)} · ${plan.phases.length} phases`),
    el('p',{class:'small'},plan.notes||'No plan notes.'),el('div',{class:'tag-row'},badge(`${plan.baselineWeeklyMinutes} baseline min/week`),badge(`${plan.goalIds.length} goals`),badge(`${plan.setlistIds.length} setlists`)),
    link('Open cycle','/cycles/'+plan.id,'text-link','arrow')))));
  return {node:page};
}

export function trainingPlanPage(id:string):Page{
  const data=store.view(),plan=(data.trainingPlans??[]).find(row=>row.id===id);if(!plan)return {node:empty('Training cycle not found','Choose another cycle.',link('Training Cycles','/cycles','button primary'))};
  const today=localDate(),phase=trainingPhaseForDate(plan,today),progress=trainingPlanProgress(plan),weekStart=monday(),weekSeconds=calculateTotalPracticeTime(filterSessions(data.sessions,weekStart,today)),weekMinutes=Math.round(weekSeconds/60),phaseTarget=phase?.weeklyMinutes??plan.baselineWeeklyMinutes;
  const page=el('div',{class:'page training-plan-page'},link('All training cycles','/cycles','back-link'),pageHeader(titleCase(plan.status),plan.name,`${formatDate(plan.startOn)} → ${formatDate(plan.endOn)}`,planActions(plan)));
  page.append(el('section',{class:'panel training-plan-overview'},sectionHeader('Cycle overview',currentPhaseLabel(plan)),
    el('div',{class:'stats-strip'},stat('Baseline',`${plan.baselineWeeklyMinutes} min/week`),stat('This week',`${weekMinutes} min`,`Since ${formatDate(weekStart)}`),stat('Current target',`${phaseTarget} min/week`),stat('Days',`${progress.elapsedDays}/${progress.totalDays}`)),
    progressBar(phaseTarget?Math.min(1,weekMinutes/phaseTarget):0,'Current week planned minutes'),
    el('p',{class:'field-hint'},'Weekly minutes compare recorded active time with the phase target. Reaching the target does not imply the plan’s musical goals are achieved.'),
    plan.notes?el('p',{class:'pre-line'},plan.notes):null));

  const milestones=el('section',{class:'panel'},sectionHeader('Linked milestones',`${plan.goalIds.length} goals · ${plan.setlistIds.length} setlists`));
  const linkedGoals=plan.goalIds.map(goalId=>data.goals.find(goal=>goal.id===goalId)).filter(goal=>!!goal);
  if(linkedGoals.length)for(const goal of linkedGoals){const gp=goalProgress(goal!,store.snapshot());milestones.append(el('div',{class:'training-milestone-row'},el('div',{},el('strong',{},goal!.title),el('p',{class:'muted small'},gp.label)),progressBar(gp.fraction,goal!.title),badge(gp.done?'Achieved':'In progress',gp.done?'accent':'neutral')));}
  const linkedSetlists=plan.setlistIds.map(setlistId=>data.setlists.find(setlist=>setlist.id===setlistId)).filter(setlist=>!!setlist);
  if(linkedSetlists.length)for(const setlist of linkedSetlists)milestones.append(el('div',{class:'training-setlist-row'},link(setlist!.name,'/setlists/'+setlist!.id),el('span',{class:'muted small'},setlist!.date?formatDate(setlist!.date):'No performance date')));
  if(!linkedGoals.length&&!linkedSetlists.length)milestones.append(el('p',{class:'muted'},'No goals or setlists are linked. The phases still provide a general development structure.'));
  page.append(milestones);

  page.append(el('section',{class:'panel training-timeline'},sectionHeader('Periodization','Contiguous phases; edit workload, emphasis and skill focus without changing the date boundaries.'),plan.phases.map((row,index)=>phaseCard(plan,row,index))));
  return {node:page};
}
