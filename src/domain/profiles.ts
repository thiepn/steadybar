import type { Data } from './models.js';
import type { Capability, InstrumentFamily, InstrumentType, PracticeProfile, ProtocolKind } from './practice-types.js';
export interface ProfileDefinition {
  id: InstrumentType; label: string; family: InstrumentFamily; skills: readonly string[]; focuses: readonly string[]; summary: string;
}
export const PROFILE_DEFINITIONS: readonly ProfileDefinition[] = [
  {id:'drums',label:'Drums',family:'percussion',skills:['warmup','technique','rudiments','hands','feet','coordination','groove','timing','fills','dynamics','reading','repertoire'],focuses:['Groove & time','Coordination','Hands','Feet','Technique','Reading','Repertoire'],summary:'Sticking, coordination, dynamics and time.'},
  {id:'guitar',label:'Guitar',family:'fretted',skills:['warmup','technique','chords','rhythm','fretboard','scales','arpeggios','improvisation','reading','repertoire'],focuses:['Chords & rhythm','Lead technique','Fretboard','Scales','Improvisation','Reading','Repertoire'],summary:'Chord changes, picking, fretboard recall and repertoire.'},
  {id:'bass',label:'Bass',family:'fretted',skills:['warmup','technique','groove','timing','muting','fretboard','harmony','walking','reading','repertoire'],focuses:['Groove & time','Technique','Muting','Harmony','Fretboard','Walking','Repertoire'],summary:'Time, muting, articulation and harmonic movement.'},
  {id:'piano',label:'Piano',family:'keyboard',skills:['warmup','technique','scales','arpeggios','chords','voicings','independence','sight-reading','improvisation','repertoire'],focuses:['Technique','Scales & arpeggios','Chords & voicings','Independence','Sight reading','Improvisation','Repertoire'],summary:'Keys, hand coordination, voicings and first-read practice.'},
  {id:'voice',label:'Voice',family:'voice',skills:['warmup','pitch','breath','tone','registers','agility','ear-training','sight-singing','harmony','diction','repertoire'],focuses:['Pitch','Breath','Tone','Agility','Ear training','Harmony','Repertoire'],summary:'Reference pitches, bounded patterns, ease and phrase work.'},
  {id:'custom',label:'Custom',family:'general',skills:['warmup','technique','timing','ear-training','reading','repertoire','other'],focuses:['Technique','Timing','Ear training','Reading','Repertoire'],summary:'Choose a family; use compatible tasks and your own material.'},
];
export const FAMILIES: readonly InstrumentFamily[] = ['percussion','fretted','bowed','keyboard','wind','pitched','voice','general'];
const familyCapabilities: Record<InstrumentFamily, readonly Capability[]> = {
  percussion:['tempo','sticking','repertoire'],fretted:['tempo','pitch','chords','fretboard','repertoire'],
  bowed:['tempo','pitch','repertoire'],keyboard:['tempo','pitch','chords','hands','repertoire'],
  wind:['tempo','pitch','repertoire'],pitched:['tempo','pitch','repertoire'],voice:['tempo','pitch','voice','repertoire'],general:['tempo','repertoire'],
};
export function definition(type: InstrumentType): ProfileDefinition { return PROFILE_DEFINITIONS.find(p=>p.id===type)!; }
export function capabilities(profile: PracticeProfile): readonly Capability[] { return familyCapabilities[profile.family]; }
export function profiles(data: Data): PracticeProfile[] { return data.profiles ?? []; }
export function isHistoricalProfile(profile: PracticeProfile): boolean { return profile.attribution==='unresolved-history'; }
/** Profiles that may own new practice. Historical attribution buckets are intentionally excluded. */
export function selectableProfiles(data: Data): PracticeProfile[] { return profiles(data).filter(p=>!p.archived&&!isHistoricalProfile(p)); }
export function activeProfile(data: Data): PracticeProfile {
  const available=selectableProfiles(data);
  const result=available.find(p=>p.id===data.settings.activeProfileId) ?? available[0];
  if(!result)throw new Error('No usable practice profile. Restore a valid workspace backup.');
  return result;
}
/** Repair only selection metadata. No exercises, sessions, plans or history are reassigned. */
export function repairProfileSelection(data: Data): Data {
  if(!data.profiles?.length)return data;
  const available=selectableProfiles(data);
  if(!available.length)throw new Error('At least one usable practice profile is required. Historical practice cannot own new sessions.');
  const active=available.find(p=>p.id===data.settings.activeProfileId)
    ?? available.find(p=>p.id===data.settings.primaryProfileId)
    ?? available[0]!;
  const primary=available.find(p=>p.id===data.settings.primaryProfileId) ?? active;
  const def=definition(active.instrumentType);
  const aim=active.focusAreas.includes(data.settings.aim) ? data.settings.aim : active.focusAreas[0] ?? def.focuses[0] ?? 'Technique';
  return {...data,settings:{...data.settings,activeProfileId:active.id,primaryProfileId:primary.id,instrument:def.label,aim}};
}
export function profileName(data: Data,id?:string): string { return profiles(data).find(p=>p.id===id)?.name ?? 'Earlier practice'; }
export function profileView(data: Data,id=data.settings.activeProfileId): Data {
  if(!data.profiles)return data;
  const chosen=selectableProfiles(data).some(p=>p.id===id) ? id : activeProfile(data).id;
  return {...data,exercises:data.exercises.filter(e=>e.profileId===chosen),routines:data.routines.filter(r=>r.profileId===chosen),
    dailyPlans:data.dailyPlans.filter(p=>p.profileId===chosen),goals:data.goals.filter(g=>!g.profileId||g.profileId===chosen),
    sessions:data.sessions.filter(s=>s.profileId===chosen)};
}
export function instrumentType(value:string):InstrumentType {
  return ({drums:'drums',guitar:'guitar',bass:'bass',piano:'piano',keyboard:'piano',voice:'voice',vocals:'voice'} as Record<string,InstrumentType>)[value.toLowerCase()] ?? 'custom';
}
export function skillLabel(value:string):string { return value.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase()); }
export interface ProtocolDefinition { id:ProtocolKind;label:string;needs:readonly Capability[];description:string;metric:string }
export const PROTOCOLS:readonly ProtocolDefinition[]=[
  {id:'free',label:'Free practice',needs:[],description:'A timed task with an optional click.',metric:'Reflection'},
  {id:'tempo',label:'Tempo practice',needs:['tempo'],description:'Play a defined technique at a chosen tempo.',metric:'Clean BPM'},
  {id:'repetitions',label:'Clean repetitions',needs:[],description:'Count clean and attempted repetitions.',metric:'Clean repetitions'},
  {id:'chord-changes',label:'Chord changes',needs:['chords'],description:'Practice a specific sequence; log the totals after playing.',metric:'Clean transitions'},
  {id:'groove',label:'Groove & control',needs:['tempo'],description:'Hold a groove, then assess time and control.',metric:'Time / control / articulation'},
  {id:'scale-cycle',label:'Scale & key cycle',needs:['pitch'],description:'Cycle selected keys; track hands, errors and tempo when used.',metric:'Keys practiced'},
  {id:'fretboard',label:'Fretboard recall',needs:['fretboard'],description:'Identify notes on selected strings and frets.',metric:'Scored note recall'},
  {id:'vocal-pattern',label:'Vocal pattern',needs:['voice'],description:'Hear a pattern inside a user-set comfortable range.',metric:'Self-rated ease / fatigue'},
  {id:'pitch-match',label:'Pitch & intervals',needs:['pitch'],description:'Hear a reference and reproduce it. Self-assessment, not microphone grading.',metric:'Self-reported matching'},
  {id:'sight-reading',label:'First-read practice',needs:[],description:'Use your own score and record the first attempt separately.',metric:'Continuity / errors'},
  {id:'repertoire',label:'Repertoire passage',needs:['repertoire'],description:'Isolate a phrase, measures or musical goal.',metric:'Reflection'},
];
export function supportedProtocols(profile:PracticeProfile):readonly ProtocolDefinition[] {
  const have=capabilities(profile);return PROTOCOLS.filter(p=>p.needs.every(c=>have.includes(c)));
}
export function protocolDefinition(kind:ProtocolKind):ProtocolDefinition { return PROTOCOLS.find(p=>p.id===kind)!; }
