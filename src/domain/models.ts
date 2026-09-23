import type { PracticeProfile, PracticeProtocol, ProtocolOutcome, ProtocolState, SongPart, SongTransition, Experience } from './practice-types.js';
import type { PlanGeneration, PracticeEvaluation, PracticePrescription, PracticeState, PriorityCycle, SetPrepSnapshot } from './practice-state.js';
import type { CourseProgress, LessonSource } from '../learning/types.js';
import type { AccentColor, SurfaceTheme } from './appearance.js';
export type Category = 'rudiment' | 'technique' | 'groove' | 'coordination' | 'warmup' | 'timing' | 'other';
export const CATEGORIES: Category[] = ['rudiment', 'technique', 'groove', 'coordination', 'warmup', 'timing', 'other'];
export type Rating = 'failed' | 'messy' | 'acceptable' | 'clean' | 'effortless';
export const RATINGS: Rating[] = ['failed', 'messy', 'acceptable', 'clean', 'effortless'];
export type Subdivision = 1 | 2 | 3 | 4;
export type Accent = 0 | 1 | 2;
export type ClickMode = 'standard' | 'two-four' | 'sparse' | 'one-per-bar' | 'gap';
export interface TimingClickConfig {
  mode: ClickMode;
  sparseEvery: 2 | 3 | 4;
  gapClickBars: number;
  gapSilentBars: number;
}
export type ProgressionDirection = 'reduce' | 'hold' | 'advance';
export type ProgressionDimension =
  | 'baseline'
  | 'tempo'
  | 'duration'
  | 'subdivision'
  | 'click-density'
  | 'gap-click'
  | 'accent-pattern'
  | 'dynamics'
  | 'orchestration'
  | 'memory'
  | 'musical-context';
export interface ExerciseProgression {
  engineVersion: 1;
  direction: ProgressionDirection;
  dimension: ProgressionDimension;
  level: 0 | 1 | 2 | 3;
  summary: string;
  cue: string;
  bpm?: number;
  targetSeconds?: number;
  subdivision?: Subdivision;
  timingClick?: TimingClickConfig;
}
export interface Meter { beats: number; beatUnit: 4 | 8 }
export interface MetronomeConfig {
  bpm: number; meter: Meter; subdivision: Subdivision; accents: Accent[];
  countIn: 0 | 1 | 2 | 4; volume: number; timing?: TimingClickConfig;
}
export type TrainerConfig =
  | { mode: 'progressive'; start: number; step: number; seconds: number; max: number }
  | { mode: 'repetition'; start: number; step: number; rounds: number; max: number }
  | { mode: 'ladder'; bpms: number[]; seconds: number }
  | { mode: 'endurance'; bpm: number; seconds: number };
