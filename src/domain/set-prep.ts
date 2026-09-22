import type { Data, DailyPlan, PracticeSession, RoutineBlock, Setlist, Song, SongSection } from './models.js';
import type { PracticeIntent, PracticeReasonCode, PracticeState, PracticeTargetRef, SetPrepMode, SetPrepRole, SetPrepSnapshot, SetPrepStage } from './practice-state.js';
import { practiceTargetKey } from './practice-state.js';
import { reviewDue } from './mastery-engine.js';
import { activeProfile } from './profiles.js';
import { advanceISO, localDate, uuid } from './utils.js';

export const SET_PREP_ENGINE_VERSION=1 as const;
export const SET_PREP_MINUTES=[10,15,20,30,45,60] as const;
export type SetPrepMinutes=(typeof SET_PREP_MINUTES)[number];
export type SetPrepReadiness='unassessed'|'needs-work'|'usable'|'ready';
export type SetPrepWindow=SetPrepStage|'past';

export interface SetPrepIssue {
  kind:'song'|'section'|'transition';
  target:PracticeTargetRef;
  label:string;
  readiness:SetPrepReadiness;
  detail:string;
}
export interface SetPrepSongAssessment {
  setPosition:number;
  songId:string;
  title:string;
  partId?:string;
  readiness:SetPrepReadiness;
  summary:string;
  manualStatus:string;
  wholeSong:SetPrepReadiness;
  issues:SetPrepIssue[];
}
export interface SetPrepAssessment {
  setlistId:string;
  setlistName:string;
  profileId:string;
  performanceDate?:string;
  daysUntil?:number;
  window:SetPrepWindow;
  readiness:'attention'|'usable'|'ready-evidence';
  counts:{ready:number;usable:number;needsWork:number;unassessed:number};
  items:SetPrepSongAssessment[];
}
export interface SetPrepOptions {
  profileId?:string;
  minutes:number;
  mode?:SetPrepMode;
  now?:Date|string|number;
  today?:string;
}
export interface SetPrepSelection {
  target:PracticeTargetRef;
  setPosition:number;
  role:SetPrepRole;
  readiness:SetPrepReadiness;
  block:RoutineBlock;
}
export interface SetPrepBuild {
  plan:DailyPlan;
  selections:SetPrepSelection[];
  totalSeconds:number;
  assessment:SetPrepAssessment;
}

const DAY=24*60*60*1000;
const rank:Record<SetPrepReadiness,number>={'needs-work':0,unassessed:1,usable:2,ready:3};
const toMillis=(value:Date|string|number|undefined)=>value===undefined?Date.now():value instanceof Date?value.getTime():typeof value==='number'?value:Date.parse(value);
const iso=(value:Date|string|number|undefined)=>new Date(toMillis(value)).toISOString();

function daysBetween(from:string,to:string):number {
  const f=from.split('-').map(Number),t=to.split('-').map(Number);
  return Math.round((Date.UTC(t[0]!,t[1]!-1,t[2]!)-Date.UTC(f[0]!,f[1]!-1,f[2]!))/DAY);
}

export function setPrepWindow(setlist:Setlist,today:string=localDate()):{window:SetPrepWindow;daysUntil?:number} {
  if(!setlist.date)return {window:'build'};
  const days=daysBetween(today,setlist.date);
  if(days<0)return {window:'past',daysUntil:days};
  if(days===0)return {window:'performance-day',daysUntil:0};
  if(days<=2)return {window:'taper',daysUntil:days};
  if(days<=7)return {window:'simulate',daysUntil:days};
  if(days<=14)return {window:'integrate',daysUntil:days};
  return {window:'build',daysUntil:days};
}

function arrangement(song:Song,profileId:string){
  const part=song.parts?.find(p=>p.profileId===profileId);
  return {
    part,
    partId:part?.id,
    sections:part?.sections??song.sections,
    transitions:part?.transitions??song.transitions??[],
    status:part?.status??song.status,
  };
}

