import type { TimingLabMatchedHit } from './models.js';
import { analyzeTiming, type TimingAnalysis, type TimingDetectedHit, type TimingExpectedHit } from './timing-analysis.js';

export interface PocketAnalysis {
  targetOffsetMs:number;
  targetBandMs:number;
  meanTargetErrorMs:number;
  medianTargetErrorMs:number;
  meanAbsoluteTargetErrorMs:number;
  targetBandHits:number;
}

const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
const median=(values:number[])=>{
  if(!values.length)return 0;
  const rows=[...values].sort((a,b)=>a-b),middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]!:(rows[middle-1]!+rows[middle]!)/2;
};
const round1=(value:number)=>Math.round(value*10)/10;

export function analyzePocket(
  hits:readonly Pick<TimingLabMatchedHit,'offsetMs'>[],
  targetOffsetMs:number,
  targetBandMs:number,
):PocketAnalysis{
  if(!Number.isFinite(targetOffsetMs)||targetOffsetMs<-120||targetOffsetMs>120)throw new Error('Pocket target offset must be between -120 and +120 ms.');
  if(!Number.isFinite(targetBandMs)||targetBandMs<1||targetBandMs>100)throw new Error('Pocket target band must be between 1 and 100 ms.');
  const errors=hits.map(hit=>hit.offsetMs-targetOffsetMs);
  return {
    targetOffsetMs:round1(targetOffsetMs),
    targetBandMs:round1(targetBandMs),
    meanTargetErrorMs:round1(mean(errors)),
    medianTargetErrorMs:round1(median(errors)),
    meanAbsoluteTargetErrorMs:round1(mean(errors.map(Math.abs))),
    targetBandHits:errors.filter(error=>Math.abs(error)<=targetBandMs).length,
  };
}

export function pocketTargetLabel(offsetMs:number):string{
  if(Math.abs(offsetMs)<.05)return 'Centered';
  return offsetMs<0?'Ahead '+Math.abs(offsetMs).toFixed(0)+' ms':'Behind '+offsetMs.toFixed(0)+' ms';
}

export function pocketErrorLabel(errorMs:number):'earlier-than-target'|'on-target'|'later-than-target'{
  return errorMs<-2?'earlier-than-target':errorMs>2?'later-than-target':'on-target';
}

export interface PocketTimingAnalysis {
  timing:TimingAnalysis;
  pocket:PocketAnalysis;
}

export function analyzePocketTiming(
  expected:readonly TimingExpectedHit[],
  detected:readonly TimingDetectedHit[],
  inputOffsetMs:number,
  targetOffsetMs:number,
  targetBandMs:number,
  matchWindowMs?:number,
):PocketTimingAnalysis{
  analyzePocket([],targetOffsetMs,targetBandMs);
  const shiftedDetected=detected.map(hit=>({...hit,time:hit.time-targetOffsetMs/1000}));
  const relative=analyzeTiming(expected,shiftedDetected,inputOffsetMs,matchWindowMs);
  const hits=relative.hits.map(hit=>({...hit,offsetMs:round1(hit.offsetMs+targetOffsetMs)}));
  const offsets=hits.map(hit=>hit.offsetMs),average=mean(offsets);
  const spread=Math.sqrt(mean(offsets.map(value=>(value-average)**2)));
  const timing:TimingAnalysis={
    ...relative,hits,
    meanOffsetMs:round1(average),
    medianOffsetMs:round1(median(offsets)),
    meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),
    spreadMs:round1(spread),
  };
  return {timing,pocket:analyzePocket(hits,targetOffsetMs,targetBandMs)};
}

