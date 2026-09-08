export type Category = 'rudiment' | 'technique' | 'groove' | 'coordination' | 'warmup' | 'timing' | 'other';
export const CATEGORIES: Category[] = ['rudiment', 'technique', 'groove', 'coordination', 'warmup', 'timing', 'other'];
export type Rating = 'failed' | 'messy' | 'acceptable' | 'clean' | 'effortless';
export const RATINGS: Rating[] = ['failed', 'messy', 'acceptable', 'clean', 'effortless'];
export type Subdivision = 1 | 2 | 3 | 4;
export type Accent = 0 | 1 | 2;
export interface Meter { beats: number; beatUnit: 4 | 8 }
export interface MetronomeConfig {
  bpm: number; meter: Meter; subdivision: Subdivision; accents: Accent[];
  countIn: 0 | 1 | 2 | 4; volume: number;
}
export type TrainerConfig =
  | { mode: 'progressive'; start: number; step: number; seconds: number; max: number }
  | { mode: 'repetition'; start: number; step: number; rounds: number; max: number }
  | { mode: 'ladder'; bpms: number[]; seconds: number }
  | { mode: 'endurance'; bpm: number; seconds: number };
export interface Entity { id: string; createdAt: string; updatedAt: string }
export interface Exercise extends Entity {
  name: string; instrument: string; category: Category; description: string; instructions: string;
  sticking: string; accents: string; defaultBpm: number; targetBpm?: number;
  minBpm: number; maxBpm: number; meter: Meter; subdivision: Subdivision;
  tags: string[]; notes: string; builtin: boolean; archived: boolean;
}
export type SongStatus = 'learning' | 'practicing' | 'performance-ready' | 'archived';
export interface SongSection { id: string; name: string; bars?: number; bpmOverride?: number; notes: string; order: number }
export interface Song extends Entity {
  title: string; artist: string; bpm: number; meter: Meter; key: string;
  difficulty: 1 | 2 | 3 | 4 | 5; status: SongStatus; notes: string; sections: SongSection[];
}
export interface RoutineBlock {
  id: string; type: 'exercise' | 'song' | 'song-section' | 'free';
  exerciseId?: string; songId?: string; songSectionId?: string;
  title: string; targetSeconds: number; bpm: number; notes: string;
  tempoTrainer?: TrainerConfig; order: number;
}
export interface Routine extends Entity {
  name: string; description: string; blocks: RoutineBlock[]; scheduledDays: number[];
  tags: string[]; builtin: boolean; archived: boolean;
}
export interface DailyPlan extends Entity { date: string; sourceRoutineId?: string; blocks: RoutineBlock[] }
export interface TempoAttempt { id: string; bpm: number; rating: Rating; timestamp: string; durationSeconds?: number; note: string }
export interface PracticeBlock {
  id: string; type: RoutineBlock['type']; sourceExerciseId?: string; sourceSongId?: string; sourceSongSectionId?: string;
  titleSnapshot: string; categorySnapshot: string; stickingSnapshot: string;
  meterSnapshot: Meter; subdivisionSnapshot: Subdivision;
  targetSeconds: number; actualActiveSeconds: number; initialBpm: number; finalBpm: number;
  tempoAttempts: TempoAttempt[]; notes: string; startedAt?: string; endedAt?: string;
  completed: boolean; skipped: boolean; tempoTrainer?: TrainerConfig;
}
export interface SessionRuntime {
  phase: 'ready' | 'countin' | 'running' | 'paused'; runStartedAt?: string;
  bpm: number; trainerCleanRounds: number; trainerStartSeconds: number;
  checkpointAt: string; metronomeOn: boolean;
}
export interface PracticeSession extends Entity {
  status: 'active' | 'completed' | 'abandoned'; startedAt: string; endedAt?: string;
  activeBlockIndex: number; blocks: PracticeBlock[]; sessionNotes: string; sessionRating?: 1 | 2 | 3 | 4 | 5;
  sourceRoutineId?: string; sourceDailyPlanId?: string; runtime: SessionRuntime;
}
export interface Goal extends Entity {
  type: 'bpm' | 'weekly-sessions' | 'song-mastery' | 'custom'; title: string; description: string;
  exerciseId?: string; songId?: string; targetValue: number; unit: string; deadline?: string;
  completed: boolean; completedAt?: string;
}
export interface Setlist extends Entity { name: string; date?: string; songIds: string[]; notes: string }
export interface Preset extends Entity { name: string; config: MetronomeConfig }
export interface Settings {
  id: 'preferences'; theme: 'system' | 'light' | 'dark'; accent?: 'graphite' | 'blue' | 'forest' | 'plum' | 'amber' | 'rose'; instrument: string; aim: string;
  onboardingDone: boolean; metronome: MetronomeConfig; wakeLock: boolean; defaultFocus: boolean;
  pauseWhenHidden: boolean; seedVersion: number;
}
export interface Data {
  exercises: Exercise[]; songs: Song[]; routines: Routine[]; dailyPlans: DailyPlan[];
  sessions: PracticeSession[]; goals: Goal[]; setlists: Setlist[]; metronomePresets: Preset[];
  settings: Settings;
}
export interface Backup { format: 'music-practice-os'; version: 1; exportedAt: string; data: Data }
export const DEFAULT_METRONOME: MetronomeConfig = { bpm: 80, meter: { beats: 4, beatUnit: 4 }, subdivision: 1, accents: [2,1,1,1], countIn: 0, volume: 0.65 };
export const DEFAULT_SETTINGS: Settings = { id: 'preferences', theme: 'system', accent: 'graphite', instrument: 'Drums', aim: 'Technique', onboardingDone: false, metronome: DEFAULT_METRONOME, wakeLock: true, defaultFocus: true, pauseWhenHidden: true, seedVersion: 1 };
