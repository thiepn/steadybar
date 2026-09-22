import type { DailyPlan, Data, PracticeSession, RoutineBlock, Song, SongSection } from './models.js';
import { exerciseBpm } from './protocols.js';
import { applyExerciseProgression, buildExerciseProgression } from './progression-engine.js';
import { rankPracticeTargets, type PriorityCandidate } from './priority-engine.js';
import { skillDefinition } from './skill-graph.js';
import type { PlanGeneration, PracticeIntent, PracticeReasonCode, PracticeState, PracticeTargetRef } from './practice-state.js';
import { practiceTargetKey } from './practice-state.js';
import { activeProfile } from './profiles.js';
import { advanceISO, localDate, uuid } from './utils.js';

export const AUTOPILOT_ENGINE_VERSION=1 as const;
export const AUTOPILOT_MINUTES=[5,10,15,20,30,45,60] as const;
export type AutopilotMinutes=(typeof AUTOPILOT_MINUTES)[number];
export type AutopilotSessionIntent='balanced'|'songs'|'timing'|'technique';
type SlotRole='ramp-in'|'primary'|'application'|'secondary'|'retention'|'repertoire';

export interface AutopilotOptions {
  profileId?:string;
  minutes:number;
  intent?:AutopilotSessionIntent;
  now?:Date|string|number;
  today?:string;
}

export interface AutopilotSelection {
  role:SlotRole;
  candidate:PriorityCandidate;
  block:RoutineBlock;
}

export interface AutopilotBuild {
  plan:DailyPlan;
  selections:AutopilotSelection[];
  totalSeconds:number;
}

const time=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);
const iso=(value:Date|string|number|undefined)=>new Date(time(value)).toISOString();

const PATTERNS:Record<AutopilotMinutes,{role:SlotRole;seconds:number}[]>={
  5:[{role:'primary',seconds:180},{role:'application',seconds:120}],
  10:[{role:'ramp-in',seconds:120},{role:'primary',seconds:240},{role:'application',seconds:240}],
  15:[{role:'ramp-in',seconds:120},{role:'primary',seconds:300},{role:'application',seconds:240},{role:'secondary',seconds:240}],
  20:[{role:'ramp-in',seconds:180},{role:'primary',seconds:420},{role:'application',seconds:300},{role:'secondary',seconds:300}],
  30:[{role:'ramp-in',seconds:180},{role:'primary',seconds:480},{role:'secondary',seconds:360},{role:'application',seconds:420},{role:'retention',seconds:360}],
  45:[{role:'ramp-in',seconds:300},{role:'primary',seconds:600},{role:'secondary',seconds:480},{role:'application',seconds:480},{role:'retention',seconds:480},{role:'repertoire',seconds:360}],
  60:[{role:'ramp-in',seconds:300},{role:'primary',seconds:900},{role:'secondary',seconds:720},{role:'application',seconds:720},{role:'retention',seconds:480},{role:'repertoire',seconds:480}],
};

function validMinutes(value:number):number {
  if(!Number.isInteger(value)||value<5||value>180)throw new Error('Choose a whole-number session duration from 5 to 180 minutes.');
  return value;
}
function patternForMinutes(minutes:number):{role:SlotRole;seconds:number}[] {
  const canonical=PATTERNS[minutes as AutopilotMinutes];if(canonical)return canonical.map(slot=>({...slot}));
  const baseMinutes=[...AUTOPILOT_MINUTES].filter(value=>value<minutes).at(-1)??AUTOPILOT_MINUTES[0],base=PATTERNS[baseMinutes]!,total=minutes*60,baseTotal=base.reduce((sum,slot)=>sum+slot.seconds,0);
  let remaining=total;
  return base.map((slot,index)=>{
    const seconds=index===base.length-1?remaining:Math.max(1,Math.floor(total*slot.seconds/baseTotal));
    remaining-=seconds;return {...slot,seconds};
  });
}

