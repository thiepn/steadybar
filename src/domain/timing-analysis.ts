import type { MetronomeConfig, TimingLabConfidence, TimingLabMatchedHit } from './models.js';

export interface TimingExpectedHit {
  index:number;
  time:number;
  elapsedMs:number;
  bar:number;
  beat:number;
  part:number;
}
export interface TimingDetectedHit {
  time:number;
  strength:number;
}
export interface TimingAnalysis {
  expectedCount:number;
  detectedCount:number;
  matchedCount:number;
  misses:number;
  extras:number;
  meanOffsetMs:number;
  medianOffsetMs:number;
  meanAbsoluteErrorMs:number;
  spreadMs:number;
  driftMsPerMinute:number;
  confidence:TimingLabConfidence;
  matchWindowMs:number;
  hits:TimingLabMatchedHit[];
}

function mean(values:number[]):number{return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;}
function median(values:number[]):number{
  if(!values.length)return 0;
  const rows=[...values].sort((a,b)=>a-b),middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]!:(rows[middle-1]!+rows[middle]!)/2;
}
function round1(value:number):number{return Math.round(value*10)/10;}

export function timingIntervalSeconds(config:Pick<MetronomeConfig,'bpm'|'subdivision'>):number{
  return 60/config.bpm/config.subdivision;
}
export function timingMatchWindowMs(config:Pick<MetronomeConfig,'bpm'|'subdivision'>):number{
  return Math.round(Math.min(180,Math.max(35,timingIntervalSeconds(config)*450)));
}
export function buildExpectedTimingGrid(config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,startTime:number,durationSeconds:number):TimingExpectedHit[]{
  const interval=timingIntervalSeconds(config),perBar=config.meter.beats*config.subdivision,count=Math.max(1,Math.floor(durationSeconds/interval+1e-9));
  return Array.from({length:count},(_,index)=>{
    const position=index%perBar;
    return {
      index,
      time:startTime+index*interval,
      elapsedMs:index*interval*1000,
      bar:Math.floor(index/perBar),
      beat:Math.floor(position/config.subdivision),
      part:position%config.subdivision,
    };
  });
}

function driftPerMinute(hits:TimingLabMatchedHit[]):number{
  if(hits.length<3)return 0;
  const xs=hits.map(hit=>hit.elapsedMs/1000),ys=hits.map(hit=>hit.offsetMs),mx=mean(xs),my=mean(ys);
  const denominator=xs.reduce((sum,x)=>sum+(x-mx)**2,0);
  if(denominator<=0)return 0;
  const slope=xs.reduce((sum,x,index)=>sum+(x-mx)*(ys[index]!-my),0)/denominator;
  return slope*60;
}

export function analyzeTiming(
  expected:readonly TimingExpectedHit[],
  detected:readonly TimingDetectedHit[],
  inputOffsetMs=0,
  matchWindowMs?:number,
):TimingAnalysis{
  if(!expected.length)throw new Error('Timing analysis needs at least one expected hit.');
  const intervalMs=expected.length>1?(expected[1]!.time-expected[0]!.time)*1000:500;
  const window=matchWindowMs??Math.round(Math.min(180,Math.max(35,intervalMs*.45)));
  const corrected=detected.map((hit,index)=>({index,time:hit.time-inputOffsetMs/1000,strength:hit.strength}));
  const candidates:{expectedIndex:number;detectedIndex:number;distanceMs:number}[]=[];
  for(let e=0;e<expected.length;e++){
    for(let d=0;d<corrected.length;d++){
      const distanceMs=(corrected[d]!.time-expected[e]!.time)*1000;
      if(Math.abs(distanceMs)<=window)candidates.push({expectedIndex:e,detectedIndex:d,distanceMs});
    }
  }
  candidates.sort((a,b)=>Math.abs(a.distanceMs)-Math.abs(b.distanceMs)||a.expectedIndex-b.expectedIndex||a.detectedIndex-b.detectedIndex);
  const usedExpected=new Set<number>(),usedDetected=new Set<number>(),pairs:typeof candidates=[];
  for(const candidate of candidates){
    if(usedExpected.has(candidate.expectedIndex)||usedDetected.has(candidate.detectedIndex))continue;
    usedExpected.add(candidate.expectedIndex);usedDetected.add(candidate.detectedIndex);pairs.push(candidate);
  }
  pairs.sort((a,b)=>a.expectedIndex-b.expectedIndex);
  const hits:TimingLabMatchedHit[]=pairs.map(pair=>{
    const target=expected[pair.expectedIndex]!,source=corrected[pair.detectedIndex]!;
    return {
      index:target.index,elapsedMs:round1(target.elapsedMs),offsetMs:round1(pair.distanceMs),strength:round1(source.strength),
      bar:target.bar,beat:target.beat,part:target.part,
    };
  });
  const offsets=hits.map(hit=>hit.offsetMs),average=mean(offsets);
  const spread=Math.sqrt(mean(offsets.map(value=>(value-average)**2)));
  const expectedCount=expected.length,detectedCount=detected.length,matchedCount=hits.length,matchRate=matchedCount/expectedCount;
  const extras=Math.max(0,detectedCount-matchedCount),misses=expectedCount-matchedCount;
  const confidence:TimingLabConfidence=
    matchedCount>=16&&matchRate>=.8&&extras<=Math.max(2,expectedCount*.15)?'high':
    matchedCount>=8&&matchRate>=.6&&extras<=Math.max(4,expectedCount*.35)?'medium':'low';
  return {
    expectedCount,detectedCount,matchedCount,misses,extras,
    meanOffsetMs:round1(average),
    medianOffsetMs:round1(median(offsets)),
    meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),
    spreadMs:round1(spread),
    driftMsPerMinute:round1(driftPerMinute(hits)),
    confidence,matchWindowMs:window,hits,
  };
}

export function timingBiasLabel(meanOffsetMs:number):'early'|'centered'|'late'{
  return meanOffsetMs<-5?'early':meanOffsetMs>5?'late':'centered';
}
