import type { MetronomeConfig, TimingLabResult } from '../domain/models.js';
import type { TimingAnalysis } from '../domain/timing-analysis.js';
import type { PocketAnalysis } from '../domain/pocket-analysis.js';
import { metadata } from '../domain/utils.js';
import { resolvedTiming } from '../audio/scheduler.js';
import { store } from './store.js';

export interface SaveTimingLabInput {
  profileId:string;
  config:MetronomeConfig;
  durationSeconds:number;
  threshold:number;
  inputOffsetMs:number;
  analysis:TimingAnalysis;
  sessionId?:string;
  blockId?:string;
  sourceExerciseId?:string;
  pocket?:PocketAnalysis;
}

export async function saveTimingLabResult(input:SaveTimingLabInput):Promise<TimingLabResult>{
  const base=metadata(),a=input.analysis;
  const result:TimingLabResult={
    ...base,timingLabVersion:input.pocket?2:1,profileId:input.profileId,
    sessionId:input.sessionId,blockId:input.blockId,sourceExerciseId:input.sourceExerciseId,
    bpm:input.config.bpm,meter:structuredClone(input.config.meter),subdivision:input.config.subdivision,
    timingClick:structuredClone(resolvedTiming(input.config)),
    durationSeconds:input.durationSeconds,threshold:input.threshold,inputOffsetMs:input.inputOffsetMs,matchWindowMs:a.matchWindowMs,
    expectedCount:a.expectedCount,detectedCount:a.detectedCount,matchedCount:a.matchedCount,misses:a.misses,extras:a.extras,
    meanOffsetMs:a.meanOffsetMs,medianOffsetMs:a.medianOffsetMs,meanAbsoluteErrorMs:a.meanAbsoluteErrorMs,spreadMs:a.spreadMs,
    driftMsPerMinute:a.driftMsPerMinute,confidence:a.confidence,
    ...(input.pocket?structuredClone(input.pocket):{}),hits:a.hits,
  };
  await store.save('timingResults',result);
  return result;
}
export async function deleteTimingLabResult(id:string):Promise<void>{await store.delete('timingResults',id);}
