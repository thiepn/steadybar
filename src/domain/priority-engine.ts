import type { Data, Exercise, Goal, Song } from './models.js';
import { reviewDue } from './mastery-engine.js';
import { activeProfile } from './profiles.js';
import { skillDefinition, skillDefinitionsFor } from './skill-graph.js';
import type { PracticeReasonCode, PracticeState, PracticeTargetRef } from './practice-state.js';
import { practiceTargetKey } from './practice-state.js';
import { localDate } from './utils.js';

const HOUR=60*60*1000,DAY=24*HOUR;

export type PriorityFactorCode =
  | PracticeReasonCode
  | 'manual-priority'
  | 'profile-focus'
  | 'musical-usefulness'
  | 'recent-repetition'
  | 'recent-scheduling'
  | 'skip-pattern'
  | 'prerequisite-gap'
  | 'level-mismatch'
  | 'repertoire-status'
  | 'snoozed';

export interface PriorityFactor {
  code:PriorityFactorCode;
  points:number;
  detail:string;
  prescriptionReason?:PracticeReasonCode;
}

export interface PriorityCandidate {
  target:PracticeTargetRef;
  targetKey:string;
  profileId:string;
  label:string;
  skillIds:string[];
  score:number;
  eligible:boolean;
  factors:PriorityFactor[];
  reasons:PracticeReasonCode[];
  state?:PracticeState;
}

export interface PriorityOptions {
  now?:Date|string|number;
  today?:string;
  includeIneligible?:boolean;
}

interface CandidateSeed {
  target:PracticeTargetRef;
  label:string;
  skillIds:string[];
  exercise?:Exercise;
  song?:Song;
  songStatus?:Song['status'];
}

const time=(value:string)=>Date.parse(value);
const toMillis=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);

function daysBetween(from:string,to:string):number {
  const f=from.split('-').map(Number),t=to.split('-').map(Number);
  return Math.round((Date.UTC(t[0]!,t[1]!-1,t[2]!)-Date.UTC(f[0]!,f[1]!-1,f[2]!))/DAY);
}

function repertoireSkillId(data:Data,profileId:string):string|undefined {
  const profile=data.profiles?.find(p=>p.id===profileId);if(!profile)return undefined;
  return skillDefinitionsFor(profile.instrumentType).find(s=>s.domain==='repertoire')?.id;
}

function skillLineage(id:string):string[] {
  const result:string[]=[];let current=skillDefinition(id),guard=0;
  while(current&&guard++<20){result.push(current.id);current=current.parentId?skillDefinition(current.parentId):undefined;}
  return result;
}

function candidateSkillSet(skillIds:string[]):Set<string> {
  return new Set(skillIds.flatMap(skillLineage));
}

function focusTokens(value:string):Set<string>{
  return new Set(value.toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).map(word=>word.length>3&&word.endsWith('s')?word.slice(0,-1):word));
}
function focusMatch(skillIds:string[],focusAreas:string[]):string|undefined {
  const labels=skillIds.flatMap(id=>{const skill=skillDefinition(id);return skill?[skill.label,skill.domain]:[];});
  return focusAreas.find(focus=>{
    const f=focusTokens(focus);
    return labels.some(label=>{const s=focusTokens(label);return s.size>0&&([...s].every(token=>f.has(token))||[...f].every(token=>s.has(token)));});
  });
}

function arrangement(song:Song,profileId:string){
  const part=song.parts?.find(p=>p.profileId===profileId);
  return {part,sections:part?.sections??song.sections,transitions:part?.transitions??song.transitions??[],status:part?.status??song.status};
}

function candidateSeeds(data:Data,profileId:string):CandidateSeed[] {
  const seeds:CandidateSeed[]=[];
  for(const exercise of data.exercises){
    if(exercise.profileId!==profileId||exercise.archived)continue;
    const skillIds=[exercise.primarySkillId,...(exercise.secondarySkillIds??[])].filter((id):id is string=>!!id);
    seeds.push({target:{kind:'exercise',exerciseId:exercise.id},label:exercise.name,skillIds,exercise});
  }
  const repertoire=repertoireSkillId(data,profileId);
  for(const song of data.songs){
    if(song.status==='archived')continue;
    const info=arrangement(song,profileId),skillIds=repertoire?[repertoire]:[],partId=info.part?.id;
    seeds.push({target:{kind:'song',songId:song.id,...(partId?{partId}:{})},label:song.title,skillIds,song,songStatus:info.status});
    for(const section of info.sections)seeds.push({target:{kind:'song-section',songId:song.id,...(partId?{partId}:{}),sectionId:section.id},label:song.title+' · '+section.name,skillIds,song,songStatus:info.status});
    for(const transition of info.transitions){
      const from=info.sections.find(s=>s.id===transition.fromSectionId)?.name??'Section',to=info.sections.find(s=>s.id===transition.toSectionId)?.name??'Section';
      seeds.push({target:{kind:'song-transition',songId:song.id,...(partId?{partId}:{}),transitionId:transition.id},label:transition.name||song.title+' · '+from+' → '+to,skillIds,song,songStatus:info.status});
    }
  }
  return seeds;
}

