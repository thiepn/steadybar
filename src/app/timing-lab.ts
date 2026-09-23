import type { MetronomeConfig, TimingLabResult } from '../domain/models.js';
import type { TimingAnalysis } from '../domain/timing-analysis.js';
import { metadata } from '../domain/utils.js';
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
}

export async function saveTimingLabResult(input:SaveTimingLabInput):Promise<TimingLabResult>{
  const base=metadata(),a=input.analysis;
  const result:TimingLabResult={
    ...base,timingLabVersion:1,profileId:input.profileId,
    sessionId:input.sessionId,blockId:input.blockId,sourceExerciseId:input.sourceExerciseId,
    bpm:input.config.bpm,meter:structuredClone(input.config.meter),subdivision:input.config.subdivision,
    timingClick:structuredClone(input.config.timing!),
    durationSeconds:input.durationSeconds,threshold:input.threshold,inputOffsetMs:input.inputOffsetMs,matchWindowMs:a.matchWindowMs,
    expectedCount:a.expectedCount,detectedCount:a.detectedCount,matchedCount:a.matchedCount,misses:a.misses,extras:a.extras,
    meanOffsetMs:a.meanOffsetMs,medianOffsetMs:a.medianOffsetMs,meanAbsoluteErrorMs:a.meanAbsoluteErrorMs,spreadMs:a.spreadMs,
    driftMsPerMinute:a.driftMsPerMinute,confidence:a.confidence,hits:a.hits,
  };
  await store.save('timingResults',result);
  return result;
}
export async function deleteTimingLabResult(id:string):Promise<void>{await store.delete('timingResults',id);}
