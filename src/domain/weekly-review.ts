import type { Data } from './models.js';
import type { PriorityCycle, PriorityItem } from './practice-state.js';
import type { AutopilotSessionIntent } from './autopilot.js';
import type { PracticeDiagnostics } from './practice-diagnostics.js';
import { buildPracticeIntelligence, type PracticeIntelligence } from './practice-intelligence.js';
import { activeProfile } from './profiles.js';
import { rankPracticeTargets, type PriorityCandidate, type PriorityFactorCode } from './priority-engine.js';
import { skillDefinition, skillDefinitionsFor } from './skill-graph.js';
import { localDate, uuid } from './utils.js';

export const WEEKLY_REVIEW_ENGINE_VERSION=2 as const;

export type WeeklyFocusRole='primary'|'secondary'|'support';

export interface WeeklyReviewWindow {
  from:string;
  to:string;
  previousFrom:string;
  previousTo:string;
}
export interface WeeklyFocusSuggestion {
  skillId:string;
  label:string;
  role:WeeklyFocusRole;
  weight:1|2|3;
  reasons:string[];
  examples:string[];
  signalCodes:PriorityFactorCode[];
}
export interface WeeklyReview {
  engineVersion:2;
  profileId:string;
  window:WeeklyReviewWindow;
  diagnostics:PracticeDiagnostics;
  intelligence:PracticeIntelligence;
  focus:WeeklyFocusSuggestion[];
  suggestedIntent:AutopilotSessionIntent;
  suggestedIntentReason:string;
  activeCycle?:PriorityCycle;
  recentCycles:PriorityCycle[];
}
export interface WeeklyFocusSelection {
  skillId:string;
  weight:1|2|3;
  note:string;
}
export interface WeeklyReviewOptions {
  profileId?:string;
  now?:Date|string|number;
  today?:string;
}

const DAY=86400000;
const urgentSignals=new Set<PriorityFactorCode>(['upcoming-performance','active-goal','retention-due','recent-weakness']);
const mediumSignals=new Set<PriorityFactorCode>(['training-phase','musical-transfer','domain-balance','neglected','profile-focus','manual-priority']);

const toMillis=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);
function parseDay(value:string):number{
  const [y,m,d]=value.split('-').map(Number);return Date.UTC(y!,m!-1,d!);
}
function dayString(ms:number):string{
  const date=new Date(ms);return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
}
function shiftDay(value:string,days:number):string{return dayString(parseDay(value)+days*DAY);}
function reviewWindow(today:string):WeeklyReviewWindow{
  return {from:shiftDay(today,-6),to:today,previousFrom:shiftDay(today,-13),previousTo:shiftDay(today,-7)};
}
function neutralizeActiveCycle(data:Data,profileId:string):Data{
  return {...data,priorityCycles:(data.priorityCycles??[]).filter(cycle=>!(cycle.profileId===profileId&&cycle.status==='active'))};
}
function recurringSkillReasons(diagnostics:PracticeDiagnostics,skillIds:string[]):Map<string,string[]>{
  const result=new Map<string,string[]>();
  for(const row of diagnostics.limitations){
    if(row.count<3||!row.evaluatedBlocks||row.count/row.evaluatedBlocks<.3)continue;
    for(const skillId of skillIds){
      const skill=skillDefinition(skillId);if(skill?.domain!==row.tag)continue;
      const reasons=result.get(skillId)??[];
      reasons.push(`${skill.label} limitation appeared in ${row.count} of ${row.evaluatedBlocks} evaluated blocks this week.`);
      result.set(skillId,reasons);
    }
  }
  return result;
}

