import { activeProfile } from '../domain/profiles.js';
import type { PracticeRecording } from '../domain/models.js';
import { store } from '../app/store.js';
import { deletePracticeRecording, recordingBlob, updatePracticeRecording } from '../app/recordings.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, formDialog, formText, link, notify, pageHeader, sectionHeader, select, stat, textarea } from '../ui/components.js';
import { duration, formatDate } from '../domain/utils.js';

function bytes(value:number):string{
  if(value<1024)return value+' B';
  if(value<1024*1024)return (value/1024).toFixed(value<10*1024?1:0)+' KB';
  return (value/(1024*1024)).toFixed(value<10*1024*1024?1:0)+' MB';
}
function editRecording(recording:PracticeRecording):void{
  formDialog('Recording details',[
    select('rating','Self-rating',[['','Not rated'],['1','1 · Rough'],['2','2 · Developing'],['3','3 · Okay'],['4','4 · Good'],['5','5 · Strong']],recording.rating?String(recording.rating):''),
    textarea('note','Note',recording.note,4),
    checkbox('favorite','Favorite',recording.favorite),
    checkbox('milestone','Milestone',recording.milestone),
    checkbox('markedBest','Current best for this target',recording.markedBest),
    el('p',{class:'field-hint'},'These are your own evidence labels. Steadybar does not infer musical quality from the recording.'),
  ],async(data)=>{
    const rating=formText(data,'rating');
    await updatePracticeRecording(recording.id,{
      rating:rating?Number(rating) as 1|2|3|4|5:undefined,
      note:formText(data,'note'),
      favorite:data.has('favorite'),milestone:data.has('milestone'),markedBest:data.has('markedBest'),
    });
    notify('Recording details saved.');
  },'Save details');
}

export function recordingsPage():Page{
  const data=store.snapshot(),profile=activeProfile(data),rows=(data.recordings??[]).filter(row=>row.profileId===profile.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const page=el('div',{class:'page recordings-page'},pageHeader('','Recordings',`${profile.name} · Local practice evidence captured during sessions.`,[link('Practice','/practice','button secondary','play')]));
  const totalSeconds=rows.reduce((sum,row)=>sum+row.durationSeconds,0),totalBytes=rows.reduce((sum,row)=>sum+row.sizeBytes,0);
  page.append(el('div',{class:'stats-strip'},stat('Recordings',rows.length),stat('Recorded time',duration(totalSeconds)),stat('Local audio',bytes(totalBytes)),stat('Milestones',rows.filter(row=>row.milestone).length)));

  if(!rows.length){
    page.append(empty('No recordings yet.','Open an active practice session and use Record attempt under Tools & block options. Audio stays on this device.',link('Start practice','/practice','button primary','play'),'note'));
    return {node:page};
  }

  let objectUrl:string|undefined;
  const playerTitle=el('strong',{},'Choose a recording');
  const playerMeta=el('span',{class:'muted small'},'Audio remains local to this browser profile.');
  const audio=el('audio',{controls:true,preload:'metadata',class:'recording-audio'});
  const player=el('section',{class:'panel recording-player'},sectionHeader('Playback'),playerTitle,playerMeta,audio);
  page.append(player);

  const list=el('section',{class:'panel'},sectionHeader('Practice evidence',`${rows.length} saved attempt${rows.length===1?'':'s'}`));
  const load=async(row:PracticeRecording)=>{
    const blob=await recordingBlob(row);
    if(!blob){notify('The audio file is unavailable on this device. Its recording metadata is still preserved.','error');return;}
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(blob);audio.src=objectUrl;audio.load();
    playerTitle.textContent=row.title;playerMeta.textContent=`${formatDate(row.createdAt,true)} · Attempt ${row.attemptNumber}${row.bpm?` · ${row.bpm} BPM`:''}`;
    try{await audio.play();}catch{notify('Recording loaded. Use the player to start playback.','info');}
  };

  for(const row of rows){
    const tags=el('div',{class:'tag-row'},
      badge(`Attempt ${row.attemptNumber}`),
      row.bpm?badge(`${row.bpm} BPM`):null,
      row.markedBest?badge('Best','accent'):null,
      row.milestone?badge('Milestone','accent'):null,
      row.favorite?badge('Favorite'):null,
      row.rating?badge(`Rating ${row.rating}/5`):null);
    const actions=el('div',{class:'actions wrap'},
      button('Play',()=>load(row),'secondary','play'),
      button('Details',()=>editRecording(row),'ghost','note'),
      button('Delete',async()=>{if(await confirmAction('Delete this recording?','The local audio and its recording metadata will be permanently removed. Practice-session history is unchanged.','Delete recording',true)){await deletePracticeRecording(row.id);notify('Recording deleted.');}},'ghost danger-text'));
    list.append(el('article',{class:'recording-card'},el('div',{class:'recording-card-main'},el('div',{class:'split'},el('div',{},el('div',{class:'eyebrow'},formatDate(row.createdAt,true)),el('h3',{},row.title)),el('strong',{},duration(row.durationSeconds))),tags,row.note?el('p',{class:'muted small pre-line'},row.note):null,el('p',{class:'muted small'},`${row.mimeType||'Audio'} · ${bytes(row.sizeBytes)} · stored locally`)),actions));
  }
  page.append(list,el('p',{class:'field-hint'},'Backups include recording metadata but not large local audio blobs. Export or keep important recordings separately before clearing browser data.'));
  return {node:page,cleanup:()=>{audio.pause();if(objectUrl)URL.revokeObjectURL(objectUrl);}};
}
