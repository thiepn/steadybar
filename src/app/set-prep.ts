import type { DailyPlan, Setlist } from '../domain/models.js';
import { applySetPrepPlan, buildSetPrepPlan, type SetPrepMode } from '../domain/set-prep.js';
import { activeProfile } from '../domain/profiles.js';
import { store } from './store.js';

export async function prepareSetPrepPlan(setlist:Setlist,minutes:number,mode:SetPrepMode='focused'):Promise<DailyPlan>{
  let prepared!:DailyPlan;
  await store.workspace(data=>{
    const build=buildSetPrepPlan(data,setlist,{profileId:activeProfile(data).id,minutes,mode});
    prepared=structuredClone(build.plan);
    return applySetPrepPlan(data,build);
  });
  return prepared;
}