interface FocusGroup {
  skillId:string;
  label:string;
  bestRank:number;
  bestScore:number;
  importance:number;
  tier:number;
  reasons:string[];
  examples:string[];
  signalCodes:Set<PriorityFactorCode>;
}
function signalTier(codes:Set<PriorityFactorCode>,hasRecurring:boolean):number{
  if(hasRecurring||[...codes].some(code=>urgentSignals.has(code)))return 0;
  if([...codes].some(code=>mediumSignals.has(code)))return 1;
  return 2;
}
function factorRows(candidate:PriorityCandidate){
  return candidate.factors.filter(row=>row.points>0).sort((a,b)=>b.points-a.points||a.code.localeCompare(b.code));
}
function focusSuggestions(data:Data,profileId:string,diagnostics:PracticeDiagnostics,now:number,today:string):WeeklyFocusSuggestion[]{
  const profile=data.profiles?.find(row=>row.id===profileId);if(!profile)return [];
  const definitions=skillDefinitionsFor(profile.instrumentType),allowed=new Set(definitions.map(row=>row.id));
  const recurring=recurringSkillReasons(diagnostics,[...allowed]);
  const candidates=rankPracticeTargets(neutralizeActiveCycle(data,profileId),profileId,{now,today});
  const groups=new Map<string,FocusGroup>();
  candidates.slice(0,40).forEach((candidate,rank)=>{
    for(const skillId of candidate.skillIds){
      if(!allowed.has(skillId))continue;
      const definition=skillDefinition(skillId),existing=groups.get(skillId)??{
        skillId,label:definition?.label??skillId,bestRank:rank,bestScore:candidate.score,importance:definition?.defaultImportance??0,tier:2,reasons:[],examples:[],signalCodes:new Set<PriorityFactorCode>(),
      };
      existing.bestRank=Math.min(existing.bestRank,rank);existing.bestScore=Math.max(existing.bestScore,candidate.score);
      if(!existing.examples.includes(candidate.label)&&existing.examples.length<3)existing.examples.push(candidate.label);
      for(const factor of factorRows(candidate)){
        existing.signalCodes.add(factor.code);
        if(!existing.reasons.includes(factor.detail)&&existing.reasons.length<5)existing.reasons.push(factor.detail);
      }
      groups.set(skillId,existing);
    }
  });
  for(const [skillId,reasons] of recurring){
    const definition=skillDefinition(skillId),existing=groups.get(skillId)??{
      skillId,label:definition?.label??skillId,bestRank:Number.MAX_SAFE_INTEGER,bestScore:0,importance:definition?.defaultImportance??0,tier:2,reasons:[],examples:[],signalCodes:new Set<PriorityFactorCode>(),
    };
    for(const reason of reasons)if(!existing.reasons.includes(reason))existing.reasons.unshift(reason);
    groups.set(skillId,existing);
  }
  for(const group of groups.values())group.tier=signalTier(group.signalCodes,recurring.has(group.skillId));
  const sorted=[...groups.values()].sort((a,b)=>a.tier-b.tier||a.bestRank-b.bestRank||b.bestScore-a.bestScore||b.importance-a.importance||a.label.localeCompare(b.label)).slice(0,3);
  const roles:WeeklyFocusRole[]=['primary','secondary','support'],weights=( [3,2,1] as const );
  return sorted.map((group,index)=>({
    skillId:group.skillId,label:group.label,role:roles[index]!,weight:weights[index]!,
    reasons:[...(recurring.get(group.skillId)??[]),...group.reasons].filter((value,i,array)=>array.indexOf(value)===i).slice(0,3),
    examples:group.examples.slice(0,2),signalCodes:[...group.signalCodes].sort(),
  }));
}

function intentForFocus(focus:WeeklyFocusSuggestion[]):{intent:AutopilotSessionIntent;reason:string}{
  const primary=focus[0];if(!primary)return {intent:'balanced',reason:'No single skill area has enough evidence to dominate next week.'};
  if(primary.signalCodes.includes('upcoming-performance')||skillDefinition(primary.skillId)?.domain==='repertoire')return {intent:'songs',reason:'The primary focus is current repertoire/performance work.'};
  const domain=skillDefinition(primary.skillId)?.domain;
  if(domain==='timing')return {intent:'timing',reason:'The primary focus is timing.'};
  if(domain==='technique'||domain==='coordination')return {intent:'technique',reason:`The primary focus is ${primary.label.toLowerCase()}.`};
  return {intent:'balanced',reason:`${primary.label} is the primary focus, but the rest of the week still benefits from a mixed session.`};
}

