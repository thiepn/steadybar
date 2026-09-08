import type { Data, DailyPlan, Exercise, Goal, PracticeSession, Preset, Routine, Setlist, Settings, Song } from '../domain/models.js';
import { DEFAULT_SETTINGS } from '../domain/models.js';
import { validateData, validateExercise, validateGoal, validatePlan, validatePreset, validateRoutine, validateSession, validateSetlist, validateSettings, validateSong, type Validator } from '../domain/validation.js';
import { seedData } from './seed.js';

// Keep the original storage identifier so existing practice data survives the Steadybar rename.
export const DB_NAME = 'music-practice-os';
export const DB_VERSION = 2;
export const STORES = ['exercises','songs','routines','dailyPlans','sessions','goals','setlists','metronomePresets','settings'] as const;
export type StoreName = typeof STORES[number];
export interface StoreTypes { exercises:Exercise; songs:Song; routines:Routine; dailyPlans:DailyPlan; sessions:PracticeSession; goals:Goal; setlists:Setlist; metronomePresets:Preset; settings:Settings }
const validators: { [K in StoreName]: Validator<StoreTypes[K]> } = {exercises:validateExercise,songs:validateSong,routines:validateRoutine,dailyPlans:validatePlan,sessions:validateSession,goals:validateGoal,setlists:validateSetlist,metronomePresets:validatePreset,settings:validateSettings};

