import { switchProfile } from '../app/profiles.js';
import { exerciseBpm } from '../domain/protocols.js';
import { activeProfile } from '../domain/profiles.js';
import type { Exercise, Routine, RoutineBlock, Song } from '../domain/models.js';
import { metadata, localDate, freshBlocks, uuid } from '../domain/utils.js';
import { store } from '../app/store.js';
import { practice } from './controller.js';
import { navigate } from '../app/navigation.js';
import { confirmAction, notify } from '../ui/components.js';
export function exerciseBlock(exercise:Exercise,seconds=exercise.defaultSeconds??600):RoutineBlock{return {id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,targetSeconds:seconds,bpm:exerciseBpm(exercise),notes:'',order:0};}
export function songBlock(song:Song,sectionId?:string,seconds=600,partId?:string):RoutineBlock{
  const profile=activeProfile(store.snapshot()),part=partId==='shared'?undefined:partId?song.parts?.find(p=>p.id===partId):song.parts?.find(p=>p.profileId===profile.id),section=(part?.sections??song.sections).find(s=>s.id===sectionId);
  return {id:uuid(),type:section?'song-section':'song',profileId:part?.profileId??profile.id,songPartId:part?.id,songId:song.id,songSectionId:section?.id,title:song.title+(section?` · ${section.name}`:''),targetSeconds:seconds,bpm:section?.bpmOverride||song.bpm,notes:'',order:0};
}
export function freeBlock(seconds=600,bpm=80,title='Free Practice'):RoutineBlock{return {id:uuid(),type:'free',title,targetSeconds:seconds,bpm,notes:'',order:0};}
export async function launchPractice(blocks:RoutineBlock[],source:{routineId?:string;planId?:string;profileId?:string}={}):Promise<void>{
  const active=await store.activeSession();
  if(active){notify('Your unfinished session is ready to resume. End it before starting a new session.','info');if(practice.session?.id!==active.id || practice.session?.status!=='active')await practice.recover();navigate('/practice/active');return;}
  const requested=blocks[0]?.profileId;
  if(requested&&requested!==store.snapshot().settings.activeProfileId)await switchProfile(requested);
  const profile=activeProfile(store.snapshot());
  const attributed=blocks.map(b=>({...b,profileId:b.profileId??profile.id}));
  await practice.create(attributed,source);navigate('/practice/active');
}
export async function addToday(block:RoutineBlock):Promise<void>{
  const profile=activeProfile(store.snapshot());
  const current=store.view().dailyPlans.find(p=>p.date===localDate());
  if(block.profileId&&block.profileId!==profile.id)throw new Error('Switch to this exercise’s profile before adding it to Today.');
  const plan=current?structuredClone(current):{...metadata(),profileId:profile.id,date:localDate(),blocks:[]};
  plan.blocks.push({...structuredClone(block),profileId:profile.id,id:uuid(),order:plan.blocks.length});await store.save('dailyPlans',plan);notify('Added to today’s plan.');
}
export async function routineToday(routine:Routine):Promise<void>{
  const current=store.view().dailyPlans.find(p=>p.date===localDate());
  if(routine.profileId!==activeProfile(store.snapshot()).id)throw new Error('Switch to this routine’s profile first.');
  if(current?.blocks.length && !await confirmAction('Replace today’s plan?',`Use “${routine.name}” instead of your current ${current.blocks.length}-block plan? This does not change practice history.`,'Use routine'))return;
  await store.save('dailyPlans',{...(current||metadata()),profileId:routine.profileId,date:localDate(),sourceRoutineId:routine.id,blocks:freshBlocks(routine.blocks)});notify('Today’s plan is ready.');navigate('/');
}
