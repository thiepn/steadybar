import type {
  MetronomeConfig,MidiDeviceProfile,MidiDrumMapping,MidiDrumVoice,MidiExpectedPattern,MidiGridLaneAssignment,MidiGridLaneSummary,MidiPhraseBarSummary,
  MidiPerformanceMatchedHit,MidiPerformanceResult,MidiVoiceSummary,TimingLabConfidence,
} from './models.js';
import type { DrumGridVoice, PracticeProtocol } from './practice-types.js';
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
  wrongVoiceCount?:number;
  gridLaneSummaries?:MidiGridLaneSummary[];
  phraseLaneSummaries?:MidiGridLaneSummary[];
  phraseBarSummaries?:MidiPhraseBarSummary[];
  landingExpectedCount?:number;
  landingMatchedCount?:number;
  landingMisses?:number;
  landingMeanOffsetMs?:number;
  landingMeanAbsoluteErrorMs?:number;
  accentVelocityMean?:number;
  normalVelocityMean?:number;
  accentVelocityDifference?:number;
}
type DrumGridProtocol=Extract<PracticeProtocol,{kind:'drum-grid'}>;
type DrumPhraseProtocol=Extract<PracticeProtocol,{kind:'drum-phrase'}>;
interface MidiGridExpectedHit extends TimingExpectedHit {
  gridVoice:DrumGridVoice;
  midiVoice:MidiDrumVoice;
  accent:boolean;
}
interface MidiPhraseExpectedHit extends MidiGridExpectedHit {
  phraseBarIndex:number;
  phraseBarRole:'groove'|'fill'|'return';
  phraseBarLabel:string;
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

export function expectedMidiGrid(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  pattern:MidiExpectedPattern,
):TimingExpectedHit[]{
  const grid=buildExpectedTimingGrid(config,startTime,durationSeconds);
  if(pattern==='subdivision')return grid;
  if(pattern==='beat')return grid.filter(hit=>hit.part===0);
  if(pattern==='drum-grid')throw new Error('Drum Grid scoring requires an authored grid and lane-to-MIDI assignments.');
  if(pattern==='drum-phrase')throw new Error('Drum Phrase scoring requires an authored phrase and lane-to-MIDI assignments.');
  if(config.meter.beats<4)throw new Error('2 & 4 backbeat analysis requires a meter with at least four beats.');
  return grid.filter(hit=>hit.part===0&&(hit.beat===1||hit.beat===3));
}

export function analyzeMidiPerformance(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  events:readonly MidiTimedEvent[],
  profile:Pick<MidiDeviceProfile,'channel'|'mappings'>,
  matchWindowMs=timingMatchWindowMs(config),
  voiceFilter?:MidiDrumVoice,
  expectedPattern:MidiExpectedPattern='subdivision',
):MidiPerformanceAnalysis{
  const expected:TimingExpectedHit[]=expectedMidiGrid(config,startTime,durationSeconds,expectedPattern);
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

type IndexedMappedEvent={source:MidiMappedEvent&{originalIndex:number};detectedIndex:number};
interface AuthoredMidiMatch<T extends MidiGridExpectedHit>{target:T;source:MidiMappedEvent&{originalIndex:number};distanceMs:number}

function lowerBoundTime<T>(rows:readonly T[],time:number,getTime:(row:T)=>number):number{
  let low=0,high=rows.length;
  while(low<high){const mid=(low+high)>>1;if(getTime(rows[mid]!)<time)low=mid+1;else high=mid;}
  return low;
}

function matchAuthoredMidi<T extends MidiGridExpectedHit>(
  expected:readonly T[],
  detected:readonly (MidiMappedEvent&{originalIndex:number})[],
  matchWindowMs:number,
):{matches:AuthoredMidiMatch<T>[];used:Set<number>;wrongVoiceCount:number}{
  const windowSeconds=matchWindowMs/1000,byVoice=new Map<MidiDrumVoice,IndexedMappedEvent[]>();
  detected.forEach((source,detectedIndex)=>{
    const rows=byVoice.get(source.mapping.voice)??[];rows.push({source,detectedIndex});byVoice.set(source.mapping.voice,rows);
  });
  const used=new Set<number>(),matches:AuthoredMidiMatch<T>[]=[];
  for(const target of expected){
    const rows=byVoice.get(target.midiVoice);if(!rows?.length)continue;
    const minimum=target.time-windowSeconds,maximum=target.time+windowSeconds;
    let index=lowerBoundTime(rows,minimum,row=>row.source.time),best:IndexedMappedEvent|undefined,bestDistance=Infinity;
    for(;index<rows.length&&rows[index]!.source.time<=maximum;index++){
      const candidate=rows[index]!;if(used.has(candidate.detectedIndex))continue;
      const distanceMs=(candidate.source.time-target.time)*1000,absolute=Math.abs(distanceMs);
      if(absolute<bestDistance||(absolute===bestDistance&&candidate.detectedIndex<(best?.detectedIndex??Infinity))){best=candidate;bestDistance=absolute;}
    }
    if(!best)continue;
    used.add(best.detectedIndex);matches.push({target,source:best.source,distanceMs:(best.source.time-target.time)*1000});
  }
  const slots:{time:number;voices:Set<MidiDrumVoice>}[]=[];
  for(const target of expected){
    const last=slots.at(-1);
    if(last&&last.time===target.time)last.voices.add(target.midiVoice);
    else slots.push({time:target.time,voices:new Set([target.midiVoice])});
  }
  let wrongVoiceCount=0;
  detected.forEach((source,detectedIndex)=>{
    if(used.has(detectedIndex)||!slots.length)return;
    const insertion=lowerBoundTime(slots,source.time,row=>row.time),candidates=[insertion-1,insertion].filter(index=>index>=0&&index<slots.length);
    let nearestIndex=-1,distance=Infinity;
    for(const index of candidates){const candidate=Math.abs((source.time-slots[index]!.time)*1000);if(candidate<distance){distance=candidate;nearestIndex=index;}}
    if(nearestIndex>=0&&distance<=matchWindowMs&&!slots[nearestIndex]!.voices.has(source.mapping.voice))wrongVoiceCount++;
  });
  return {matches,used,wrongVoiceCount};
}

export function expectedMidiDrumGrid(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  grid:DrumGridProtocol,
  assignments:readonly MidiGridLaneAssignment[],
):MidiGridExpectedHit[]{
  if(grid.pulse.beats!==config.meter.beats||grid.pulse.beatUnit!==config.meter.beatUnit||grid.pulse.subdivision!==config.subdivision)
    throw new Error('Drum Grid score pulse must match the MIDI test meter and subdivision.');
  const assignmentMap=new Map(assignments.map(row=>[row.gridVoice,row.midiVoice]));
  const activeLanes=grid.lanes.filter(lane=>/[xX]/.test(lane.steps));
  for(const lane of activeLanes)if(!assignmentMap.has(lane.voice))throw new Error('Assign a MIDI drum sound to every active Drum Grid lane.');
  const assignedActive=activeLanes.map(lane=>assignmentMap.get(lane.voice)!);
  if(new Set(assignedActive).size!==assignedActive.length)throw new Error('Active Drum Grid lanes need different MIDI sounds so lane accuracy remains identifiable.');
  const base=buildExpectedTimingGrid(config,startTime,durationSeconds),expected:MidiGridExpectedHit[]=[];
  for(const hit of base){
    const step=hit.beat*config.subdivision+hit.part;
    for(const lane of activeLanes){
      const cell=lane.steps[step];
      if(cell==='x'||cell==='X')expected.push({...hit,index:expected.length,gridVoice:lane.voice,midiVoice:assignmentMap.get(lane.voice)!,accent:cell==='X'});
    }
  }
  if(!expected.length)throw new Error('The selected Drum Grid has no expected hits.');
  return expected;
}

export function analyzeMidiGridPerformance(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  events:readonly MidiTimedEvent[],
  profile:Pick<MidiDeviceProfile,'channel'|'mappings'>,
  grid:DrumGridProtocol,
  assignments:readonly MidiGridLaneAssignment[],
  matchWindowMs=timingMatchWindowMs(config),
):MidiPerformanceAnalysis{
  const expected=expectedMidiDrumGrid(config,startTime,durationSeconds,grid,assignments);
  const endTime=startTime+durationSeconds,windowSeconds=matchWindowMs/1000;
  const windowedEvents=events.filter(event=>event.time>=startTime-windowSeconds&&event.time<=endTime+windowSeconds);
  const {mapped,unmappedCount}=mapMidiEvents(windowedEvents,profile);
  const detected=mapped.map((event,index)=>({...event,originalIndex:index})).sort((a,b)=>a.time-b.time||a.originalIndex-b.originalIndex);
  const matched=matchAuthoredMidi(expected,detected,matchWindowMs),wrongVoiceCount=matched.wrongVoiceCount;
  const hits:MidiPerformanceMatchedHit[]=matched.matches.map(({target,source,distanceMs})=>({
    index:target.index,elapsedMs:round1(target.elapsedMs),offsetMs:round1(distanceMs),
    note:source.note,velocity:source.velocity,channel:source.channel,voice:source.mapping.voice,label:source.mapping.label,
    bar:target.bar,beat:target.beat,part:target.part,expectedGridVoice:target.gridVoice,expectedAccent:target.accent,
  }));
  const offsets=hits.map(hit=>hit.offsetMs),velocities=hits.map(hit=>hit.velocity),average=mean(offsets);
  const expectedCount=expected.length,detectedCount=detected.length,matchedCount=hits.length,misses=expectedCount-matchedCount,extras=Math.max(0,detectedCount-matchedCount);
  const velocityMin=velocities.length?Math.min(...velocities):0,velocityMax=velocities.length?Math.max(...velocities):0;
  const gridLaneSummaries:MidiGridLaneSummary[]=assignments.flatMap(assignment=>{
    const laneExpected=expected.filter(hit=>hit.gridVoice===assignment.gridVoice);
    if(!laneExpected.length)return [];
    const matched=hits.filter(hit=>hit.expectedGridVoice===assignment.gridVoice).length;
    return [{gridVoice:assignment.gridVoice,midiVoice:assignment.midiVoice,expectedCount:laneExpected.length,matchedCount:matched,misses:laneExpected.length-matched}];
  });
  const accentHits=hits.filter(hit=>hit.expectedAccent),accentVoices=[...new Set(accentHits.map(hit=>hit.voice))];
  const comparableVoice=accentVoices.length===1?accentVoices[0]:undefined;
  const accentVelocities=comparableVoice?accentHits.filter(hit=>hit.voice===comparableVoice).map(hit=>hit.velocity):[];
  const normalVelocities=comparableVoice?hits.filter(hit=>hit.expectedAccent===false&&hit.voice===comparableVoice).map(hit=>hit.velocity):[];
  const accentVelocityMean=accentVelocities.length&&normalVelocities.length?round1(mean(accentVelocities)):undefined;
  const normalVelocityMean=accentVelocities.length&&normalVelocities.length?round1(mean(normalVelocities)):undefined;
  const accentVelocityDifference=accentVelocityMean!==undefined&&normalVelocityMean!==undefined?round1(accentVelocityMean-normalVelocityMean):undefined;
  return {
    expectedCount,detectedCount,matchedCount,misses,extras,unmappedCount,wrongVoiceCount,gridLaneSummaries,
    meanOffsetMs:round1(average),medianOffsetMs:round1(median(offsets)),meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),
    spreadMs:round1(spread(offsets)),driftMsPerMinute:round1(driftPerMinute(hits)),confidence:confidenceFor(expectedCount,matchedCount,extras),matchWindowMs,
    velocityMean:round1(mean(velocities)),velocityMedian:round1(median(velocities)),velocitySpread:round1(spread(velocities)),
    velocityMin,velocityMax,velocityRange:velocityMax-velocityMin,hits,voices:voiceSummaries(hits),
    ...(accentVelocityMean!==undefined?{accentVelocityMean}:{}),
    ...(normalVelocityMean!==undefined?{normalVelocityMean}:{}),
    ...(accentVelocityDifference!==undefined?{accentVelocityDifference}:{}),
  };
}

export function drumPhraseCycleSeconds(phrase:DrumPhraseProtocol,bpm=phrase.pulse.bpm):number {
  return phrase.bars.length*phrase.pulse.beats*60/bpm;
}

export function expectedMidiDrumPhrase(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  phrase:DrumPhraseProtocol,
  assignments:readonly MidiGridLaneAssignment[],
):MidiPhraseExpectedHit[]{
  if(phrase.pulse.beats!==config.meter.beats||phrase.pulse.beatUnit!==config.meter.beatUnit||phrase.pulse.subdivision!==config.subdivision)
    throw new Error('Drum Phrase score pulse must match the MIDI test meter and subdivision.');
  const cycleSeconds=drumPhraseCycleSeconds(phrase,config.bpm);
  if(durationSeconds+1e-6<cycleSeconds)throw new Error(`Drum Phrase scoring needs at least one complete phrase cycle (${Math.ceil(cycleSeconds)} seconds at this tempo).`);
  const assignmentMap=new Map(assignments.map(row=>[row.gridVoice,row.midiVoice]));
  const activeVoices=[...new Set(phrase.bars.flatMap(bar=>bar.lanes.filter(lane=>/[xX]/.test(lane.steps)).map(lane=>lane.voice)))];
  for(const voice of activeVoices)if(!assignmentMap.has(voice))throw new Error('Assign a MIDI drum sound to every active Drum Phrase lane.');
  const assignedActive=activeVoices.map(voice=>assignmentMap.get(voice)!);
  if(new Set(assignedActive).size!==assignedActive.length)throw new Error('Active Drum Phrase lanes need different MIDI sounds so lane accuracy remains identifiable.');
  const base=buildExpectedTimingGrid(config,startTime,durationSeconds),expected:MidiPhraseExpectedHit[]=[];
  for(const hit of base){
    const phraseBarIndex=hit.bar%phrase.bars.length,bar=phrase.bars[phraseBarIndex]!,step=hit.beat*config.subdivision+hit.part;
    for(const lane of bar.lanes){
      const cell=lane.steps[step];
      if((cell==='x'||cell==='X')&&assignmentMap.has(lane.voice))expected.push({...hit,index:expected.length,gridVoice:lane.voice,midiVoice:assignmentMap.get(lane.voice)!,accent:cell==='X',phraseBarIndex,phraseBarRole:bar.role,phraseBarLabel:bar.label});
    }
  }
  if(!expected.length)throw new Error('The selected Drum Phrase has no expected hits.');
  return expected;
}

export function analyzeMidiPhrasePerformance(
  config:Pick<MetronomeConfig,'bpm'|'meter'|'subdivision'>,
  startTime:number,
  durationSeconds:number,
  events:readonly MidiTimedEvent[],
  profile:Pick<MidiDeviceProfile,'channel'|'mappings'>,
  phrase:DrumPhraseProtocol,
  assignments:readonly MidiGridLaneAssignment[],
  matchWindowMs=timingMatchWindowMs(config),
):MidiPerformanceAnalysis{
  const expected=expectedMidiDrumPhrase(config,startTime,durationSeconds,phrase,assignments);
  const endTime=startTime+durationSeconds,windowSeconds=matchWindowMs/1000;
  const windowedEvents=events.filter(event=>event.time>=startTime-windowSeconds&&event.time<=endTime+windowSeconds);
  const {mapped,unmappedCount}=mapMidiEvents(windowedEvents,profile);
  const detected=mapped.map((event,index)=>({...event,originalIndex:index})).sort((a,b)=>a.time-b.time||a.originalIndex-b.originalIndex);
  const matched=matchAuthoredMidi(expected,detected,matchWindowMs),wrongVoiceCount=matched.wrongVoiceCount;
  const hits:MidiPerformanceMatchedHit[]=matched.matches.map(({target,source,distanceMs})=>({
    index:target.index,elapsedMs:round1(target.elapsedMs),offsetMs:round1(distanceMs),
    note:source.note,velocity:source.velocity,channel:source.channel,voice:source.mapping.voice,label:source.mapping.label,
    bar:target.bar,beat:target.beat,part:target.part,expectedGridVoice:target.gridVoice,expectedAccent:target.accent,
    expectedPhraseBarIndex:target.phraseBarIndex,expectedPhraseBarRole:target.phraseBarRole,
  }));
  const offsets=hits.map(hit=>hit.offsetMs),velocities=hits.map(hit=>hit.velocity),average=mean(offsets);
  const expectedCount=expected.length,detectedCount=detected.length,matchedCount=hits.length,misses=expectedCount-matchedCount,extras=Math.max(0,detectedCount-matchedCount);
  const velocityMin=velocities.length?Math.min(...velocities):0,velocityMax=velocities.length?Math.max(...velocities):0;
  const phraseLaneSummaries:MidiGridLaneSummary[]=assignments.flatMap(assignment=>{
    const laneExpected=expected.filter(hit=>hit.gridVoice===assignment.gridVoice);if(!laneExpected.length)return [];
    const matched=hits.filter(hit=>hit.expectedGridVoice===assignment.gridVoice).length;
    return [{gridVoice:assignment.gridVoice,midiVoice:assignment.midiVoice,expectedCount:laneExpected.length,matchedCount:matched,misses:laneExpected.length-matched}];
  });
  const phraseBarSummaries:MidiPhraseBarSummary[]=phrase.bars.map((bar,barIndex)=>{
    const barExpected=expected.filter(hit=>hit.phraseBarIndex===barIndex),barHits=hits.filter(hit=>hit.expectedPhraseBarIndex===barIndex);
    return {barIndex,role:bar.role,label:bar.label,expectedCount:barExpected.length,matchedCount:barHits.length,misses:barExpected.length-barHits.length,meanAbsoluteErrorMs:round1(mean(barHits.map(hit=>Math.abs(hit.offsetMs))))};
  });
  const landingExpected=expected.filter(hit=>hit.phraseBarRole==='return'&&hit.beat===0&&hit.part===0),landingHits=hits.filter(hit=>hit.expectedPhraseBarRole==='return'&&hit.beat===0&&hit.part===0);
  const landingExpectedCount=landingExpected.length,landingMatchedCount=landingHits.length,landingMisses=landingExpectedCount-landingMatchedCount,landingMeanOffsetMs=round1(mean(landingHits.map(hit=>hit.offsetMs))),landingMeanAbsoluteErrorMs=round1(mean(landingHits.map(hit=>Math.abs(hit.offsetMs))));
  const accentHits=hits.filter(hit=>hit.expectedAccent),accentVoices=[...new Set(accentHits.map(hit=>hit.voice))],comparableVoice=accentVoices.length===1?accentVoices[0]:undefined;
  const accentVelocities=comparableVoice?accentHits.filter(hit=>hit.voice===comparableVoice).map(hit=>hit.velocity):[],normalVelocities=comparableVoice?hits.filter(hit=>hit.expectedAccent===false&&hit.voice===comparableVoice).map(hit=>hit.velocity):[];
  const accentVelocityMean=accentVelocities.length&&normalVelocities.length?round1(mean(accentVelocities)):undefined,normalVelocityMean=accentVelocities.length&&normalVelocities.length?round1(mean(normalVelocities)):undefined;
  const accentVelocityDifference=accentVelocityMean!==undefined&&normalVelocityMean!==undefined?round1(accentVelocityMean-normalVelocityMean):undefined;
  return {
    expectedCount,detectedCount,matchedCount,misses,extras,unmappedCount,wrongVoiceCount,phraseLaneSummaries,phraseBarSummaries,
    landingExpectedCount,landingMatchedCount,landingMisses,landingMeanOffsetMs,landingMeanAbsoluteErrorMs,
    meanOffsetMs:round1(average),medianOffsetMs:round1(median(offsets)),meanAbsoluteErrorMs:round1(mean(offsets.map(Math.abs))),
    spreadMs:round1(spread(offsets)),driftMsPerMinute:round1(driftPerMinute(hits)),confidence:confidenceFor(expectedCount,matchedCount,extras),matchWindowMs,
    velocityMean:round1(mean(velocities)),velocityMedian:round1(median(velocities)),velocitySpread:round1(spread(velocities)),velocityMin,velocityMax,velocityRange:velocityMax-velocityMin,hits,voices:voiceSummaries(hits),
    ...(accentVelocityMean!==undefined?{accentVelocityMean}:{}),...(normalVelocityMean!==undefined?{normalVelocityMean}:{}),...(accentVelocityDifference!==undefined?{accentVelocityDifference}:{}),
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
