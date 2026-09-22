import type { Data, PracticeSession, ProgressionDimension } from './models.js';
import type { LimitationTag, MasteryState, PracticeResult, PracticeState, PracticeTargetRef } from './practice-state.js';
import { finishedSessions, sessionTime } from './analytics.js';
import { reviewDue } from './mastery-engine.js';
import { skillDefinition } from './skill-graph.js';
import { localDate } from './utils.js';

export const DIAGNOSTICS_ENGINE_VERSION=1 as const;

export type TrendDirection='up'|'down'|'steady'|'unavailable';
export type InsightTone='attention'|'positive'|'neutral';

export interface ResultCounts {solid:number;usable:number;notYet:number;total:number}
export interface WindowSnapshot {
  from?:string;
  to?:string;
  activeSeconds:number;
  sessions:number;
  completedSessions:number;
  activeDays:number;
  evaluations:ResultCounts;
  generated:{blocks:number;completed:number;skipped:number;endedEarly:number};
  progression:{blocks:number;notYet:number;usable:number;solid:number};
}
export interface WindowComparison {
  current:WindowSnapshot;
  previous?:WindowSnapshot;
  activeTimeTrend:TrendDirection;
  activeDayTrend:TrendDirection;
  solidShareTrend:TrendDirection;
  notYetShareTrend:TrendDirection;
}
export interface LimitationFrequency {
  tag:LimitationTag;
  count:number;
  previousCount:number;
  evaluatedBlocks:number;
}
export interface MasteryCount {mastery:MasteryState;count:number}
export interface DueReviewRow {
  targetKey:string;
  label:string;
  mastery:MasteryState;
  nextReviewAt:string;
  latestResult?:PracticeResult;
}
export interface TempoGapRow {
  targetKey:string;
  label:string;
  peak:number;
  working?:number;
  cold?:number;
  peakToWorking?:number;
  workingToCold?:number;
}
export interface ProgressionOutcomeRow {
  dimension:ProgressionDimension;
  blocks:number;
  solid:number;
  usable:number;
  notYet:number;
}
export interface PracticeStateRow {
  targetKey:string;
  label:string;
  mastery:MasteryState;
  latestResult?:PracticeResult;
  evidenceCount:number;
  lastPracticedAt?:string;
  nextReviewAt?:string;
  reviewDue:boolean;
  limitations:LimitationTag[];
  peak?:number;
  working?:number;
  cold?:number;
}
export interface DiagnosticInsight {
  code:
    | 'limited-evaluation'
    | 'result-improving'
    | 'result-weakening'
    | 'result-stable'
    | 'recurring-limitation'
    | 'retention-backlog'
    | 'tempo-reliability-gap'
    | 'generated-follow-through'
    | 'generated-skips'
    | 'progression-friction';
  tone:InsightTone;
  title:string;
  detail:string;
  evidence:string;
}
export interface PracticeDiagnostics {
  engineVersion:1;
  comparison:WindowComparison;
  limitations:LimitationFrequency[];
  mastery:MasteryCount[];
  dueReviews:DueReviewRow[];
  tempoGaps:TempoGapRow[];
  progression:ProgressionOutcomeRow[];
  states:PracticeStateRow[];
  insights:DiagnosticInsight[];
}

const DAY=86400000;
const masteryOrder:MasteryState[]=['unassessed','discover','learn','build','stabilize','retest','apply','maintain'];
const limitationOrder:LimitationTag[]=['timing','coordination','memory','dynamics','tension','sound','accuracy','endurance','too-fast','form'];

