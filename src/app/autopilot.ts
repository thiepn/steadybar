import type { DailyPlan } from '../domain/models.js';
import { applyAutopilotPlan, buildAutopilotPlan, type AutopilotSessionIntent } from '../domain/autopilot.js';
import { activeProfile } from '../domain/profiles.js';
import { store } from './store.js';

export async function prepareAutopilotPlan(minutes:number,intent:AutopilotSessionIntent='balanced'):Promise<DailyPlan>{
  let prepared!:DailyPlan;
  await store.workspace(data=>{
    const build=buildAutopilotPlan(data,{profileId:activeProfile(data).id,minutes,intent});
    prepared=structuredClone(build.plan);
    return applyAutopilotPlan(data,build);
  });
  return prepared;
}