function stateMap(data:Data,profileId:string):Map<string,PracticeState>{
  return new Map((data.practiceStates??[]).filter(state=>state.profileId===profileId).map(state=>[state.targetKey,state]));
}
function stateFor(states:Map<string,PracticeState>,target:PracticeTargetRef):PracticeState|undefined{return states.get(practiceTargetKey(target));}

function readinessForState(state:PracticeState|undefined,now:number):{readiness:SetPrepReadiness;detail:string} {
  if(!state||!state.evidenceCount||state.mastery==='discover'||state.mastery==='unassessed')return {readiness:'unassessed',detail:'No current evaluated evidence.'};
  if(state.latestResult==='not-yet'||state.mastery==='learn'||state.mastery==='build')return {readiness:'needs-work',detail:state.latestResult==='not-yet'?'Recent result · Not Yet.':'Still building reliable control.'};
  if(state.latestResult==='usable')return {readiness:'usable',detail:'Recent result · Usable; performance-context confirmation is still missing.'};
  if(state.latestResult==='solid'){
    if(state.mastery==='maintain'&&state.lastAppliedAt&&!reviewDue(state,now))return {readiness:'ready',detail:'Solid transfer/performance evidence with no review currently due.'};
    return {readiness:'usable',detail:reviewDue(state,now)?'Solid evidence exists, but a retention review is due.':'Solid evidence exists; performance-context confirmation is still incomplete.'};
  }
  return {readiness:'unassessed',detail:'No modern Not Yet / Usable / Solid result is available.'};
}

function componentIssues(
  states:Map<string,PracticeState>,
  song:Song,
  profileId:string,
  now:number,
  whole:SetPrepReadiness,
):SetPrepIssue[]{
  const info=arrangement(song,profileId),issues:SetPrepIssue[]=[];
  for(const section of info.sections){
    const target:PracticeTargetRef={kind:'song-section',songId:song.id,...(info.partId?{partId:info.partId}:{}),sectionId:section.id};
    const r=readinessForState(stateFor(states,target),now);
    if(r.readiness==='needs-work'||(r.readiness==='unassessed'&&whole==='unassessed'))issues.push({kind:'section',target,label:section.name,readiness:r.readiness,detail:r.detail});
  }
  for(const transition of info.transitions){
    const from=info.sections.find(s=>s.id===transition.fromSectionId)?.name??'Section',to=info.sections.find(s=>s.id===transition.toSectionId)?.name??'Section';
    const target:PracticeTargetRef={kind:'song-transition',songId:song.id,...(info.partId?{partId:info.partId}:{}),transitionId:transition.id};
    const r=readinessForState(stateFor(states,target),now);
    if(r.readiness==='needs-work'||(r.readiness==='unassessed'&&whole==='unassessed'))issues.push({kind:'transition',target,label:transition.name||from+' → '+to,readiness:r.readiness,detail:r.detail});
  }
  return issues.sort((a,b)=>rank[a.readiness]-rank[b.readiness]||(a.kind==='transition'?-1:1)||a.label.localeCompare(b.label));
}

function assessSong(data:Data,setPosition:number,song:Song,profileId:string,states:Map<string,PracticeState>,now:number):SetPrepSongAssessment {
  const info=arrangement(song,profileId),wholeTarget:PracticeTargetRef={kind:'song',songId:song.id,...(info.partId?{partId:info.partId}:{})};
  const whole=readinessForState(stateFor(states,wholeTarget),now),issues=componentIssues(states,song,profileId,now,whole.readiness);
  const weak=issues.some(issue=>issue.readiness==='needs-work'),unknown=issues.some(issue=>issue.readiness==='unassessed');
  let readiness:SetPrepReadiness;
  if(weak)readiness='needs-work';
  else if(whole.readiness==='ready')readiness='ready';
  else if(whole.readiness==='usable')readiness='usable';
  else if(unknown)readiness='unassessed';
  else {
    const componentTargets=[
      ...info.sections.map(section=>({kind:'song-section',songId:song.id,...(info.partId?{partId:info.partId}:{}),sectionId:section.id} as PracticeTargetRef)),
      ...info.transitions.map(transition=>({kind:'song-transition',songId:song.id,...(info.partId?{partId:info.partId}:{}),transitionId:transition.id} as PracticeTargetRef)),
    ];
    const componentReadiness=componentTargets.map(target=>readinessForState(stateFor(states,target),now).readiness);
    readiness=componentReadiness.length&&componentReadiness.every(value=>value==='usable'||value==='ready')?'usable':'unassessed';
  }
  const summary=readiness==='ready'?'Ready evidence · solid performance/transfer confirmation.'
    :readiness==='usable'?'Usable evidence · rehearse in set context before relying on it.'
    :readiness==='needs-work'?'Attention required · a current weak spot is recorded.'
    :info.status==='performance-ready'?'Marked performance-ready manually, but evaluated evidence is still missing.'
    :'Unassessed · no current evaluated performance evidence.';
  return {setPosition,songId:song.id,title:song.title,...(info.partId?{partId:info.partId}:{}),readiness,summary,manualStatus:info.status,wholeSong:whole.readiness,issues};
}