function skillDomains(candidate:PriorityCandidate):Set<string>{
  return new Set(candidate.skillIds.map(id=>skillDefinition(id)?.domain).filter((v):v is string=>!!v));
}
function repertoire(candidate:PriorityCandidate):boolean {
  return candidate.target.kind==='song'||candidate.target.kind==='song-section'||candidate.target.kind==='song-transition'||skillDomains(candidate).has('repertoire');
}
function candidateSongId(candidate:PriorityCandidate):string|undefined {
  return candidate.target.kind==='song'||candidate.target.kind==='song-section'||candidate.target.kind==='song-transition'?candidate.target.songId:undefined;
}
function matchesIntent(candidate:PriorityCandidate,intent:AutopilotSessionIntent):boolean {
  if(intent==='balanced')return true;
  if(intent==='songs')return repertoire(candidate);
  const domains=skillDomains(candidate);
  return intent==='timing'?domains.has('timing'):domains.has('technique');
}
function complementary(candidate:PriorityCandidate,intent:AutopilotSessionIntent):boolean {
  const domains=skillDomains(candidate);
  if(repertoire(candidate))return true;
  if(intent==='timing')return domains.has('groove')||domains.has('musicality');
  if(intent==='technique')return domains.has('fills')||domains.has('groove')||domains.has('musicality');
  return domains.has('groove')||domains.has('fills')||domains.has('musicality');
}
function warmupCandidate(data:Data,candidate:PriorityCandidate):boolean {
  const target=candidate.target;if(target.kind!=='exercise')return false;
  const exercise=data.exercises.find(e=>e.id===target.exerciseId);
  return exercise?.category==='warmup'||exercise?.skillArea==='warmup'||exercise?.tags.includes('warmup')||false;
}
function newMaterial(candidate:PriorityCandidate):boolean {
  return !candidate.state||candidate.state.evidenceCount===0;
}
function urgentNewMaterial(candidate:PriorityCandidate):boolean {
  return candidate.reasons.includes('upcoming-performance')||candidate.reasons.includes('active-goal');
}
function overlap(a:PriorityCandidate,b:PriorityCandidate|undefined):boolean {
  if(!b)return false;
  return a.skillIds.some(id=>b.skillIds.includes(id));
}
function roleBonus(data:Data,candidate:PriorityCandidate,role:SlotRole,intent:AutopilotSessionIntent,primary?:PriorityCandidate):number {
  let bonus=0;
  if(role==='primary')bonus+=matchesIntent(candidate,intent)?30:intent==='balanced'?0:-15;
  if(role==='ramp-in'){
    if(warmupCandidate(data,candidate))bonus+=45;
    if(primary&&overlap(candidate,primary))bonus+=18;
    if(candidate.target.kind==='exercise')bonus+=8;
    if(repertoire(candidate))bonus-=20;
    if(candidate.state?.mastery==='maintain'||candidate.state?.mastery==='stabilize')bonus+=5;
  }
  if(role==='application'){
    if(repertoire(candidate))bonus+=35;
    if(candidate.state?.mastery==='apply'||candidate.reasons.includes('musical-transfer'))bonus+=25;
    if(complementary(candidate,intent))bonus+=12;
  }
  if(role==='secondary'){
    if(matchesIntent(candidate,intent))bonus+=18;
    if(primary&&!overlap(candidate,primary))bonus+=16;
  }
  if(role==='retention'){
    if(candidate.reasons.includes('retention-due'))bonus+=40;
    if(candidate.state?.mastery==='retest')bonus+=25;
    if(candidate.state?.mastery==='maintain')bonus+=12;
  }
  if(role==='repertoire'&&repertoire(candidate))bonus+=50;
  return bonus;
}
function diversityPenalty(candidate:PriorityCandidate,selected:PriorityCandidate[],intent:AutopilotSessionIntent):number {
  if(selected.some(item=>item.targetKey===candidate.targetKey))return -1000;
  let penalty=0;
  const song=candidateSongId(candidate);
  if(song&&selected.some(item=>candidateSongId(item)===song))penalty-=intent==='songs'?8:18;
  if(intent==='balanced'){
    const usedSkills=new Set(selected.flatMap(item=>item.skillIds));
    if(candidate.skillIds.length&&candidate.skillIds.every(id=>usedSkills.has(id)))penalty-=10;
  }
  return penalty;
}
function choose(data:Data,candidates:PriorityCandidate[],role:SlotRole,intent:AutopilotSessionIntent,selected:PriorityCandidate[],primary?:PriorityCandidate,allowNew=true):PriorityCandidate|undefined {
  let pool=candidates;
  if((role==='primary'||role==='secondary')&&intent!=='balanced'){
    const preferred=candidates.filter(candidate=>matchesIntent(candidate,intent));if(preferred.length)pool=preferred;
  }else if((role==='application'||role==='repertoire')&&intent==='songs'){
    const preferred=candidates.filter(repertoire);if(preferred.length)pool=preferred;
  }
  if(!allowNew){
    const familiar=pool.filter(candidate=>!newMaterial(candidate)||urgentNewMaterial(candidate));
    if(familiar.length)pool=familiar;
  }
  const scored=pool.map((candidate,index)=>({candidate,index,fit:candidate.score+roleBonus(data,candidate,role,intent,primary)+diversityPenalty(candidate,selected,intent)}))
    .sort((a,b)=>b.fit-a.fit||a.index-b.index||a.candidate.targetKey.localeCompare(b.candidate.targetKey));
  const unused=scored.find(row=>!selected.some(item=>item.targetKey===row.candidate.targetKey));
  return unused?.candidate??scored[0]?.candidate;
}

