import { validateCourseProgress, validateLessonSource } from '../learning/validation.js';
import { COURSES } from '../learning/catalog.js';
import { sessionEvidenceSeconds } from '../learning/evidence.js';
export { validateCourseProgress } from '../learning/validation.js';
import { patternFits, exerciseProtocol, protocolPulse } from './protocols.js';
import { validateProfile, validateProtocol, validateOutcome, validateProtocolState, validateSongPart, validateSongTransition, assertProtocolCompatible, assertOutcomeMatches } from './practice-validation.js';
import { assertPracticeStateReferences, assertPracticeTargetReferences, assertPriorityCycleReferences, validatePlanGeneration, validatePracticeEvaluation, validatePracticePrescription, validatePracticeState, validatePriorityCycle } from './practice-state-validation.js';
import { isSkillForInstrument } from './skill-graph.js';
export { validateProfile } from './practice-validation.js';
import { ACCENTS, SURFACE_THEMES } from './appearance.js';
import type { Backup, Data, Exercise, Goal, MetronomeConfig, MidiDeviceProfile, MidiPerformanceResult, PracticeRecording, PracticeSession, Preset, RepertoireAudioTrack, Routine, RoutineBlock, Settings, Setlist, Song, TimingLabResult, TrainerConfig, DailyPlan, TrainingPlan, WeeklySchedule } from './models.js';