export function assessSetlist(data:Data,setlist:Setlist,profileId:string=activeProfile(data).id,options:{now?:Date|string|number;today?:string}={}):SetPrepAssessment {
  const now=toMillis(options.now),today=options.today??localDate(new Date(now)),window=setPrepWindow(setlist,today),states=stateMap(data,profileId);
  const items=setlist.songIds.map((songId,setPosition)=>data.songs.find(song=>song.id===songId)).filter((song):song is Song=>!!song).map((song,index)=>{
    // Preserve the true set position even when an unavailable song was skipped above.
    const setPosition=setlist.songIds.indexOf(song.id,index?itemsPlaceholder(setlist.songIds,song.id,index):0);
    return assessSong(data,setPosition,song,profileId,states,now);
  });
  // The mapping above cannot safely use an accumulating helper inside Array.map without state.
  const ordered:SetPrepSongAssessment[]=[];
  setlist.songIds.forEach((songId,setPosition)=>{const song=data.songs.find(row=>row.id===songId);if(song)ordered.push(assessSong(data,setPosition,song,profileId,states,now));});
  const counts={ready:0,usable:0,needsWork:0,unassessed:0};
  for(const item of ordered){
    if(item.readiness==='ready')counts.ready++;
    else if(item.readiness==='usable')counts.usable++;
    else if(item.readiness==='needs-work')counts.needsWork++;
    else counts.unassessed++;
  }
  const readiness=counts.needsWork||counts.unassessed?'attention':ordered.length&&counts.ready===ordered.length?'ready-evidence':'usable';
  return {setlistId:setlist.id,setlistName:setlist.name,profileId,...(setlist.date?{performanceDate:setlist.date}:{}),...(window.daysUntil!==undefined?{daysUntil:window.daysUntil}:{}),window:window.window,readiness,counts,items:ordered};
}

// Only exists so TypeScript catches accidental reliance on Array#indexOf for repeated songs.
function itemsPlaceholder(_ids:string[],_songId:string,_index:number):number{return 0;}

function validMinutes(value:number):SetPrepMinutes {
  if(!SET_PREP_MINUTES.includes(value as SetPrepMinutes))throw new Error('Choose 10, 15, 20, 30, 45, or 60 minutes.');
  return value as SetPrepMinutes;
}

function prepStage(assessment:SetPrepAssessment):SetPrepStage {
  if(assessment.window==='past')throw new Error('This performance date has passed. Update the setlist date before building new set preparation.');
  return assessment.window;
}

function stateIntent(state:PracticeState|undefined):PracticeIntent {
  if(!state)return 'build';
  if(state.latestResult==='not-yet'||state.mastery==='learn'||state.mastery==='build')return 'build';
  if(state.mastery==='maintain')return 'maintain';
  if(state.mastery==='apply')return 'apply';
  if(state.mastery==='retest')return 'retest';
  return 'stabilize';
}

