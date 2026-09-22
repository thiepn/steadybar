import type { Data, Goal, TrainingEmphasis, TrainingPhase, TrainingPhaseFocus, TrainingPhaseKind, TrainingPlan } from './models.js';
import { activeProfile } from './profiles.js';
import { skillDefinition, skillDefinitionsFor } from './skill-graph.js';
import { localDate, uuid } from './utils.js';

export const TRAINING_PLAN_ENGINE_VERSION=1 as const;

export interface BuildTrainingPlanOptions {
  profileId?:string;
  name:string;
  startOn:string;
  endOn:string;
  baselineWeeklyMinutes:number;
  goalIds:string[];
  setlistIds:string[];
  notes?:string;
  now?:Date|string|number;
}
export interface TrainingContext {
  plan:TrainingPlan;
  phase?:TrainingPhase;
  today:string;
  daysIntoPlan:number;
  daysRemaining:number;
}
export interface TrainingPlanProgress {
  elapsedDays:number;
  totalDays:number;
  fraction:number;
}
interface PhaseSpec {kind:TrainingPhaseKind;share:number;label:string}

const DAY=86400000;
const loadMultiplier:Record<TrainingPhaseKind,number>={
  foundation:.85,build:1,deload:.65,integrate:.9,simulate:.8,taper:.6,consolidate:.75,custom:1,
};
const toMillis=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);
const parseDay=(value:string)=>Date.parse(value+'T00:00:00Z');
const dayString=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const addDays=(value:string,days:number)=>dayString(parseDay(value)+days*DAY);
const inclusiveDays=(start:string,end:string)=>Math.round((parseDay(end)-parseDay(start))/DAY)+1;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round15=(value:number)=>Math.max(15,Math.round(value/15)*15);

