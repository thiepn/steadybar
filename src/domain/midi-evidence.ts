import type { MidiExpectedPattern } from './models.js';

export interface MidiEvidenceSourceInput {
  expectedPattern:MidiExpectedPattern;
  activeSessionId?:string;
  activeBlockId?:string;
  activeSourceExerciseId?:string;
  gridExerciseId?:string;
  phraseExerciseId?:string;
}
export interface MidiEvidenceSource {
  sessionId?:string;
  blockId?:string;
  sourceExerciseId?:string;
}

/** An explicitly selected saved authored score owns the evidence source.
 * Active-session context is retained only for generic tests or when the active block supplied the score.
 */
export function resolveMidiEvidenceSource(input:MidiEvidenceSourceInput):MidiEvidenceSource {
  const explicit=input.expectedPattern==='drum-grid'?input.gridExerciseId:input.expectedPattern==='drum-phrase'?input.phraseExerciseId:undefined;
  if(explicit)return {sourceExerciseId:explicit};
  return {sessionId:input.activeSessionId,blockId:input.activeBlockId,sourceExerciseId:input.activeSourceExerciseId};
}
