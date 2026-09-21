import type { PlanGeneration, PracticeEvaluation, PracticePrescription, PracticeState, PracticeTargetRef, PriorityCycle } from './practice-state.js';
import { practiceTargetKey } from './practice-state.js';
import { isSkillForInstrument } from './skill-graph.js';
import type { Data } from './models.js';
import { arr, dateOnly, fail, id, iso, name, num, obj, one, optional, text, uniqueIds, type Validator } from './schema.js';

const result=one('not-yet','usable','solid');
const context=one('normal','cold','transfer','maintenance','performance','unknown');
const limitation=one('timing','coordination','memory','dynamics','tension','sound','accuracy','endurance','too-fast','form');
const intent=one('ramp-in','learn','build','stabilize','retest','apply','maintain','perform','free');
const reason=one('active-priority','active-goal','retention-due','recent-weakness','neglected','domain-balance','upcoming-performance','prerequisite','musical-transfer','maintenance','user-request');
const mastery=one('unassessed','discover','learn','build','stabilize','retest','apply','maintain');

export const validatePracticeTarget:Validator<PracticeTargetRef>=(v,p='Practice target')=>{
  const kind=v!==null&&typeof v==='object'&&'kind' in v?(v as {kind?:unknown}).kind:undefined;
  switch(kind){
    case 'skill':return obj({kind:one('skill'),profileId:id,skillId:id})(v,p);
    case 'exercise':return obj({kind:one('exercise'),exerciseId:id})(v,p);
    case 'song':return obj({kind:one('song'),songId:id,partId:optional(id)})(v,p);
    case 'song-section':return obj({kind:one('song-section'),songId:id,partId:optional(id),sectionId:id})(v,p);
    case 'song-transition':return obj({kind:one('song-transition'),songId:id,partId:optional(id),transitionId:id})(v,p);
    case 'lesson':return obj({kind:one('lesson'),profileId:id,courseId:id,lessonId:id,revision:num(1,10000,true)})(v,p);
    default:return fail(p,'unknown practice target');
  }
};

export const validatePracticeEvaluation:Validator<PracticeEvaluation>=(v,p='Practice evaluation')=>{
  const r=obj({id,timestamp:iso,result,context,limitations:arr(limitation,10),note:text()})(v,p);
  if(new Set(r.limitations).size!==r.limitations.length)fail(p,'limitations must be unique');
  return r;
};

export const validatePracticePrescription:Validator<PracticePrescription>=(v,p='Practice prescription')=>{
  const r=obj({target:validatePracticeTarget,intent,reasons:arr(reason,20),generatedBy:one('autopilot','learn','set-prep','manual'),engineVersion:optional(num(1,10000,true))})(v,p);
  if(new Set(r.reasons).size!==r.reasons.length)fail(p,'reasons must be unique');
  return r;
};

export const validatePlanGeneration:Validator<PlanGeneration>=obj({
  kind:one('manual','routine','autopilot','set-prep','lesson'),
  generatedAt:iso,
  requestedMinutes:optional(num(1,1440,true)),
  sessionIntent:optional(one('balanced','songs','timing','technique')),
  engineVersion:optional(num(1,10000,true)),
});

const tempo=obj({
  peak:optional(num(20,300,true)),working:optional(num(20,300,true)),cold:optional(num(20,300,true)),
  peakAt:optional(iso),workingAt:optional(iso),coldAt:optional(iso),
});
const recent=obj({solid:num(0,1000000,true),usable:num(0,1000000,true),notYet:num(0,1000000,true)});
const scheduling=obj({
  lastScheduledAt:optional(iso),lastSkippedAt:optional(iso),consecutiveSkips:num(0,1000000,true),
  snoozedUntil:optional(iso),manualPriority:one(-2,-1,0,1,2),
});
const engine=obj({version:one(1),derivedAt:iso});

export const validatePracticeState:Validator<PracticeState>=(v,p='Practice state')=>{
  const r=obj({
    id,createdAt:iso,updatedAt:iso,profileId:id,targetKey:text(600,1),target:validatePracticeTarget,mastery,
    lastPracticedAt:optional(iso),lastEvaluatedAt:optional(iso),lastRetestAt:optional(iso),lastAppliedAt:optional(iso),nextReviewAt:optional(iso),
    latestResult:optional(result),limitations:arr(limitation,10),evidenceCount:num(0,10000000,true),tempo:optional(tempo),recent,
    scheduling,engine,
  })(v,p);
  if(r.targetKey!==practiceTargetKey(r.target))fail(p,'target key does not match target');
  if(new Set(r.limitations).size!==r.limitations.length)fail(p,'limitations must be unique');
  return r;
};

const priorityItem=obj({id,skillId:id,weight:one(1,2,3),note:text()});
export const validatePriorityCycle:Validator<PriorityCycle>=(v,p='Priority cycle')=>{
  const r=obj({id,createdAt:iso,updatedAt:iso,profileId:id,name,status:one('active','completed','archived'),startedOn:dateOnly,endedOn:optional(dateOnly),items:arr(priorityItem,5)})(v,p);
  uniqueIds(r.items,`${p}.items`);
  if(!r.items.length)fail(p,'add at least one priority');
  if(new Set(r.items.map(i=>i.skillId)).size!==r.items.length)fail(p,'priority skills must be unique');
  if(r.endedOn&&r.endedOn<r.startedOn)fail(p,'end date cannot be before start date');
  return r;
};

export function assertPracticeTargetReferences(target:PracticeTargetRef,profileId:string,data:Data,path='Practice target'):void {
  const profile=data.profiles?.find(p=>p.id===profileId)??fail(path,'profile does not exist');
  if(target.kind==='skill'){
    if(target.profileId!==profileId||!isSkillForInstrument(target.skillId,profile.instrumentType))fail(path,'skill does not belong to this profile');
  }else if(target.kind==='exercise'){
    const exercise=data.exercises.find(e=>e.id===target.exerciseId);
    if(!exercise||exercise.profileId!==profileId)fail(path,'exercise does not belong to this profile');
  }else if(target.kind==='song'||target.kind==='song-section'||target.kind==='song-transition'){
    const song=data.songs.find(s=>s.id===target.songId)??fail(path,'song does not exist');
    const part=target.partId?song.parts?.find(p=>p.id===target.partId):undefined;
    if(target.partId&&(!part||part.profileId!==profileId))fail(path,'song part does not belong to this profile');
    if(target.kind==='song-section'&&!(part?.sections??song.sections).some(s=>s.id===target.sectionId))fail(path,'song section does not exist');
    if(target.kind==='song-transition'&&!(part?.transitions??song.transitions??[]).some(t=>t.id===target.transitionId))fail(path,'song transition does not exist');
  }else if(target.kind==='lesson'&&target.profileId!==profileId)fail(path,'lesson target belongs to a different profile');
}

export function assertPracticeStateReferences(state:PracticeState,data:Data):void {
  assertPracticeTargetReferences(state.target,state.profileId,data,'Practice state');
}

export function assertPriorityCycleReferences(cycle:PriorityCycle,data:Data):void {
  const profile=data.profiles?.find(p=>p.id===cycle.profileId)??fail('Priority cycle','profile does not exist');
  for(const item of cycle.items)if(!isSkillForInstrument(item.skillId,profile.instrumentType))fail('Priority cycle','skill does not belong to this profile');
}
