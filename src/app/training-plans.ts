import type { TrainingEmphasis, TrainingPhaseKind, TrainingPlan } from '../domain/models.js';
import { activateTrainingPlan, buildTrainingPlan, regenerateTrainingPlan, setTrainingPlanStatus, updateTrainingPhase, type BuildTrainingPlanOptions } from '../domain/training-plan.js';
import { store } from './store.js';

export async function createTrainingPlan(options:BuildTrainingPlanOptions):Promise<TrainingPlan>{
  let created!:TrainingPlan;
  await store.workspace(data=>{created=buildTrainingPlan(data,options);return {...data,trainingPlans:[...(data.trainingPlans??[]),created]};});
  return structuredClone(created);
}
export async function rebuildTrainingPlan(planId:string,options:BuildTrainingPlanOptions):Promise<void>{
  await store.workspace(data=>regenerateTrainingPlan(data,planId,options));
}
export async function activatePlan(planId:string):Promise<void>{await store.workspace(data=>activateTrainingPlan(data,planId));}
export async function pausePlan(planId:string):Promise<void>{await store.workspace(data=>setTrainingPlanStatus(data,planId,'paused'));}
export async function completePlan(planId:string):Promise<void>{await store.workspace(data=>setTrainingPlanStatus(data,planId,'completed'));}
export async function archivePlan(planId:string):Promise<void>{await store.workspace(data=>setTrainingPlanStatus(data,planId,'archived'));}
export async function editTrainingPhase(planId:string,phaseId:string,change:{name:string;kind:TrainingPhaseKind;weeklyMinutes:number;emphasis:TrainingEmphasis;focuses:{skillId:string;weight:1|2|3;note:string}[];notes:string}):Promise<void>{
  await store.workspace(data=>updateTrainingPhase(data,planId,phaseId,change));
}
