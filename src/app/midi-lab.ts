import type {
  MetronomeConfig,MidiDeviceProfile,MidiDrumMapping,MidiPerformanceResult,
} from '../domain/models.js';
import type { MidiPerformanceAnalysis } from '../domain/midi-analysis.js';
import { metadata, nowISO } from '../domain/utils.js';
import { resolvedTiming } from '../audio/scheduler.js';
import { store } from './store.js';

export interface MidiDeviceProfileInput {
  profileId:string;
  deviceKey:string;
  inputId?:string;
  manufacturer:string;
  name:string;
  channel?:number;
  mappings:MidiDrumMapping[];
}
export interface MidiResultInput {
  profileId:string;
  config:MetronomeConfig;
  durationSeconds:number;
  device:Pick<MidiDeviceProfile,'id'|'deviceKey'|'name'|'manufacturer'>;
  analysis:MidiPerformanceAnalysis;
  sessionId?:string;
  blockId?:string;
  sourceExerciseId?:string;
}

export function midiProfileFor(profileId:string,deviceKey:string):MidiDeviceProfile|undefined{
  return (store.snapshot().midiDeviceProfiles??[]).find(row=>row.profileId===profileId&&row.deviceKey===deviceKey);
}

export async function saveMidiDeviceProfile(input:MidiDeviceProfileInput):Promise<MidiDeviceProfile>{
  const existing=midiProfileFor(input.profileId,input.deviceKey),base=existing??metadata();
  const next:MidiDeviceProfile={
    ...base,updatedAt:nowISO(),profileId:input.profileId,deviceKey:input.deviceKey,inputId:input.inputId,
    manufacturer:input.manufacturer,name:input.name,channel:input.channel,mappings:input.mappings.map(row=>({...row})),
  };
  await store.save('midiDeviceProfiles',next);
  return next;
}

export async function deleteMidiDeviceProfile(id:string):Promise<void>{await store.delete('midiDeviceProfiles',id);}

export async function saveMidiPerformanceResult(input:MidiResultInput):Promise<MidiPerformanceResult>{
  const base=metadata(),a=input.analysis;
  const result:MidiPerformanceResult={
    ...base,midiAnalysisVersion:1,profileId:input.profileId,
    sessionId:input.sessionId,blockId:input.blockId,sourceExerciseId:input.sourceExerciseId,
    deviceProfileId:input.device.id,deviceKey:input.device.deviceKey,deviceNameSnapshot:input.device.name,manufacturerSnapshot:input.device.manufacturer,
    bpm:input.config.bpm,meter:structuredClone(input.config.meter),subdivision:input.config.subdivision,
    timingClick:structuredClone(resolvedTiming(input.config)),durationSeconds:input.durationSeconds,matchWindowMs:a.matchWindowMs,
    expectedCount:a.expectedCount,detectedCount:a.detectedCount,matchedCount:a.matchedCount,misses:a.misses,extras:a.extras,unmappedCount:a.unmappedCount,
    meanOffsetMs:a.meanOffsetMs,medianOffsetMs:a.medianOffsetMs,meanAbsoluteErrorMs:a.meanAbsoluteErrorMs,spreadMs:a.spreadMs,driftMsPerMinute:a.driftMsPerMinute,
    confidence:a.confidence,velocityMean:a.velocityMean,velocityMedian:a.velocityMedian,velocitySpread:a.velocitySpread,
    velocityMin:a.velocityMin,velocityMax:a.velocityMax,velocityRange:a.velocityRange,hits:a.hits,voices:a.voices,
  };
  await store.save('midiResults',result);
  return result;
}

export async function deleteMidiPerformanceResult(id:string):Promise<void>{await store.delete('midiResults',id);}
