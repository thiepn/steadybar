import type { Data, Exercise, PracticeBlock, RoutineBlock } from '../domain/models.js';
import type { PracticeProfile, PracticeProtocol } from '../domain/practice-types.js';
import { definition, instrumentType, isPracticeProfile } from '../domain/profiles.js';
import { exerciseProtocol, pulse } from '../domain/protocols.js';
import { starterContent } from './profile-content.js';


/**
 * Repair only the selectable-profile pointers of an existing v2 workspace.
 * Historical attribution buckets remain intact and all practice records are untouched.
 */
export function normalizeProfileSelection(input:Data):Data {
  const d=structuredClone(input);if(d.schemaVersion!==2)return d;
  let available=(d.profiles??[]).filter(isPracticeProfile);
  if(!available.length){
    const recoverable=(d.profiles??[]).find(p=>p.attribution!=='unresolved-history');
    if(!recoverable)return d;
    recoverable.archived=false;available=[recoverable];
  }
  const active=available.find(p=>p.id===d.settings.activeProfileId)??available.find(p=>p.id===d.settings.primaryProfileId)??available[0]!;
  const primary=available.find(p=>p.id===d.settings.primaryProfileId)??active;
  d.settings={...d.settings,activeProfileId:active.id,primaryProfileId:primary.id,instrument:definition(active.instrumentType).label,aim:active.focusAreas[0]??'Technique'};
  return d;
}

