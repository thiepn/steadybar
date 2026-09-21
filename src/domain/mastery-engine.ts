import type { PracticeEvidence } from './practice-evidence.js';
import type { MasteryState, PracticeResult, PracticeState } from './practice-state.js';

export const MASTERY_ENGINE_VERSION = 2 as const;
const HOUR = 60*60*1000;
const DAY = 24*HOUR;

export type ChallengeDirection = 'reduce'|'hold'|'advance';

const time=(value:string)=>Date.parse(value);
const modernResult=(e:PracticeEvidence)=>e.result!==undefined&&e.reliability!=='legacy';
const solid=(e:PracticeEvidence)=>e.result==='solid';
const sorted=(events:PracticeEvidence[])=>[...events].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));

function separated(events:PracticeEvidence[],hours:number):boolean {
  const rows=sorted(events);
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(time(rows[j]!.timestamp)-time(rows[i]!.timestamp)>=hours*HOUR)return true;
  return false;
}

function latestConfirmation(events:PracticeEvidence[],hours:number):PracticeEvidence|undefined {
  const rows=sorted(events);
  for(let j=rows.length-1;j>=0;j--)for(let i=0;i<j;i++)if(time(rows[j]!.timestamp)-time(rows[i]!.timestamp)>=hours*HOUR)return rows[j];
  return undefined;
}

function thresholdLevel(events:PracticeEvidence[],hours:number):{bpm:number;at:string}|undefined {
  const values=[...new Set(events.filter(e=>e.bpm!==undefined).map(e=>e.bpm!))].sort((a,b)=>b-a);
  for(const bpm of values){
    const qualifying=events.filter(e=>e.bpm!==undefined&&e.bpm>=bpm);
    const confirmation=latestConfirmation(qualifying,hours);
    if(confirmation)return {bpm,at:confirmation.timestamp};
  }
  return undefined;
}

export function tempoLevels(events:PracticeEvidence[]):PracticeState['tempo']|undefined {
  const solidTempo=sorted(events.filter(e=>solid(e)&&e.bpm!==undefined));
  if(!solidTempo.length)return undefined;
  const peakBpm=Math.max(...solidTempo.map(e=>e.bpm!));
  const peakEvent=solidTempo.find(e=>e.bpm===peakBpm)!;
  const modern=solidTempo.filter(e=>e.reliability!=='legacy');
  const working=thresholdLevel(modern,12);
  const cold=thresholdLevel(modern.filter(e=>e.context==='cold'),24);
  const effectiveWorking=cold&&(!working||cold.bpm>working.bpm)?cold:working;
  return {
    peak:peakBpm,peakAt:peakEvent.timestamp,
    ...(effectiveWorking?{working:effectiveWorking.bpm,workingAt:effectiveWorking.at}:{}),
    ...(cold?{cold:cold.bpm,coldAt:cold.at}:{}),
  };
}

function validColdEvents(events:PracticeEvidence[]):PracticeEvidence[] {
  const modern=sorted(events.filter(modernResult));
  return modern.filter((candidate,index)=>candidate.context==='cold'&&solid(candidate)&&modern.slice(0,index).some(previous=>solid(previous)&&time(candidate.timestamp)-time(previous.timestamp)>=12*HOUR));
}

function validTransferEvents(events:PracticeEvidence[]):PracticeEvidence[] {
  const modern=sorted(events.filter(modernResult)),cold=validColdEvents(modern);
  return modern.filter(candidate=>['transfer','performance'].includes(candidate.context)&&solid(candidate)&&cold.some(previous=>time(candidate.timestamp)>=time(previous.timestamp)));
}

function consecutiveResult(events:PracticeEvidence[],result:PracticeResult):number {
  let count=0;
  for(const row of [...sorted(events.filter(modernResult))].reverse()){
    if(row.result!==result)break;
    count++;
  }
  return count;
}

function establishedFailure(event:PracticeEvidence,working?:number):boolean {
  if(event.result!=='not-yet')return false;
  return event.bpm===undefined||working===undefined||event.bpm<=working;
}

