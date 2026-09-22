import type { PracticeRecording } from './models.js';

export type RecordingTarget = Pick<PracticeRecording,'sourceType'|'sourceExerciseId'|'sourceSongId'|'sourceSongSectionId'|'title'>;

export function recordingTargetKey(recording:RecordingTarget):string{
  if(recording.sourceType==='exercise'&&recording.sourceExerciseId)return 'exercise:'+recording.sourceExerciseId;
  if(recording.sourceType==='song-section'&&recording.sourceSongId&&recording.sourceSongSectionId)return 'song-section:'+recording.sourceSongId+':'+recording.sourceSongSectionId;
  if(recording.sourceType==='song'&&recording.sourceSongId)return 'song:'+recording.sourceSongId;
  return recording.sourceType+':'+recording.title.toLowerCase();
}

export function nextRecordingAttempt(existing:readonly PracticeRecording[],recording:RecordingTarget):number{
  const key=recordingTargetKey(recording);
  return Math.max(0,...existing.filter(row=>recordingTargetKey(row)===key).map(row=>row.attemptNumber))+1;
}
