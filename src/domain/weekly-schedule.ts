import type { Data, TrainingEmphasis, WeeklySchedule, WeeklyScheduleDay, WeeklyScheduleDayKind } from './models.js';
import { activeProfile } from './profiles.js';
import { activeTrainingPlan, trainingPhaseForDate } from './training-plan.js';
import { skillDefinition } from './skill-graph.js';
import { finishedSessions, sessionTime } from './analytics.js';
import { localDate, uuid } from './utils.js';
import { buildPracticeLoadCalibration } from './practice-load.js';

export const WEEKLY_SCHEDULE_ENGINE_VERSION=1 as const;
export const MAX_SCHEDULED_DAY_MINUTES=180;

export interface BuildWeeklyScheduleOptions {
  profileId?:string;
  weekStart?:string;
  targetMinutes?:number;
  practiceDays?:number;
  includeOptionalDay?:boolean;
  adaptiveLoad?:boolean;
  now?:Date|string|number;
}
export interface WeeklyScheduleDayActual {
  date:string;
  activeSeconds:number;
  sessions:number;
}
export interface WeeklyScheduleActuals {
  activeSeconds:number;
  activeDays:number;
  scheduledPracticeDays:number;
  practiceDaysWithActivity:number;
  byDate:WeeklyScheduleDayActual[];
}

const DAY_PATTERNS:Record<number,number[]>={
  1:[2],
  2:[1,4],
  3:[0,2,4],
  4:[0,1,3,5],
  5:[0,1,2,4,5],
  6:[0,1,2,3,4,5],
  7:[0,1,2,3,4,5,6],
};