/** Pure, deterministic v1→v2 transform. The repository retains the pre-upgrade snapshot. */
export function migratePracticeData(input:Data):Data {
  if(input.schemaVersion===2)return normalizeProfileSelection(input);
  const d=structuredClone(input);
  const dates=[...d.exercises,...d.routines,...d.sessions,...d.songs].map(e=>e.createdAt).sort();
  const timestamp=dates[0]??'1970-01-01T00:00:00.000Z';
  const profileMap=new Map<string,PracticeProfile>();
  const ensure=(instrument:string,selected=false):PracticeProfile=>{
    const type=instrumentType(instrument),key=type==='custom'?`custom-${instrument.toLowerCase()}`:type;
    let p=profileMap.get(key);if(p)return p;
    const suffix=key.replace(/[^a-z0-9-]/g,'-').slice(0,50)||'custom';
    const existingIds=new Set([...profileMap.values()].map(p=>p.id));let id=`profile-${suffix}`,i=2;while(existingIds.has(id))id=`profile-${suffix}-${i++}`;
    p={id,name:type==='custom'?instrument:definition(type).label,instrumentType:type,family:definition(type).family,level:'beginner',focusAreas:selected?[d.settings.aim]:[],defaultSessionMinutes:30,archived:false,createdAt:timestamp,updatedAt:timestamp,attribution:selected?'selected':'exercise-instrument'};
    profileMap.set(key,p);return p;
  };
  const selected=ensure(d.settings.instrument,true);
  const unknown=():PracticeProfile=>{
    const existing=profileMap.get('unresolved');if(existing)return existing;
    const used=new Set([...profileMap.values()].map(p=>p.id));let id='profile-earlier',suffix=2;while(used.has(id))id=`profile-earlier-${suffix++}`;
    const p:PracticeProfile={id,name:'Earlier practice',instrumentType:'custom',family:'general',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:timestamp,updatedAt:timestamp,attribution:'unresolved-history'};
    profileMap.set('unresolved',p);return p;
  };
  d.exercises=d.exercises.map((e):Exercise=>{
    const p=ensure(e.instrument),protocol=exerciseProtocol(e);
    if(protocol.kind==='tempo'&&p.family!=='percussion')delete protocol.sticking;
    const rawSkill=e.category==='rudiment'?'rudiments':e.category;
    return {...e,profileId:p.id,skillArea:definition(p.instrumentType).skills.includes(rawSkill)?rawSkill:'technique',protocol};
  });
  const exercises=new Map(d.exercises.map(e=>[e.id,e]));
  const songs=new Map(d.songs.map(s=>[s.id,s]));
  const migrateBlock=(raw:RoutineBlock):RoutineBlock=>{
    let b={...raw};
    const missingExercise=b.type==='exercise'&&!exercises.has(b.exerciseId??'');
    const song=b.songId?songs.get(b.songId):undefined;
    const missingSong=(b.type==='song'||b.type==='song-section')&&!song;
    const missingSection=b.type==='song-section'&&song&&!song.sections.some(s=>s.id===b.songSectionId);
    // Preserve old timing and cues when a future source has already been deleted.
    // Keep the unresolved reference in a visible note and the exact original in
    // the pre-upgrade backup. Never attach it to an unrelated starter exercise.
    if(missingExercise||missingSong||missingSection){
      const reference=[b.exerciseId,b.songId,b.songSectionId].filter(Boolean).join(' / ');
      b={...b,type:missingSection?'song':'free',exerciseId:undefined,
        songId:missingSection?b.songId:undefined,songSectionId:undefined,songPartId:undefined,
        tempoTrainer:undefined,notes:`${b.notes}\nMigration note: source ${reference} was unavailable. Original title, duration and tempo retained.`.trim()};
    }
    const e=b.exerciseId?exercises.get(b.exerciseId):undefined;
    const profileId=e?.profileId??selected.id;
    const protocol:PracticeProtocol|undefined=b.type==='free'?{kind:'free',focus:b.notes||b.title,...(b.bpm===undefined?{}:{pulse:pulse(b.bpm)})}:undefined;
    return {...b,profileId,...(protocol?{protocol}:{})};
  };
  const group=(blocks:RoutineBlock[]):Map<string,RoutineBlock[]>=>{
    const groups=new Map<string,RoutineBlock[]>();
    for(const raw of blocks){const b=migrateBlock(raw),id=b.profileId!;groups.set(id,[...(groups.get(id)??[]),b]);}
    if(!groups.size)groups.set(selected.id,[]);return groups;
  };
  // IDs cannot collide with existing user-created IDs. Remap source routines
  // per profile so a split Guitar plan never points back to the Drum routine.
  const routineIds=new Set(d.routines.map(r=>r.id)),planIds=new Set(d.dailyPlans.map(p=>p.id));
  const allocate=(base:string,ids:Set<string>)=>{let id=base,n=2;while(ids.has(id))id=`${base}-${n++}`;ids.add(id);return id;};
  const routineMap=new Map<string,string>();
  d.routines=d.routines.flatMap(r=>[...group(r.blocks)].map(([profileId,blocks],index)=>{
    const id=index===0?r.id:allocate(`${r.id}.profile-${index}`,routineIds);routineMap.set(`${r.id}/${profileId}`,id);
    return {...r,id,profileId,name:index===0?r.name:`${r.name} (${[...profileMap.values()].find(p=>p.id===profileId)?.name??'Part'})`.slice(0,200),blocks:blocks.map((b,order)=>({...b,order}))};
  }));
  d.dailyPlans=d.dailyPlans.flatMap(r=>[...group(r.blocks)].map(([profileId,blocks],index)=>({...r,
    id:index===0?r.id:allocate(`${r.id}.profile-${index}`,planIds),profileId,
    sourceRoutineId:r.sourceRoutineId?routineMap.get(`${r.sourceRoutineId}/${profileId}`):undefined,
    blocks:blocks.map((b,order)=>({...b,order}))})));
  d.sessions=d.sessions.map(s=>{
    const blocks=s.blocks.map((b):PracticeBlock=>{
      const e=b.sourceExerciseId?exercises.get(b.sourceExerciseId):undefined;
      const p=e?[...profileMap.values()].find(p=>p.id===e.profileId)!:b.categorySnapshot==='rudiment'?ensure('Drums'):unknown();
      // Historic performance parameters, never the current edited exercise, define the snapshot.
      const protocol:PracticeProtocol={kind:'tempo',pulse:{bpm:b.initialBpm??s.runtime.bpm,beats:b.meterSnapshot.beats,beatUnit:b.meterSnapshot.beatUnit,subdivision:b.subdivisionSnapshot},technique:'Earlier tempo-based practice',...(p.family==='percussion'&&b.stickingSnapshot?{sticking:b.stickingSnapshot}:{})};
      return {...b,profileId:p.id,profileNameSnapshot:p.name,protocolSnapshot:protocol,instructionsSnapshot:'',outcomes:[],protocolState:{step:0,clean:0,total:0}};
    });
    const ids=new Set(blocks.map(b=>b.profileId)),p=ids.size===1?[...profileMap.values()].find(p=>p.id===blocks[0]!.profileId)!:unknown();
    return {...s,profileId:p.id,profileNameSnapshot:p.name,blocks};
  });
  d.goals=d.goals.map(g=>{
    if((g.exerciseId&&!exercises.has(g.exerciseId))||(g.songId&&!songs.has(g.songId))){
      return {...g,type:'custom',exerciseId:undefined,songId:undefined,songPartId:undefined,metric:undefined,
        description:`${g.description}\nMigration note: unavailable source ${g.exerciseId??g.songId}. Previous target: ${g.targetValue} ${g.unit}. Kept as a manual goal.`.trim()};
    }
    return {...g,...(g.exerciseId?{profileId:exercises.get(g.exerciseId)?.profileId??selected.id}:{})};
  });
  d.setlists=d.setlists.map(list=>{const missing=list.songIds.filter(id=>!songs.has(id));return missing.length?{...list,songIds:list.songIds.filter(id=>songs.has(id)),notes:`${list.notes}\nMigration note: previously deleted songs ${missing.join(', ')} were removed from this setlist. Their IDs remain in this note and the pre-upgrade backup.`.trim()}:list;});
  d.profiles=[...profileMap.values()];d.schemaVersion=2;
  d.settings={...d.settings,activeProfileId:selected.id,primaryProfileId:selected.id};
  // Non-drum users receive an actual library on upgrade, while all older records stay.
  for(const p of d.profiles.filter(p=>p.attribution!=='unresolved-history')){
    const content=starterContent(p),exIds=new Set(d.exercises.map(e=>e.id)),rIds=new Set(d.routines.map(r=>r.id));
    d.exercises.push(...content.exercises.filter(e=>!exIds.has(e.id)));
    d.routines.push(...content.routines.filter(r=>!rIds.has(r.id)));
  }
  return normalizeProfileSelection(d);
}