function parseDay(value:string):number{
  const [y,m,d]=value.split('-').map(Number);
  return Date.UTC(y!,m!-1,d!);
}
function dayString(ms:number):string{
  const date=new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
}
function inWindow(session:PracticeSession,from?:string,to?:string):boolean{
  const day=localDate(session.startedAt);
  return (!from||day>=from)&&(!to||day<=to);
}
function previousWindow(from?:string,to?:string):{from:string;to:string}|undefined{
  if(!from||!to)return undefined;
  const start=parseDay(from),end=parseDay(to);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return undefined;
  const days=Math.round((end-start)/DAY)+1,previousTo=start-DAY,previousFrom=previousTo-(days-1)*DAY;
  return {from:dayString(previousFrom),to:dayString(previousTo)};
}
function resultCounts(sessions:PracticeSession[]):ResultCounts{
  const result:ResultCounts={solid:0,usable:0,notYet:0,total:0};
  for(const session of sessions)for(const block of session.blocks){
    const value=block.evaluation?.result;if(!value)continue;
    result.total++;
    if(value==='solid')result.solid++;
    else if(value==='usable')result.usable++;
    else result.notYet++;
  }
  return result;
}
function generatedStats(sessions:PracticeSession[]):WindowSnapshot['generated']{
  const result={blocks:0,completed:0,skipped:0,endedEarly:0};
  for(const session of sessions)for(const block of session.blocks){
    if(!['autopilot','set-prep'].includes(block.prescriptionSnapshot?.generatedBy??''))continue;
    result.blocks++;
    if(block.completed)result.completed++;
    else if(block.skipped)result.skipped++;
    else result.endedEarly++;
  }
  return result;
}
function progressionStats(sessions:PracticeSession[]):WindowSnapshot['progression']{
  const result={blocks:0,notYet:0,usable:0,solid:0};
  for(const session of sessions)for(const block of session.blocks){
    if(!block.progressionSnapshot)continue;
    result.blocks++;
    const value=block.evaluation?.result;
    if(value==='solid')result.solid++;
    else if(value==='usable')result.usable++;
    else if(value==='not-yet')result.notYet++;
  }
  return result;
}
function snapshot(sessions:PracticeSession[],from?:string,to?:string):WindowSnapshot{
  const rows=finishedSessions(sessions).filter(session=>inWindow(session,from,to));
  const activeDays=new Set(rows.filter(session=>sessionTime(session)>0).map(session=>localDate(session.startedAt))).size;
  return {
    from,to,
    activeSeconds:rows.reduce((sum,row)=>sum+sessionTime(row),0),
    sessions:rows.length,
    completedSessions:rows.filter(row=>row.status==='completed').length,
    activeDays,
    evaluations:resultCounts(rows),
    generated:generatedStats(rows),
    progression:progressionStats(rows),
  };
}
function trend(current:number,previous:number,minimumChange:number):TrendDirection{
  if(!Number.isFinite(current)||!Number.isFinite(previous))return 'unavailable';
  const delta=current-previous;
  if(Math.abs(delta)<minimumChange)return 'steady';
  return delta>0?'up':'down';
}
function share(value:number,total:number):number|undefined{return total?value/total:undefined;}
function shareTrend(current:number,currentTotal:number,previous:number,previousTotal:number):TrendDirection{
  const a=share(current,currentTotal),b=share(previous,previousTotal);
  if(a===undefined||b===undefined)return 'unavailable';
  return trend(a,b,.12);
}
function windowComparison(sessions:PracticeSession[],from?:string,to?:string):WindowComparison{
  const current=snapshot(sessions,from,to),previousRange=previousWindow(from,to),previous=previousRange?snapshot(sessions,previousRange.from,previousRange.to):undefined;
  return {
    current,
    ...(previous?{previous}:{}),
    activeTimeTrend:previous?trend(current.activeSeconds,previous.activeSeconds,15*60):'unavailable',
    activeDayTrend:previous?trend(current.activeDays,previous.activeDays,1):'unavailable',
    solidShareTrend:previous?shareTrend(current.evaluations.solid,current.evaluations.total,previous.evaluations.solid,previous.evaluations.total):'unavailable',
    notYetShareTrend:previous?shareTrend(current.evaluations.notYet,current.evaluations.total,previous.evaluations.notYet,previous.evaluations.total):'unavailable',
  };
}