function performanceLinked(data:Data,setlistIds:string[],startOn:string,endOn:string):boolean{
  return setlistIds.some(id=>{const setlist=data.setlists.find(row=>row.id===id);return !!setlist?.date&&setlist.date>=startOn&&setlist.date<=endOn;});
}
function template(days:number,performance:boolean):PhaseSpec[]{
  if(days<=28)return performance
    ?[{kind:'build',share:.4,label:'Build'},{kind:'integrate',share:.3,label:'Integrate'},{kind:'simulate',share:.2,label:'Simulate'},{kind:'taper',share:.1,label:'Taper'}]
    :[{kind:'foundation',share:.25,label:'Foundation'},{kind:'build',share:.45,label:'Build'},{kind:'integrate',share:.2,label:'Integrate'},{kind:'consolidate',share:.1,label:'Consolidate'}];
  if(days<=56)return performance
    ?[{kind:'foundation',share:.18,label:'Foundation'},{kind:'build',share:.36,label:'Build'},{kind:'integrate',share:.24,label:'Integrate'},{kind:'simulate',share:.12,label:'Simulate'},{kind:'taper',share:.1,label:'Taper'}]
    :[{kind:'foundation',share:.2,label:'Foundation'},{kind:'build',share:.4,label:'Build'},{kind:'integrate',share:.25,label:'Integrate'},{kind:'consolidate',share:.15,label:'Consolidate'}];
  return performance
    ?[{kind:'foundation',share:.15,label:'Foundation'},{kind:'build',share:.3,label:'Build'},{kind:'deload',share:.1,label:'Reduced-load consolidation'},{kind:'integrate',share:.2,label:'Integrate'},{kind:'simulate',share:.15,label:'Simulate'},{kind:'taper',share:.1,label:'Taper'}]
    :[{kind:'foundation',share:.2,label:'Foundation'},{kind:'build',share:.35,label:'Build'},{kind:'deload',share:.1,label:'Reduced-load consolidation'},{kind:'integrate',share:.2,label:'Integrate'},{kind:'consolidate',share:.15,label:'Consolidate'}];
}
function allocateDays(total:number,specs:PhaseSpec[]):number[]{
  if(total<specs.length)throw new Error('The training plan is too short for its periodization template.');
  const raw=specs.map(spec=>spec.share*total),result=raw.map(value=>Math.max(1,Math.floor(value)));
  let assigned=result.reduce((a,b)=>a+b,0);
  const fractional=raw.map((value,index)=>({index,fraction:value-Math.floor(value)})).sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
  let cursor=0;
  while(assigned<total){const row=fractional[cursor%fractional.length]!.index;result[row]=(result[row]??0)+1;assigned++;cursor++;}
  while(assigned>total){
    const row=[...result.keys()].sort((a,b)=>result[b]!-result[a]!||b-a).find(index=>result[index]!>1);
    if(row===undefined)break;result[row]!--;assigned--;
  }
  return result;
}
function repertoireSkill(data:Data,profileId:string):string|undefined{
  const profile=data.profiles?.find(row=>row.id===profileId);return profile?skillDefinitionsFor(profile.instrumentType).find(skill=>skill.domain==='repertoire')?.id:undefined;
}
function goalSkills(data:Data,profileId:string,goal:Goal):string[]{
  if(goal.exerciseId){
    const exercise=data.exercises.find(row=>row.id===goal.exerciseId&&row.profileId===profileId);
    if(exercise)return [exercise.primarySkillId,...(exercise.secondarySkillIds??[])].filter((value):value is string=>!!value);
  }
  if(goal.songId){const rep=repertoireSkill(data,profileId);return rep?[rep]:[];}
  return [];
}
function profileFallbackSkills(data:Data,profileId:string):string[]{
  const profile=data.profiles?.find(row=>row.id===profileId);if(!profile)return [];
  const defs=[...skillDefinitionsFor(profile.instrumentType)];
  const normalized=profile.focusAreas.map(value=>value.toLowerCase());
  const focused=defs.filter(skill=>normalized.some(value=>value.includes(skill.domain.toLowerCase())||value.includes(skill.label.toLowerCase())));
  return [...focused,...defs.sort((a,b)=>b.defaultImportance-a.defaultImportance||a.label.localeCompare(b.label))].map(row=>row.id);
}
function linkedSkills(data:Data,profileId:string,goalIds:string[],setlistIds:string[]):string[]{
  const result:string[]=[];
  for(const goalId of goalIds){const goal=data.goals.find(row=>row.id===goalId);if(goal)for(const skill of goalSkills(data,profileId,goal))if(!result.includes(skill))result.push(skill);}
  if(setlistIds.length){const rep=repertoireSkill(data,profileId);if(rep&&!result.includes(rep))result.push(rep);}
  for(const skill of profileFallbackSkills(data,profileId))if(!result.includes(skill))result.push(skill);
  return result.slice(0,5);
}
function phaseSkills(data:Data,profileId:string,kind:TrainingPhaseKind,base:string[],hasPerformance:boolean):string[]{
  const rep=repertoireSkill(data,profileId);
  if(kind==='foundation'){
    const prereqs:string[]=[];
    for(const id of base)for(const pre of skillDefinition(id)?.prerequisiteIds??[])if(!prereqs.includes(pre))prereqs.push(pre);
    if(prereqs.length)return [...prereqs,...base].filter((id,index,array)=>array.indexOf(id)===index).slice(0,3);
  }
  if(kind==='integrate'){
    const applications:string[]=[];
    for(const id of base)for(const app of skillDefinition(id)?.applicationIds??[])if(!applications.includes(app))applications.push(app);
    if(rep&&hasPerformance&&!applications.includes(rep))applications.unshift(rep);
    if(applications.length)return [...applications,...base].filter((id,index,array)=>array.indexOf(id)===index).slice(0,3);
  }
  if((kind==='simulate'||kind==='taper')&&rep&&hasPerformance)return [rep,...base.filter(id=>id!==rep)].slice(0,3);
  return base.slice(0,3);
}
function focusesFor(skills:string[]):TrainingPhaseFocus[]{
  const weights=( [3,2,1] as const );
  return skills.slice(0,3).map((skillId,index)=>({id:uuid(),skillId,weight:weights[index]!,note:''}));
}
function emphasisFor(kind:TrainingPhaseKind,skills:string[]):TrainingEmphasis{
  const primary=skillDefinition(skills[0]??'');
  if(['simulate','taper'].includes(kind)||primary?.domain==='repertoire')return 'songs';
  if(primary?.domain==='timing')return 'timing';
  if(primary&&['technique','coordination'].includes(primary.domain))return 'technique';
  return 'balanced';
}
function phaseNotes(kind:TrainingPhaseKind):string{
  switch(kind){
    case 'foundation':return 'Build foundations and prerequisite control before increasing task complexity.';
    case 'build':return 'Accumulate deliberate work on the plan’s main skill targets.';
    case 'deload':return 'Reduce planned volume and consolidate. This is a scheduling template, not a medical recovery prescription.';
    case 'integrate':return 'Reconnect isolated skills to musical tasks, complete passages, and broader application.';
    case 'simulate':return 'Favor continuous performance-context work and realistic running order.';
    case 'taper':return 'Reduce planned volume, keep cues familiar, and avoid large late changes before the linked performance.';
    case 'consolidate':return 'Retest, retain, and consolidate gains before deciding the next cycle.';
    case 'custom':return '';
  }
}
function buildPhases(data:Data,profileId:string,startOn:string,endOn:string,baselineWeeklyMinutes:number,goalIds:string[],setlistIds:string[]):TrainingPhase[]{
  const days=inclusiveDays(startOn,endOn),performance=performanceLinked(data,setlistIds,startOn,endOn),specs=template(days,performance),allocations=allocateDays(days,specs),base=linkedSkills(data,profileId,goalIds,setlistIds);
  let cursor=startOn;
  return specs.map((spec,index)=>{
    const length=allocations[index]!,phaseStart=cursor,phaseEnd=addDays(phaseStart,length-1),skills=phaseSkills(data,profileId,spec.kind,base,performance);
    cursor=addDays(phaseEnd,1);
    return {id:uuid(),name:spec.label,kind:spec.kind,startOn:phaseStart,endOn:phaseEnd,weeklyMinutes:round15(baselineWeeklyMinutes*loadMultiplier[spec.kind]),emphasis:emphasisFor(spec.kind,skills),focuses:focusesFor(skills),notes:phaseNotes(spec.kind)};
  });
}

