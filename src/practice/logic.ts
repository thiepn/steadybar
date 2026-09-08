import { exerciseProtocol, protocolPulse, pulse } from '../domain/protocols.js';
import { profileName } from '../domain/profiles.js';
import type { PracticeProtocol } from '../domain/practice-types.js';
import type { Data, PracticeBlock, PracticeSession, RoutineBlock } from '../domain/models.js';
import { metadata, nowISO, uuid } from '../domain/utils.js';
import { trainerBpm } from '../domain/trainer.js';
export function snapshotBlock(block:RoutineBlock,data:Data):PracticeBlock {
  const exercise=data.exercises.find(e=>e.id===block.exerciseId),song=data.songs.find(s=>s.id===block.songId),part=song?.parts?.find(p=>p.id===block.songPartId),section=(part?.sections??song?.sections)?.find(s=>s.id===block.songSectionId);
  if(block.type==='exercise' && !exercise)throw new Error(`The exercise in “${block.title}” is unavailable. Edit or remove that block first.`);
  if((block.type==='song' || block.type==='song-section') && !song)throw new Error(`The song in “${block.title}” is unavailable. Edit or remove that block first.`);
  if(block.type==='song-section' && !section)throw new Error(`A section in “${block.title}” was removed. Select an existing section before practicing.`);
  const protocol:PracticeProtocol|undefined = data.schemaVersion===2 ? structuredClone(block.protocol ?? (exercise ? exerciseProtocol(exercise) : song ? {kind:'repertoire',focus:part?.notes||block.notes||'Practice the selected passage.',measures:section?.name??'',hands:'not-applicable',pulse:{bpm:block.bpm??section?.bpmOverride??song.bpm,beats:song.meter.beats,beatUnit:song.meter.beatUnit,subdivision:1}} : {kind:'free',focus:block.notes||block.title,...(block.bpm===undefined?{}:{pulse:pulse(block.bpm)})})) : undefined;
  if(protocol?.kind==='sight-reading'&&data.sessions.some(s=>s.blocks.some(b=>b.sourceExerciseId===exercise?.id&&b.startedAt&&b.protocolSnapshot?.kind==='sight-reading'&&b.protocolSnapshot.material===protocol.material)))protocol.firstRead=false;
  if(protocol && 'pulse' in protocol && protocol.pulse && block.bpm!==undefined)protocol.pulse.bpm=block.bpm;
  if(block.tempoTrainer&&protocol&&protocol.kind!=='tempo')throw new Error('Tempo trainers apply to tempo-practice tasks only.');
  const timing=protocol?protocolPulse(protocol):undefined;
  const bpm=block.tempoTrainer ? trainerBpm(block.tempoTrainer,0,0) : protocol ? protocolPulse(protocol)?.bpm : block.bpm;
  const profileId=exercise?.profileId??part?.profileId??block.profileId??data.settings.activeProfileId;
  if(block.songPartId&&!part)throw new Error('This song part is unavailable. Choose an existing part.');
  const profile=data.profiles?.find(p=>p.id===profileId);
  if(profile?.archived)throw new Error('Restore the archived profile before starting practice.');
  const title=block.type==='free' ? block.title : exercise?.name || (song ? (block.title || `${song.title}${section ? ` · ${section.name}` : ''}`) : block.title);
  return {id:uuid(),...(protocol?{profileId,profileNameSnapshot:profileName(data,profileId),protocolSnapshot:protocol,instructionsSnapshot:exercise?.instructions??[part?.name,part?.key?`Key ${part.key}`:'',part?.tuning?`Tuning ${part.tuning}`:'',part?.capo!==undefined?`Capo ${part.capo}`:'',part?.range,part?.role,part?.notes,section?.notes,block.notes].filter(Boolean).join('\n'),outcomes:[],protocolState:{step:0,clean:0,total:0,...(protocol.kind==='vocal-pattern'?{rootMidi:protocol.startMidi}:{})}}:{}),sourceSongPartId:part?.id,type:block.type,sourceExerciseId:exercise?.id,sourceSongId:song?.id,sourceSongSectionId:section?.id,titleSnapshot:title,categorySnapshot:exercise?.skillArea||exercise?.category || (song ? 'song' : 'other'),stickingSnapshot:protocol?.kind==='tempo'?protocol.sticking??'':protocol?'':exercise?.sticking||'',meterSnapshot:structuredClone(timing?{beats:timing.beats,beatUnit:timing.beatUnit}:exercise?.meter || song?.meter || data.settings.metronome.meter),subdivisionSnapshot:timing?.subdivision??exercise?.subdivision??data.settings.metronome.subdivision,targetSeconds:block.tempoTrainer?.mode==='endurance'?block.tempoTrainer.seconds:block.targetSeconds,actualActiveSeconds:0,initialBpm:bpm,finalBpm:bpm,tempoAttempts:[],notes:[block.notes,section?.notes].filter(Boolean).join('\n'),completed:false,skipped:false,tempoTrainer:block.tempoTrainer ? structuredClone(block.tempoTrainer) : undefined};
}
export function createSession(blocks:RoutineBlock[],data:Data,source:{routineId?:string;planId?:string;profileId?:string}={}):PracticeSession {
  if(!blocks.length)throw new Error('Add at least one block before starting practice.');
  const snapshots=blocks.map(b=>snapshotBlock(b,data)),now=nowISO();
  const profileId=source.profileId??snapshots[0]?.profileId??data.settings.activeProfileId;
  if(data.schemaVersion===2 && snapshots.some(b=>b.profileId!==profileId))throw new Error('Practice one profile per session. Save the current session before switching instruments.');
  return {...metadata(),...(data.schemaVersion===2?{profileId,profileNameSnapshot:profileName(data,profileId)}:{}),status:'active',startedAt:now,activeBlockIndex:0,blocks:snapshots,sessionNotes:'',sourceRoutineId:source.routineId,sourceDailyPlanId:source.planId,runtime:{phase:'ready',bpm:snapshots[0]!.initialBpm??data.settings.metronome.bpm,trainerCleanRounds:0,trainerStartSeconds:0,checkpointAt:now,metronomeOn:snapshots[0]!.initialBpm!==undefined}};
}
export function blockElapsed(session:PracticeSession,now=Date.now()):number {
  const block=session.blocks[session.activeBlockIndex];if(!block)return 0;
  const extra=session.status==='active' && session.runtime.phase==='running' && session.runtime.runStartedAt ? Math.max(0,(now-Date.parse(session.runtime.runStartedAt))/1000) : 0;
  return block.actualActiveSeconds+extra;
}
export function checkpointSession(session:PracticeSession,now=Date.now()):PracticeSession {
  const next=structuredClone(session),time=new Date(now).toISOString();
  next.blocks[next.activeBlockIndex]!.actualActiveSeconds=blockElapsed(next,now);
  if(next.runtime.phase==='running')next.runtime.runStartedAt=time;
  next.runtime.checkpointAt=time;next.updatedAt=time;return next;
}
export function pauseSession(session:PracticeSession,now=Date.now()):PracticeSession {
  const next=checkpointSession(session,now);next.runtime.phase='paused';delete next.runtime.runStartedAt;return next;
}
export function recoverSession(session:PracticeSession):PracticeSession {
  const next=structuredClone(session);
  // Never treat unknown browser downtime as practice. Saved checkpoints already include elapsed time.
  if(next.runtime.phase==='running' || next.runtime.phase==='countin'){next.runtime.phase='paused';delete next.runtime.runStartedAt;}
  return next;
}
export function finishBlock(session:PracticeSession,skip=false,now=Date.now()):PracticeSession {
  const next=pauseSession(session,now),block=next.blocks[next.activeBlockIndex]!;
  block.completed=!skip;block.skipped=skip;block.endedAt=new Date(now).toISOString();if(!block.protocolSnapshot||protocolPulse(block.protocolSnapshot))block.finalBpm=next.runtime.bpm;
  if(next.activeBlockIndex+1<next.blocks.length){
    next.activeBlockIndex++;
    const upcoming=next.blocks[next.activeBlockIndex]!;
    next.runtime={...next.runtime,phase:'ready',bpm:upcoming.initialBpm??80,metronomeOn:upcoming.initialBpm!==undefined,trainerCleanRounds:0,trainerStartSeconds:0};
  }else {next.status='completed';next.endedAt=new Date(now).toISOString();}
  return next;
}
export function restartBlock(session:PracticeSession,now=Date.now()):PracticeSession {
  const next=pauseSession(session,now),old=next.blocks[next.activeBlockIndex]!;
  old.endedAt=new Date(now).toISOString();
  const startBpm=old.tempoTrainer?trainerBpm(old.tempoTrainer,0,0):next.runtime.bpm;
  const fresh:PracticeBlock={...structuredClone(old),id:uuid(),actualActiveSeconds:0,initialBpm:old.initialBpm===undefined?undefined:startBpm,finalBpm:old.initialBpm===undefined?undefined:startBpm,tempoAttempts:[],...(old.protocolSnapshot?{outcomes:[],protocolState:{step:0,clean:0,total:0,...(old.protocolSnapshot.kind==='vocal-pattern'?{rootMidi:old.protocolSnapshot.startMidi}:{})}}:{}),startedAt:undefined,endedAt:undefined,completed:false,skipped:false};
  if(fresh.protocolSnapshot?.kind==='sight-reading'&&old.startedAt)fresh.protocolSnapshot.firstRead=false;
  old.notes=[old.notes,'Restarted: time and attempts retained in this segment.'].filter(Boolean).join('\n');
  next.blocks.splice(next.activeBlockIndex+1,0,fresh);next.activeBlockIndex++;
  next.runtime={...next.runtime,phase:'ready',bpm:startBpm,trainerCleanRounds:0,trainerStartSeconds:0};return next;
}