export function masteryFromEvidence(events:PracticeEvidence[],tempo=tempoLevels(events)):MasteryState {
  if(!events.length)return 'discover';
  const modern=sorted(events.filter(modernResult));
  if(!modern.length)return 'unassessed';

  const normalSolid=modern.filter(e=>e.context==='normal'&&solid(e));
  const stable=separated(normalSolid,12);
  const cold=validColdEvents(modern);
  const transfer=validTransferEvents(modern);

  let state:MasteryState;
  if(transfer.length)state='maintain';
  else if(cold.length)state='apply';
  else if(stable)state='retest';
  else if(modern.some(solid))state='stabilize';
  else if(modern.some(e=>e.result==='usable'))state='build';
  else state='learn';

  const latest=modern.at(-1)!;
  let establishedNotYet=0;
  for(const row of [...modern].reverse()){
    if(!establishedFailure(row,tempo?.working))break;
    establishedNotYet++;
  }
  if(establishedNotYet>=2){
    if(['maintain','apply','retest','stabilize','build'].includes(state))return 'build';
    return 'learn';
  }
  if(latest.result==='not-yet'){
    if(!establishedFailure(latest,tempo?.working))return state;
    if(state==='maintain'||state==='apply')return state;
    if(state==='retest')return 'stabilize';
    if(state==='stabilize')return 'build';
    return state==='learn'?'learn':'build';
  }
  if(latest.result==='usable'){
    if(latest.bpm!==undefined&&tempo?.working!==undefined&&latest.bpm>tempo.working)return state;
    if(state==='maintain'||state==='apply'||state==='stabilize')return state;
    if(state==='retest')return 'stabilize';
    return 'build';
  }
  return state;
}

function addDays(timestamp:string,days:number):string {
  return new Date(time(timestamp)+days*DAY).toISOString();
}

function maintenancePasses(events:PracticeEvidence[]):number {
  const transfer=validTransferEvents(events).at(-1);
  if(!transfer)return 0;
  return events.filter(e=>modernResult(e)&&solid(e)&&['maintenance','performance'].includes(e.context)&&time(e.timestamp)>time(transfer.timestamp)).length;
}

export function nextReviewAt(events:PracticeEvidence[],mastery:MasteryState):string|undefined {
  const modern=sorted(events.filter(modernResult)),latest=modern.at(-1);
  if(!latest||mastery==='discover'||mastery==='unassessed')return undefined;
  if(latest.result==='not-yet')return addDays(latest.timestamp,1);
  if(latest.result==='usable')return addDays(latest.timestamp,2);
  switch(mastery){
    case 'learn':return addDays(latest.timestamp,1);
    case 'build':return addDays(latest.timestamp,2);
    case 'stabilize':return addDays(latest.timestamp,2);
    case 'retest':return addDays(latest.timestamp,3);
    case 'apply':return addDays(latest.timestamp,3);
    case 'maintain':{
      const intervals=[7,14,30,60] as const;
      return addDays(latest.timestamp,intervals[Math.min(maintenancePasses(modern),intervals.length-1)]!);
    }
    default:return undefined;
  }
}

export function challengeDirection(events:PracticeEvidence[]):ChallengeDirection {
  const modern=sorted(events.filter(modernResult)),latest=modern.at(-1);
  if(!latest)return 'hold';
  const tail=modern.slice(-2),working=tempoLevels(events)?.working;
  if(tail.length===2&&tail.every(e=>establishedFailure(e,working)))return 'reduce';
  if(tail.length===2&&tail.every(solid)&&time(tail[1]!.timestamp)-time(tail[0]!.timestamp)>=12*HOUR)return 'advance';
  return 'hold';
}

export function reviewDue(state:PracticeState,now:Date|number|string=new Date()):boolean {
  if(!state.nextReviewAt)return false;
  const value=now instanceof Date?now.getTime():typeof now==='number'?now:Date.parse(now);
  return value>=Date.parse(state.nextReviewAt);
}

export function validRetentionEvidence(events:PracticeEvidence[]):{cold:number;transfer:number}{
  return {cold:validColdEvents(events).length,transfer:validTransferEvents(events).length};
}