function intentFor(stage:SetPrepStage,mode:SetPrepMode,role:SetPrepRole,state:PracticeState|undefined):PracticeIntent {
  if(mode==='run-through'||stage==='performance-day'||stage==='simulate')return 'perform';
  if(stage==='integrate')return role==='weak-spot'||role==='transition'?'stabilize':'apply';
  if(stage==='taper')return role==='weak-spot'||role==='transition'?'stabilize':'perform';
  return stateIntent(state);
}

function reasonsFor(setlist:Setlist,stage:SetPrepStage,mode:SetPrepMode,role:SetPrepRole,readiness:SetPrepReadiness):PracticeReasonCode[] {
  const reasons:PracticeReasonCode[]=['setlist-focus'];
  if(setlist.date)reasons.push('upcoming-performance');
  if(role==='transition')reasons.push('transition-risk');
  if(mode==='run-through'||stage==='simulate'||stage==='performance-day'||role==='run-through')reasons.push('performance-simulation');
  if(readiness==='needs-work')reasons.push('recent-weakness');
  if(readiness==='unassessed')reasons.push('neglected');
  return [...new Set(reasons)];
}

function setPrepSnapshot(setlist:Setlist,stage:SetPrepStage,mode:SetPrepMode,role:SetPrepRole,setPosition:number):SetPrepSnapshot {
  return {engineVersion:SET_PREP_ENGINE_VERSION,setlistId:setlist.id,setlistName:setlist.name,...(setlist.date?{performanceDate:setlist.date}:{}),stage,mode,role,setPosition};
}

function targetBlock(data:Data,setlist:Setlist,profileId:string,target:PracticeTargetRef,seconds:number,stage:SetPrepStage,mode:SetPrepMode,role:SetPrepRole,readiness:SetPrepReadiness,setPosition:number,states:Map<string,PracticeState>):RoutineBlock {
  if(target.kind!=='song'&&target.kind!=='song-section'&&target.kind!=='song-transition')throw new Error('Set preparation requires repertoire targets.');
  const song=data.songs.find(row=>row.id===target.songId);if(!song)throw new Error('A setlist song is unavailable.');
  const info=arrangement(song,profileId),part=target.partId?info.part:info.part,sections=part?.sections??song.sections,transitions=part?.transitions??song.transitions??[];
  let type:RoutineBlock['type']='song',section:SongSection|undefined,title=song.title,notes=part?.notes??song.notes;
  if(target.kind==='song-section'){
    section=sections.find(row=>row.id===target.sectionId);if(!section)throw new Error('A set-prep section is unavailable.');
    type='song-section';title+=' · '+section.name;notes=[section.notes,notes].filter(Boolean).join('\n');
  }else if(target.kind==='song-transition'){
    const transition=transitions.find(row=>row.id===target.transitionId);if(!transition)throw new Error('A set-prep transition is unavailable.');
    const from=sections.find(row=>row.id===transition.fromSectionId),to=sections.find(row=>row.id===transition.toSectionId);
    if(!from||!to)throw new Error('A set-prep transition references unavailable sections.');
    section=from;type='song-section';title+=' · '+(transition.name||from.name+' → '+to.name);
    notes=[transition.notes,'Transition: '+from.name+' → '+to.name,from.notes,to.notes,notes].filter(Boolean).join('\n');
  }
  const cue=role==='run-through'?'Set run-through: keep the running order and do not restart for small mistakes.'
    :role==='transition'?'Set prep: loop the transition, then reconnect it to the surrounding sections without stopping.'
    :role==='weak-spot'?'Set prep: isolate the weak spot, then reconnect it to the surrounding musical context.'
    :'Set prep: play the song continuously, note actionable misses, and avoid restarting for minor errors.';
  const prescription={target:structuredClone(target),intent:intentFor(stage,mode,role,stateFor(states,target)),reasons:reasonsFor(setlist,stage,mode,role,readiness),generatedBy:'set-prep' as const,engineVersion:SET_PREP_ENGINE_VERSION};
  return {
    id:uuid(),type,profileId,songId:song.id,...(part?{songPartId:part.id}:{}),...(section?{songSectionId:section.id}:{}),
    title,targetSeconds:seconds,bpm:section?.bpmOverride??song.bpm,notes:[cue,notes].filter(Boolean).join('\n'),
    prescription,setPrep:setPrepSnapshot(setlist,stage,mode,role,setPosition),order:0,
  };
}

