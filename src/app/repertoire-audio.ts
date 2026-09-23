import type { RepertoireAudioCue, RepertoireAudioTrack } from '../domain/models.js';
import { metadata, nowISO, uuid } from '../domain/utils.js';
import { deleteRepertoireTrackAsset, getRepertoireTrackAsset, repertoireTrackAssetExists, saveRepertoireTrackAsset } from '../db/media.js';
import { probeAudioBlob } from '../audio/track-player.js';
import { store } from './store.js';

function titleFromFile(name:string):string{
  return name.replace(/.[^.]+$/,'').trim()||'Local track';
}

export async function importRepertoireTrack(songId:string,file:File,songPartId?:string):Promise<RepertoireAudioTrack>{
  if(!file.size)throw new Error('Choose a non-empty audio file.');
  const data=store.snapshot(),song=data.songs.find(row=>row.id===songId);
  if(!song)throw new Error('The song no longer exists.');
  if(songPartId&&!song.parts?.some(part=>part.id===songPartId))throw new Error('The selected song part no longer exists.');
  const probe=await probeAudioBlob(file),base=metadata();
  const track:RepertoireAudioTrack={
    ...base,songId,songPartId,assetId:base.id,title:titleFromFile(file.name),fileName:file.name,
    mimeType:probe.mimeType,sizeBytes:file.size,durationSeconds:probe.durationSeconds,cues:[],lastPlaybackRate:1,
  };
  await saveRepertoireTrackAsset(track.assetId,file,track.createdAt);
  try{await store.save('audioTracks',track);}
  catch(error){await deleteRepertoireTrackAsset(track.assetId).catch(()=>{});throw error;}
  return track;
}

export async function replaceRepertoireTrackFile(trackId:string,file:File):Promise<RepertoireAudioTrack>{
  if(!file.size)throw new Error('Choose a non-empty audio file.');
  const current=(store.snapshot().audioTracks??[]).find(row=>row.id===trackId);
  if(!current)throw new Error('The local track no longer exists.');
  const probe=await probeAudioBlob(file),required=Math.max(0,...current.cues.map(cue=>cue.endSeconds));
  if(probe.durationSeconds+.05<required)throw new Error(`This replacement is too short for the saved cues. Choose a track at least ${required.toFixed(1)} seconds long or remove those cues first.`);
  const backup=await getRepertoireTrackAsset(current.assetId);
  await saveRepertoireTrackAsset(current.assetId,file,current.createdAt);
  try{
    const next={...current,fileName:file.name,title:titleFromFile(file.name),mimeType:probe.mimeType,sizeBytes:file.size,durationSeconds:probe.durationSeconds,updatedAt:nowISO()};
    await store.save('audioTracks',next);return next;
  }catch(error){
    if(backup)await saveRepertoireTrackAsset(current.assetId,backup,current.createdAt).catch(()=>{});
    throw error;
  }
}

export async function deleteRepertoireTrack(trackId:string):Promise<void>{
  const current=(store.snapshot().audioTracks??[]).find(row=>row.id===trackId);
  if(!current)return;
  await store.delete('audioTracks',trackId);
  await deleteRepertoireTrackAsset(current.assetId).catch(()=>{});
}

export async function repertoireTrackBlob(track:RepertoireAudioTrack):Promise<Blob|undefined>{
  return getRepertoireTrackAsset(track.assetId);
}

export async function repertoireTrackAvailable(track:RepertoireAudioTrack):Promise<boolean>{
  return repertoireTrackAssetExists(track.assetId);
}

export async function updateRepertoireTrackRate(trackId:string,rate:number):Promise<void>{
  const value=Math.max(.5,Math.min(1.5,rate));
  await store.workspace(data=>{
    const track=data.audioTracks?.find(row=>row.id===trackId);if(!track)throw new Error('The local track no longer exists.');
    track.lastPlaybackRate=value;track.updatedAt=nowISO();return data;
  },false);
}

export async function saveRepertoireCue(trackId:string,input:{sectionId?:string;label:string;startSeconds:number;endSeconds:number}):Promise<RepertoireAudioCue>{
  let saved!:RepertoireAudioCue;
  await store.workspace(data=>{
    const track=data.audioTracks?.find(row=>row.id===trackId);if(!track)throw new Error('The local track no longer exists.');
    const start=Math.max(0,input.startSeconds),end=Math.min(track.durationSeconds,input.endSeconds);
    if(end-start<.08)throw new Error('Cue end must be at least 0.08 seconds after cue start.');
    const existing=input.sectionId?track.cues.find(cue=>cue.sectionId===input.sectionId):undefined;
    saved=existing??{id:uuid(),label:input.label.trim()||'Loop',startSeconds:start,endSeconds:end,order:track.cues.length,sectionId:input.sectionId};
    saved.label=input.label.trim()||saved.label;saved.startSeconds=start;saved.endSeconds=end;saved.sectionId=input.sectionId;
    if(!existing)track.cues.push(saved);
    track.cues.sort((a,b)=>a.order-b.order||a.startSeconds-b.startSeconds);track.updatedAt=nowISO();return data;
  },false);
  return saved;
}

export async function deleteRepertoireCue(trackId:string,cueId:string):Promise<void>{
  await store.workspace(data=>{
    const track=data.audioTracks?.find(row=>row.id===trackId);if(!track)throw new Error('The local track no longer exists.');
    track.cues=track.cues.filter(cue=>cue.id!==cueId).map((cue,index)=>({...cue,order:index}));track.updatedAt=nowISO();return data;
  },false);
}
