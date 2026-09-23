import type {
  MetronomeConfig,MidiDeviceProfile,MidiDrumMapping,MidiDrumVoice,
  MidiPerformanceMatchedHit,MidiPerformanceResult,MidiVoiceSummary,TimingLabConfidence,
} from './models.js';
import { buildExpectedTimingGrid, matchTimingEvents, timingMatchWindowMs, type TimingExpectedHit } from './timing-analysis.js';

export interface MidiTimedEvent {
  time:number;
  note:number;
  velocity:number;
  channel:number;
}
export interface MidiMappedEvent extends MidiTimedEvent {
  mapping:MidiDrumMapping;
}
export interface MidiPerformanceAnalysis {
  expectedCount:number;
  detectedCount:number;
  matchedCount:number;
  misses:number;
  extras:number;
  unmappedCount:number;
  meanOffsetMs:number;
  medianOffsetMs:number;
  meanAbsoluteErrorMs:number;
  spreadMs:number;
  driftMsPerMinute:number;
  confidence:TimingLabConfidence;
  matchWindowMs:number;
  velocityMean:number;
  velocityMedian:number;
  velocitySpread:number;
  velocityMin:number;
  velocityMax:number;
  velocityRange:number;
  hits:MidiPerformanceMatchedHit[];
  voices:MidiVoiceSummary[];
}

const mean=(values:number[])=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
function median(values:number[]):number{
  if(!values.length)return 0;
  const rows=[...values].sort((a,b)=>a-b),middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]!:(rows[middle-1]!+rows[middle]!)/2;
}
const round1=(value:number)=>Math.round(value*10)/10;
function spread(values:number[]):number{
  if(!values.length)return 0;
  const center=mean(values);
  return Math.sqrt(mean(values.map(value=>(value-center)**2)));
}
function driftPerMinute(hits:Pick<MidiPerformanceMatchedHit,'elapsedMs'|'offsetMs'>[]):number{
  if(hits.length<3)return 0;
  const xs=hits.map(hit=>hit.elapsedMs/1000),ys=hits.map(hit=>hit.offsetMs),mx=mean(xs),my=mean(ys);
  const denominator=xs.reduce((sum,x)=>sum+(x-mx)**2,0);
  if(denominator<=0)return 0;
  return xs.reduce((sum,x,index)=>sum+(x-mx)*(ys[index]!-my),0)/denominator*60;
}
function confidenceFor(expectedCount:number,matchedCount:number,extras:number):TimingLabConfidence{
  const rate=expectedCount?matchedCount/expectedCount:0;
  return matchedCount>=16&&rate>=.85&&extras<=Math.max(2,expectedCount*.1)?'high':
    matchedCount>=8&&rate>=.65&&extras<=Math.max(4,expectedCount*.3)?'medium':'low';
}

export function midiDeviceKey(manufacturer:string|undefined,name:string|undefined):string{
  const clean=(value:string|undefined)=>(value??'').trim().toLowerCase().replace(/\s+/g,' ');
  return `${clean(manufacturer)||'unknown'}::${clean(name)||'midi input'}`;
}

export const DEFAULT_GM_DRUM_MAPPING:ReadonlyArray<MidiDrumMapping> = [
  {note:35,voice:'kick',label:'Kick',enabled:true},{note:36,voice:'kick',label:'Kick',enabled:true},
  {note:37,voice:'rim',label:'Rim / side stick',enabled:true},{note:38,voice:'snare',label:'Snare',enabled:true},{note:40,voice:'snare',label:'Snare',enabled:true},
  {note:42,voice:'hihat-closed',label:'Closed hi-hat',enabled:true},{note:44,voice:'hihat-pedal',label:'Hi-hat pedal',enabled:true},{note:46,voice:'hihat-open',label:'Open hi-hat',enabled:true},
  {note:41,voice:'tom-low',label:'Low tom',enabled:true},{note:43,voice:'tom-low',label:'Floor tom',enabled:true},{note:45,voice:'tom-mid',label:'Mid tom',enabled:true},
  {note:47,voice:'tom-mid',label:'Mid tom',enabled:true},{note:48,voice:'tom-high',label:'High tom',enabled:true},{note:50,voice:'tom-high',label:'High tom',enabled:true},
  {note:49,voice:'crash',label:'Crash',enabled:true},{note:55,voice:'crash',label:'Splash / crash',enabled:true},{note:57,voice:'crash',label:'Crash 2',enabled:true},
  {note:51,voice:'ride',label:'Ride',enabled:true},{note:53,voice:'ride-bell',label:'Ride bell',enabled:true},{note:59,voice:'ride',label:'Ride 2',enabled:true},
];

export function defaultMidiMappings():MidiDrumMapping[]{return DEFAULT_GM_DRUM_MAPPING.map(row=>({...row}));}