interface Candidate {
  item:SetPrepSongAssessment;
  target:PracticeTargetRef;
  role:SetPrepRole;
  readiness:SetPrepReadiness;
  label:string;
}

function wholeTarget(item:SetPrepSongAssessment):PracticeTargetRef {
  return {kind:'song',songId:item.songId,...(item.partId?{partId:item.partId}:{})};
}

function candidatePool(assessment:SetPrepAssessment,stage:SetPrepStage):Candidate[] {
  const result:Candidate[]=[];
  for(const item of assessment.items){
    const issueRows=item.issues
      .filter(issue=>stage!=='taper'||issue.readiness==='needs-work')
      .map(issue=>({item,target:issue.target,role:issue.kind==='transition'?'transition' as const:'weak-spot' as const,readiness:issue.readiness,label:issue.label}));
    const song={item,target:wholeTarget(item),role:'song' as const,readiness:item.readiness,label:item.title};
    if(stage==='build')result.push(...issueRows,song);
    else if(stage==='integrate')result.push(...issueRows.sort((a,b)=>(a.role==='transition'?-1:1)-(b.role==='transition'?-1:1)),song);
    else if(stage==='simulate')result.push(song,...issueRows.filter(row=>row.role==='transition'));
    else if(stage==='taper')result.push(...issueRows,song);
    else result.push(song);
  }
  const stageBias=(candidate:Candidate):number=>{
    if(stage==='build')return candidate.role==='weak-spot'?0:candidate.role==='transition'?1:2;
    if(stage==='integrate')return candidate.role==='transition'?0:candidate.role==='weak-spot'?1:2;
    if(stage==='simulate')return candidate.role==='song'?0:1;
    if(stage==='taper')return candidate.readiness==='needs-work'?0:1;
    return 0;
  };
  return result.sort((a,b)=>rank[a.readiness]-rank[b.readiness]||stageBias(a)-stageBias(b)||a.item.setPosition-b.item.setPosition||a.label.localeCompare(b.label));
}

function allocate(total:number,count:number):number[]{
  if(count<1)throw new Error('Set preparation needs at least one practice target.');
  const base=Math.floor(total/count),remainder=total-base*count;
  return Array.from({length:count},(_,i)=>base+(i<remainder?1:0));
}

function focusedSelections(assessment:SetPrepAssessment,totalSeconds:number,stage:SetPrepStage):Candidate[] {
  const pool=candidatePool(assessment,stage),maxBlocks=Math.min(10,Math.max(1,Math.floor(totalSeconds/180)));
  const selected:Candidate[]=[],seen=new Set<string>();
  for(const candidate of pool){
    const key=practiceTargetKey(candidate.target);
    if(seen.has(key))continue;
    seen.add(key);selected.push(candidate);
    if(selected.length>=maxBlocks)break;
  }
  return selected;
}

function runThroughSelections(assessment:SetPrepAssessment,totalSeconds:number):Candidate[] {
  if(totalSeconds<assessment.items.length*60)throw new Error('Choose at least '+assessment.items.length+' minutes so every setlist song receives at least one minute.');
  return assessment.items.map(item=>({item,target:wholeTarget(item),role:'run-through',readiness:item.readiness,label:item.title}));
}

