import { store } from './store.js';
import { activeProfile, definition, isPracticeProfile, practiceProfiles, profiles } from '../domain/profiles.js';
import type { Data, Routine } from '../domain/models.js';
import type { Experience, InstrumentFamily, InstrumentType, PracticeProfile } from '../domain/practice-types.js';
import { freshBlocks, localDate, metadata, nowISO } from '../domain/utils.js';
import { starterContent } from '../db/profile-content.js';
import { validateProfile } from '../domain/practice-validation.js';

export interface NewProfile { name:string; instrumentType:InstrumentType; family?:InstrumentFamily; level:Experience; focusAreas:string[]; defaultSessionMinutes:number }
const normalizedName=(value:string)=>value.trim().replace(/\s+/g,' ');
const sameName=(a:string,b:string)=>normalizedName(a).localeCompare(normalizedName(b),undefined,{sensitivity:'accent'})===0;
function generatedName(data:Data,base:string):string{
  const used=profiles(data).map(p=>p.name);if(!used.some(name=>sameName(name,base)))return base;
  let i=2;while(used.some(name=>sameName(name,`${base} ${i}`)))i++;return `${base} ${i}`;
}
function assertUniqueName(data:Data,name:string,exceptId?:string):void{
  if(profiles(data).some(p=>p.id!==exceptId&&sameName(p.name,name)))throw new Error('Use a distinct profile name so profile switching and history stay unambiguous.');
}
export function makeProfile(values:NewProfile):PracticeProfile {
  const name=normalizedName(values.name)||definition(values.instrumentType).label;
  return validateProfile({...metadata(),...values,name,family:values.instrumentType==='custom'?values.family??'general':definition(values.instrumentType).family,archived:false,attribution:'selected'});
}
export function provisionProfile(data:Data,profile:PracticeProfile):Data {
  const next=structuredClone(data),content=starterContent(profile);
  if(profiles(next).some(p=>p.id===profile.id))throw new Error('A profile with this ID already exists.');
  next.profiles=[...profiles(next),profile];next.exercises.push(...content.exercises);next.routines.push(...content.routines);return next;
}
/**
 * Create a profile atomically. An unfinished session is allowed: it remains pinned
 * to the profile/configuration snapshot it started with while the workspace browser
 * switches to the newly created profile.
 */
export async function createProfile(values:NewProfile,activate=true):Promise<PracticeProfile>{
  let created!:PracticeProfile;
  await store.workspace(data=>{
    const requested=normalizedName(values.name),base=requested||definition(values.instrumentType).label;
    const name=requested?base:generatedName(data,base);if(requested)assertUniqueName(data,name);
    created=makeProfile({...values,name});const next=provisionProfile(data,created);
    if(activate)next.settings={...next.settings,activeProfileId:created.id,instrument:definition(created.instrumentType).label,aim:created.focusAreas[0]??'Technique'};
    if(!next.settings.primaryProfileId||!practiceProfiles(next).some(p=>p.id===next.settings.primaryProfileId))next.settings.primaryProfileId=created.id;
    return next;
  });
  return created;
}
/** Switching the workspace does not mutate or re-attribute an unfinished session. */
export async function switchProfile(id:string):Promise<void>{
  await store.workspace(data=>{const p=profiles(data).find(p=>p.id===id&&isPracticeProfile(p));if(!p)throw new Error('Choose an available practice profile.');return {...data,settings:{...data.settings,activeProfileId:p.id,instrument:definition(p.instrumentType).label,aim:p.focusAreas[0]??'Technique'}};});
}
export async function updateProfile(profile:PracticeProfile):Promise<void>{
  await store.workspace(data=>{
    const existing=profiles(data).find(p=>p.id===profile.id);if(!existing)throw new Error('This profile no longer exists.');
    if(existing.attribution==='unresolved-history')throw new Error('Earlier practice is a read-only historical bucket, not an editable practice profile.');
    if(existing.instrumentType!==profile.instrumentType||existing.family!==profile.family)throw new Error('Create a new profile to use a different instrument. Existing history keeps its identity.');
    const name=normalizedName(profile.name);assertUniqueName(data,name,profile.id);
    const p=validateProfile({...profile,name,updatedAt:nowISO()});
    const settings=data.settings.activeProfileId===p.id?{...data.settings,instrument:definition(p.instrumentType).label,aim:p.focusAreas[0]??'Technique'}:data.settings;
    return {...data,settings,profiles:profiles(data).map(item=>item.id===p.id?p:item)};
  });
}
export async function archiveProfile(id:string,archived:boolean):Promise<void>{
  await store.workspace(data=>{
    const p=profiles(data).find(p=>p.id===id);if(!p)throw new Error('Profile not found.');
    if(p.attribution==='unresolved-history')throw new Error('Earlier practice is a protected historical bucket.');
    if(!archived&&profiles(data).some(item=>item.id!==id&&isPracticeProfile(item)&&sameName(item.name,p.name)))throw new Error('Rename this archived profile before restoring it so the profile picker stays unambiguous.');
    if(archived&&data.sessions.some(s=>s.status==='active'&&(s.profileId===id||s.blocks.some(b=>b.profileId===id))))throw new Error('End the unfinished session before archiving the profile that owns it.');
    const remaining=profiles(data).filter(item=>item.id!==id&&isPracticeProfile(item));
    if(archived&&!remaining.length)throw new Error('Keep at least one practice profile available.');
    const next={...data,profiles:profiles(data).map(item=>item.id===id?{...item,archived,updatedAt:nowISO()}:item),settings:{...data.settings}};
    const preferred=remaining.find(item=>item.id===data.settings.primaryProfileId)??remaining[0];
    if(archived&&next.settings.activeProfileId===id){next.settings.activeProfileId=preferred!.id;next.settings.instrument=definition(preferred!.instrumentType).label;next.settings.aim=preferred!.focusAreas[0]??'Technique';}
    if(archived&&next.settings.primaryProfileId===id)next.settings.primaryProfileId=preferred!.id;
    return next;
  });
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
    const date=localDate(),existing=data.dailyPlans.find(plan=>plan.profileId===p.id&&plan.date===date),base=existing??metadata();
    const updatedAt=new Date(Math.max(Date.now(),Date.parse(base.updatedAt)+1)).toISOString();
    const plan={...base,updatedAt,date,profileId:p.id,sourceRoutineId:routine.id,blocks:fitRoutine(routine,minutes)};
    return {...data,dailyPlans:[...data.dailyPlans.filter(v=>v.id!==plan.id),plan]};
  });
}
