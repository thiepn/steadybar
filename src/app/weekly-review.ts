import type { PriorityCycle } from '../domain/practice-state.js';
import { applyWeeklyPriorityCycle, endActivePriorityCycle, restorePriorityCycle, type WeeklyFocusSelection } from '../domain/weekly-review.js';
import { store } from './store.js';

export async function applyWeeklyFocus(profileId:string,selections:WeeklyFocusSelection[]):Promise<void>{
  await store.workspace(data=>applyWeeklyPriorityCycle(data,profileId,selections));
}
export async function restoreWeeklyFocus(profileId:string,cycleId:string):Promise<void>{
  await store.workspace(data=>restorePriorityCycle(data,profileId,cycleId));
}
export async function endWeeklyFocus(profileId:string):Promise<void>{
  await store.workspace(data=>endActivePriorityCycle(data,profileId));
}
export function activePriorityCycle(profileId:string):PriorityCycle|undefined{
  return store.snapshot().priorityCycles?.find(cycle=>cycle.profileId===profileId&&cycle.status==='active');
}
