import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMidiEvidenceSource } from '../dist/app/domain/midi-evidence.js';

const active={
  activeSessionId:'session-active',
  activeBlockId:'block-active',
  activeSourceExerciseId:'exercise-active',
};

test('explicit saved Drum Grid score owns MIDI evidence source over unrelated active practice',()=>{
  assert.deepEqual(resolveMidiEvidenceSource({...active,expectedPattern:'drum-grid',gridExerciseId:'grid-saved'}),{sourceExerciseId:'grid-saved'});
});

test('explicit saved Drum Phrase score owns MIDI evidence source over unrelated active practice',()=>{
  assert.deepEqual(resolveMidiEvidenceSource({...active,expectedPattern:'drum-phrase',phraseExerciseId:'phrase-saved'}),{sourceExerciseId:'phrase-saved'});
});

test('current active authored score retains active session and block attribution',()=>{
  assert.deepEqual(resolveMidiEvidenceSource({...active,expectedPattern:'drum-grid'}),{sessionId:'session-active',blockId:'block-active',sourceExerciseId:'exercise-active'});
  assert.deepEqual(resolveMidiEvidenceSource({...active,expectedPattern:'drum-phrase'}),{sessionId:'session-active',blockId:'block-active',sourceExerciseId:'exercise-active'});
});

test('generic MIDI tests retain active practice context and tolerate no active practice',()=>{
  assert.deepEqual(resolveMidiEvidenceSource({...active,expectedPattern:'subdivision'}),{sessionId:'session-active',blockId:'block-active',sourceExerciseId:'exercise-active'});
  assert.deepEqual(resolveMidiEvidenceSource({expectedPattern:'beat'}),{sessionId:undefined,blockId:undefined,sourceExerciseId:undefined});
});