/** v1 → v2: introduce visibility policy without altering any practice records. */
export function migrateSettingsV1(input: Partial<Settings>): Settings {
  return validateSettings({...DEFAULT_SETTINGS,...input,pauseWhenHidden:input.pauseWhenHidden ?? true});
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve,reject) => {req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
function complete(tx:IDBTransaction): Promise<void> {
  return new Promise((resolve,reject) => {
    tx.oncomplete=()=>resolve();
    tx.onabort=()=>reject(tx.error || new Error('The storage transaction was aborted. Nothing in that transaction was saved.'));
  });
}
/** Ask for strong durability, while supporting browsers predating the options argument. */
export function writeTransaction(db:IDBDatabase,names:string|string[]):IDBTransaction {
  try{return db.transaction(names,'readwrite',{durability:'strict'});}
  catch(error){
    if(error instanceof TypeError)return db.transaction(names,'readwrite');
    throw error;
  }
}
async function write<T>(names:string|string[],action:(tx:IDBTransaction)=>T|Promise<T>):Promise<T> {
  const db=await openDatabase(),tx=writeTransaction(db,names),done=complete(tx);
  // A request can fail before an awaited operation returns; observe aborts immediately.
  void done.catch(()=>{});
  try{const result=await action(tx);await done;return result;}
  catch(error){try{tx.abort();}catch{/* Already committed or aborted. */}await done.catch(()=>{});throw error;}
}
let connection: IDBDatabase | undefined;
let pending: Promise<IDBDatabase> | undefined;
export async function openDatabase(name = DB_NAME): Promise<IDBDatabase> {
  if(name === DB_NAME && connection)return connection;
  if(name === DB_NAME && pending)return pending;
  const promise = new Promise<IDBDatabase>((resolve,reject) => {
    if(!globalThis.indexedDB){reject(new Error('IndexedDB is unavailable. Allow website storage in this browser to save practice data.'));return;}
    const req=indexedDB.open(name,DB_VERSION);
    let blocked=false,upgradeError:unknown;
    req.onupgradeneeded=event=>{
      try{
        const db=req.result;
        if(event.oldVersion<1){
          for(const storeName of STORES){
            const table=db.createObjectStore(storeName,{keyPath:'id'});
            if(storeName==='sessions'){table.createIndex('status','status');table.createIndex('startedAt','startedAt');}
            if(storeName==='dailyPlans')table.createIndex('date','date',{unique:true});
          }
        }
        if(event.oldVersion>0 && event.oldVersion<2){
          const settings=req.transaction!.objectStore('settings'),get=settings.get('preferences');
          get.onsuccess=()=>{
            try{if(get.result)settings.put(migrateSettingsV1(get.result as Partial<Settings>));}
            catch(error){upgradeError=error;req.transaction?.abort();}
          };
        }
      }catch(error){upgradeError=error;req.transaction?.abort();}
    };
    req.onblocked=()=>{blocked=true;reject(new Error('Close other tabs of Steadybar, then reload to finish the database upgrade.'));};
    req.onerror=()=>reject(upgradeError || new Error(`Practice storage could not open: ${req.error?.message || 'check browser storage permissions'}`));
    req.onsuccess=()=>{
      const db=req.result;
      // An open request cannot be cancelled after reporting a blocked upgrade.
      // Do not retain a late connection from a request the caller already rejected.
      if(blocked){db.close();return;}
      db.onversionchange=()=>{db.close();if(connection===db){connection=undefined;pending=undefined;}};
      if(name===DB_NAME)connection=db;
      resolve(db);
    };
  });
  if(name===DB_NAME){pending=promise;void promise.catch(()=>{if(pending===promise)pending=undefined;});}
  return promise;
}
async function readTable<T>(name:StoreName,read:(table:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await openDatabase(),tx=db.transaction(name,'readonly'),done=complete(tx);
  void done.catch(()=>{});
  try{const result=await request(read(tx.objectStore(name)));await done;return result;}
  catch(error){await done.catch(()=>{});throw error;}
}
export async function all<K extends StoreName>(name:K):Promise<StoreTypes[K][]> {
  return await readTable(name,table=>table.getAll()) as StoreTypes[K][];
}
export async function get<K extends StoreName>(name:K,id:string):Promise<StoreTypes[K]|undefined> {
  return await readTable(name,table=>table.get(id)) as StoreTypes[K]|undefined;
}
export async function put<K extends StoreName>(name:K,value:StoreTypes[K]):Promise<void> {
  const validated=validators[name](value);
  await write(name,tx=>{tx.objectStore(name).put(validated);});
}
export async function remove(name:StoreName,id:string):Promise<void> {
  await write(name,tx=>{tx.objectStore(name).delete(id);});
}
export async function updateSession(id:string,fn:(session:PracticeSession)=>PracticeSession):Promise<PracticeSession> {
  return await write('sessions',async tx=>{
    const current=await request(tx.objectStore('sessions').get(id)) as PracticeSession|undefined;
    if(!current)throw new Error('This practice session no longer exists.');
    const next=validateSession(fn(structuredClone(current)));
    if(next.id!==current.id)throw new Error('A session update cannot change its identity.');
    // Ensure commands in the same millisecond still have an ordered revision timestamp.
    next.updatedAt=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString();
    tx.objectStore('sessions').put(next);return next;
  });
}
export async function insertActiveSession(session:PracticeSession):Promise<void> {
  const validated=validateSession(session);
  if(validated.status!=='active')throw new Error('A new practice session must be active.');
  await write('sessions',async tx=>{
    const active=await request(tx.objectStore('sessions').index('status').count('active'));
    if(active>0)throw new Error('There is already an unfinished session. Resume or end it before starting another.');
    tx.objectStore('sessions').add(validated);
  });
}
export async function replaceData(input:Data):Promise<void> {
  // Validate ALL tables and IDs before clearing even one record.
  const data=validateData(input);
  await write([...STORES],tx=>{
    for(const name of STORES){
      const table=tx.objectStore(name);table.clear();
      for(const row of name==='settings'?[data.settings]:data[name])table.put(row);
    }
  });
}
export async function readData():Promise<Data> {
  const db=await openDatabase(),tx=db.transaction([...STORES],'readonly'),done=complete(tx);
  void done.catch(()=>{});
  try{
    // One snapshot transaction prevents cross-store inconsistencies during export.
    const rows=await Promise.all(STORES.map(name=>request(tx.objectStore(name).getAll())));
    await done;
    const source=Object.fromEntries(STORES.map((name,i)=>[name,name==='settings'?rows[i]?.[0]:rows[i]]));
    if(!source.settings)throw new Error('Application settings are missing. Reload, or restore a known-good backup.');
    return source as unknown as Data;
  }catch(error){await done.catch(()=>{});throw error;}
}
export async function initializeDatabase():Promise<void> {
  await write([...STORES],async tx=>{
    const prefs=await request(tx.objectStore('settings').get('preferences'));
    if(!prefs){
      const seed=validateData(seedData());
      for(const name of STORES)for(const row of name==='settings'?[seed.settings]:seed[name])tx.objectStore(name).put(row);
    }
  });
}
