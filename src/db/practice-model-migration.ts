import type { Data, Exercise } from '../domain/models.js';
import { rebuildPracticeStates } from '../domain/practice-state-rebuild.js';
import { MASTERY_ENGINE_VERSION } from '../domain/mastery-engine.js';
import { skillIdForExercise } from '../domain/skill-graph.js';

function withSkill(exercise:Exercise,data:Data):Exercise {
  if(exercise.primarySkillId)return exercise;
  const profile=data.profiles?.find(p=>p.id===exercise.profileId);
  const primarySkillId=profile?skillIdForExercise(profile.instrumentType,exercise.skillArea,exercise.category):undefined;
  return primarySkillId?{...exercise,primarySkillId}:exercise;
}

/**
 * Upgrade a profile workspace into practice-model v1 without inventing
 * retention/mastery claims. Historical evidence is interpreted by the same
 * deterministic rebuild used for future repair/re-derivation.
 */
export function migratePracticeModel(input:Data):Data {
  const data=structuredClone(input);
  if(data.schemaVersion!==2)return data;
  const alreadyCurrent=data.practiceModelVersion===1;
  data.practiceModelVersion=1;
  data.priorityCycles??=[];
  data.exercises=data.exercises.map(exercise=>withSkill(exercise,data));
  if(alreadyCurrent&&data.practiceStates?.every(state=>state.engine.version===MASTERY_ENGINE_VERSION))return data;
  data.practiceStates=rebuildPracticeStates({...data,practiceStates:data.practiceStates??[]});
  return data;
}