export function buildTrainingPlan(data:Data,options:BuildTrainingPlanOptions):TrainingPlan{
  const profileId=options.profileId??activeProfile(data).id,startOn=options.startOn,endOn=options.endOn,days=inclusiveDays(startOn,endOn);
  if(!Number.isFinite(days)||days<14)throw new Error('Use at least a two-week range for a long-term training cycle.');
  if(days>366)throw new Error('Training cycles are limited to one year. Split longer development into multiple reviewable cycles.');
  if(options.baselineWeeklyMinutes<15||options.baselineWeeklyMinutes>10000)throw new Error('Enter a realistic weekly minute target.');
  const at=new Date(toMillis(options.now)).toISOString();
  return {
    id:uuid(),createdAt:at,updatedAt:at,profileId,name:options.name.trim()||'Training cycle',status:'draft',startOn,endOn,
    baselineWeeklyMinutes:Math.round(options.baselineWeeklyMinutes),goalIds:[...new Set(options.goalIds)],setlistIds:[...new Set(options.setlistIds)],notes:options.notes?.trim()??'',
    phases:buildPhases(data,profileId,startOn,endOn,Math.round(options.baselineWeeklyMinutes),options.goalIds,options.setlistIds),
  };
}
export function regenerateTrainingPlan(data:Data,planId:string,options:BuildTrainingPlanOptions):Data{
  const existing=(data.trainingPlans??[]).find(row=>row.id===planId);if(!existing)throw new Error('This training plan is unavailable.');
  const generated=buildTrainingPlan(data,{...options,profileId:existing.profileId}),next=structuredClone(data),at=new Date(toMillis(options.now)).toISOString();
  const replacement:TrainingPlan={...generated,id:existing.id,createdAt:existing.createdAt,updatedAt:at,status:existing.status};
  next.trainingPlans=(next.trainingPlans??[]).map(row=>row.id===planId?replacement:row);return next;
}
export function activeTrainingPlan(data:Data,profileId:string):TrainingPlan|undefined{
  return (data.trainingPlans??[]).find(plan=>plan.profileId===profileId&&plan.status==='active');
}
export function trainingPhaseForDate(plan:TrainingPlan,today:string):TrainingPhase|undefined{
  return plan.phases.find(phase=>phase.startOn<=today&&phase.endOn>=today);
}
export function activeTrainingContext(data:Data,profileId:string,today=localDate()):TrainingContext|undefined{
  const plan=activeTrainingPlan(data,profileId);if(!plan)return undefined;
  const total=inclusiveDays(plan.startOn,plan.endOn),elapsed=clamp(inclusiveDays(plan.startOn,today),0,total),remaining=clamp(Math.round((parseDay(plan.endOn)-parseDay(today))/DAY),0,total);
  return {plan,phase:trainingPhaseForDate(plan,today),today,daysIntoPlan:elapsed,daysRemaining:remaining};
}
export function trainingPlanProgress(plan:TrainingPlan,today=localDate()):TrainingPlanProgress{
  const total=inclusiveDays(plan.startOn,plan.endOn),elapsed=today<plan.startOn?0:today>plan.endOn?total:inclusiveDays(plan.startOn,today);
  return {elapsedDays:elapsed,totalDays:total,fraction:clamp(elapsed/total,0,1)};
}
export function activateTrainingPlan(data:Data,planId:string,now:Date|string|number|undefined=undefined):Data{
  const next=structuredClone(data),plan=(next.trainingPlans??[]).find(row=>row.id===planId);if(!plan)throw new Error('This training plan is unavailable.');
  const at=new Date(toMillis(now)).toISOString();
  next.trainingPlans=(next.trainingPlans??[]).map(row=>{
    if(row.profileId!==plan.profileId)return row;
    if(row.id===planId)return {...row,status:'active' as const,updatedAt:at};
    if(row.status==='active')return {...row,status:'paused' as const,updatedAt:at};
    return row;
  });
  return next;
}
export function setTrainingPlanStatus(data:Data,planId:string,status:'draft'|'paused'|'completed'|'archived',now:Date|string|number|undefined=undefined):Data{
  const next=structuredClone(data),at=new Date(toMillis(now)).toISOString(),plan=(next.trainingPlans??[]).find(row=>row.id===planId);if(!plan)throw new Error('This training plan is unavailable.');
  next.trainingPlans=(next.trainingPlans??[]).map(row=>row.id===planId?{...row,status,updatedAt:at}:row);return next;
}
export function updateTrainingPhase(data:Data,planId:string,phaseId:string,change:{name:string;kind:TrainingPhaseKind;weeklyMinutes:number;emphasis:TrainingEmphasis;focuses:{skillId:string;weight:1|2|3;note:string}[];notes:string},now:Date|string|number|undefined=undefined):Data{
  const next=structuredClone(data),plan=(next.trainingPlans??[]).find(row=>row.id===planId);if(!plan)throw new Error('This training plan is unavailable.');
  const phase=plan.phases.find(row=>row.id===phaseId);if(!phase)throw new Error('This training phase is unavailable.');
  const seen=new Set<string>();for(const focus of change.focuses){if(seen.has(focus.skillId))throw new Error('Phase focus skills must be unique.');seen.add(focus.skillId);}
  const at=new Date(toMillis(now)).toISOString();
  plan.phases=plan.phases.map(row=>row.id===phaseId?{...row,name:change.name.trim()||row.name,kind:change.kind,weeklyMinutes:Math.round(change.weeklyMinutes),emphasis:change.emphasis,focuses:change.focuses.map(focus=>({id:uuid(),...focus,note:focus.note.trim()})),notes:change.notes.trim()}:row);
  plan.updatedAt=at;return next;
}