export function buildSetPrepPlan(data:Data,setlist:Setlist,options:SetPrepOptions):SetPrepBuild {
  if(data.schemaVersion!==2)throw new Error('Finish workspace migration before using Set Prep.');
  const minutes=validMinutes(options.minutes),profileId=options.profileId??activeProfile(data).id,mode=options.mode??'focused',generatedAt=iso(options.now),today=options.today??localDate(new Date(toMillis(options.now)));
  if(!setlist.songIds.length)throw new Error('Add at least one song to this setlist before building Set Prep.');
  const assessment=assessSetlist(data,setlist,profileId,{now:generatedAt,today}),stage=prepStage(assessment),totalSeconds=minutes*60,states=stateMap(data,profileId);
  const candidates=mode==='run-through'?runThroughSelections(assessment,totalSeconds):focusedSelections(assessment,totalSeconds,stage);
  if(!candidates.length)throw new Error('Set Prep could not find an available repertoire target.');
  const seconds=allocate(totalSeconds,candidates.length);
  const selections=candidates.map((candidate,index):SetPrepSelection=>{
    const block=targetBlock(data,setlist,profileId,candidate.target,seconds[index]!,stage,mode,candidate.role,candidate.readiness,candidate.item.setPosition,states);
    block.order=index;
    return {target:structuredClone(candidate.target),setPosition:candidate.item.setPosition,role:candidate.role,readiness:candidate.readiness,block};
  });
  const existing=data.dailyPlans.find(plan=>plan.profileId===profileId&&plan.date===today),blocks=selections.map(row=>row.block);
  const generation={kind:'set-prep' as const,generatedAt,requestedMinutes:minutes,setlistId:setlist.id,setPrepStage:stage,setPrepMode:mode,engineVersion:SET_PREP_ENGINE_VERSION};
  const plan:DailyPlan=existing?{id:existing.id,createdAt:existing.createdAt,updatedAt:advanceISO(existing.updatedAt,toMillis(options.now)),profileId,date:today,generation,blocks}
    :{id:uuid(),createdAt:generatedAt,updatedAt:generatedAt,profileId,date:today,generation,blocks};
  return {plan,selections,totalSeconds,assessment};
}

function blankState(profileId:string,target:PracticeTargetRef,at:string):PracticeState {
  return {id:uuid(),createdAt:at,updatedAt:at,profileId,targetKey:practiceTargetKey(target),target:structuredClone(target),mastery:'discover',limitations:[],challenge:'hold',evidenceCount:0,recent:{solid:0,usable:0,notYet:0},scheduling:{lastScheduledAt:at,consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:at}};
}

export function applySetPrepPlan(data:Data,build:SetPrepBuild):Data {
  const next=structuredClone(data),at=build.plan.generation?.generatedAt??build.plan.updatedAt;
  next.dailyPlans=[...next.dailyPlans.filter(plan=>plan.id!==build.plan.id&&!(plan.profileId===build.plan.profileId&&plan.date===build.plan.date)),structuredClone(build.plan)];
  const states=new Map((next.practiceStates??[]).map(state=>[state.profileId+'|'+state.targetKey,state]));
  for(const selection of build.selections){
    const profileId=build.plan.profileId!,key=profileId+'|'+practiceTargetKey(selection.target),existing=states.get(key),state=existing??blankState(profileId,selection.target,at);
    state.updatedAt=existing?advanceISO(existing.updatedAt,toMillis(at)):at;
    state.scheduling={...state.scheduling,lastScheduledAt:at};
    states.set(key,state);
  }
  next.practiceStates=[...states.values()].sort((a,b)=>a.profileId.localeCompare(b.profileId)||a.targetKey.localeCompare(b.targetKey));
  return next;
}

export function applySetPrepSessionScheduling(states:PracticeState[],session:PracticeSession):PracticeState[] {
  if(session.status==='active')return states;
  const next=states.map(state=>structuredClone(state)),byKey=new Map(next.map(state=>[state.profileId+'|'+state.targetKey,state]));
  for(const block of session.blocks){
    const prescription=block.prescriptionSnapshot;
    if(prescription?.generatedBy!=='set-prep')continue;
    const profileId=block.profileId??session.profileId;if(!profileId)continue;
    const state=byKey.get(profileId+'|'+practiceTargetKey(prescription.target));if(!state)continue;
    const at=block.endedAt??session.endedAt??session.updatedAt;
    if(block.skipped){state.scheduling.lastSkippedAt=at;state.scheduling.consecutiveSkips+=1;}
    else if(block.completed)state.scheduling.consecutiveSkips=0;
    state.updatedAt=advanceISO(state.updatedAt,toMillis(at));
  }
  return next;
}