export interface Entity { id: string; createdAt: string; updatedAt: string }
export interface Exercise extends Entity {
  name: string; instrument: string; category: Category; description: string; instructions: string;
  profileId?: string; skillArea?: string; primarySkillId?: string; secondarySkillIds?: string[]; protocol?: PracticeProtocol; level?: Experience; defaultSeconds?: number;
  sticking?: string; accents?: string; defaultBpm?: number; targetBpm?: number;
  minBpm?: number; maxBpm?: number; meter?: Meter; subdivision?: Subdivision;
  tags: string[]; notes: string; builtin: boolean; archived: boolean;
}
export type SongStatus = 'learning' | 'practicing' | 'performance-ready' | 'archived';
export interface SongSection { id: string; name: string; bars?: number; bpmOverride?: number; notes: string; order: number }
export interface Song extends Entity {
  title: string; artist: string; bpm: number; meter: Meter; key: string;
  difficulty: 1 | 2 | 3 | 4 | 5; status: SongStatus; notes: string; sections: SongSection[]; transitions?: SongTransition[]; parts?: SongPart[];
}
export interface RoutineBlock {
  lessonSource?: LessonSource;
  id: string; type: 'exercise' | 'song' | 'song-section' | 'free';
  exerciseId?: string; songId?: string; songSectionId?: string; songPartId?: string; profileId?: string; protocol?: PracticeProtocol;
  title: string; targetSeconds: number; bpm?: number; notes: string;
  tempoTrainer?: TrainerConfig; prescription?: PracticePrescription; progression?: ExerciseProgression; setPrep?: SetPrepSnapshot; order: number;
}
export interface Routine extends Entity {
  profileId?: string;
  name: string; description: string; blocks: RoutineBlock[]; scheduledDays: number[];
  tags: string[]; builtin: boolean; archived: boolean;
}
export interface DailyPlan extends Entity { profileId?: string; date: string; sourceRoutineId?: string; generation?: PlanGeneration; blocks: RoutineBlock[] }
export interface TempoAttempt { id: string; bpm: number; rating: Rating; timestamp: string; durationSeconds?: number; note: string }
export interface PracticeBlock {
  lessonSource?: LessonSource;
  profileId?: string; profileNameSnapshot?: string; protocolSnapshot?: PracticeProtocol; instructionsSnapshot?: string; outcomes?: ProtocolOutcome[]; protocolState?: ProtocolState; sourceSongPartId?: string;
  id: string; type: RoutineBlock['type']; sourceExerciseId?: string; sourceSongId?: string; sourceSongSectionId?: string;
  titleSnapshot: string; categorySnapshot: string; stickingSnapshot: string;
  meterSnapshot: Meter; subdivisionSnapshot: Subdivision; timingClickSnapshot?: TimingClickConfig; progressionSnapshot?: ExerciseProgression; setPrepSnapshot?: SetPrepSnapshot;
  targetSeconds: number; actualActiveSeconds: number; initialBpm?: number; finalBpm?: number;
  tempoAttempts: TempoAttempt[]; notes: string; startedAt?: string; endedAt?: string;
  completed: boolean; skipped: boolean; tempoTrainer?: TrainerConfig; prescriptionSnapshot?: PracticePrescription; evaluation?: PracticeEvaluation;
}
export interface SessionRuntime {
  phase: 'ready' | 'countin' | 'running' | 'paused'; runStartedAt?: string;
  bpm: number; trainerCleanRounds: number; trainerStartSeconds: number;
  checkpointAt: string; metronomeOn: boolean;
}
export interface PracticeSession extends Entity {
  profileId?: string; profileNameSnapshot?: string;
  status: 'active' | 'completed' | 'abandoned'; startedAt: string; endedAt?: string;
  activeBlockIndex: number; blocks: PracticeBlock[]; sessionNotes: string; sessionRating?: 1 | 2 | 3 | 4 | 5;
  sourceRoutineId?: string; sourceDailyPlanId?: string; runtime: SessionRuntime;
}
export interface Goal extends Entity {
  profileId?: string; songPartId?: string; metric?: 'clean-count' | 'keys-practiced' | 'recall-correct' | 'pitch-sessions';
  type: 'bpm' | 'weekly-sessions' | 'weekly-minutes' | 'protocol' | 'song-mastery' | 'custom'; title: string; description: string;
  exerciseId?: string; songId?: string; targetValue: number; unit: string; deadline?: string;
  completed: boolean; completedAt?: string;
}
export type TrainingPhaseKind = 'foundation' | 'build' | 'deload' | 'integrate' | 'simulate' | 'taper' | 'consolidate' | 'custom';
export type TrainingEmphasis = 'balanced' | 'songs' | 'timing' | 'technique';
export interface TrainingPhaseFocus {
  id: string; skillId: string; weight: 1 | 2 | 3; note: string;
}
export interface TrainingPhase {
  id: string; name: string; kind: TrainingPhaseKind;
  startOn: string; endOn: string; weeklyMinutes: number; emphasis: TrainingEmphasis;
  focuses: TrainingPhaseFocus[]; notes: string;
}
export interface TrainingPlan extends Entity {
  profileId: string; name: string; status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startOn: string; endOn: string; baselineWeeklyMinutes: number;
  goalIds: string[]; setlistIds: string[]; notes: string; phases: TrainingPhase[];
}
export type WeeklyScheduleDayKind = 'practice' | 'optional' | 'rest';
export interface WeeklyScheduleDay {
  id: string; date: string; kind: WeeklyScheduleDayKind;
  plannedMinutes: number; intent: TrainingEmphasis; note: string;
}
export type PracticeLoadConfidence = 'low' | 'medium' | 'high';
export interface WeeklyScheduleLoadCalibration {
  engineVersion: 1;
  confidence: PracticeLoadConfidence;
  windowStart: string; windowEnd: string;
  observedSessions: number; observedActiveDays: number; observedActiveWeeks: number;
  typicalActiveDayMinutes: number; medianActiveWeekMinutes: number;
  baselineWeeklyMinutes: number; targetSource: 'training-plan' | 'weekly-goal' | 'profile-default';
  suggestedWeeklyMinutes: number; suggestedPracticeDays: number;
  preferredWeekdays: number[];
  loadAdjusted?: boolean; patternAdjusted?: boolean;
}
export interface WeeklyScheduleSource {
  engineVersion: 1;
  trainingPlanId?: string; trainingPlanName?: string;
  trainingPhaseIds: string[]; trainingPhaseNames: string[];
  priorityCycleId?: string; priorityCycleName?: string;
  loadCalibration?: WeeklyScheduleLoadCalibration;
}
export interface WeeklySchedule extends Entity {
  profileId: string; weekStart: string; status: 'draft' | 'applied';
  targetMinutes: number; source: WeeklyScheduleSource; days: WeeklyScheduleDay[];
}
export type PracticeRecordingSourceType = 'exercise' | 'song' | 'song-section' | 'free';
export interface PracticeRecording extends Entity {
  recordingVersion: 1;
  profileId: string; assetId: string; title: string;
  durationSeconds: number; mimeType: string; sizeBytes: number;
  sessionId?: string; blockId?: string; sourceType: PracticeRecordingSourceType;
  sourceExerciseId?: string; sourceSongId?: string; sourceSongSectionId?: string;
  bpm?: number; attemptNumber: number; rating?: 1 | 2 | 3 | 4 | 5;
  note: string; tags: string[]; markedBest: boolean; milestone: boolean; favorite: boolean;
}
export type TimingLabConfidence = 'low' | 'medium' | 'high';
export interface TimingLabMatchedHit {
  index: number;
  elapsedMs: number;
  offsetMs: number;
  strength: number;
  bar: number;
  beat: number;
  part: number;
}
export interface TimingLabResult extends Entity {
  timingLabVersion: 1;
  profileId: string;
  sessionId?: string;
  blockId?: string;
  sourceExerciseId?: string;
  bpm: number;
  meter: Meter;
  subdivision: Subdivision;
  timingClick: TimingClickConfig;
  durationSeconds: number;
  threshold: number;
  inputOffsetMs: number;
  matchWindowMs: number;
  expectedCount: number;
  detectedCount: number;
  matchedCount: number;
  misses: number;
  extras: number;
  meanOffsetMs: number;
  medianOffsetMs: number;
  meanAbsoluteErrorMs: number;
  spreadMs: number;
  driftMsPerMinute: number;
  confidence: TimingLabConfidence;
  hits: TimingLabMatchedHit[];
}
export type MidiExpectedPattern = 'subdivision' | 'beat' | 'two-four';
export type MidiDrumVoice =
  | 'kick' | 'snare' | 'rim' | 'hihat-closed' | 'hihat-open' | 'hihat-pedal'
  | 'tom-high' | 'tom-mid' | 'tom-low' | 'ride' | 'ride-bell' | 'crash' | 'other';
