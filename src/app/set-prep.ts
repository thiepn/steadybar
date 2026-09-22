import type { DailyPlan, Setlist } from '../domain/models.js';
import { applySetPrepPlan, buildSetPrepPlan } from '../domain/set-prep.js';
import type { SetPrepMode } from '../domain/practice-state.js';
import { activeProfile } from '../domain/profiles.js';
import { store } from './store.js';

export async function prepareSetPrepPlan(setlist:Setlist,minutes:number,mode:SetPrepMode='focused'):Promise<DailyPlan>{
  let prepared!:DailyPlan;
  await store.workspace(data=>{
    const current=data.setlists.find(row=>row.id===setlist.id);
    if(!current)throw new Error('This setlist no longer exists.');
    const build=buildSetPrepPlan(data,current,{profileId:activeProfile(data).id,minutes,mode});
    prepared=structuredClone(build.plan);
    return applySetPrepPlan(data,build);
  });
  return prepared;
}