export function mapMidiEvents(events:readonly MidiTimedEvent[],profile:Pick<MidiDeviceProfile,'channel'|'mappings'>):{mapped:MidiMappedEvent[];unmappedCount:number}{
  const map=new Map(profile.mappings.filter(row=>row.enabled).map(row=>[row.note,row]));
  const mapped:MidiMappedEvent[]=[];let unmappedCount=0;
  for(const event of events){
    if(profile.channel!==undefined&&event.channel!==profile.channel)continue;
    const mapping=map.get(event.note);
    if(!mapping){unmappedCount++;continue;}
    mapped.push({...event,mapping});
  }
  return {mapped,unmappedCount};
}

function voiceSummaries(hits:MidiPerformanceMatchedHit[]):MidiVoiceSummary[]{
  const groups=new Map<string,MidiPerformanceMatchedHit[]>();
  for(const hit of hits){
    const key=hit.voice+'::'+hit.label,rows=groups.get(key)??[];
    rows.push(hit);groups.set(key,rows);
  }
  return [...groups.values()].map(rows=>{
    const velocities=rows.map(row=>row.velocity),offsets=rows.map(row=>row.offsetMs);
    return {
      voice:rows[0]!.voice,label:rows[0]!.label,count:rows.length,
      medianVelocity:round1(median(velocities)),velocitySpread:round1(spread(velocities)),
      meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),timingSpreadMs:round1(spread(offsets)),
    };
  }).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
}

export function analyzeMidiPerformance(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  events:readonly MidiTimedEvent[],
  profile:Pick<MidiDeviceProfile,'channel'|'mappings'>,
  matchWindowMs=timingMatchWindowMs(config),
  voiceFilter?:MidiDrumVoice,
):MidiPerformanceAnalysis{
  const expected:TimingExpectedHit[]=buildExpectedTimingGrid(config,startTime,durationSeconds);
  const endTime=startTime+durationSeconds,windowSeconds=matchWindowMs/1000;
  const windowedEvents=events.filter(event=>event.time>=startTime-windowSeconds&&event.time<=endTime+windowSeconds);
  const {mapped,unmappedCount}=mapMidiEvents(windowedEvents,profile);
  const analyzed=voiceFilter?mapped.filter(event=>event.mapping.voice===voiceFilter):mapped;
  const {pairs,corrected}=matchTimingEvents(expected,analyzed,0,matchWindowMs);
  const hits:MidiPerformanceMatchedHit[]=pairs.map(pair=>{
    const target=expected[pair.expectedIndex]!,source=corrected[pair.detectedIndex]!;
    return {
      index:target.index,elapsedMs:round1(target.elapsedMs),offsetMs:round1(pair.distanceMs),
      note:source.note,velocity:source.velocity,channel:source.channel,voice:source.mapping.voice,label:source.mapping.label,
      bar:target.bar,beat:target.beat,part:target.part,
    };
  });
  const offsets=hits.map(hit=>hit.offsetMs),velocities=hits.map(hit=>hit.velocity),average=mean(offsets);
  const expectedCount=expected.length,detectedCount=analyzed.length,matchedCount=hits.length;
  const misses=expectedCount-matchedCount,extras=Math.max(0,detectedCount-matchedCount);
  const velocityMin=velocities.length?Math.min(...velocities):0,velocityMax=velocities.length?Math.max(...velocities):0;
  return {
    expectedCount,detectedCount,matchedCount,misses,extras,unmappedCount,
    meanOffsetMs:round1(average),medianOffsetMs:round1(median(offsets)),meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),
    spreadMs:round1(spread(offsets)),driftMsPerMinute:round1(driftPerMinute(hits)),confidence:confidenceFor(expectedCount,matchedCount,extras),matchWindowMs,
    velocityMean:round1(mean(velocities)),velocityMedian:round1(median(velocities)),velocitySpread:round1(spread(velocities)),
    velocityMin,velocityMax,velocityRange:velocityMax-velocityMin,hits,voices:voiceSummaries(hits),
  };
}

export function midiResultFromAnalysis(
  base:Omit<MidiPerformanceResult,'expectedCount'|'detectedCount'|'matchedCount'|'misses'|'extras'|'unmappedCount'|'meanOffsetMs'|'medianOffsetMs'|'meanAbsoluteErrorMs'|'spreadMs'|'driftMsPerMinute'|'confidence'|'matchWindowMs'|'velocityMean'|'velocityMedian'|'velocitySpread'|'velocityMin'|'velocityMax'|'velocityRange'|'hits'|'voices'>,
  analysis:MidiPerformanceAnalysis,
):MidiPerformanceResult{return {...base,...analysis};}

export const MIDI_VOICES:ReadonlyArray<{value:MidiDrumVoice;label:string}> = [
  {value:'kick',label:'Kick'},{value:'snare',label:'Snare'},{value:'rim',label:'Rim / side stick'},
  {value:'hihat-closed',label:'Closed hi-hat'},{value:'hihat-open',label:'Open hi-hat'},{value:'hihat-pedal',label:'Hi-hat pedal'},
  {value:'tom-high',label:'High tom'},{value:'tom-mid',label:'Mid tom'},{value:'tom-low',label:'Low tom'},
  {value:'ride',label:'Ride'},{value:'ride-bell',label:'Ride bell'},{value:'crash',label:'Crash'},{value:'other',label:'Other'},
];