function goalMatches(goal:Goal,target:PracticeTargetRef):boolean {
  if(goal.completed)return false;
  if(target.kind==='exercise')return !!goal.exerciseId&&goal.exerciseId===target.exerciseId;
  if(target.kind==='song'||target.kind==='song-section'||target.kind==='song-transition'){
    if(!goal.songId||goal.songId!==target.songId)return false;
    return !goal.songPartId||goal.songPartId===(target.partId??undefined);
  }
  return false;
}

function recentSkillSeconds(data:Data,profileId:string,now:number):Map<string,number> {
  const result=new Map<string,number>(),exercises=new Map(data.exercises.map(e=>[e.id,e])),repertoire=repertoireSkillId(data,profileId);
  for(const session of data.sessions){
    if(session.status==='active'||session.profileId!==profileId||now-time(session.startedAt)>14*DAY)continue;
    for(const block of session.blocks){
      const skills:string[]=[];
      if(block.sourceExerciseId){
        const exercise=exercises.get(block.sourceExerciseId);
        if(exercise){if(exercise.primarySkillId)skills.push(exercise.primarySkillId);skills.push(...(exercise.secondarySkillIds??[]));}
      } else if(block.sourceSongId&&repertoire)skills.push(repertoire);
      for(const skill of new Set(skills))result.set(skill,(result.get(skill)??0)+block.actualActiveSeconds);
    }
  }
  return result;
}

function prerequisiteEvidence(data:Data,profileId:string,skillId:string):boolean {
  const exercises=new Map(data.exercises.map(e=>[e.id,e])),repertoire=repertoireSkillId(data,profileId);
  return (data.practiceStates??[]).filter(s=>s.profileId===profileId&&s.evidenceCount>0&&s.target.kind!=='skill').some(state=>{
    if(state.target.kind==='exercise'){
      const exercise=exercises.get(state.target.exerciseId);if(!exercise)return false;
      const skills=[exercise.primarySkillId,...(exercise.secondarySkillIds??[])].filter((id):id is string=>!!id);
      return skills.some(id=>skillLineage(id).includes(skillId));
    }
    return !!repertoire&&['song','song-section','song-transition'].includes(state.target.kind)&&skillLineage(repertoire).includes(skillId);
  });
}

function factor(code:PriorityFactorCode,points:number,detail:string,prescriptionReason?:PracticeReasonCode):PriorityFactor {
  return {code,points,detail,...(prescriptionReason?{prescriptionReason}:{})};
}

function upcomingPerformance(data:Data,target:PracticeTargetRef,today:string):{days:number;name:string}|undefined {
  if(target.kind!=='song'&&target.kind!=='song-section'&&target.kind!=='song-transition')return undefined;
  let best:{days:number;name:string}|undefined;
  for(const setlist of data.setlists){
    if(!setlist.date||!setlist.songIds.includes(target.songId))continue;
    const days=daysBetween(today,setlist.date);if(days<0||days>30)continue;
    if(!best||days<best.days)best={days,name:setlist.name};
  }
  return best;
}

function priorityCycleFactor(data:Data,profileId:string,skillIds:string[]):PriorityFactor|undefined {
  const cycle=data.priorityCycles?.find(c=>c.profileId===profileId&&c.status==='active');if(!cycle)return undefined;
  const lineage=candidateSkillSet(skillIds),matches=cycle.items.filter(item=>lineage.has(item.skillId)).sort((a,b)=>b.weight-a.weight||a.id.localeCompare(b.id)),item=matches[0];
  if(!item)return undefined;
  const label=skillDefinition(item.skillId)?.label??item.skillId,points=item.weight===3?18:item.weight===2?12:6;
  return factor('active-priority',points,'Current priority · '+label,'active-priority');
}