const toMillis=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);
function dateAtNoon(value:string):Date{return new Date(value+'T12:00:00');}
export function weekStartFor(value:Date|string|number=new Date()):string{
  const date=value instanceof Date?new Date(value):typeof value==='number'?new Date(value):dateAtNoon(value);
  date.setHours(12,0,0,0);
  date.setDate(date.getDate()-(date.getDay()+6)%7);
  return localDate(date);
}
export function addScheduleDays(value:string,days:number):string{
  const date=dateAtNoon(value);date.setDate(date.getDate()+days);return localDate(date);
}
function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
function recentGoal(data:Data,profileId:string,type:'weekly-minutes'|'weekly-sessions'){
  return data.goals.filter(goal=>goal.type===type&&!goal.completed&&(!goal.profileId||goal.profileId===profileId))
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||b.createdAt.localeCompare(a.createdAt))[0];
}
function profileDefaultWeeklyMinutes(data:Data,profileId:string):number{
  const profile=data.profiles?.find(row=>row.id===profileId),sessions=recentGoal(data,profileId,'weekly-sessions');
  return Math.max(5,Math.round((profile?.defaultSessionMinutes??30)*(sessions?.targetValue??3)));
}
function fallbackWeeklyMinutes(data:Data,profileId:string):number{
  const minutes=recentGoal(data,profileId,'weekly-minutes');if(minutes)return Math.round(minutes.targetValue);
  return profileDefaultWeeklyMinutes(data,profileId);
}
function targetFromTraining(data:Data,profileId:string,weekStart:string):number|undefined{
  const plan=activeTrainingPlan(data,profileId);if(!plan)return undefined;
  const fallback=fallbackWeeklyMinutes(data,profileId),values:number[]=[];
  let overlap=false;
  for(let i=0;i<7;i++){
    const date=addScheduleDays(weekStart,i);
    if(date>=plan.startOn&&date<=plan.endOn){
      overlap=true;values.push((trainingPhaseForDate(plan,date)?.weeklyMinutes??plan.baselineWeeklyMinutes)/7);
    }else values.push(fallback/7);
  }
  return overlap?Math.max(5,Math.round(values.reduce((sum,value)=>sum+value,0))):undefined;
}
function constrainPracticeDays(count:number,targetMinutes:number):number{
  let next=clamp(Math.round(count),1,7);
  next=Math.max(next,Math.ceil(targetMinutes/MAX_SCHEDULED_DAY_MINUTES));
  next=Math.min(next,Math.max(1,Math.floor(targetMinutes/5)));
  if(next>7)throw new Error('This weekly target cannot fit into seven sessions of 180 minutes or less.');
  return next;
}
function recommendedPracticeDays(data:Data,profileId:string,targetMinutes:number):number{
  const explicit=recentGoal(data,profileId,'weekly-sessions');
  const profile=data.profiles?.find(row=>row.id===profileId),defaultMinutes=Math.max(5,profile?.defaultSessionMinutes??30);
  return constrainPracticeDays(explicit?Math.round(explicit.targetValue):Math.round(targetMinutes/defaultMinutes),targetMinutes);
}
function allocateMinutes(total:number,count:number):number[]{
  if(!Number.isInteger(total)||total<5)throw new Error('Weekly planned minutes must be a whole number of at least 5.');
  if(!Number.isInteger(count)||count<1||count>7)throw new Error('Choose between 1 and 7 planned practice days.');
  if(total<count*5)throw new Error('The weekly target is too small for that many practice days. Use at least 5 minutes per planned day.');
  if(total>count*MAX_SCHEDULED_DAY_MINUTES)throw new Error(`The weekly target is too large for ${count} practice days. Use more days or a smaller target.`);
  const base=Math.floor(total/count),remainder=total-base*count;
  return Array.from({length:count},(_,index)=>base+(index<remainder?1:0));
}
function intentFromPriority(data:Data,profileId:string):TrainingEmphasis|undefined{
  const cycle=data.priorityCycles?.find(row=>row.profileId===profileId&&row.status==='active');
  const item=[...(cycle?.items??[])].sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id))[0];if(!item)return undefined;
  const domain=skillDefinition(item.skillId)?.domain;
  if(domain==='repertoire')return 'songs';
  if(domain==='timing')return 'timing';
  if(domain==='technique'||domain==='coordination')return 'technique';
  return undefined;
}
function intentForDate(data:Data,profileId:string,date:string):TrainingEmphasis{
  const priority=intentFromPriority(data,profileId);if(priority)return priority;
  const plan=activeTrainingPlan(data,profileId);
  return plan&&date>=plan.startOn&&date<=plan.endOn?(trainingPhaseForDate(plan,date)?.emphasis??'balanced'):'balanced';
}
function sourceSnapshot(data:Data,profileId:string,weekStart:string,loadCalibration?:WeeklySchedule['source']['loadCalibration']):WeeklySchedule['source']{
  const plan=activeTrainingPlan(data,profileId),phaseIds:string[]=[],phaseNames:string[]=[];
  if(plan)for(let i=0;i<7;i++){
    const date=addScheduleDays(weekStart,i),phase=date>=plan.startOn&&date<=plan.endOn?trainingPhaseForDate(plan,date):undefined;
    if(phase&&!phaseIds.includes(phase.id)){phaseIds.push(phase.id);phaseNames.push(phase.name);}
  }
  const cycle=data.priorityCycles?.find(row=>row.profileId===profileId&&row.status==='active');
  return {
    engineVersion:WEEKLY_SCHEDULE_ENGINE_VERSION,
    ...(plan&&phaseIds.length?{trainingPlanId:plan.id,trainingPlanName:plan.name}:{}),
    trainingPhaseIds:phaseIds,trainingPhaseNames:phaseNames,
    ...(cycle?{priorityCycleId:cycle.id,priorityCycleName:cycle.name}:{}),
    ...(loadCalibration?{loadCalibration}:{}),
  };
}
function optionalIndex(practiceIndexes:Set<number>):number|undefined{
  for(const index of [5,6,4,3,2,1,0])if(!practiceIndexes.has(index))return index;
  return undefined;
}
function selectedPracticeIndexes(practiceDays:number,preferredWeekdays?:number[]):number[]{
  if(!preferredWeekdays)return [...DAY_PATTERNS[practiceDays]!];
  return preferredWeekdays.slice(0,practiceDays).sort((a,b)=>a-b);
}
function buildDays(data:Data,profileId:string,weekStart:string,targetMinutes:number,practiceDays:number,includeOptional:boolean,preferredWeekdays?:number[]):WeeklyScheduleDay[]{
  const allocations=allocateMinutes(targetMinutes,practiceDays),indexes=selectedPracticeIndexes(practiceDays,preferredWeekdays),practiceSet=new Set(indexes),optional=includeOptional?optionalIndex(practiceSet):undefined;
  const average=Math.round(targetMinutes/practiceDays);
  return Array.from({length:7},(_,index)=>{
    const date=addScheduleDays(weekStart,index),position=indexes.indexOf(index);
    const kind:WeeklyScheduleDayKind=position>=0?'practice':index===optional?'optional':'rest';
    return {
      id:uuid(),date,kind,
      plannedMinutes:kind==='practice'?allocations[position]!:kind==='optional'?clamp(average,5,MAX_SCHEDULED_DAY_MINUTES):0,
      intent:intentForDate(data,profileId,date),note:'',
    };
  });
}
export function buildWeeklySchedule(data:Data,options:BuildWeeklyScheduleOptions={}):WeeklySchedule{
  const now=toMillis(options.now),profileId=options.profileId??activeProfile(data).id,weekStart=options.weekStart??weekStartFor(now);
  if(weekStartFor(weekStart)!==weekStart)throw new Error('Weekly schedules must start on Monday.');

  const trainingTarget=targetFromTraining(data,profileId,weekStart),minuteGoal=recentGoal(data,profileId,'weekly-minutes');
  const baselineMinutes=Math.round(trainingTarget??minuteGoal?.targetValue??profileDefaultWeeklyMinutes(data,profileId));
  const targetSource=trainingTarget!==undefined?'training-plan' as const:minuteGoal?'weekly-goal' as const:'profile-default' as const;
  const calibration=buildPracticeLoadCalibration(data,profileId,weekStart,baselineMinutes,targetSource);
  const adaptiveEnabled=options.adaptiveLoad??true,adaptiveReady=adaptiveEnabled&&calibration.confidence!=='low';
  const adaptiveTarget=targetSource==='profile-default'&&adaptiveReady?calibration.suggestedWeeklyMinutes:baselineMinutes;
  const targetMinutes=Math.round(options.targetMinutes??adaptiveTarget);
  if(targetMinutes>7*MAX_SCHEDULED_DAY_MINUTES)throw new Error('Weekly schedules support up to 1,260 planned minutes. Split larger workloads manually.');

  const explicitSessionGoal=recentGoal(data,profileId,'weekly-sessions');
  const practiceDays=options.practiceDays??(
    !explicitSessionGoal&&adaptiveReady
      ?constrainPracticeDays(calibration.suggestedPracticeDays,targetMinutes)
      :recommendedPracticeDays(data,profileId,targetMinutes)
  );
  const preferredWeekdays=adaptiveReady?calibration.preferredWeekdays:undefined;
  const chosenIndexes=selectedPracticeIndexes(practiceDays,preferredWeekdays),legacyIndexes=DAY_PATTERNS[practiceDays]!;
  const loadCalibration=adaptiveEnabled?{
    ...calibration,
    loadAdjusted:targetSource==='profile-default'&&targetMinutes!==baselineMinutes&&targetMinutes===calibration.suggestedWeeklyMinutes,
    patternAdjusted:JSON.stringify(chosenIndexes)!==JSON.stringify(legacyIndexes),
  }:undefined;
  const at=new Date(now).toISOString();
  return {
    id:uuid(),createdAt:at,updatedAt:at,profileId,weekStart,status:'draft',targetMinutes,
    source:sourceSnapshot(data,profileId,weekStart,loadCalibration),
    days:buildDays(data,profileId,weekStart,targetMinutes,practiceDays,options.includeOptionalDay??true,preferredWeekdays),
  };
}
export function scheduleForWeek(data:Data,profileId:string,weekStart:string):WeeklySchedule|undefined{
  return (data.weeklySchedules??[]).find(schedule=>schedule.profileId===profileId&&schedule.weekStart===weekStart);
}
export function appliedScheduleDay(data:Data,profileId:string,date:string):{schedule:WeeklySchedule;day:WeeklyScheduleDay}|undefined{
  const schedule=scheduleForWeek(data,profileId,weekStartFor(date));if(schedule?.status!=='applied')return undefined;
  const day=schedule.days.find(row=>row.date===date);return day?{schedule,day}:undefined;
}
export function saveGeneratedWeeklySchedule(data:Data,schedule:WeeklySchedule):Data{
  const next=structuredClone(data),rows=next.weeklySchedules??[];
  next.weeklySchedules=[...rows.filter(row=>!(row.profileId===schedule.profileId&&row.weekStart===schedule.weekStart)),structuredClone(schedule)];
  return next;
}
export function regenerateWeeklySchedule(data:Data,scheduleId:string,options:BuildWeeklyScheduleOptions={}):Data{
  const current=(data.weeklySchedules??[]).find(row=>row.id===scheduleId);if(!current)throw new Error('This weekly schedule is unavailable.');
  const generated=buildWeeklySchedule(data,{...options,profileId:current.profileId,weekStart:current.weekStart}),replacement={...generated,id:current.id,createdAt:current.createdAt,status:'draft' as const};
  return saveGeneratedWeeklySchedule(data,replacement);
}
export function updateWeeklyScheduleDay(data:Data,scheduleId:string,dayId:string,change:{kind:WeeklyScheduleDayKind;plannedMinutes:number;intent:TrainingEmphasis;note:string},now:Date|string|number|undefined=undefined):Data{
  const next=structuredClone(data),schedule=(next.weeklySchedules??[]).find(row=>row.id===scheduleId);if(!schedule)throw new Error('This weekly schedule is unavailable.');
  const day=schedule.days.find(row=>row.id===dayId);if(!day)throw new Error('This scheduled day is unavailable.');
  const minutes=change.kind==='rest'?0:Math.round(change.plannedMinutes);
  if(change.kind!=='rest'&&(minutes<5||minutes>MAX_SCHEDULED_DAY_MINUTES))throw new Error('Planned practice days must be between 5 and 180 minutes.');
  Object.assign(day,{kind:change.kind,plannedMinutes:minutes,intent:change.intent,note:change.note.trim()});
  schedule.targetMinutes=schedule.days.filter(row=>row.kind==='practice').reduce((sum,row)=>sum+row.plannedMinutes,0);
  schedule.updatedAt=new Date(toMillis(now)).toISOString();return next;
}
export function applyWeeklySchedule(data:Data,scheduleId:string,now:Date|string|number|undefined=undefined):Data{
  const next=structuredClone(data),schedule=(next.weeklySchedules??[]).find(row=>row.id===scheduleId);if(!schedule)throw new Error('This weekly schedule is unavailable.');
  if(!schedule.days.some(row=>row.kind==='practice'))throw new Error('Add at least one planned practice day before applying this week.');
  schedule.status='applied';schedule.updatedAt=new Date(toMillis(now)).toISOString();return next;
}
export function weeklyScheduleActuals(data:Data,schedule:WeeklySchedule):WeeklyScheduleActuals{
  const rows=schedule.days.map(day=>{
    const sessions=finishedSessions(data.sessions).filter(session=>session.profileId===schedule.profileId&&localDate(session.startedAt)===day.date);
    return {date:day.date,activeSeconds:sessions.reduce((sum,session)=>sum+sessionTime(session),0),sessions:sessions.length};
  });
  return {
    activeSeconds:rows.reduce((sum,row)=>sum+row.activeSeconds,0),
    activeDays:rows.filter(row=>row.activeSeconds>0).length,
    scheduledPracticeDays:schedule.days.filter(day=>day.kind==='practice').length,
    practiceDaysWithActivity:schedule.days.filter(day=>day.kind==='practice'&&(rows.find(row=>row.date===day.date)?.activeSeconds??0)>0).length,
    byDate:rows,
  };
}
