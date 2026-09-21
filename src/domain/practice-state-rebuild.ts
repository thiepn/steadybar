import type { Data } from './models.js';
import { allPracticeEvidence, type PracticeEvidence } from './practice-evidence.js';
import type { PracticeState, PracticeTargetRef } from './practice-state.js';

function latest(values:string[]):string|undefined{return [...values].sort().at(-1);}
function earliest(values:string[]):string|undefined{return [...values].sort()[0];}
function stableId(profileId:string,key:string):string {
  let hash=2166136261;
  for(const ch of `${profileId}|${key}`){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return `state-${(hash>>>0).toString(36)}`;
}
function targetFor(key:string,events:PracticeEvidence[],fallback?:PracticeState):PracticeTargetRef|undefined {
  for(const event of events){const index=event.targetKeys.indexOf(key);if(index>=0&&event.targets[index])return event.targets[index];}
  return fallback?.target;
}

export function rebuildPracticeStates(data:Data):PracticeState[] {
  const existing=new Map((data.practiceStates??[]).map(state=>[`${state.profileId}|${state.targetKey}`,state]));
  const evidence=allPracticeEvidence(data);
  const keys=new Map<string,{profileId:string;targetKey:string;events:PracticeEvidence[]}>();
  for(const event of evidence)for(const key of event.targetKeys){
    const id=`${event.profileId}|${key}`,group=keys.get(id)??{profileId:event.profileId,targetKey:key,events:[]};group.events.push(event);keys.set(id,group);
  }
  for(const [id,state] of existing)if(!keys.has(id))keys.set(id,{profileId:state.profileId,targetKey:state.targetKey,events:[]});

  return [...keys.values()].sort((a,b)=>a.profileId.localeCompare(b.profileId)||a.targetKey.localeCompare(b.targetKey)).flatMap(group=>{
    const old=existing.get(`${group.profileId}|${group.targetKey}`),events=[...group.events].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));
    const target=targetFor(group.targetKey,events,old);if(!target)return [];
    const resultEvents=events.filter(e=>e.result!==undefined),lastResult=resultEvents.at(-1);
    const practiced=events.filter(e=>e.practiced),evaluated=events.filter(e=>e.result!==undefined||e.quality?.length);
    const cold=events.filter(e=>e.context==='cold'),transfer=events.filter(e=>e.context==='transfer');
    const solidTempo=events.filter(e=>e.bpm!==undefined&&e.result==='solid');
    const peak=solidTempo.reduce<PracticeEvidence|undefined>((best,row)=>!best||row.bpm!>best.bpm!?row:best,undefined);
    const recent=resultEvents.slice(-10).reduce((sum,row)=>{if(row.result==='solid')sum.solid++;else if(row.result==='usable')sum.usable++;else sum.notYet++;return sum;},{solid:0,usable:0,notYet:0});
    const limitationEvent=[...events].reverse().find(e=>e.limitations.length);
    const timestamps=events.map(e=>e.timestamp),derivedAt=latest(timestamps)??old?.engine.derivedAt??old?.updatedAt??old?.createdAt;
    if(!derivedAt)return [];
    const createdAt=old?.createdAt??earliest(timestamps)??derivedAt;
    const updatedAt=latest([derivedAt,...(old?.updatedAt?[old.updatedAt]:[])])??derivedAt;
    return [{
      id:old?.id??stableId(group.profileId,group.targetKey),createdAt,updatedAt,profileId:group.profileId,targetKey:group.targetKey,target,
      mastery:events.length?'unassessed':'discover',
      ...(practiced.length?{lastPracticedAt:latest(practiced.map(e=>e.timestamp))}:{}),
      ...(evaluated.length?{lastEvaluatedAt:latest(evaluated.map(e=>e.timestamp))}:{}),
      ...(cold.length?{lastRetestAt:latest(cold.map(e=>e.timestamp))}:{}),
      ...(transfer.length?{lastAppliedAt:latest(transfer.map(e=>e.timestamp))}:{}),
      ...(lastResult?{latestResult:lastResult.result}:{}),
      limitations:limitationEvent?[...limitationEvent.limitations]:[],
      evidenceCount:events.length,
      ...(peak?{tempo:{peak:peak.bpm,peakAt:peak.timestamp}}:{}),
      recent,
      scheduling:old?{...old.scheduling}:{consecutiveSkips:0,manualPriority:0},
      engine:{version:1,derivedAt},
    } satisfies PracticeState];
  });
}