function stateFactorSet(state:PracticeState|undefined,now:number):PriorityFactor[] {
  if(!state)return [factor('neglected',8,'Not practiced yet','neglected')];
  const factors:PriorityFactor[]=[];
  if(state.scheduling.snoozedUntil&&time(state.scheduling.snoozedUntil)>now)factors.push(factor('snoozed',-1000,'Snoozed until '+localDate(state.scheduling.snoozedUntil)));
  if(state.scheduling.manualPriority)factors.push(factor('manual-priority',state.scheduling.manualPriority*8,state.scheduling.manualPriority>0?'Raised manually':'Lowered manually',state.scheduling.manualPriority>0?'user-request':undefined));
  if(state.scheduling.consecutiveSkips)factors.push(factor('skip-pattern',-4*Math.min(3,state.scheduling.consecutiveSkips),String(state.scheduling.consecutiveSkips)+' recent scheduled skip'+(state.scheduling.consecutiveSkips===1?'':'s')));
  if(state.scheduling.lastScheduledAt){
    const age=now-time(state.scheduling.lastScheduledAt);if(age>=0&&age<DAY)factors.push(factor('recent-scheduling',-6,'Already scheduled recently'));
  }
  if(reviewDue(state,now)){
    const overdue=Math.max(0,Math.floor((now-time(state.nextReviewAt!))/DAY)),points=16+Math.min(8,overdue);
    factors.push(factor('retention-due',points,overdue?'Retention review overdue by '+overdue+' day'+(overdue===1?'':'s'):'Retention review due','retention-due'));
  }
  if(state.latestResult==='not-yet')factors.push(factor('recent-weakness',12,'Recent result · Not Yet','recent-weakness'));
  else if(state.latestResult==='usable')factors.push(factor('recent-weakness',6,'Recent result · Usable','recent-weakness'));
  if(state.mastery==='learn')factors.push(factor('recent-weakness',6,'Still learning','recent-weakness'));
  else if(state.mastery==='build')factors.push(factor('recent-weakness',4,'Still building reliability','recent-weakness'));
  else if(state.mastery==='apply')factors.push(factor('musical-transfer',10,'Ready for musical transfer','musical-transfer'));
  if(state.mastery==='maintain'&&!reviewDue(state,now))factors.push(factor('maintenance',-6,'Stable and not due for maintenance'));
  if(state.lastPracticedAt){
    const age=now-time(state.lastPracticedAt);
    if(age>=0&&age<6*HOUR)factors.push(factor('recent-repetition',-18,'Practiced within the last 6 hours'));
    else if(age<DAY)factors.push(factor('recent-repetition',-10,'Practiced within the last day'));
    else if(age<3*DAY)factors.push(factor('recent-repetition',-4,'Practiced within the last 3 days'));
    else {
      const days=Math.floor(age/DAY),points=days>=60?12:days>=30?10:days>=14?7:days>=7?4:0;
      if(points)factors.push(factor('neglected',points,'Not revisited for '+days+' days','neglected'));
    }
  } else factors.push(factor('neglected',8,'Not practiced yet','neglected'));
  return factors;
}

function repertoireStatusFactor(status:Song['status']|undefined):PriorityFactor|undefined {
  if(status==='learning')return factor('repertoire-status',6,'Repertoire status · Learning');
  if(status==='practicing')return factor('repertoire-status',3,'Repertoire status · Practicing');
  if(status==='performance-ready')return factor('repertoire-status',-4,'Already marked performance-ready');
  return undefined;
}

function performanceFactor(data:Data,target:PracticeTargetRef,today:string):PriorityFactor|undefined {
  const upcoming=upcomingPerformance(data,target,today);if(!upcoming)return undefined;
  const points=upcoming.days<=2?24:upcoming.days<=7?18:upcoming.days<=14?12:6;
  const when=upcoming.days===0?'today':upcoming.days===1?'tomorrow':'in '+upcoming.days+' days';
  return factor('upcoming-performance',points,upcoming.name+' · '+when,'upcoming-performance');
}

function importanceFactor(skillIds:string[]):PriorityFactor|undefined {
  const importance=Math.max(0,...skillIds.map(id=>skillDefinition(id)?.defaultImportance??0)),points=importance>=3?6:importance===2?3:0;
  return points?factor('musical-usefulness',points,'High musical usefulness'):undefined;
}

function prerequisiteFactors(data:Data,profileId:string,skillIds:string[]):PriorityFactor[] {
  const missing=new Set<string>();
  for(const id of skillIds)for(const prereq of skillDefinition(id)?.prerequisiteIds??[])if(!prerequisiteEvidence(data,profileId,prereq))missing.add(prereq);
  if(!missing.size)return [];
  const labels=[...missing].map(id=>skillDefinition(id)?.label??id);
  return [factor('prerequisite-gap',-Math.min(6,missing.size*3),'Foundation still sparse · '+labels.join(', '))];
}