export function buildWeeklyReview(data:Data,options:WeeklyReviewOptions={}):WeeklyReview{
  const now=toMillis(options.now),profileId=options.profileId??activeProfile(data).id,today=options.today??localDate(new Date(now)),window=reviewWindow(today);
  const intelligence=buildPracticeIntelligence(data,{profileId,from:window.from,to:window.to,now,today}),diagnostics=intelligence.diagnostics;
  const focus=focusSuggestions(data,profileId,diagnostics,now,today),intent=intentForFocus(focus);
  const cycles=(data.priorityCycles??[]).filter(cycle=>cycle.profileId===profileId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||b.createdAt.localeCompare(a.createdAt));
  return {
    engineVersion:WEEKLY_REVIEW_ENGINE_VERSION,profileId,window,diagnostics,intelligence,focus,suggestedIntent:intent.intent,suggestedIntentReason:intent.reason,
    ...(cycles.find(cycle=>cycle.status==='active')?{activeCycle:structuredClone(cycles.find(cycle=>cycle.status==='active')!)}:{}),
    recentCycles:cycles.filter(cycle=>cycle.status!=='active').slice(0,5).map(cycle=>structuredClone(cycle)),
  };
}

function closeActive(cycles:PriorityCycle[],profileId:string,today:string,at:string):PriorityCycle[]{
  return cycles.map(cycle=>{
    if(cycle.profileId!==profileId||cycle.status!=='active')return structuredClone(cycle);
    const endedOn=today<cycle.startedOn?cycle.startedOn:today;
    return {...structuredClone(cycle),status:'completed' as const,endedOn,updatedAt:at};
  });
}
function validateSelections(data:Data,profileId:string,selections:WeeklyFocusSelection[]):WeeklyFocusSelection[]{
  if(!selections.length)throw new Error('Choose at least one weekly priority.');
  if(selections.length>5)throw new Error('A priority cycle supports at most five priorities.');
  const profile=data.profiles?.find(row=>row.id===profileId);if(!profile)throw new Error('This practice profile is unavailable.');
  const allowed=new Set(skillDefinitionsFor(profile.instrumentType).map(row=>row.id)),seen=new Set<string>();
  return selections.map(row=>{
    if(!allowed.has(row.skillId))throw new Error('A selected priority does not belong to this instrument.');
    if(seen.has(row.skillId))throw new Error('Weekly priorities must be unique.');seen.add(row.skillId);
    if(![1,2,3].includes(row.weight))throw new Error('Priority strength must be Primary, Secondary, or Support.');
    return {skillId:row.skillId,weight:row.weight,note:row.note.trim()};
  });
}
export function applyWeeklyPriorityCycle(data:Data,profileId:string,selections:WeeklyFocusSelection[],options:{now?:Date|string|number;today?:string;name?:string}={}):Data{
  const now=toMillis(options.now),at=new Date(now).toISOString(),today=options.today??localDate(new Date(now)),rows=validateSelections(data,profileId,selections);
  const next=structuredClone(data),items:PriorityItem[]=rows.map(row=>({id:uuid(),skillId:row.skillId,weight:row.weight,note:row.note}));
  next.priorityCycles=[...closeActive(next.priorityCycles??[],profileId,today,at),{
    id:uuid(),createdAt:at,updatedAt:at,profileId,name:options.name?.trim()||`Weekly focus · ${today}`,status:'active' as const,startedOn:today,items,
  }];
  return next;
}
export function restorePriorityCycle(data:Data,profileId:string,sourceCycleId:string,options:{now?:Date|string|number;today?:string}={}):Data{
  const source=(data.priorityCycles??[]).find(cycle=>cycle.id===sourceCycleId&&cycle.profileId===profileId);
  if(!source)throw new Error('That previous priority cycle is unavailable.');
  return applyWeeklyPriorityCycle(data,profileId,source.items.map(item=>({skillId:item.skillId,weight:item.weight,note:item.note})),{
    now:options.now,today:options.today,name:`Restored · ${source.name}`,
  });
}
export function endActivePriorityCycle(data:Data,profileId:string,options:{now?:Date|string|number;today?:string}={}):Data{
  const now=toMillis(options.now),at=new Date(now).toISOString(),today=options.today??localDate(new Date(now)),next=structuredClone(data);
  next.priorityCycles=closeActive(next.priorityCycles??[],profileId,today,at);return next;
}
