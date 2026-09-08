import { validateBackup } from '../domain/validation.js';
import type { Backup, Data } from '../domain/models.js';
import { localDate, nowISO } from '../domain/utils.js';
import { recoverSession } from '../practice/logic.js';
import { readData, replaceData } from './database.js';
export function createBackup(data:Data,timestamp=nowISO()):Backup {return validateBackup({format:'music-practice-os',version:1,exportedAt:timestamp,data});}
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
  validated.data.sessions=validated.data.sessions.map(s=>s.status==='active'?recoverSession(s):s);
  await replaceData(validated.data);
}