function targetLabel(data:Data,target:PracticeTargetRef):string{
  switch(target.kind){
    case 'exercise':return data.exercises.find(row=>row.id===target.exerciseId)?.name??'Exercise unavailable';
    case 'song':return data.songs.find(row=>row.id===target.songId)?.title??'Song unavailable';
    case 'song-section':{
      const song=data.songs.find(row=>row.id===target.songId);if(!song)return 'Song section unavailable';
      const part=target.partId?song.parts?.find(row=>row.id===target.partId):undefined;
      const section=(part?.sections??song.sections).find(row=>row.id===target.sectionId);
      return song.title+(section?' · '+section.name:' · Section unavailable');
    }
    case 'song-transition':{
      const song=data.songs.find(row=>row.id===target.songId);if(!song)return 'Song transition unavailable';
      const part=target.partId?song.parts?.find(row=>row.id===target.partId):undefined;
      const sections=part?.sections??song.sections,transition=(part?.transitions??song.transitions??[]).find(row=>row.id===target.transitionId);
      if(!transition)return song.title+' · Transition unavailable';
      const from=sections.find(row=>row.id===transition.fromSectionId)?.name??'Section',to=sections.find(row=>row.id===transition.toSectionId)?.name??'Section';
      return song.title+' · '+(transition.name||from+' → '+to);
    }
    case 'skill':return skillDefinition(target.skillId)?.label??target.skillId;
    case 'lesson':return 'Lesson · '+target.lessonId;
  }
}