function stateIntent(candidate:PriorityCandidate):PracticeIntent {
  const state=candidate.state;
  if(candidate.reasons.includes('retention-due')){
    if(state?.mastery==='maintain')return 'maintain';
    if(state?.mastery==='retest')return 'retest';
    if(state?.mastery==='apply')return 'apply';
  }
  switch(state?.mastery){
    case 'discover':return 'learn';
    case 'learn':return 'learn';
    case 'build':return 'build';
    case 'stabilize':return 'stabilize';
    case 'retest':return 'stabilize';
    case 'apply':return 'apply';
    case 'maintain':return 'maintain';
    case 'unassessed':return 'build';
    default:return 'learn';
  }
}
function intentFor(role:SlotRole,candidate:PriorityCandidate):PracticeIntent {
  if(role==='ramp-in')return 'ramp-in';
  if(role==='application'||role==='repertoire'){
    if(candidate.reasons.includes('upcoming-performance')&&repertoire(candidate))return 'perform';
    if(repertoire(candidate)||candidate.state?.mastery==='apply'||candidate.reasons.includes('musical-transfer'))return 'apply';
    return stateIntent(candidate);
  }
  if(role==='retention'){
    if(candidate.state?.mastery==='maintain')return 'maintain';
    if(candidate.state?.mastery==='apply')return 'apply';
    if(candidate.state?.mastery==='retest'||candidate.reasons.includes('retention-due'))return 'retest';
    return stateIntent(candidate);
  }
  return stateIntent(candidate);
}
function prescription(candidate:PriorityCandidate,role:SlotRole,intent:AutopilotSessionIntent){
  const reasons=[...candidate.reasons];
  if(intent!=='balanced'&&!reasons.includes('user-request'))reasons.push('user-request');
  return {target:structuredClone(candidate.target),intent:intentFor(role,candidate),reasons:[...new Set(reasons)] as PracticeReasonCode[],generatedBy:'autopilot' as const,engineVersion:AUTOPILOT_ENGINE_VERSION};
}

