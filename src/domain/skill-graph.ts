import { PROFILE_DEFINITIONS } from './profiles.js';
import type { InstrumentType } from './practice-types.js';
import type { SkillDefinition } from './practice-state.js';

const drums:SkillDefinition[]=[
  {id:'drums.timing',instrument:'drums',domain:'timing',label:'Timing & Pulse',description:'Stable pulse, subdivisions, click independence and internal time.',prerequisiteIds:[],applicationIds:['drums.groove','drums.repertoire'],defaultImportance:3},
  {id:'drums.groove',instrument:'drums',domain:'groove',label:'Groove',description:'Pocket, stylistic beat vocabulary and sustained groove consistency.',prerequisiteIds:['drums.timing'],applicationIds:['drums.repertoire','drums.musicality'],defaultImportance:3},
  {id:'drums.coordination',instrument:'drums',domain:'coordination',label:'Coordination',description:'Hand-foot coordination, independence and controlled limb transitions.',prerequisiteIds:[],applicationIds:['drums.groove','drums.fills'],defaultImportance:2},
  {id:'drums.technique',instrument:'drums',domain:'technique',label:'Technique',description:'Efficient hand and foot mechanics, rebound, strokes, accents and rudiments.',prerequisiteIds:[],applicationIds:['drums.groove','drums.fills','drums.dynamics'],defaultImportance:2},
  {id:'drums.fills',instrument:'drums',domain:'fills',label:'Fills & Phrasing',description:'Transitions, fill vocabulary, orchestration and phrases that preserve time.',prerequisiteIds:['drums.timing'],applicationIds:['drums.repertoire','drums.musicality'],defaultImportance:2},
  {id:'drums.dynamics',instrument:'drums',domain:'dynamics',label:'Dynamics & Touch',description:'Accents, ghost notes, balance, low-volume control and consistent sound.',prerequisiteIds:['drums.technique'],applicationIds:['drums.groove','drums.repertoire','drums.musicality'],defaultImportance:3},
  {id:'drums.reading',instrument:'drums',domain:'reading',label:'Reading & Rhythm',description:'Notation, counting, sight reading and unfamiliar rhythmic material.',prerequisiteIds:['drums.timing'],applicationIds:['drums.repertoire'],defaultImportance:1},
  {id:'drums.repertoire',instrument:'drums',domain:'repertoire',label:'Repertoire',description:'Song forms, arrangements, sections, transitions and performance readiness.',prerequisiteIds:['drums.timing','drums.groove'],applicationIds:['drums.musicality'],defaultImportance:3},
  {id:'drums.musicality',instrument:'drums',domain:'musicality',label:'Listening & Musicality',description:'Style, form awareness, tasteful choices, ensemble support and restraint.',prerequisiteIds:['drums.groove'],applicationIds:[],defaultImportance:3},
];

const generic:SkillDefinition[]=PROFILE_DEFINITIONS
  .filter(p=>p.id!=='drums')
  .flatMap(profile=>[...new Set(profile.skills.filter(skill=>skill!=='warmup'))].map(skill=>({
    id:`${profile.id}.${skill}`,
    instrument:profile.id,
    domain:skill,
    label:skill.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase()),
    description:`${profile.label} practice area: ${skill.replaceAll('-',' ')}.`,
    prerequisiteIds:[],
    applicationIds:skill==='repertoire'?[]:[`${profile.id}.repertoire`],
    defaultImportance:skill==='repertoire'?3:2,
  })));

export const SKILL_DEFINITIONS:readonly SkillDefinition[]=[...drums,...generic];

export function skillDefinition(id:string):SkillDefinition|undefined {
  return SKILL_DEFINITIONS.find(skill=>skill.id===id);
}

export function skillDefinitionsFor(instrument:InstrumentType):readonly SkillDefinition[] {
  return SKILL_DEFINITIONS.filter(skill=>skill.instrument===instrument);
}

export function isSkillForInstrument(id:string,instrument:InstrumentType):boolean {
  return skillDefinition(id)?.instrument===instrument;
}

const drumMap:Record<string,string>={
  timing:'drums.timing',
  groove:'drums.groove',
  coordination:'drums.coordination',
  fills:'drums.fills',
  dynamics:'drums.dynamics',
  reading:'drums.reading',
  repertoire:'drums.repertoire',
  rudiments:'drums.technique',
  hands:'drums.technique',
  feet:'drums.technique',
  technique:'drums.technique',
  warmup:'drums.technique',
  other:'drums.musicality',
};

export function skillIdForExercise(instrument:InstrumentType,skillArea?:string,category?:string):string|undefined {
  const raw=(skillArea||category||'').trim();
  if(!raw)return undefined;
  if(instrument==='drums')return drumMap[raw]??'drums.technique';
  const normalized=raw==='warmup'?'technique':raw;
  const exact=`${instrument}.${normalized}`;
  if(skillDefinition(exact))return exact;
  const fallback=`${instrument}.technique`;
  return skillDefinition(fallback)?fallback:skillDefinitionsFor(instrument)[0]?.id;
}