function limitationFrequencies(current:PracticeSession[],previous:PracticeSession[]):LimitationFrequency[]{
  const currentCounts=new Map<LimitationTag,number>(),previousCounts=new Map<LimitationTag,number>();
  let evaluatedBlocks=0;
  for(const session of current)for(const block of session.blocks){
    if(!block.evaluation)continue;evaluatedBlocks++;
    for(const tag of block.evaluation.limitations)currentCounts.set(tag,(currentCounts.get(tag)??0)+1);
  }
  for(const session of previous)for(const block of session.blocks){
    if(!block.evaluation)continue;
    for(const tag of block.evaluation.limitations)previousCounts.set(tag,(previousCounts.get(tag)??0)+1);
  }
  return limitationOrder.map(tag=>({tag,count:currentCounts.get(tag)??0,previousCount:previousCounts.get(tag)??0,evaluatedBlocks}))
    .filter(row=>row.count||row.previousCount)
    .sort((a,b)=>b.count-a.count||b.previousCount-a.previousCount||a.tag.localeCompare(b.tag));
}
function masteryCounts(states:PracticeState[]):MasteryCount[]{
  const counts=new Map<MasteryState,number>();
  for(const state of states)counts.set(state.mastery,(counts.get(state.mastery)??0)+1);
  return masteryOrder.map(mastery=>({mastery,count:counts.get(mastery)??0})).filter(row=>row.count);
}
function dueRows(data:Data,states:PracticeState[],now:number):DueReviewRow[]{
  return states.filter(state=>state.nextReviewAt&&reviewDue(state,now)).map(state=>({
    targetKey:state.targetKey,label:targetLabel(data,state.target),mastery:state.mastery,nextReviewAt:state.nextReviewAt!,...(state.latestResult?{latestResult:state.latestResult}:{})
  })).sort((a,b)=>a.nextReviewAt.localeCompare(b.nextReviewAt)||a.label.localeCompare(b.label));
}
function tempoGapRows(data:Data,states:PracticeState[]):TempoGapRow[]{
  return states.flatMap(state=>{
    const tempo=state.tempo;if(!tempo?.peak)return [];
    const peakToWorking=tempo.working===undefined?undefined:tempo.peak-tempo.working;
    const workingToCold=tempo.working===undefined||tempo.cold===undefined?undefined:tempo.working-tempo.cold;
    if((peakToWorking??0)<5&&(workingToCold??0)<5)return [];
    return [{
      targetKey:state.targetKey,label:targetLabel(data,state.target),peak:tempo.peak,...(tempo.working!==undefined?{working:tempo.working}:{}),...(tempo.cold!==undefined?{cold:tempo.cold}:{}),
      ...(peakToWorking!==undefined?{peakToWorking}:{}),...(workingToCold!==undefined?{workingToCold}:{}),
    }];
  }).sort((a,b)=>(b.peakToWorking??0)-(a.peakToWorking??0)||(b.workingToCold??0)-(a.workingToCold??0)||a.label.localeCompare(b.label));
}
function progressionRows(sessions:PracticeSession[]):ProgressionOutcomeRow[]{
  const map=new Map<ProgressionDimension,ProgressionOutcomeRow>();
  for(const session of sessions)for(const block of session.blocks){
    const p=block.progressionSnapshot;if(!p)continue;
    const row=map.get(p.dimension)??{dimension:p.dimension,blocks:0,solid:0,usable:0,notYet:0};row.blocks++;
    if(block.evaluation?.result==='solid')row.solid++;
    else if(block.evaluation?.result==='usable')row.usable++;
    else if(block.evaluation?.result==='not-yet')row.notYet++;
    map.set(p.dimension,row);
  }
  return [...map.values()].sort((a,b)=>b.blocks-a.blocks||b.notYet-a.notYet||a.dimension.localeCompare(b.dimension));
}
function stateRows(data:Data,states:PracticeState[],now:number):PracticeStateRow[]{
  const rows=states.map(state=>{
    const due=!!state.nextReviewAt&&reviewDue(state,now);
    const attention=(due?100:0)+(state.latestResult==='not-yet'?50:state.latestResult==='usable'?20:0)+(['learn','build'].includes(state.mastery)?10:0);
    const row:PracticeStateRow={
      targetKey:state.targetKey,label:targetLabel(data,state.target),mastery:state.mastery,...(state.latestResult?{latestResult:state.latestResult}:{}),evidenceCount:state.evidenceCount,
      ...(state.lastPracticedAt?{lastPracticedAt:state.lastPracticedAt}:{}),...(state.nextReviewAt?{nextReviewAt:state.nextReviewAt}:{}),reviewDue:due,
      limitations:[...state.limitations],...(state.tempo?.peak!==undefined?{peak:state.tempo.peak}:{}),...(state.tempo?.working!==undefined?{working:state.tempo.working}:{}),...(state.tempo?.cold!==undefined?{cold:state.tempo.cold}:{}),
    };
    return {row,attention};
  });
  rows.sort((a,b)=>b.attention-a.attention||(b.row.lastPracticedAt??'').localeCompare(a.row.lastPracticedAt??'')||a.row.label.localeCompare(b.row.label));
  return rows.map(item=>item.row);
}
function insightRows(comparison:WindowComparison,limitations:LimitationFrequency[],due:DueReviewRow[],tempo:TempoGapRow[],progression:ProgressionOutcomeRow[]):DiagnosticInsight[]{
  const rows:DiagnosticInsight[]=[],current=comparison.current,previous=comparison.previous;
  if(current.evaluations.total<3){
    rows.push({code:'limited-evaluation',tone:'neutral',title:'Evaluation coverage is limited',detail:'There are too few Not Yet / Usable / Solid evaluations in this range for a meaningful result trend.',evidence:`${current.evaluations.total} evaluated block${current.evaluations.total===1?'':'s'} in the selected range.`});
  }else if(previous&&previous.evaluations.total>=3){
    if(comparison.solidShareTrend==='up'&&comparison.notYetShareTrend!=='up')rows.push({code:'result-improving',tone:'positive',title:'Recent evaluated results are stronger',detail:'Solid results make up a larger share of evaluated blocks than in the immediately preceding equal-length window.',evidence:`Solid: ${current.evaluations.solid}/${current.evaluations.total} now vs ${previous.evaluations.solid}/${previous.evaluations.total} before.`});
    else if(comparison.notYetShareTrend==='up')rows.push({code:'result-weakening',tone:'attention',title:'Not Yet results are appearing more often',detail:'The selected range contains a higher share of Not Yet evaluations than the preceding equal-length window.',evidence:`Not Yet: ${current.evaluations.notYet}/${current.evaluations.total} now vs ${previous.evaluations.notYet}/${previous.evaluations.total} before.`});
    else rows.push({code:'result-stable',tone:'neutral',title:'Evaluated result mix is broadly stable',detail:'Solid and Not Yet shares have not moved enough to flag a directional change.',evidence:`Current evaluations: ${current.evaluations.solid} Solid · ${current.evaluations.usable} Usable · ${current.evaluations.notYet} Not Yet.`});
  }
  const recurring=limitations.find(row=>row.count>=3&&row.evaluatedBlocks>0&&row.count/row.evaluatedBlocks>=.3);
  if(recurring)rows.push({code:'recurring-limitation',tone:'attention',title:`${recurring.tag.replaceAll('-',' ')} keeps recurring`,detail:'The same limitation appears across a substantial share of recently evaluated blocks. Treat this as a pattern to investigate, not an automatic diagnosis.',evidence:`${recurring.count} of ${recurring.evaluatedBlocks} evaluated blocks in this range included this limitation.`});
  if(due.length)rows.push({code:'retention-backlog',tone:'attention',title:'Retention reviews are due',detail:'Some established targets have reached their scheduled review point. This is a scheduling signal, not evidence that the skill has decayed.',evidence:`${due.length} current target${due.length===1?' is':'s are'} due for review.`});
  if(tempo.length){
    const row=tempo[0]!;
    rows.push({code:'tempo-reliability-gap',tone:'attention',title:'Peak tempo is ahead of repeatable tempo',detail:'At least one target has a meaningful gap between its lifetime peak and its repeated working/cold evidence.',evidence:`${row.label}: peak ${row.peak} BPM${row.working!==undefined?` · working ${row.working} BPM`:''}${row.cold!==undefined?` · cold ${row.cold} BPM`:''}.`});
  }
  if(current.generated.blocks>=3){
    if(current.generated.skipped>=2)rows.push({code:'generated-skips',tone:'attention',title:'Generated blocks are being skipped',detail:'Autopilot or Set Prep is scheduling work that is not consistently reaching completion. Repeated skips may mean the session composition or timing is not fitting current needs.',evidence:`${current.generated.completed} completed · ${current.generated.skipped} skipped · ${current.generated.endedEarly} ended early across ${current.generated.blocks} generated blocks.`});
    else if(current.generated.completed>=Math.max(3,current.generated.blocks-1))rows.push({code:'generated-follow-through',tone:'positive',title:'Generated practice is translating into completed work',detail:'Most Autopilot/Set Prep blocks in the selected range were completed rather than skipped.',evidence:`${current.generated.completed} of ${current.generated.blocks} generated blocks completed.`});
  }
  const friction=progression.find(row=>row.blocks>=2&&row.notYet>=2&&row.notYet>row.solid);
  if(friction)rows.push({code:'progression-friction',tone:'attention',title:`${friction.dimension.replaceAll('-',' ')} progression is meeting resistance`,detail:'Recent generated challenges on this axis contain more Not Yet results than Solid results. The progression engine already responds conservatively; this view simply exposes the pattern.',evidence:`${friction.blocks} blocks · ${friction.solid} Solid · ${friction.usable} Usable · ${friction.notYet} Not Yet.`});
  return rows.slice(0,6);
}

export function buildPracticeDiagnostics(data:Data,options:{from?:string;to?:string;now?:Date|string|number}={}):PracticeDiagnostics{
  const now=options.now===undefined?Date.now():options.now instanceof Date?options.now.getTime():typeof options.now==='number'?options.now:Date.parse(options.now);
  const comparison=windowComparison(data.sessions,options.from,options.to),currentSessions=finishedSessions(data.sessions).filter(session=>inWindow(session,options.from,options.to));
  const prevRange=previousWindow(options.from,options.to),previousSessions=prevRange?finishedSessions(data.sessions).filter(session=>inWindow(session,prevRange.from,prevRange.to)):[];
  const states=data.practiceStates??[],limitations=limitationFrequencies(currentSessions,previousSessions),due=dueRows(data,states,now),tempo=tempoGapRows(data,states),progression=progressionRows(currentSessions);
  return {
    engineVersion:DIAGNOSTICS_ENGINE_VERSION,
    comparison,
    limitations,
    mastery:masteryCounts(states),
    dueReviews:due,
    tempoGaps:tempo,
    progression,
    states:stateRows(data,states,now),
    insights:insightRows(comparison,limitations,due,tempo,progression),
  };
}
