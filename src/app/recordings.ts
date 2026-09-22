import type { PracticeRecording, PracticeRecordingSourceType } from '../domain/models.js';
import { nextRecordingAttempt, recordingTargetKey } from '../domain/recordings.js';
import { metadata, nowISO } from '../domain/utils.js';
import { saveRecordingAsset, deleteRecordingAsset, getRecordingAsset } from '../db/media.js';
import { store } from './store.js';

export interface RecordingContext {
  profileId:string;
  title:string;
  sourceType:PracticeRecordingSourceType;
  sessionId?:string;
  blockId?:string;
  sourceExerciseId?:string;
  sourceSongId?:string;
  sourceSongSectionId?:string;
  bpm?:number;
}
export interface RecordingCapture {
  blob:Blob;
  mimeType:string;
  durationSeconds:number;
}

export async function savePracticeRecording(capture:RecordingCapture,context:RecordingContext):Promise<PracticeRecording>{
  const base=metadata(),existing=(store.snapshot().recordings??[]);
  const probe={sourceType:context.sourceType,sourceExerciseId:context.sourceExerciseId,sourceSongId:context.sourceSongId,sourceSongSectionId:context.sourceSongSectionId,title:context.title};
  const attemptNumber=nextRecordingAttempt(existing,probe);
  const recording:PracticeRecording={
    ...base,recordingVersion:1,profileId:context.profileId,assetId:base.id,title:context.title,
    durationSeconds:capture.durationSeconds,mimeType:capture.mimeType,sizeBytes:capture.blob.size,
    sessionId:context.sessionId,blockId:context.blockId,sourceType:context.sourceType,
    sourceExerciseId:context.sourceExerciseId,sourceSongId:context.sourceSongId,sourceSongSectionId:context.sourceSongSectionId,
    bpm:context.bpm,attemptNumber,rating:undefined,note:'',tags:[],markedBest:false,milestone:false,favorite:false,
  };
  await saveRecordingAsset(recording.assetId,capture.blob,recording.createdAt);
  try{await store.save('recordings',recording);}
  catch(error){await deleteRecordingAsset(recording.assetId).catch(()=>{});throw error;}
  return recording;
}

export async function updatePracticeRecording(id:string,change:Partial<Pick<PracticeRecording,'rating'|'note'|'tags'|'markedBest'|'milestone'|'favorite'>>):Promise<void>{
  await store.workspace(data=>{
    const recordings=data.recordings??[],current=recordings.find(row=>row.id===id);
    if(!current)throw new Error('This recording no longer exists.');
    if(change.markedBest){
      const key=recordingTargetKey(current);
      for(const row of recordings)if(row.id!==id&&recordingTargetKey(row)===key)row.markedBest=false;
    }
    Object.assign(current,change,{updatedAt:nowISO()});data.recordings=recordings;return data;
  });
}

export async function deletePracticeRecording(id:string):Promise<void>{
  const current=(store.snapshot().recordings??[]).find(row=>row.id===id);
  if(!current)return;
  await store.delete('recordings',id);
  await deleteRecordingAsset(current.assetId).catch(()=>{});
}

export async function recordingBlob(recording:PracticeRecording):Promise<Blob|undefined>{
  return getRecordingAsset(recording.assetId);
}