function balanceFactor(recent:Map<string,number>,skillIds:string[]):PriorityFactor|undefined {
  if(!skillIds.length||!recent.size)return undefined;
  const max=Math.max(...recent.values());if(max<=0)return undefined;
  const seconds=Math.min(...skillIds.map(id=>recent.get(id)??0)),ratio=seconds/max,points=seconds===0?6:ratio<.25?5:ratio<.5?3:0;
  return points?factor('domain-balance',points,'Balances recent practice','domain-balance'):undefined;
}

function profileFocusFactor(data:Data,profileId:string,skillIds:string[]):PriorityFactor|undefined {
  if(data.priorityCycles?.some(c=>c.profileId===profileId&&c.status==='active'))return undefined;
  const profile=data.profiles?.find(p=>p.id===profileId),match=profile?focusMatch(skillIds,profile.focusAreas):undefined;
  return match?factor('profile-focus',5,'Matches '+match):undefined;
}

function levelFactor(seed:CandidateSeed,data:Data,profileId:string):PriorityFactor|undefined {
  if(!seed.exercise?.level)return undefined;const profile=data.profiles?.find(p=>p.id===profileId);
  return profile&&seed.exercise.level!==profile.level?factor('level-mismatch',-4,'Exercise level · '+seed.exercise.level):undefined;
}

export function buildPriorityCandidates(data:Data,profileId?:string,options:PriorityOptions={}):PriorityCandidate[] {
  if(data.schemaVersion!==2)return [];
  const pid=profileId??activeProfile(data).id,now=toMillis(options.now),today=options.today??localDate(new Date(now)),states=new Map((data.practiceStates??[]).filter(s=>s.profileId===pid).map(s=>[s.targetKey,s]));
  const recent=recentSkillSeconds(data,pid,now),activeGoals=data.goals.filter(g=>!g.completed&&(!g.profileId||g.profileId===pid)),candidates:PriorityCandidate[]=[];
  for(const seed of candidateSeeds(data,pid)){
    const targetKey=practiceTargetKey(seed.target),state=states.get(targetKey),factors:PriorityFactor[]=[];
    factors.push(...stateFactorSet(state,now));
    const cycle=priorityCycleFactor(data,pid,seed.skillIds);if(cycle)factors.push(cycle);
    const focus=profileFocusFactor(data,pid,seed.skillIds);if(focus)factors.push(focus);
    const importance=importanceFactor(seed.skillIds);if(importance)factors.push(importance);
    const balance=balanceFactor(recent,seed.skillIds);if(balance)factors.push(balance);
    const level=levelFactor(seed,data,pid);if(level)factors.push(level);
    factors.push(...prerequisiteFactors(data,pid,seed.skillIds));
    if(activeGoals.some(goal=>goalMatches(goal,seed.target)))factors.push(factor('active-goal',20,'Linked to an active goal','active-goal'));
    const performance=performanceFactor(data,seed.target,today);if(performance)factors.push(performance);
    const repertoireStatus=repertoireStatusFactor(seed.songStatus);if(repertoireStatus)factors.push(repertoireStatus);
    const eligible=!factors.some(f=>f.code==='snoozed'),score=factors.reduce((sum,item)=>sum+item.points,0);
    const reasons=[...new Set(factors.filter(f=>f.points>0&&f.prescriptionReason).sort((a,b)=>b.points-a.points||a.code.localeCompare(b.code)).map(f=>f.prescriptionReason!))];
    candidates.push({target:seed.target,targetKey,profileId:pid,label:seed.label,skillIds:[...seed.skillIds],score,eligible,factors,reasons,state});
  }
  return candidates.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.targetKey.localeCompare(b.targetKey));
}

export function rankPracticeTargets(data:Data,profileId?:string,options:PriorityOptions={}):PriorityCandidate[] {
  const candidates=buildPriorityCandidates(data,profileId,options);
  return options.includeIneligible?candidates:candidates.filter(c=>c.eligible);
}

export function rankExerciseTargets(data:Data,profileId?:string,options:PriorityOptions={}):PriorityCandidate[] {
  return rankPracticeTargets(data,profileId,options).filter(c=>c.target.kind==='exercise');
}

export function priorityReasonText(candidate:PriorityCandidate):string {
  const order:PriorityFactorCode[]=['upcoming-performance','active-goal','active-priority','profile-focus','retention-due','recent-weakness','musical-transfer','domain-balance','neglected','musical-usefulness','repertoire-status','manual-priority'];
  const positive=candidate.factors.filter(f=>f.points>0);
  for(const code of order){const match=positive.find(f=>f.code===code);if(match)return match.detail;}
  return positive.sort((a,b)=>b.points-a.points||a.code.localeCompare(b.code))[0]?.detail??'General practice candidate';
}
