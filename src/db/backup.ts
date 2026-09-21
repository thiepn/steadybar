import { migratePracticeData } from './profile-migration.js';
import { migratePracticeModel } from './practice-model-migration.js';
import { rebuildPracticeStates } from '../domain/practice-state-rebuild.js';
import { validateData } from '../domain/validation.js';
import { validateBackup } from '../domain/validation.js';
import type { Backup, Data } from '../domain/models.js';
import { localDate, nowISO } from '../domain/utils.js';
import { recoverSession } from '../practice/logic.js';
import { readData, replaceData } from './database.js';
export function createBackup(data:Data,timestamp=nowISO()):Backup {
  const modern=data.schemaVersion===2&&data.practiceModelVersion===1;
  const version:Backup['version']=modern?4:data.schemaVersion===2?3:1;
  const payload=data.schemaVersion===2?{...data,courseProgress:data.courseProgress??[],...(modern?{practiceStates:data.practiceStates??[],priorityCycles:data.priorityCycles??[]}:{})}:data;
  return validateBackup({format:'music-practice-os',version,exportedAt:timestamp,data:payload});
}
export function parseBackup(text:string):Backup {
  if(text.length > 100*1024*1024) throw new Error('This backup is larger than 100 MB. No data was changed.');
  let parsed:unknown;
  try{parsed=JSON.parse(text);}catch{throw new Error('This file is not valid JSON. Choose a Steadybar .json backup.');}
  return validateBackup(parsed);
}
export async function exportBackup():Promise<void> {
  const backup=createBackup(await readData());
  downloadText(JSON.stringify(backup,null,2),`steadybar-backup-${localDate()}.json`);
}
export function downloadText(text:string,name:string,type='application/json'):void {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function restoreBackup(backup:Backup):Promise<void> {
  const validated=validateBackup(backup);
  // Never restore an old running clock, even during the interval before the page reloads.
  validated.data=migratePracticeModel(migratePracticeData(validated.data));
  validated.data.sessions=validated.data.sessions.map(s=>s.status==='active'?recoverSession(s):s);
  if(validated.data.schemaVersion===2){validated.data.practiceStates=rebuildPracticeStates(validated.data);}
  validated.data=validateData(validated.data);
  await replaceData(validated.data);
}
