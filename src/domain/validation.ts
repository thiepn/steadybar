import { validateCourseProgress, validateLessonSource } from '../learning/validation.js';
import { COURSES } from '../learning/catalog.js';
import { sessionEvidenceSeconds } from '../learning/evidence.js';
export { validateCourseProgress } from '../learning/validation.js';
import { patternFits, exerciseProtocol, protocolPulse } from './protocols.js';
import { validateProfile, validateProtocol, validateOutcome, validateProtocolState, validateSongPart, assertProtocolCompatible, assertOutcomeMatches } from './practice-validation.js';
export { validateProfile } from './practice-validation.js';
import { ACCENTS, SURFACE_THEMES } from './appearance.js';
import type { Backup, Data, Exercise, Goal, MetronomeConfig, PracticeSession, Preset, Routine, RoutineBlock, Settings, Setlist, Song, TrainerConfig, DailyPlan } from './models.js';

import { fail, text, num, bool, one, optional, arr, obj, iso, dateOnly, id, name, bpm, order, uniqueIds, type Validator } from './schema.js';
export { ValidationError, dateOnly, type Validator } from './schema.js';
const entity = { id, createdAt: iso, updatedAt: iso };
const meter = obj({ beats:num(1,16,true), beatUnit:one(4,8) });
const subdivision = one(1,2,3,4);
const baseMetronome = obj({ bpm, meter, subdivision, accents:arr(one(0,1,2),16), countIn:one(0,1,2,4), volume:num(0,1) });
export const validateMetronome: Validator<MetronomeConfig> = (v,p = 'Metronome') => {
  const config = baseMetronome(v,p);
  if (config.accents.length !== config.meter.beats) fail(p,'accent count must match the meter');
  return config;
};
export const validateTrainer: Validator<TrainerConfig> = (v,p = 'Tempo trainer') => {
  const mode = typeof v === 'object' && v !== null && 'mode' in v ? v.mode : undefined;
  switch (mode) {
    case 'progressive': {
      const c = obj({ mode:one('progressive'), start:bpm, step:num(1,100,true), seconds:num(1,86400,true), max:bpm })(v,p);
      if(c.max < c.start) fail(p, 'maximum BPM must be at least the starting BPM'); return c;
    }
    case 'repetition': {
      const c = obj({ mode:one('repetition'), start:bpm, step:num(1,100,true), rounds:num(1,100,true), max:bpm })(v,p);
      if(c.max < c.start) fail(p, 'maximum BPM must be at least the starting BPM'); return c;
    }
    case 'ladder': {
      const c = obj({ mode:one('ladder'), bpms:arr(bpm,100), seconds:num(1,86400,true) })(v,p);
      if(c.bpms.length < 2) fail(p,'enter at least two ladder tempos'); return c;
    }
    case 'endurance': return obj({ mode:one('endurance'), bpm, seconds:num(1,86400,true) })(v,p);
    default: return fail(p,'unknown tempo trainer mode');
  }
};
const rawExercise = obj({ ...entity, name, profileId:optional(id), skillArea:optional(text(100,1)), protocol:optional(validateProtocol), level:optional(one('beginner','intermediate','advanced')), defaultSeconds:optional(num(1,86400,true)), instrument:name, category:one('rudiment','technique','groove','coordination','warmup','timing','other'), description:text(), instructions:text(), sticking:optional(text(1000)), accents:optional(text(1000)), defaultBpm:optional(bpm), targetBpm:optional(bpm), minBpm:optional(bpm), maxBpm:optional(bpm), meter:optional(meter), subdivision:optional(subdivision), tags:arr(text(80),50), notes:text(), builtin:bool, archived:bool });
export const validateExercise: Validator<Exercise> = (v,p='Exercise') => {
  const exercise=rawExercise(v,p);
  if(exercise.minBpm!==undefined && exercise.maxBpm!==undefined && exercise.minBpm>exercise.maxBpm)fail(p,'minimum BPM cannot exceed maximum BPM');
  if(!exercise.protocol && (exercise.defaultBpm===undefined || !exercise.meter || !exercise.subdivision))fail(p,'legacy exercises require tempo and meter');
  return exercise;
};
const section = obj({ id, name, bars:optional(num(1,1000,true)), bpmOverride:optional(bpm), notes:text(), order });
const rawSong = obj({ ...entity, title:name, artist:text(200), bpm, meter, key:text(40), difficulty:one(1,2,3,4,5), status:one('learning','practicing','performance-ready','archived'), notes:text(), sections:arr(section,200), parts:optional(arr(validateSongPart,100)) });
export const validateSong: Validator<Song> = (v,p='Song') => {
  const song=rawSong(v,p);uniqueIds(song.sections,`${p}.sections`);if(song.parts)uniqueIds(song.parts,`${p}.parts`);return song;
};
const rawRoutineBlock = obj({ id, lessonSource:optional(validateLessonSource), profileId:optional(id), songPartId:optional(id), protocol:optional(validateProtocol), type:one('exercise','song','song-section','free'), exerciseId:optional(id), songId:optional(id), songSectionId:optional(id), title:name, targetSeconds:num(1,86400,true), bpm:optional(bpm), notes:text(), tempoTrainer:optional(validateTrainer), order });
export const validateRoutineBlock: Validator<RoutineBlock> = (v,p='Block') => {
  const block=rawRoutineBlock(v,p);
  if(block.type==='exercise' && !block.exerciseId)fail(p,'an exercise block needs an exercise ID');
  if((block.type==='song' || block.type==='song-section') && !block.songId)fail(p,'a song block needs a song ID');
  if(block.type==='song-section' && !block.songSectionId)fail(p,'a section block needs a section ID');
  return block;
};
const rawRoutine = obj({ ...entity, profileId:optional(id), name, description:text(), blocks:arr(validateRoutineBlock,200), scheduledDays:arr(num(0,6,true),7), tags:arr(text(80),50), builtin:bool, archived:bool });
export const validateRoutine: Validator<Routine> = (v,p='Routine') => {
  const routine=rawRoutine(v,p);uniqueIds(routine.blocks,`${p}.blocks`);
  if(new Set(routine.scheduledDays).size!==routine.scheduledDays.length)fail(p,'scheduled weekdays must be unique');
  return routine;
};
const rawPlan = obj({ ...entity, profileId:optional(id), date:dateOnly, sourceRoutineId:optional(id), blocks:arr(validateRoutineBlock,200) });
export const validatePlan: Validator<DailyPlan> = (v,p='Daily plan') => {
  const plan=rawPlan(v,p);uniqueIds(plan.blocks,`${p}.blocks`);return plan;
};
const attempt = obj({ id, bpm, rating:one('failed','messy','acceptable','clean','effortless'), timestamp:iso, durationSeconds:optional(num(0,31536000)), note:text() });
const practiceBlock = obj({ id, lessonSource:optional(validateLessonSource), profileId:optional(id), profileNameSnapshot:optional(name), protocolSnapshot:optional(validateProtocol), instructionsSnapshot:optional(text()), outcomes:optional(arr(validateOutcome,10000)), protocolState:optional(validateProtocolState), sourceSongPartId:optional(id), type:one('exercise','song','song-section','free'), sourceExerciseId:optional(id), sourceSongId:optional(id), sourceSongSectionId:optional(id), titleSnapshot:name, categorySnapshot:text(100), stickingSnapshot:text(1000), meterSnapshot:meter, subdivisionSnapshot:subdivision, targetSeconds:num(1,86400,true), actualActiveSeconds:num(0,31536000), initialBpm:optional(bpm), finalBpm:optional(bpm), tempoAttempts:arr(attempt,10000), notes:text(), startedAt:optional(iso), endedAt:optional(iso), completed:bool, skipped:bool, tempoTrainer:optional(validateTrainer) });
const runtime = obj({ phase:one('ready','countin','running','paused'), runStartedAt:optional(iso), bpm, trainerCleanRounds:num(0,100000,true), trainerStartSeconds:num(0,31536000), checkpointAt:iso, metronomeOn:bool });
const rawSession = obj({ ...entity, profileId:optional(id), profileNameSnapshot:optional(name), status:one('active','completed','abandoned'), startedAt:iso, endedAt:optional(iso), activeBlockIndex:order, blocks:arr(practiceBlock,200), sessionNotes:text(), sessionRating:optional(one(1,2,3,4,5)), sourceRoutineId:optional(id), sourceDailyPlanId:optional(id), runtime });
export const validateSession: Validator<PracticeSession> = (v,p = 'Session') => {
  const s = rawSession(v,p);
  if(s.blocks.length === 0 || s.activeBlockIndex >= s.blocks.length) fail(p,'the active block index must refer to an existing block');
  if(s.runtime.phase === 'running' && !s.runtime.runStartedAt) fail(p,'a running session needs a start timestamp');
  if(s.status!=='active' && (!s.endedAt || s.runtime.phase==='running' || s.runtime.phase==='countin'))fail(p,'an ended session needs an end timestamp and a stopped timer');
  if(new Set(s.blocks.map(b=>b.id)).size!==s.blocks.length)fail(p,'block IDs must be unique within a session');
  for(const b of s.blocks){
    if(b.outcomes){uniqueIds(b.outcomes,`${p}.outcomes`);if(!b.protocolSnapshot)fail(p,'outcomes require a protocol snapshot');for(const outcome of b.outcomes)assertOutcomeMatches(outcome,b.protocolSnapshot!);}
    if(b.protocolSnapshot){
      const p=b.protocolSnapshot;
      if(p.kind!=='tempo'&&(b.tempoAttempts.length||b.tempoTrainer))fail('Session','non-tempo tasks cannot contain tempo attempts or a tempo trainer');
      if(b.protocolState?.rootMidi!==undefined&&p.kind==='vocal-pattern'&&!patternFits(p,b.protocolState.rootMidi))fail('Session','saved vocal root is outside the comfortable range');
      if((b.outcomes??[]).filter(o=>o.kind==='reading'&&o.firstRead).length>1)fail('Session','only one first-read outcome is allowed in a segment');
    }
    if(b.protocolState && b.protocolState.clean>b.protocolState.total)fail(p,'clean count exceeds attempts');
    if(b.completed && b.skipped)fail(p,'a block cannot be both completed and skipped');
    if(new Set(b.tempoAttempts.map(a=>a.id)).size!==b.tempoAttempts.length)fail(p,'attempt IDs must be unique within a block');
  }
  return s;
};
const rawGoal = obj({ ...entity, profileId:optional(id), songPartId:optional(id), metric:optional(one('clean-count','keys-practiced','recall-correct','pitch-sessions')), type:one('bpm','weekly-sessions','weekly-minutes','protocol','song-mastery','custom'), title:name, description:text(), exerciseId:optional(id), songId:optional(id), targetValue:num(1,10000), unit:text(80), deadline:optional(dateOnly), completed:bool, completedAt:optional(iso) });
export const validateGoal: Validator<Goal> = (v,p='Goal') => {
  const goal=rawGoal(v,p);
  if(goal.type==='protocol' && !goal.metric)fail(p,'choose a protocol metric');
  if(goal.metric==='keys-practiced'&&goal.targetValue>12)fail(p,'key coverage cannot exceed twelve pitch classes');
  if(goal.type==='protocol'&&!Number.isInteger(goal.targetValue))fail(p,'task targets must be whole numbers');
  if(goal.type==='bpm'){
    if(!goal.exerciseId)fail(p,'a BPM goal needs an exercise ID');
    bpm(goal.targetValue,`${p}.targetValue`);
  }
  if(goal.type==='song-mastery' && !goal.songId)fail(p,'a song goal needs a song ID');
  if(goal.type==='weekly-sessions' && !Number.isInteger(goal.targetValue))fail(p,'a weekly session goal needs a whole-number target');
  return goal;
};
export const validateSetlist: Validator<Setlist> = obj({ ...entity, name, date:optional(dateOnly), songIds:arr(id,200), notes:text() });
export const validatePreset: Validator<Preset> = obj({ ...entity, name, config:validateMetronome });
export const validateSettings: Validator<Settings> = obj({ activeProfileId:optional(id), primaryProfileId:optional(id), id:one('preferences'), theme:one('system','light','dark'), accent:optional(one(...ACCENTS)), surfaceTheme:optional(one(...SURFACE_THEMES)), instrument:name, aim:name, onboardingDone:bool, metronome:validateMetronome, wakeLock:bool, defaultFocus:bool, pauseWhenHidden:bool, seedVersion:num(1,100,true) });
const dataSchema: Validator<Data> = obj({ schemaVersion:optional(one(2)), profiles:optional(arr(validateProfile,100)), courseProgress:optional(arr(validateCourseProgress,1600)), exercises:arr(validateExercise), songs:arr(validateSong), routines:arr(validateRoutine), dailyPlans:arr(validatePlan), sessions:arr(validateSession), goals:arr(validateGoal), setlists:arr(validateSetlist), metronomePresets:arr(validatePreset), settings:validateSettings });
/** Validate a complete replacement before opening any destructive transaction. */
export function validateData(input:unknown):Data {
  const d=dataSchema(input,'Data');
  for(const [key,value] of Object.entries(d))if(Array.isArray(value))uniqueIds(value,`Data.${key}`);
  if(new Set(d.dailyPlans.map(p=>`${p.profileId??''}/${p.date}`)).size!==d.dailyPlans.length)fail('Daily plans','contains duplicate dates');
  if(d.sessions.filter(s=>s.status==='active').length>1)fail('Sessions','data may contain only one active session');
  if(d.schemaVersion===2){
    const profileRows=d.profiles??[];
    if(!profileRows.length)fail('Profiles','at least one profile is required');
    if(!profileRows.some(p=>p.attribution!=='unresolved-history'))fail('Profiles','at least one real practice profile is required in addition to historical attribution buckets');
    const profiles=new Map(profileRows.map(p=>[p.id,p]));
    const requireProfile=(id:string|undefined)=>{const p=id?profiles.get(id):undefined;if(!p)fail('Profile','missing or unknown profile ID');return p!;};
    if(requireProfile(d.settings.activeProfileId).archived || requireProfile(d.settings.primaryProfileId).archived)fail('Settings','active and primary profiles must not be archived');
    for(const e of d.exercises){const p=requireProfile(e.profileId);if(!e.protocol||!e.skillArea)fail('Exercise','v2 exercises require a protocol and skill area');assertProtocolCompatible(e.protocol!,p);}
    const learning=d.courseProgress??[];
    if(new Set(learning.map(p=>`${p.profileId}/${p.courseId}`)).size!==learning.length)fail('Course progress','one record per profile and course is required');
    const activeCourses=learning.filter(p=>p.active);
    if(new Set(activeCourses.map(p=>p.profileId)).size!==activeCourses.length)fail('Course progress','only one course may be selected per profile');
    const sessionsById=new Map(d.sessions.map(s=>[s.id,s]));
    for(const row of learning){
      const p=requireProfile(row.profileId),course=COURSES.find(c=>c.id===row.courseId);
      if(p.attribution==='unresolved-history')fail('Course progress','historical attribution buckets cannot learn new courses');
      if(course&&course.instrument!==p.instrumentType)fail('Course progress','course belongs to a different instrument');
      if(!course)continue;
      for(const record of row.lessons){
        const lesson=course.lessons.find(l=>l.id===record.lessonId);
        for(const attempt of record.attempts){
          if(attempt.revision!==course.revision||attempt.evidence.kind!=='session')continue;
          if(!lesson)fail('Course progress','current-revision session evidence refers to an unavailable lesson');
          const session=sessionsById.get(attempt.evidence.sessionId??''),seconds=session?sessionEvidenceSeconds(session,row.profileId,course,lesson!):0;
          if(!session||!seconds||seconds!==attempt.evidence.seconds)fail('Course progress','session evidence does not match its supporting guided session');
        }
      }
    }
    const exercises=new Map(d.exercises.map(e=>[e.id,e])),songs=new Map(d.songs.map(s=>[s.id,s]));
    for(const r of [...d.routines,...d.dailyPlans]){requireProfile(r.profileId);for(const b of r.blocks){
      if(b.protocol)assertProtocolCompatible(b.protocol,requireProfile(r.profileId));
      const effective=b.protocol??(b.exerciseId&&exercises.has(b.exerciseId)?exerciseProtocol(exercises.get(b.exerciseId)!):undefined);
      if(effective&&b.tempoTrainer&&effective.kind!=='tempo')fail('Block','tempo trainer is not valid for this task');
      if(effective&&!protocolPulse(effective)&&b.bpm!==undefined)fail('Block','self-paced tasks cannot carry a tempo override');
      if(b.profileId && b.profileId!==r.profileId)fail('Block','profile differs from its plan or routine');
      if(b.exerciseId){const e=exercises.get(b.exerciseId);if(!e||e.profileId!==r.profileId)fail('Block','exercise must belong to this profile');}
      if(b.songId){const song=songs.get(b.songId);if(!song)fail('Block','song does not exist');const part=b.songPartId?song!.parts?.find(p=>p.id===b.songPartId):undefined;if(b.songPartId&&(!part||part.profileId!==r.profileId))fail('Block','song part must belong to this profile');if(b.songSectionId && !(part?.sections??song!.sections).some(s=>s.id===b.songSectionId))fail('Block','song section does not exist');}
    }}
    for(const s of d.sessions){requireProfile(s.profileId);for(const b of s.blocks){const p=requireProfile(b.profileId);if(!b.protocolSnapshot)fail('Session','version 2 blocks require a protocol snapshot');assertProtocolCompatible(b.protocolSnapshot!,p);}}
    for(const g of d.goals){
      if(g.profileId)requireProfile(g.profileId);
      const exercise=g.exerciseId?exercises.get(g.exerciseId):undefined;
      if(g.exerciseId&&(!exercise||(g.profileId&&exercise.profileId!==g.profileId)))fail('Goal','exercise does not belong to the goal profile');
      if(g.type==='bpm'&&exercise&&exerciseProtocol(exercise).kind!=='tempo')fail('Goal','BPM goals require a tempo-practice exercise');
      if(g.type==='protocol'&&exercise){const kind=exerciseProtocol(exercise).kind;const allowed:Record<string,string[]>={'clean-count':['repetitions','chord-changes'],'keys-practiced':['scale-cycle'],'recall-correct':['fretboard'],'pitch-sessions':['pitch-match','vocal-pattern']};if(!allowed[g.metric!]?.includes(kind))fail('Goal','the exercise does not produce this metric');}
      const song=g.songId?songs.get(g.songId):undefined;
      if(g.songId&&!song)fail('Goal','song does not exist');
      if(g.songPartId){const part=song?.parts?.find(p=>p.id===g.songPartId);if(!part||part.profileId!==g.profileId)fail('Goal','song part must belong to the goal profile');}
    }
    for(const setlist of d.setlists)for(const id of setlist.songIds)if(!songs.has(id))fail('Setlist','song does not exist');
    for(const s of d.songs)for(const part of s.parts??[]){const p=requireProfile(part.profileId);if(p.instrumentType!==part.instrumentType)fail('Song part','instrument identity must match its profile');}
  }
  return d;
}
export function validateBackup(input: unknown): Backup {
  if (typeof input !== 'object' || input === null) fail('Backup','expected a JSON object');
  const head = input as Record<string, unknown>;
  if(head.format !== 'music-practice-os') fail('Backup','this is not a Steadybar backup');
  if(head.version !== 1 && head.version !== 2 && head.version !== 3) fail('Backup','this backup uses an unsupported format version');
  if((head.version===2||head.version===3) && (head.data===null||typeof head.data!=='object'||!('schemaVersion' in head.data)||head.data.schemaVersion!==2))fail('Backup','profile backups require a version 2 workspace');
  if(head.version===3&&(!head.data||typeof head.data!=='object'||!('courseProgress' in head.data)||!Array.isArray(head.data.courseProgress)))fail('Backup','version 3 requires course progress, even when empty');
  return {format:'music-practice-os',version:head.version as 1|2|3,exportedAt:iso(head.exportedAt,'Exported at'),data:validateData(head.data)};
}