function arrangement(song:Song,target:Extract<PracticeTargetRef,{kind:'song'|'song-section'|'song-transition'}>,profileId:string){
  const part=target.partId?song.parts?.find(p=>p.id===target.partId):song.parts?.find(p=>p.profileId===profileId);
  return {part,sections:part?.sections??song.sections,transitions:part?.transitions??song.transitions??[]};
}
function songBlock(data:Data,candidate:PriorityCandidate,seconds:number,role:SlotRole,intent:AutopilotSessionIntent):RoutineBlock {
  const target=candidate.target;
  if(target.kind!=='song'&&target.kind!=='song-section'&&target.kind!=='song-transition')throw new Error('Expected a repertoire target.');
  const song=data.songs.find(s=>s.id===target.songId);if(!song)throw new Error('Autopilot song target is unavailable.');
  const info=arrangement(song,target,candidate.profileId);
  let section:SongSection|undefined,title=song.title,notes='',type:RoutineBlock['type']='song';
  if(target.kind==='song-section'){
    section=info.sections.find(s=>s.id===target.sectionId);if(!section)throw new Error('Autopilot song section is unavailable.');
    title+=' · '+section.name;notes=section.notes;type='song-section';
  }else if(target.kind==='song-transition'){
    const transition=info.transitions.find(t=>t.id===target.transitionId);if(!transition)throw new Error('Autopilot song transition is unavailable.');
    const from=info.sections.find(s=>s.id===transition.fromSectionId),to=info.sections.find(s=>s.id===transition.toSectionId);
    if(!from||!to)throw new Error('Autopilot transition sections are unavailable.');
    section=from;title+=' · '+(transition.name||from.name+' → '+to.name);notes=[transition.notes,'Transition: '+from.name+' → '+to.name,from.notes,to.notes].filter(Boolean).join('\n');type='song-section';
  }
  return {id:uuid(),type,profileId:candidate.profileId,songId:song.id,...(info.part?{songPartId:info.part.id}:{}),...(section?{songSectionId:section.id}:{}),title,targetSeconds:seconds,bpm:section?.bpmOverride??song.bpm,notes,prescription:prescription(candidate,role,intent),order:0};
}
function exerciseBlock(data:Data,candidate:PriorityCandidate,seconds:number,role:SlotRole,intent:AutopilotSessionIntent):RoutineBlock {
  const target=candidate.target;if(target.kind!=='exercise')throw new Error('Expected an exercise target.');
  const exercise=data.exercises.find(e=>e.id===target.exerciseId);if(!exercise)throw new Error('Autopilot exercise target is unavailable.');
  const progression=buildExerciseProgression(data,exercise,{seconds,strictDuration:true,allowAdvance:role!=='ramp-in'});
  const base:RoutineBlock={id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:candidate.profileId,title:exercise.name,targetSeconds:seconds,bpm:exerciseBpm(exercise),notes:'',prescription:prescription(candidate,role,intent),order:0};
  const progressed=applyExerciseProgression(base,progression);
  progressed.targetSeconds=seconds;
  return progressed;
}
function candidateBlock(data:Data,candidate:PriorityCandidate,seconds:number,role:SlotRole,intent:AutopilotSessionIntent):RoutineBlock {
  return candidate.target.kind==='exercise'?exerciseBlock(data,candidate,seconds,role,intent):songBlock(data,candidate,seconds,role,intent);
}

function sameTarget(a:PriorityCandidate,b:PriorityCandidate):boolean{return a.targetKey===b.targetKey;}
function selectSlots(data:Data,candidates:PriorityCandidate[],pattern:{role:SlotRole;seconds:number}[],intent:AutopilotSessionIntent):AutopilotSelection[] {
  if(!candidates.length)throw new Error('Add at least one available exercise or song before using Autopilot.');
  const selected:PriorityCandidate[]=[],result:AutopilotSelection[]=[];
  const maxNew=pattern.length<=4?1:2;let newCount=0;
  let primary:PriorityCandidate|undefined;
  for(const slot of pattern){
    const allowNew=slot.role==='ramp-in'||newCount<maxNew;
    const picked=choose(data,candidates,slot.role,intent,selected,primary,allowNew);
    if(!picked)continue;
    let candidate:PriorityCandidate=picked;
    if(slot.role==='primary')primary=candidate;
    if(selected.some(item=>sameTarget(item,candidate))){
      const alternate=candidates.find(item=>!selected.some(used=>sameTarget(used,item))&&(allowNew||!newMaterial(item)||urgentNewMaterial(item)));
      if(alternate)candidate=alternate;
    }
    if(slot.role!=='ramp-in'&&newMaterial(candidate)&&!urgentNewMaterial(candidate))newCount++;
    selected.push(candidate);
    result.push({role:slot.role,candidate,block:candidateBlock(data,candidate,slot.seconds,slot.role,intent)});
  }
  if(!result.length)throw new Error('Autopilot could not find a usable practice target.');
  return result.map((selection,order)=>({...selection,block:{...selection.block,order}}));
}

