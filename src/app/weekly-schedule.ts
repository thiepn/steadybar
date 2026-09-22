import type { TrainingEmphasis, WeeklySchedule, WeeklyScheduleDayKind } from '../domain/models.js';
import { activeProfile } from '../domain/profiles.js';
import { applyWeeklySchedule, buildWeeklySchedule, regenerateWeeklySchedule, saveGeneratedWeeklySchedule, updateWeeklyScheduleDay, type BuildWeeklyScheduleOptions } from '../domain/weekly-schedule.js';
import { store } from './store.js';

export async function createWeeklySchedule(options:BuildWeeklyScheduleOptions={}):Promise<WeeklySchedule>{
  let created!:WeeklySchedule;
  await store.workspace(data=>{
    created=buildWeeklySchedule(data,{...options,profileId:options.profileId??activeProfile(data).id});
    return saveGeneratedWeeklySchedule(data,created);
  });
  return structuredClone(created);
}
export async function regenerateSchedule(scheduleId:string,options:BuildWeeklyScheduleOptions={}):Promise<void>{
  await store.workspace(data=>regenerateWeeklySchedule(data,scheduleId,options));
}
export async function applySchedule(scheduleId:string):Promise<void>{
  await store.workspace(data=>applyWeeklySchedule(data,scheduleId));
}
export async function editScheduleDay(scheduleId:string,dayId:string,change:{kind:WeeklyScheduleDayKind;plannedMinutes:number;intent:TrainingEmphasis;note:string}):Promise<void>{
  await store.workspace(data=>updateWeeklyScheduleDay(data,scheduleId,dayId,change));
}
