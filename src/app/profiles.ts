import { store } from './store.js';
import { activeProfile, definition, isHistoricalProfile, profiles, selectableProfiles } from '../domain/profiles.js';
import type { Data, Routine } from '../domain/models.js';
import type { Experience, InstrumentFamily, InstrumentType, PracticeProfile } from '../domain/practice-types.js';
import { freshBlocks, localDate, metadata, nowISO } from '../domain/utils.js';
import { starterContent } from '../db/profile-content.js';
import { validateProfile } from '../domain/practice-validation.js';

export interface NewProfile { name:string; instrumentType:InstrumentType; family?:InstrumentFamily; level:Experience; focusAreas:string[]; defaultSessionMinutes:number }
const profileNameKey=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase();
function profileNameTaken(data:Data,name:string,exceptId?:string):boolean{
  const key=profileNameKey(name);return profiles(data).some(p=>p.id!==exceptId&&!p.archived&&!isHistoricalProfile(p)&&profileNameKey(p.name)===key);
}
function nextDefaultName(data:Data,base:string):string{
  if(!profileNameTaken(data,base))return base;
  let suffix=2;while(profileNameTaken(data,`${base} ${suffix}`))suffix++;return `${base} ${suffix}`;
}
function normalizeFocuses(values:string[],type:InstrumentType):string[]{
  const allowed=new Set(definition(type).focuses),result=[...new Set(values.filter(v=>allowed.has(v)))];
  return result.length?result:[definition(type).focuses[0]!];
}
export function makeProfile(values:NewProfile):PracticeProfile {
  const name=values.name.trim().replace(/\s+/g,' '),focusAreas=normalizeFocuses(values.focusAreas,values.instrumentType);
  return validateProfile({...metadata(),...values,name,focusAreas,family:values.instrumentType==='custom'?values.family??'general':definition(values.instrumentType).family,archived:false,attribution:'selected'});
}
export function provisionProfile(data:Data,profile:PracticeProfile):Data {
  const next=structuredClone(data),content=starterContent(profile);
  if(profiles(next).some(p=>p.id===profile.id))throw new Error('A profile with this ID already exists.');
  next.profiles=[...profiles(next),profile];next.exercises.push(...content.exercises);next.routines.push(...content.routines);return next;
}
export async function createProfile(values:NewProfile,activate=true):Promise<PracticeProfile>{
  let created:PracticeProfile|undefined;
  await store.workspace(data=>{
    const fallback=definition(values.instrumentType).label,typed=values.name.trim().replace(/\s+/g,' ');
    if(typed&&profileNameTaken(data,typed))throw new Error('Use a different profile name. Available profiles need distinct names.');
    const profile=makeProfile({...values,name:typed||nextDefaultName(data,fallback)});created=profile;
    const next=provisionProfile(data,profile);
    if(activate)next.settings={...next.settings,activeProfileId:profile.id,instrument:definition(profile.instrumentType).label,aim:profile.focusAreas[0]??'Technique'};
    return next;
  });
  return created!;
}
export async function switchProfile(id:string):Promise<void>{
  await store.workspace(data=>{
    const p=selectableProfiles(data).find(p=>p.id===id);if(!p)throw new Error('Choose an available practice profile.');
    return {...data,settings:{...data.settings,activeProfileId:p.id,instrument:definition(p.instrumentType).label,aim:p.focusAreas[0]??'Technique'}};
  });
}
export async function updateProfile(profile:PracticeProfile):Promise<void>{
  await store.workspace(data=>{
    const existing=profiles(data).find(p=>p.id===profile.id);if(!existing)throw new Error('This profile no longer exists.');
    if(isHistoricalProfile(existing))throw new Error('Earlier practice is a read-only history bucket.');
    if(existing.instrumentType!==profile.instrumentType||existing.family!==profile.family)throw new Error('Create a new profile to use a different instrument. Existing history keeps its identity.');
    const name=profile.name.trim().replace(/\s+/g,' ');if(profileNameTaken(data,name,profile.id))throw new Error('Use a different profile name. Available profiles need distinct names.');
    const p=validateProfile({...profile,name,focusAreas:normalizeFocuses(profile.focusAreas,profile.instrumentType),updatedAt:nowISO()});
    const next={...data,profiles:profiles(data).map(item=>item.id===p.id?p:item),settings:{...data.settings}};
    if(next.settings.activeProfileId===p.id){next.settings.instrument=definition(p.instrumentType).label;next.settings.aim=p.focusAreas[0]??'Technique';}
    return next;
  });
}
export async function archiveProfile(id:string,archived:boolean):Promise<void>{
  await store.workspace(data=>{
    const p=profiles(data).find(p=>p.id===id);if(!p)throw new Error('Profile not found.');
    if(isHistoricalProfile(p))throw new Error('Earlier practice is a read-only history bucket.');
    if(archived&&data.sessions.some(s=>s.status==='active'&&(s.profileId===id||s.blocks.some(b=>b.profileId===id))))throw new Error('End the unfinished session before archiving this profile.');
    if(!archived&&profileNameTaken(data,p.name,p.id))throw new Error('Rename this profile before restoring it. Available profiles need distinct names.');
    const remaining=selectableProfiles(data).filter(item=>item.id!==id);
    if(archived&&!remaining.length)throw new Error('Keep at least one practice profile available.');
    const next={...data,profiles:profiles(data).map(item=>item.id===id?{...item,archived,updatedAt:nowISO()}:item),settings:{...data.settings}};
    if(archived&&next.settings.activeProfileId===id){const fallback=remaining[0]!;next.settings.activeProfileId=fallback.id;next.settings.instrument=definition(fallback.instrumentType).label;next.settings.aim=fallback.focusAreas[0]??'Technique';}
    if(archived&&next.settings.primaryProfileId===id)next.settings.primaryProfileId=remaining[0]!.id;
    return next;
  });
}
/** Kept for backup compatibility; Primary is no longer a user-facing concept. */
export async function setPrimaryProfile(id:string):Promise<void>{
  await store.workspace(data=>{if(!selectableProfiles(data).some(p=>p.id===id))throw new Error('Choose an available practice profile.');return {...data,settings:{...data.settings,primaryProfileId:id}};});
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