export interface MidiDrumMapping {
  note: number;
  voice: MidiDrumVoice;
  label: string;
  enabled: boolean;
}
export interface MidiDeviceProfile extends Entity {
  profileId: string;
  deviceKey: string;
  inputId?: string;
  manufacturer: string;
  name: string;
  channel?: number;
  mappings: MidiDrumMapping[];
}
export interface MidiPerformanceMatchedHit {
  index: number;
  elapsedMs: number;
  offsetMs: number;
  note: number;
  velocity: number;
  channel: number;
  voice: MidiDrumVoice;
  label: string;
  bar: number;
  beat: number;
  part: number;
}
export interface MidiVoiceSummary {
  voice: MidiDrumVoice;
  label: string;
  count: number;
  medianVelocity: number;
  velocitySpread: number;
  meanAbsoluteErrorMs: number;
  timingSpreadMs: number;
}
export interface MidiPerformanceResult extends Entity {
  midiAnalysisVersion: 1;
  profileId: string;
  sessionId?: string;
  blockId?: string;
  sourceExerciseId?: string;
  deviceProfileId?: string;
  deviceKey: string;
  deviceNameSnapshot: string;
  manufacturerSnapshot: string;
  bpm: number;
  meter: Meter;
  subdivision: Subdivision;
  timingClick: TimingClickConfig;
  durationSeconds: number;
  expectedPattern: MidiExpectedPattern;
  analyzedVoice?: MidiDrumVoice;
  matchWindowMs: number;
  expectedCount: number;
  detectedCount: number;
  matchedCount: number;
  misses: number;
  extras: number;
  unmappedCount: number;
  meanOffsetMs: number;
  medianOffsetMs: number;
  meanAbsoluteErrorMs: number;
  spreadMs: number;
  driftMsPerMinute: number;
  confidence: TimingLabConfidence;
  velocityMean: number;
  velocityMedian: number;
  velocitySpread: number;
  velocityMin: number;
  velocityMax: number;
  velocityRange: number;
  hits: MidiPerformanceMatchedHit[];
  voices: MidiVoiceSummary[];
}
export interface Setlist extends Entity { name: string; date?: string; songIds: string[]; notes: string }
export interface Preset extends Entity { name: string; config: MetronomeConfig }
export interface Settings {
  activeProfileId?: string; primaryProfileId?: string;
  id: 'preferences'; theme: 'system' | 'light' | 'dark'; accent?: AccentColor; surfaceTheme?: SurfaceTheme; instrument: string; aim: string;
  onboardingDone: boolean; metronome: MetronomeConfig; wakeLock: boolean; defaultFocus: boolean;
  pauseWhenHidden: boolean; seedVersion: number;
}
export interface Data {
  schemaVersion?: 2; practiceModelVersion?: 1; profiles?: PracticeProfile[]; courseProgress?: CourseProgress[];
  exercises: Exercise[]; songs: Song[]; routines: Routine[]; dailyPlans: DailyPlan[];
  sessions: PracticeSession[]; goals: Goal[]; setlists: Setlist[]; trainingPlans?: TrainingPlan[]; weeklySchedules?: WeeklySchedule[]; recordings?: PracticeRecording[]; timingResults?: TimingLabResult[]; midiDeviceProfiles?: MidiDeviceProfile[]; midiResults?: MidiPerformanceResult[]; practiceStates?: PracticeState[]; priorityCycles?: PriorityCycle[]; metronomePresets: Preset[];
  settings: Settings;
}
export interface Backup { format: 'music-practice-os'; version: 1 | 2 | 3 | 4; exportedAt: string; data: Data }
export const DEFAULT_TIMING_CLICK: TimingClickConfig = { mode: 'standard', sparseEvery: 2, gapClickBars: 3, gapSilentBars: 1 };
export const DEFAULT_METRONOME: MetronomeConfig = { bpm: 80, meter: { beats: 4, beatUnit: 4 }, subdivision: 1, accents: [2,1,1,1], countIn: 0, volume: 0.65, timing: DEFAULT_TIMING_CLICK };
export const DEFAULT_SETTINGS: Settings = { id: 'preferences', theme: 'system', accent: 'graphite', surfaceTheme: 'neutral', instrument: 'Drums', aim: 'Technique', onboardingDone: false, metronome: DEFAULT_METRONOME, wakeLock: true, defaultFocus: true, pauseWhenHidden: true, seedVersion: 1 };