export function buildAutopilotPlan(data:Data,options:AutopilotOptions):AutopilotBuild {
  if(data.schemaVersion!==2)throw new Error('Finish workspace migration before using Autopilot.');
  const minutes=validMinutes(options.minutes),profileId=options.profileId??activeProfile(data).id,intent=options.intent??'balanced';
  const profile=data.profiles?.find(p=>p.id===profileId);
  if(profile?.instrumentType==='voice')throw new Error('Autopilot v1 does not schedule voice practice yet. Use a voice routine with planned rest and listening.');
  const generatedAt=iso(options.now),today=options.today??localDate(new Date(time(options.now)));
  const candidates=rankPracticeTargets(data,profileId,{now:generatedAt,today});
  const selections=selectSlots(data,candidates,patternForMinutes(minutes),intent);
  const blocks=selections.map(item=>item.block),totalSeconds=blocks.reduce((sum,block)=>sum+block.targetSeconds,0);
  if(totalSeconds!==minutes*60)throw new Error('Autopilot could not allocate the requested session time exactly.');
  const existing=data.dailyPlans.find(plan=>plan.profileId===profileId&&plan.date===today);
  const generation:PlanGeneration={kind:'autopilot',generatedAt,requestedMinutes:minutes,sessionIntent:intent,engineVersion:AUTOPILOT_ENGINE_VERSION};
  const plan:DailyPlan=existing?{id:existing.id,createdAt:existing.createdAt,updatedAt:advanceISO(existing.updatedAt,time(options.now)),profileId,date:today,generation,blocks}:{id:uuid(),createdAt:generatedAt,updatedAt:generatedAt,profileId,date:today,generation,blocks};
  return {plan,selections,totalSeconds};
}

function blankState(candidate:PriorityCandidate,scheduledAt:string):PracticeState {
  return {id:uuid(),createdAt:scheduledAt,updatedAt:scheduledAt,profileId:candidate.profileId,targetKey:candidate.targetKey,target:structuredClone(candidate.target),mastery:'discover',limitations:[],challenge:'hold',evidenceCount:0,recent:{solid:0,usable:0,notYet:0},scheduling:{lastScheduledAt:scheduledAt,consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:scheduledAt}};
}

export function applyAutopilotPlan(data:Data,build:AutopilotBuild):Data {
  const next=structuredClone(data),scheduledAt=build.plan.generation?.generatedAt??build.plan.updatedAt;
  next.dailyPlans=[...next.dailyPlans.filter(plan=>plan.id!==build.plan.id&&!(plan.profileId===build.plan.profileId&&plan.date===build.plan.date)),structuredClone(build.plan)];
  const states=new Map((next.practiceStates??[]).map(state=>[state.profileId+'|'+state.targetKey,state]));
  for(const selection of build.selections){
    const key=selection.candidate.profileId+'|'+selection.candidate.targetKey,existing=states.get(key);
    const state=existing??blankState(selection.candidate,scheduledAt);
    state.updatedAt=existing?advanceISO(existing.updatedAt,time(scheduledAt)):scheduledAt;
    state.scheduling={...state.scheduling,lastScheduledAt:scheduledAt};
    states.set(key,state);
  }
  next.practiceStates=[...states.values()].sort((a,b)=>a.profileId.localeCompare(b.profileId)||a.targetKey.localeCompare(b.targetKey));
  return next;
}

export function applyAutopilotSessionScheduling(states:PracticeState[],session:PracticeSession):PracticeState[] {
  if(session.status==='active')return states;
  const next=states.map(state=>structuredClone(state)),byKey=new Map(next.map(state=>[state.profileId+'|'+state.targetKey,state]));
  for(const block of session.blocks){
    const prescription=block.prescriptionSnapshot;if(prescription?.generatedBy!=='autopilot')continue;
    const profileId=block.profileId??session.profileId;if(!profileId)continue;
    const key=profileId+'|'+practiceTargetKey(prescription.target),state=byKey.get(key);if(!state)continue;
    const stamp=block.endedAt??session.endedAt??session.updatedAt;
    if(block.skipped){state.scheduling.lastSkippedAt=stamp;state.scheduling.consecutiveSkips+=1;}
    else if(block.completed)state.scheduling.consecutiveSkips=0;
    state.updatedAt=advanceISO(state.updatedAt,time(stamp));
  }
  return next;
}
