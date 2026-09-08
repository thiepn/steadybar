/** Stable persisted identities; UI labels can change without changing history. */
export type InstrumentType = 'drums' | 'guitar' | 'bass' | 'piano' | 'voice' | 'custom';
export type InstrumentFamily = 'percussion' | 'fretted' | 'bowed' | 'keyboard' | 'wind' | 'pitched' | 'voice' | 'general';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Capability = 'tempo' | 'sticking' | 'pitch' | 'chords' | 'fretboard' | 'hands' | 'voice' | 'repertoire';
export interface PracticeProfile {
  id: string; name: string; instrumentType: InstrumentType; family: InstrumentFamily;
  level: Experience; focusAreas: string[]; defaultSessionMinutes: number;
  archived: boolean; createdAt: string; updatedAt: string;
  attribution?: 'selected' | 'exercise-instrument' | 'unresolved-history';
}
export interface Pulse { bpm: number; beats: number; beatUnit: 4 | 8; subdivision: 1 | 2 | 3 | 4 }
export type Hands = 'left' | 'right' | 'together' | 'not-applicable';
export type ScaleQuality = 'major' | 'natural-minor' | 'minor-pentatonic' | 'major-pentatonic' | 'chromatic';
export type PracticeProtocol =
  | { kind: 'free'; focus: string; pulse?: Pulse }
  | { kind: 'tempo'; pulse: Pulse; technique: string; sticking?: string; orchestration?: string }
  | { kind: 'repetitions'; task: string; target: number; pulse?: Pulse }
  | { kind: 'chord-changes'; chords: string[]; target: number; technique: string; pulse?: Pulse }
  | { kind: 'groove'; pulse: Pulse; key: string; style: string; focus: 'time' | 'muting' | 'articulation' | 'coordination'; progression: string }
  | { kind: 'scale-cycle'; keys: number[]; quality: ScaleQuality; octaves: 1 | 2 | 3 | 4; hands: Hands; motion: 'parallel' | 'contrary'; fingering: string; position: string; pulse?: Pulse }
  | { kind: 'fretboard'; tuning: number[]; strings: number[]; minFret: number; maxFret: number; target: number }
  | { kind: 'vocal-pattern'; startMidi: number; lowMidi: number; highMidi: number; offsets: number[]; syllable: string; transpose: -2 | -1 | 1 | 2; noteSeconds: number; restSeconds: number }
  | { kind: 'pitch-match'; rootMidi: number; interval: number; target: number }
  | { kind: 'sight-reading'; material: string; key: string; hands: Hands; firstRead: boolean; pulse?: Pulse }
  | { kind: 'repertoire'; focus: string; measures: string; hands: Hands; pulse?: Pulse };
export type ProtocolKind = PracticeProtocol['kind'];
interface OutcomeBase { id: string; timestamp: string; note: string }
/** Explicit measurements, with self-report distinguished from scored recall. */
export type ProtocolOutcome = OutcomeBase & (
  | { kind: 'count'; protocol: 'repetitions' | 'chord-changes'; clean: number; total: number; durationSeconds: number; source: 'self-report' }
  | { kind: 'groove'; timing: number; control: number; articulation: number; durationSeconds: number; source: 'self-report' }
  | { kind: 'scale'; key: number; hands: Hands; quality: ScaleQuality; mistakes: number; bpm?: number; source: 'self-report' }
  | { kind: 'recall'; string: number; fret: number; expected: number; answer: number; correct: boolean; source: 'scored-input' }
  | { kind: 'voice'; rootMidi: number; pitch: number; ease: number; breath: number; fatigue: number; source: 'self-report' }
  | { kind: 'pitch'; rootMidi: number; interval: number; matched: boolean; source: 'self-report' }
  | { kind: 'reading'; firstRead: boolean; errors: number; continuity: number; source: 'self-report' }
  | { kind: 'reflection'; rating: number; source: 'self-report' }
);
export interface ProtocolState { step: number; clean: number; total: number; rootMidi?: number; lastReferenceAt?: string }
export interface SongPart {
  id: string; profileId: string; name: string; instrumentType: InstrumentType;
  notes: string; key: string; status: 'learning' | 'practicing' | 'performance-ready';
  tuning: string; capo?: number; role: string; range: string;
  sections: { id: string; name: string; bars?: number; bpmOverride?: number; notes: string; order: number }[];
}