import { fail, text, num, bool, one, optional, arr, obj, iso, dateOnly, id, name, bpm, order, uniqueIds, type Validator } from './schema.js';
export { ValidationError, dateOnly, type Validator } from './schema.js';
const entity = { id, createdAt: iso, updatedAt: iso };
const meter = obj({ beats:num(1,16,true), beatUnit:one(4,8) });
const subdivision = one(1,2,3,4);
const timingClick = obj({
  mode: one('standard','two-four','sparse','one-per-bar','gap'),
  sparseEvery: one(2,3,4),
  gapClickBars: num(1,16,true),
  gapSilentBars: num(1,16,true),
});
const progression = obj({
  engineVersion: one(1),
  direction: one('reduce','hold','advance'),
  dimension: one('baseline','tempo','duration','subdivision','click-density','gap-click','accent-pattern','dynamics','orchestration','memory','musical-context'),
  level: one(0,1,2,3),
  summary: text(300,1),
  cue: text(1000,1),
  bpm: optional(bpm),
  targetSeconds: optional(num(1,86400,true)),
  subdivision: optional(subdivision),
  timingClick: optional(timingClick),
});
const setPrep = obj({
  engineVersion: one(1),
  setlistId: id,
  setlistName: name,
  performanceDate: optional(dateOnly),
  stage: one('build','integrate','simulate','taper','performance-day'),
  mode: one('focused','run-through'),
  role: one('weak-spot','transition','song','run-through'),
  setPosition: num(0,199,true),
});
const baseMetronome = obj({ bpm, meter, subdivision, accents:arr(one(0,1,2),16), countIn:one(0,1,2,4), volume:num(0,1), timing:optional(timingClick) });
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
const rawExercise = obj({ ...entity, name, profileId:optional(id), skillArea:optional(text(100,1)), primarySkillId:optional(id), secondarySkillIds:optional(arr(id,20)), protocol:optional(validateProtocol), level:optional(one('beginner','intermediate','advanced')), defaultSeconds:optional(num(1,86400,true)), instrument:name, category:one('rudiment','technique','groove','coordination','warmup','timing','other'), description:text(), instructions:text(), sticking:optional(text(1000)), accents:optional(text(1000)), defaultBpm:optional(bpm), targetBpm:optional(bpm), minBpm:optional(bpm), maxBpm:optional(bpm), meter:optional(meter), subdivision:optional(subdivision), tags:arr(text(80),50), notes:text(), builtin:bool, archived:bool });
export const validateExercise: Validator<Exercise> = (v,p='Exercise') => {
  const exercise=rawExercise(v,p);
  if(exercise.minBpm!==undefined && exercise.maxBpm!==undefined && exercise.minBpm>exercise.maxBpm)fail(p,'minimum BPM cannot exceed maximum BPM');
  if(!exercise.protocol && (exercise.defaultBpm===undefined || !exercise.meter || !exercise.subdivision))fail(p,'legacy exercises require tempo and meter');
  if(exercise.secondarySkillIds&&new Set(exercise.secondarySkillIds).size!==exercise.secondarySkillIds.length)fail(p,'secondary skills must be unique');
  return exercise;
};
const section = obj({ id, name, bars:optional(num(1,1000,true)), bpmOverride:optional(bpm), notes:text(), order });
const rawSong = obj({ ...entity, title:name, artist:text(200), bpm, meter, key:text(40), difficulty:one(1,2,3,4,5), status:one('learning','practicing','performance-ready','archived'), notes:text(), sections:arr(section,200), transitions:optional(arr(validateSongTransition,400)), parts:optional(arr(validateSongPart,100)) });
export const validateSong: Validator<Song> = (v,p='Song') => {
  const song=rawSong(v,p);uniqueIds(song.sections,`${p}.sections`);if(song.parts)uniqueIds(song.parts,`${p}.parts`);if(song.transitions){uniqueIds(song.transitions,`${p}.transitions`);const ids=new Set(song.sections.map(s=>s.id));for(const t of song.transitions){if(t.fromSectionId===t.toSectionId)fail(p,'a transition must connect two different sections');if(!ids.has(t.fromSectionId)||!ids.has(t.toSectionId))fail(p,'transition references an unavailable section');}}return song;
};
const rawRoutineBlock = obj({ id, lessonSource:optional(validateLessonSource), profileId:optional(id), songPartId:optional(id), protocol:optional(validateProtocol), type:one('exercise','song','song-section','free'), exerciseId:optional(id), songId:optional(id), songSectionId:optional(id), title:name, targetSeconds:num(1,86400,true), bpm:optional(bpm), notes:text(), tempoTrainer:optional(validateTrainer), prescription:optional(validatePracticePrescription), progression:optional(progression), setPrep:optional(setPrep), order });
export const validateRoutineBlock: Validator<RoutineBlock> = (v,p='Block') => {
  const block=rawRoutineBlock(v,p);
  if(block.type==='exercise' && !block.exerciseId)fail(p,'an exercise block needs an exercise ID');
  if((block.type==='song' || block.type==='song-section') && !block.songId)fail(p,'a song block needs a song ID');
  if(block.type==='song-section' && !block.songSectionId)fail(p,'a section block needs a section ID');
  if(block.progression&&block.type!=='exercise')fail(p,'exercise progression can only belong to an exercise block');
  if(block.setPrep&&!['song','song-section'].includes(block.type))fail(p,'set-prep metadata belongs only to repertoire blocks');
  if(block.setPrep&&block.prescription?.generatedBy!=='set-prep')fail(p,'set-prep metadata requires a set-prep prescription');
  if(block.prescription?.generatedBy==='set-prep'&&!block.setPrep)fail(p,'set-prep prescriptions require set-prep metadata');
  return block;
};
const rawRoutine = obj({ ...entity, profileId:optional(id), name, description:text(), blocks:arr(validateRoutineBlock,200), scheduledDays:arr(num(0,6,true),7), tags:arr(text(80),50), builtin:bool, archived:bool });
export const validateRoutine: Validator<Routine> = (v,p='Routine') => {
  const routine=rawRoutine(v,p);uniqueIds(routine.blocks,`${p}.blocks`);
  if(new Set(routine.scheduledDays).size!==routine.scheduledDays.length)fail(p,'scheduled weekdays must be unique');
  return routine;
};
const rawPlan = obj({ ...entity, profileId:optional(id), date:dateOnly, sourceRoutineId:optional(id), generation:optional(validatePlanGeneration), blocks:arr(validateRoutineBlock,200) });
export const validatePlan: Validator<DailyPlan> = (v,p='Daily plan') => {
  const plan=rawPlan(v,p);uniqueIds(plan.blocks,`${p}.blocks`);return plan;
};
const attempt = obj({ id, bpm, rating:one('failed','messy','acceptable','clean','effortless'), timestamp:iso, durationSeconds:optional(num(0,31536000)), note:text() });
const practiceBlock = obj({ id, lessonSource:optional(validateLessonSource), profileId:optional(id), profileNameSnapshot:optional(name), protocolSnapshot:optional(validateProtocol), instructionsSnapshot:optional(text()), outcomes:optional(arr(validateOutcome,10000)), protocolState:optional(validateProtocolState), sourceSongPartId:optional(id), type:one('exercise','song','song-section','free'), sourceExerciseId:optional(id), sourceSongId:optional(id), sourceSongSectionId:optional(id), titleSnapshot:name, categorySnapshot:text(100), stickingSnapshot:text(1000), meterSnapshot:meter, subdivisionSnapshot:subdivision, timingClickSnapshot:optional(timingClick), progressionSnapshot:optional(progression), setPrepSnapshot:optional(setPrep), targetSeconds:num(1,86400,true), actualActiveSeconds:num(0,31536000), initialBpm:optional(bpm), finalBpm:optional(bpm), tempoAttempts:arr(attempt,10000), notes:text(), startedAt:optional(iso), endedAt:optional(iso), completed:bool, skipped:bool, tempoTrainer:optional(validateTrainer), prescriptionSnapshot:optional(validatePracticePrescription), evaluation:optional(validatePracticeEvaluation) });
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
    if(b.progressionSnapshot&&b.type!=='exercise')fail(p,'exercise progression evidence must belong to an exercise block');
    if(b.setPrepSnapshot&&!['song','song-section'].includes(b.type))fail(p,'set-prep evidence must belong to a repertoire block');
    if(b.setPrepSnapshot&&b.prescriptionSnapshot?.generatedBy!=='set-prep')fail(p,'set-prep evidence requires a set-prep prescription');
    if(b.prescriptionSnapshot?.generatedBy==='set-prep'&&!b.setPrepSnapshot)fail(p,'set-prep session prescriptions require set-prep evidence');
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
const trainingFocus=obj({id,skillId:id,weight:one(1,2,3),note:text()});
const trainingPhase=obj({
  id,name,kind:one('foundation','build','deload','integrate','simulate','taper','consolidate','custom'),
  startOn:dateOnly,endOn:dateOnly,weeklyMinutes:num(15,10000,true),emphasis:one('balanced','songs','timing','technique'),
  focuses:arr(trainingFocus,5),notes:text(),
});
const rawTrainingPlan=obj({
  ...entity,profileId:id,name,status:one('draft','active','paused','completed','archived'),
  startOn:dateOnly,endOn:dateOnly,baselineWeeklyMinutes:num(15,10000,true),
  goalIds:arr(id,100),setlistIds:arr(id,100),notes:text(),phases:arr(trainingPhase,24),
});
const nextDate=(value:string)=>new Date(Date.parse(value+'T00:00:00Z')+86400000).toISOString().slice(0,10);
export const validateTrainingPlan:Validator<TrainingPlan>=(v,p='Training plan')=>{
  const plan=rawTrainingPlan(v,p);
  if(plan.endOn<plan.startOn)fail(p,'end date cannot be before start date');
  if(!plan.phases.length)fail(p,'add at least one training phase');
  uniqueIds(plan.phases,`${p}.phases`);
  if(new Set(plan.goalIds).size!==plan.goalIds.length)fail(p,'linked goals must be unique');
  if(new Set(plan.setlistIds).size!==plan.setlistIds.length)fail(p,'linked setlists must be unique');
  const ordered=[...plan.phases].sort((a,b)=>a.startOn.localeCompare(b.startOn)||a.endOn.localeCompare(b.endOn)||a.id.localeCompare(b.id));
  if(ordered[0]!.startOn!==plan.startOn||ordered.at(-1)!.endOn!==plan.endOn)fail(p,'phases must cover the full plan date range');
  for(let i=0;i<ordered.length;i++){
    const phase=ordered[i]!;
    if(phase.endOn<phase.startOn)fail(p,'phase end date cannot be before its start');
    if(phase.startOn<plan.startOn||phase.endOn>plan.endOn)fail(p,'phase dates must stay inside the training plan');
    if(new Set(phase.focuses.map(row=>row.skillId)).size!==phase.focuses.length)fail(p,'phase focus skills must be unique');
    if(i>0&&phase.startOn!==nextDate(ordered[i-1]!.endOn))fail(p,'training phases must be contiguous without gaps or overlaps');
  }
  return plan;
};
const weeklyScheduleDay=obj({
  id,date:dateOnly,kind:one('practice','optional','rest'),
  plannedMinutes:num(0,180,true),intent:one('balanced','songs','timing','technique'),note:text(),
});
const weeklyScheduleLoadCalibration=obj({
  engineVersion:one(1),confidence:one('low','medium','high'),
  windowStart:dateOnly,windowEnd:dateOnly,
  observedSessions:num(0,100000,true),observedActiveDays:num(0,42,true),observedActiveWeeks:num(0,6,true),
  typicalActiveDayMinutes:num(5,180,true),medianActiveWeekMinutes:num(0,1260,true),
  baselineWeeklyMinutes:num(5,1260,true),targetSource:one('training-plan','weekly-goal','profile-default'),
  suggestedWeeklyMinutes:num(5,1260,true),suggestedPracticeDays:num(1,7,true),
  preferredWeekdays:arr(num(0,6,true),7),
  loadAdjusted:optional(bool),patternAdjusted:optional(bool),
});
const weeklyScheduleSource=obj({
  engineVersion:one(1),
  trainingPlanId:optional(id),trainingPlanName:optional(name),
  trainingPhaseIds:arr(id,24),trainingPhaseNames:arr(name,24),
  priorityCycleId:optional(id),priorityCycleName:optional(name),
  loadCalibration:optional(weeklyScheduleLoadCalibration),
});
const rawWeeklySchedule=obj({
  ...entity,profileId:id,weekStart:dateOnly,status:one('draft','applied'),
  targetMinutes:num(0,1260,true),source:weeklyScheduleSource,days:arr(weeklyScheduleDay,7),
});
const weekdayUTC=(value:string)=>new Date(value+'T12:00:00Z').getUTCDay();
export const validateWeeklySchedule:Validator<WeeklySchedule>=(v,p='Weekly schedule')=>{
  const schedule=rawWeeklySchedule(v,p);
  if(weekdayUTC(schedule.weekStart)!==1)fail(p,'week must start on Monday');
  if(schedule.days.length!==7)fail(p,'a weekly schedule needs exactly seven days');
  uniqueIds(schedule.days,`${p}.days`);
  const dates=schedule.days.map(day=>day.date);
  if(new Set(dates).size!==7)fail(p,'scheduled dates must be unique');
  for(let i=0;i<7;i++){
    const day=schedule.days[i]!,expected=new Date(Date.parse(schedule.weekStart+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
    if(day.date!==expected)fail(p,'scheduled days must be ordered Monday through Sunday');
    if(day.kind==='rest'&&day.plannedMinutes!==0)fail(p,'rest days must have zero planned minutes');
    if(day.kind!=='rest'&&day.plannedMinutes<5)fail(p,'practice and optional days need at least five minutes');
  }
  const target=schedule.days.filter(day=>day.kind==='practice').reduce((sum,day)=>sum+day.plannedMinutes,0);
  if(target!==schedule.targetMinutes)fail(p,'weekly target must equal the sum of planned practice days');
  if(schedule.source.trainingPhaseIds.length!==schedule.source.trainingPhaseNames.length)fail(p,'training phase source labels must match source IDs');
  if(new Set(schedule.source.trainingPhaseIds).size!==schedule.source.trainingPhaseIds.length)fail(p,'training phase sources must be unique');
  const calibration=schedule.source.loadCalibration;
  if(calibration){
    if(calibration.windowEnd<calibration.windowStart)fail(p,'load-calibration window is invalid');
    if(calibration.preferredWeekdays.length!==7||new Set(calibration.preferredWeekdays).size!==7)fail(p,'load calibration must rank all seven weekdays exactly once');
  }
  return schedule;
};


const timingLabHit=obj({
  index:num(0,100000,true),elapsedMs:num(0,3600000),offsetMs:num(-1000,1000),strength:num(0,1),
  bar:num(0,100000,true),beat:num(0,15,true),part:num(0,3,true),
});
const rawTimingLabResult=obj({
  ...entity,timingLabVersion:one(1),profileId:id,
  sessionId:optional(id),blockId:optional(id),sourceExerciseId:optional(id),
  bpm,meter,subdivision,timingClick,
  durationSeconds:num(1,300),threshold:num(.001,.95),inputOffsetMs:num(-250,250),matchWindowMs:num(10,500),
  expectedCount:num(1,10000,true),detectedCount:num(0,10000,true),matchedCount:num(0,10000,true),
  misses:num(0,10000,true),extras:num(0,10000,true),
  meanOffsetMs:num(-1000,1000),medianOffsetMs:num(-1000,1000),meanAbsoluteErrorMs:num(0,1000),spreadMs:num(0,1000),
  driftMsPerMinute:num(-100000,100000),confidence:one('low','medium','high'),hits:arr(timingLabHit,10000),
});
export const validateTimingLabResult:Validator<TimingLabResult>=(v,p='Timing Lab result')=>{
  const result=rawTimingLabResult(v,p);
  if(result.matchedCount!==result.hits.length)fail(p,'matched hit count must equal stored matched hits');
  if(result.matchedCount>result.expectedCount||result.matchedCount>result.detectedCount)fail(p,'matched hit count exceeds available events');
  if(result.misses!==result.expectedCount-result.matchedCount)fail(p,'miss count must equal expected minus matched hits');
  if(result.extras!==result.detectedCount-result.matchedCount)fail(p,'extra count must equal detected minus matched hits');
  for(const hit of result.hits){
    if(hit.beat>=result.meter.beats)fail(p,'matched hit beat exceeds the stored meter');
    if(hit.part>=result.subdivision)fail(p,'matched hit subdivision part exceeds the stored subdivision');
  }
  return result;
};

const midiVoice=one('kick','snare','rim','hihat-closed','hihat-open','hihat-pedal','tom-high','tom-mid','tom-low','ride','ride-bell','crash','other');
const midiMapping=obj({note:num(0,127,true),voice:midiVoice,label:text(80,1),enabled:bool});
const rawMidiDeviceProfile=obj({
  ...entity,profileId:id,deviceKey:text(300,1),inputId:optional(text(300,1)),manufacturer:text(200),name:text(200,1),
  channel:optional(num(1,16,true)),mappings:arr(midiMapping,128),
});
export const validateMidiDeviceProfile:Validator<MidiDeviceProfile>=(v,p='MIDI device profile')=>{
  const profile=rawMidiDeviceProfile(v,p);
  if(new Set(profile.mappings.map(row=>row.note)).size!==profile.mappings.length)fail(p,'MIDI note mappings must be unique');
  return profile;
};
const midiHit=obj({
  index:num(0,100000,true),elapsedMs:num(0,3600000),offsetMs:num(-1000,1000),
  note:num(0,127,true),velocity:num(1,127,true),channel:num(1,16,true),voice:midiVoice,label:text(80,1),
  bar:num(0,100000,true),beat:num(0,15,true),part:num(0,3,true),
});
const midiVoiceSummary=obj({
  voice:midiVoice,label:text(80,1),count:num(1,10000,true),medianVelocity:num(1,127),velocitySpread:num(0,127),
  meanAbsoluteErrorMs:num(0,1000),timingSpreadMs:num(0,1000),
});
const rawMidiPerformanceResult=obj({
  ...entity,midiAnalysisVersion:one(1),profileId:id,
  sessionId:optional(id),blockId:optional(id),sourceExerciseId:optional(id),deviceProfileId:optional(id),
  deviceKey:text(300,1),deviceNameSnapshot:text(200,1),manufacturerSnapshot:text(200),
  bpm,meter,subdivision,timingClick,durationSeconds:num(1,300),expectedPattern:one('subdivision','beat','two-four'),analyzedVoice:optional(midiVoice),matchWindowMs:num(10,500),
  expectedCount:num(1,10000,true),detectedCount:num(0,10000,true),matchedCount:num(0,10000,true),
  misses:num(0,10000,true),extras:num(0,10000,true),unmappedCount:num(0,10000,true),
  meanOffsetMs:num(-1000,1000),medianOffsetMs:num(-1000,1000),meanAbsoluteErrorMs:num(0,1000),spreadMs:num(0,1000),driftMsPerMinute:num(-100000,100000),
  confidence:one('low','medium','high'),
  velocityMean:num(0,127),velocityMedian:num(0,127),velocitySpread:num(0,127),velocityMin:num(0,127),velocityMax:num(0,127),velocityRange:num(0,127),
  hits:arr(midiHit,10000),voices:arr(midiVoiceSummary,128),
});
export const validateMidiPerformanceResult:Validator<MidiPerformanceResult>=(v,p='MIDI performance result')=>{
  const result=rawMidiPerformanceResult(v,p);
  if(result.matchedCount!==result.hits.length)fail(p,'matched MIDI hit count must equal stored matched hits');
  if(result.matchedCount>result.expectedCount||result.matchedCount>result.detectedCount)fail(p,'matched MIDI hit count exceeds available events');
  if(result.misses!==result.expectedCount-result.matchedCount)fail(p,'MIDI miss count must equal expected minus matched hits');
  if(result.extras!==result.detectedCount-result.matchedCount)fail(p,'MIDI extra count must equal detected minus matched hits');
  if(result.velocityMax<result.velocityMin||result.velocityRange!==result.velocityMax-result.velocityMin)fail(p,'MIDI velocity range is inconsistent');
  for(const hit of result.hits){
    if(hit.beat>=result.meter.beats)fail(p,'MIDI hit beat exceeds the stored meter');
    if(hit.part>=result.subdivision)fail(p,'MIDI hit subdivision part exceeds the stored subdivision');
  }
  if(result.voices.reduce((sum,row)=>sum+row.count,0)!==result.matchedCount)fail(p,'MIDI voice summary count must equal matched hits');
  return result;
};

const repertoireAudioCue=obj({
  id,label:text(120,1),sectionId:optional(id),startSeconds:num(0,86400),endSeconds:num(.01,86400),order:num(0,10000,true),
});
const rawRepertoireAudioTrack=obj({
  ...entity,songId:id,songPartId:optional(id),assetId:id,title:text(200,1),fileName:text(500,1),mimeType:text(200,1),
  sizeBytes:num(1,10_000_000_000,true),durationSeconds:num(.01,86400),cues:arr(repertoireAudioCue,500),lastPlaybackRate:num(.5,1.5),
});
export const validateRepertoireAudioTrack:Validator<RepertoireAudioTrack>=(v,p='Repertoire audio track')=>{
  const track=rawRepertoireAudioTrack(v,p);
  if(new Set(track.cues.map(cue=>cue.id)).size!==track.cues.length)fail(p,'audio cue IDs must be unique');
  if(new Set(track.cues.map(cue=>cue.sectionId).filter(Boolean)).size!==track.cues.filter(cue=>cue.sectionId).length)fail(p,'only one saved cue per section is allowed for a track');
  for(const cue of track.cues){
    if(cue.endSeconds<=cue.startSeconds)fail(p,'audio cue end must be after its start');
    if(cue.endSeconds>track.durationSeconds+.05)fail(p,'audio cue exceeds the track duration');
  }
  return track;
};

const rawPracticeRecording=obj({
  ...entity,recordingVersion:one(1),profileId:id,assetId:id,title:name,
  durationSeconds:num(0.01,86400),mimeType:text(200,1),sizeBytes:num(1,10_000_000_000,true),
  sessionId:optional(id),blockId:optional(id),sourceType:one('exercise','song','song-section','free'),
  sourceExerciseId:optional(id),sourceSongId:optional(id),sourceSongSectionId:optional(id),
  bpm:optional(bpm),attemptNumber:num(1,100000,true),rating:optional(one(1,2,3,4,5)),
  note:text(),tags:arr(text(80),50),markedBest:bool,milestone:bool,favorite:bool,
});
export const validatePracticeRecording:Validator<PracticeRecording>=(v,p='Practice recording')=>{
  const recording=rawPracticeRecording(v,p);
  if(recording.sourceType==='exercise'&&!recording.sourceExerciseId)fail(p,'exercise recordings need an exercise reference');
  if(recording.sourceType==='song'&&!recording.sourceSongId)fail(p,'song recordings need a song reference');
  if(recording.sourceType==='song-section'&&(!recording.sourceSongId||!recording.sourceSongSectionId))fail(p,'song-section recordings need song and section references');
  return recording;
};

export const validatePreset: Validator<Preset> = obj({ ...entity, name, config:validateMetronome });
export const validateSettings: Validator<Settings> = obj({ activeProfileId:optional(id), primaryProfileId:optional(id), id:one('preferences'), theme:one('system','light','dark'), accent:optional(one(...ACCENTS)), surfaceTheme:optional(one(...SURFACE_THEMES)), instrument:name, aim:name, onboardingDone:bool, metronome:validateMetronome, wakeLock:bool, defaultFocus:bool, pauseWhenHidden:bool, seedVersion:num(1,100,true) });
const dataSchema: Validator<Data> = obj({ schemaVersion:optional(one(2)), practiceModelVersion:optional(one(1)), profiles:optional(arr(validateProfile,100)), courseProgress:optional(arr(validateCourseProgress,1600)), exercises:arr(validateExercise), songs:arr(validateSong), routines:arr(validateRoutine), dailyPlans:arr(validatePlan), sessions:arr(validateSession), goals:arr(validateGoal), setlists:arr(validateSetlist), trainingPlans:optional(arr(validateTrainingPlan,1000)), weeklySchedules:optional(arr(validateWeeklySchedule,10000)), recordings:optional(arr(validatePracticeRecording,100000)), timingResults:optional(arr(validateTimingLabResult,100000)), midiDeviceProfiles:optional(arr(validateMidiDeviceProfile,1000)), midiResults:optional(arr(validateMidiPerformanceResult,100000)), audioTracks:optional(arr(validateRepertoireAudioTrack,10000)), practiceStates:optional(arr(validatePracticeState,100000)), priorityCycles:optional(arr(validatePriorityCycle,10000)), metronomePresets:arr(validatePreset), settings:validateSettings });
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
    for(const e of d.exercises){const p=requireProfile(e.profileId);if(!e.protocol||!e.skillArea)fail('Exercise','v2 exercises require a protocol and skill area');assertProtocolCompatible(e.protocol!,p);if(e.primarySkillId&&!isSkillForInstrument(e.primarySkillId,p.instrumentType))fail('Exercise','primary skill does not belong to its profile');for(const skill of e.secondarySkillIds??[])if(!isSkillForInstrument(skill,p.instrumentType))fail('Exercise','secondary skill does not belong to its profile');}
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
    for(const plan of d.dailyPlans){
      if(plan.generation?.kind==='set-prep'){
        for(const block of plan.blocks){
          if(!block.setPrep||block.setPrep.setlistId!==plan.generation.setlistId||block.setPrep.stage!==plan.generation.setPrepStage||block.setPrep.mode!==plan.generation.setPrepMode)fail('Daily plan','set-prep blocks must match their plan generation metadata');
        }
      }
    }
    for(const r of [...d.routines,...d.dailyPlans]){requireProfile(r.profileId);for(const b of r.blocks){
      if(b.protocol)assertProtocolCompatible(b.protocol,requireProfile(r.profileId));
      const effective=b.protocol??(b.exerciseId&&exercises.has(b.exerciseId)?exerciseProtocol(exercises.get(b.exerciseId)!):undefined);
      if(effective&&b.tempoTrainer&&effective.kind!=='tempo')fail('Block','tempo trainer is not valid for this task');
      if(effective&&!protocolPulse(effective)&&b.bpm!==undefined)fail('Block','self-paced tasks cannot carry a tempo override');
      if(b.profileId && b.profileId!==r.profileId)fail('Block','profile differs from its plan or routine');
      if(b.prescription)assertPracticeTargetReferences(b.prescription.target,r.profileId!,d,'Block prescription');
      if(b.exerciseId){const e=exercises.get(b.exerciseId);if(!e||e.profileId!==r.profileId)fail('Block','exercise must belong to this profile');}
      if(b.songId){const song=songs.get(b.songId);if(!song)fail('Block','song does not exist');const part=b.songPartId?song!.parts?.find(p=>p.id===b.songPartId):undefined;if(b.songPartId&&(!part||part.profileId!==r.profileId))fail('Block','song part must belong to this profile');if(b.songSectionId && !(part?.sections??song!.sections).some(s=>s.id===b.songSectionId))fail('Block','song section does not exist');}
    }}
    for(const s of d.sessions){requireProfile(s.profileId);for(const b of s.blocks){const p=requireProfile(b.profileId);if(!b.protocolSnapshot)fail('Session','version 2 blocks require a protocol snapshot');assertProtocolCompatible(b.protocolSnapshot!,p);if(b.prescriptionSnapshot)assertPracticeTargetReferences(b.prescriptionSnapshot.target,b.profileId!,d,'Session prescription');}}
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
    const goals=new Map(d.goals.map(goal=>[goal.id,goal])),setlists=new Map(d.setlists.map(setlist=>[setlist.id,setlist]));
    const weeklySchedules=d.weeklySchedules??[];
    if(new Set(weeklySchedules.map(schedule=>schedule.profileId+'/'+schedule.weekStart)).size!==weeklySchedules.length)fail('Weekly schedules','one schedule per profile and week is allowed');
    for(const schedule of weeklySchedules)requireProfile(schedule.profileId);
    const recordings=d.recordings??[];
    for(const recording of recordings)requireProfile(recording.profileId);
    const timingResults=d.timingResults??[];
    for(const result of timingResults)requireProfile(result.profileId);
    const midiDeviceProfiles=d.midiDeviceProfiles??[],midiResults=d.midiResults??[],audioTracks=d.audioTracks??[];
    for(const profile of midiDeviceProfiles)requireProfile(profile.profileId);
    for(const result of midiResults)requireProfile(result.profileId);
    for(const track of audioTracks){
      const song=songs.get(track.songId);if(!song){fail('Repertoire audio','song does not exist');continue;}
      const part=track.songPartId?song.parts?.find(part=>part.id===track.songPartId):undefined;
      if(track.songPartId&&!part)fail('Repertoire audio','song part does not exist');
      const sectionIds=new Set((part?.sections??song.sections).map(section=>section.id));
      for(const cue of track.cues)if(cue.sectionId&&!sectionIds.has(cue.sectionId))fail('Repertoire audio','cue section does not belong to this track arrangement');
    }
    if(new Set(midiDeviceProfiles.map(profile=>profile.profileId+'/'+profile.deviceKey)).size!==midiDeviceProfiles.length)fail('MIDI device profiles','one mapping profile per practice profile and device is allowed');
    if(new Set(recordings.map(recording=>recording.assetId)).size!==recordings.length)fail('Practice recordings','audio asset IDs must be unique');
    if(new Set(audioTracks.map(track=>track.assetId)).size!==audioTracks.length)fail('Repertoire audio','track asset IDs must be unique');
    const trainingPlans=d.trainingPlans??[],activeTrainingPlans=trainingPlans.filter(plan=>plan.status==='active');
    if(new Set(activeTrainingPlans.map(plan=>plan.profileId)).size!==activeTrainingPlans.length)fail('Training plans','only one active training plan is allowed per profile');
    for(const plan of trainingPlans){
      const profile=requireProfile(plan.profileId);
      for(const goalId of plan.goalIds){const goal=goals.get(goalId);if(!goal){fail('Training plan','linked goal does not exist');continue;}if(goal.profileId&&goal.profileId!==plan.profileId)fail('Training plan','linked goal belongs to a different profile');}
      for(const setlistId of plan.setlistIds)if(!setlists.has(setlistId))fail('Training plan','linked setlist does not exist');
      for(const phase of plan.phases)for(const focus of phase.focuses)if(!isSkillForInstrument(focus.skillId,profile.instrumentType))fail('Training plan','phase focus does not belong to this profile');
    }
    for(const s of d.songs)for(const part of s.parts??[]){const p=requireProfile(part.profileId);if(p.instrumentType!==part.instrumentType)fail('Song part','instrument identity must match its profile');}
    if(d.practiceModelVersion===1&&(!d.practiceStates||!d.priorityCycles))fail('Practice model','version 1 requires practice states and priority cycles');
    const states=d.practiceStates??[];if(new Set(states.map(s=>`${s.profileId}/${s.targetKey}`)).size!==states.length)fail('Practice states','one state per profile and target is required');for(const state of states)assertPracticeStateReferences(state,d);
    const cycles=d.priorityCycles??[];const activeCycles=cycles.filter(c=>c.status==='active');if(new Set(activeCycles.map(c=>c.profileId)).size!==activeCycles.length)fail('Priority cycles','only one active cycle is allowed per profile');for(const cycle of cycles)assertPriorityCycleReferences(cycle,d);
  }
  return d;
}
export function validateBackup(input: unknown): Backup {
  if (typeof input !== 'object' || input === null) fail('Backup','expected a JSON object');
  const head = input as Record<string, unknown>;
  if(head.format !== 'music-practice-os') fail('Backup','this is not a Steadybar backup');
  if(head.version !== 1 && head.version !== 2 && head.version !== 3 && head.version !== 4) fail('Backup','this backup uses an unsupported format version');
  if((head.version===2||head.version===3||head.version===4) && (head.data===null||typeof head.data!=='object'||!('schemaVersion' in head.data)||head.data.schemaVersion!==2))fail('Backup','profile backups require a version 2 workspace');
  if((head.version===3||head.version===4)&&(!head.data||typeof head.data!=='object'||!('courseProgress' in head.data)||!Array.isArray(head.data.courseProgress)))fail('Backup','version 3+ requires course progress, even when empty');
  if(head.version===4){const data=head.data as Record<string,unknown>|null;if(!data||data.practiceModelVersion!==1||!Array.isArray(data.practiceStates)||!Array.isArray(data.priorityCycles))fail('Backup','version 4 requires practice model state');}
  return {format:'music-practice-os',version:head.version as 1|2|3|4,exportedAt:iso(head.exportedAt,'Exported at'),data:validateData(head.data)};
}
