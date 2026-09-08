import { store } from './store.js';
import { activeProfile, definition, profiles } from '../domain/profiles.js';
import type { Data, Routine } from '../domain/models.js';
import type { Experience, InstrumentFamily, InstrumentType, PracticeProfile } from '../domain/practice-types.js';
import { freshBlocks, localDate, metadata, nowISO } from '../domain/utils.js';
import { starterContent } from '../db/profile-content.js';
import { validateProfile } from '../domain/practice-validation.js';

export interface NewProfile { name:string; instrumentType:InstrumentType; family?:InstrumentFamily; level:Experience; focusAreas:string[]; defaultSessionMinutes:number }
export function makeProfile(values:NewProfile):PracticeProfile {
  return validateProfile({...metadata(),...values,family:values.instrumentType==='custom'?values.family??'general':definition(values.instrumentType).family,archived:false,attribution:'selected'});
}
export function provisionProfile(data:Data,profile:PracticeProfile):Data {
  const next=structuredClone(data),content=starterContent(profile);
  if(profiles(next).some(p=>p.id===profile.id))throw new Error('A profile with this ID already exists.');
  next.profiles=[...profiles(next),profile];next.exercises.push(...content.exercises);next.routines.push(...content.routines);return next;
}
function assertIdle(data:Data):void {if(data.sessions.some(s=>s.status==='active'))throw new Error('Finish or end the current session before switching profiles. Its instrument and history will not be changed.');}
export async function createProfile(values:NewProfile,activate=true):Promise<PracticeProfile>{
  const profile=makeProfile(values);
  await store.workspace(data=>{if(activate)assertIdle(data);const next=provisionProfile(data,profile);if(activate)next.settings={...next.settings,activeProfileId:profile.id,instrument:definition(profile.instrumentType).label,aim:profile.focusAreas[0]??'Technique'};return next;});
  return profile;
}
export async function switchProfile(id:string):Promise<void>{
  await store.workspace(data=>{assertIdle(data);const p=profiles(data).find(p=>p.id===id&&!p.archived);if(!p)throw new Error('Choose an available profile.');return {...data,settings:{...data.settings,activeProfileId:p.id,instrument:definition(p.instrumentType).label,aim:p.focusAreas[0]??'Technique'}};});
}
export async function updateProfile(profile:PracticeProfile):Promise<void>{
  await store.workspace(data=>{
    const existing=profiles(data).find(p=>p.id===profile.id);if(!existing)throw new Error('This profile no longer exists.');
    if(existing.instrumentType!==profile.instrumentType||existing.family!==profile.family)throw new Error('Create a new profile to use a different instrument. Existing history keeps its identity.');
    const p=validateProfile({...profile,updatedAt:nowISO()});return {...data,profiles:profiles(data).map(item=>item.id===p.id?p:item)};
  });
}
export async function archiveProfile(id:string,archived:boolean):Promise<void>{
  await store.workspace(data=>{
    const p=profiles(data).find(p=>p.id===id);if(!p)throw new Error('Profile not found.');
    if(archived&&data.sessions.some(s=>s.status==='active'&&(s.profileId===id||s.blocks.some(b=>b.profileId===id))))throw new Error('End the unfinished session before archiving this profile.');
    const remaining=profiles(data).filter(p=>p.id!==id&&!p.archived);
    if(archived&&!remaining.length)throw new Error('Keep at least one profile available.');
    const next={...data,profiles:profiles(data).map(p=>p.id===id?{...p,archived,updatedAt:nowISO()}:p),settings:{...data.settings}};
    if(archived&&next.settings.activeProfileId===id){const fallback=remaining[0]!;next.settings.activeProfileId=fallback.id;next.settings.instrument=definition(fallback.instrumentType).label;next.settings.aim=fallback.focusAreas[0]??'Technique';}
    if(archived&&next.settings.primaryProfileId===id)next.settings.primaryProfileId=remaining[0]!.id;
    return next;
  });
}
export async function setPrimaryProfile(id:string):Promise<void>{
  await store.workspace(data=>{if(!profiles(data).some(p=>p.id===id&&!p.archived))throw new Error('Choose an available profile.');return {...data,settings:{...data.settings,primaryProfileId:id}};});
}
export function selectStarterRoutine(data:Data,profile:PracticeProfile,minutes=profile.defaultSessionMinutes):Routine|undefined {
  const list=data.routines.filter(r=>r.profileId===profile.id&&!r.archived&&r.builtin);
  return list.find(r=>r.blocks.reduce((n,b)=>n+b.targetSeconds,0)===minutes*60)??list[0];
}
/** Proportional integer allocation. No zero-length blocks or silent discarded tasks. */
export function fitRoutine(routine:Routine,minutes:number):Routine['blocks']{
  if(!Number.isInteger(minutes)||minutes<5||minutes>180)throw new Error('Choose a duration from 5 to 180 minutes.');
  const total=minutes*60,original=routine.blocks.reduce((n,b)=>n+b.targetSeconds,0);
  if(!routine.blocks.length||original<=0)throw new Error('Add a block to this routine first.');
  let remaining=total;
  return freshBlocks(routine.blocks).map((b,i)=>{const countLeft=routine.blocks.length-i-1;const targetSeconds=i===routine.blocks.length-1?remaining:Math.min(remaining-countLeft,Math.max(1,Math.floor(total*b.targetSeconds/original)));remaining-=targetSeconds;return {...b,targetSeconds,order:i};});
}
export async function prepareStarterPlan(minutes:number):Promise<void>{
  await store.workspace(data=>{
    const p=activeProfile(data),routine=selectStarterRoutine(data,p,minutes);if(!routine)throw new Error('Create a routine for this profile first.');
    const date=localDate(),existing=data.dailyPlans.find(plan=>plan.profileId===p.id&&plan.date===date);
    const plan={...(existing??metadata()),date,profileId:p.id,sourceRoutineId:routine.id,blocks:fitRoutine(routine,minutes)};
    return {...data,dailyPlans:[...data.dailyPlans.filter(v=>v.id!==plan.id),plan]};
  });
}
