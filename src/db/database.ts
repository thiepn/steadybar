import { assertProtocolCompatible } from '../domain/practice-validation.js';
import { isPracticeProfile } from '../domain/profiles.js';
import type { PracticeProfile } from '../domain/practice-types.js';
import { migratePracticeData, normalizeProfileSelection } from './profile-migration.js';
import type { Data, DailyPlan, Exercise, Goal, PracticeSession, Preset, Routine, Setlist, Settings, Song } from '../domain/models.js';
import { DEFAULT_SETTINGS } from '../domain/models.js';
import { validateProfile, validateData, validateExercise, validateGoal, validatePlan, validatePreset, validateRoutine, validateSession, validateSetlist, validateSettings, validateSong, type Validator } from '../domain/validation.js';
import { seedData } from './seed.js';

// Keep the original storage identifier so existing practice data survives the Steadybar rename.
export const DB_NAME = 'music-practice-os';
export const DB_VERSION = 3;
export const STORES = ['profiles','exercises','songs','routines','dailyPlans','sessions','goals','setlists','metronomePresets','settings'] as const;
export type StoreName = typeof STORES[number];
export interface StoreTypes { profiles:PracticeProfile; exercises:Exercise; songs:Song; routines:Routine; dailyPlans:DailyPlan; sessions:PracticeSession; goals:Goal; setlists:Setlist; metronomePresets:Preset; settings:Settings }
const validators: { [K in StoreName]: Validator<StoreTypes[K]> } = {profiles:validateProfile,exercises:validateExercise,songs:validateSong,routines:validateRoutine,dailyPlans:validatePlan,sessions:validateSession,goals:validateGoal,setlists:validateSetlist,metronomePresets:validatePreset,settings:validateSettings};

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
            if(storeName==='dailyPlans')table.createIndex('profileDate',['profileId','date'],{unique:true});
          }
        }
        if(event.oldVersion<3){
          if(!db.objectStoreNames.contains('profiles'))db.createObjectStore('profiles',{keyPath:'id'});
          if(!db.objectStoreNames.contains('migrationBackups'))db.createObjectStore('migrationBackups',{keyPath:'id'});
          const plans=req.transaction!.objectStore('dailyPlans');
          if(plans.indexNames.contains('date'))plans.deleteIndex('date');
          if(!plans.indexNames.contains('profileDate'))plans.createIndex('profileDate',['profileId','date'],{unique:true});
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
const REFERENCE_STORES=STORES.filter(name=>name!=='sessions');
async function referenceSnapshot(tx:IDBTransaction):Promise<Data>{
  const rows=await Promise.all(REFERENCE_STORES.map(name=>request(tx.objectStore(name).getAll())));
  const data=Object.fromEntries(REFERENCE_STORES.map((name,i)=>[name,name==='settings'?rows[i]?.[0]:rows[i]])) as unknown as Data;
  data.sessions=[];if(data.profiles?.length)data.schemaVersion=2;return data;
}
export async function put<K extends StoreName>(name:K,value:StoreTypes[K]):Promise<void> {
  const validated=validators[name](value);
  await write([...new Set([...REFERENCE_STORES,name])],async tx=>{
    const data=await referenceSnapshot(tx);
    if(name==='settings')data.settings=validateSettings(validated);
    else if(name==='sessions')data.sessions=[validateSession(validated)];
    else {
      const rows=data[name as Exclude<StoreName,'settings'|'sessions'>]??[];
      // A discriminated store-name selects the already runtime-validated row.
      Object.assign(data,{[name]:[...rows.filter(row=>row.id!==validated.id),validated]});
    }
    if(data.schemaVersion===2)validateData(data);
    tx.objectStore(name).put(validated);
  });
}
export async function patchSettings(change:Partial<Settings>):Promise<void>{
  await write(['settings','profiles'],async tx=>{
    const current=await request(tx.objectStore('settings').get('preferences')) as Settings|undefined;
    if(!current)throw new Error('The workspace is not ready yet.');
    const next=validateSettings({...current,...change}),profiles=await request(tx.objectStore('profiles').getAll()) as PracticeProfile[];
    if(profiles.length&&(!profiles.some(p=>p.id===next.activeProfileId&&isPracticeProfile(p))||!profiles.some(p=>p.id===next.primaryProfileId&&isPracticeProfile(p))))throw new Error('Choose an available practice profile.');
    // Profile identity is changed through the guarded workspace command only.
    if(next.activeProfileId!==current.activeProfileId||next.primaryProfileId!==current.primaryProfileId)throw new Error('Use profile management to change the active or primary profile.');
    tx.objectStore('settings').put(next);
  });
}
export async function remove(name:StoreName,id:string):Promise<void> {
  if(name==='profiles')throw new Error('Archive a profile instead of deleting its history.');
  if(name==='settings')throw new Error('Use the explicit workspace reset action.');
  if(name==='sessions'){await write('sessions',tx=>{tx.objectStore(name).delete(id);});return;}
  await write([...REFERENCE_STORES],async tx=>{
    const data=await referenceSnapshot(tx);
    Object.assign(data,{[name]:(data[name]??[]).filter(row=>row.id!==id)});
    if(data.schemaVersion===2)validateData(data);
    tx.objectStore(name).delete(id);
  });
}
export async function updateSession(id:string,fn:(session:PracticeSession)=>PracticeSession):Promise<PracticeSession> {
  return await write('sessions',async tx=>{
    const current=await request(tx.objectStore('sessions').get(id)) as PracticeSession|undefined;
    if(!current)throw new Error('This practice session no longer exists.');
    const next=validateSession(fn(structuredClone(current)));
    if(next.id!==current.id||next.profileId!==current.profileId)throw new Error('A session update cannot change its identity.');
    for(const old of current.blocks){const block=next.blocks.find(b=>b.id===old.id);if(block&&block.profileId!==old.profileId)throw new Error('A practice block cannot change its profile.');}
    // Ensure commands in the same millisecond still have an ordered revision timestamp.
    next.updatedAt=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString();
    tx.objectStore('sessions').put(next);return next;
  });
}
export async function insertActiveSession(session:PracticeSession):Promise<void> {
  const validated=validateSession(session);
  if(validated.status!=='active')throw new Error('A new practice session must be active.');
  await write(['sessions','profiles'],async tx=>{
    const profiles=await request(tx.objectStore('profiles').getAll()) as PracticeProfile[];
    if(profiles.length){if(!profiles.some(p=>p.id===validated.profileId&&isPracticeProfile(p)))throw new Error('An active session needs an available practice profile.');for(const b of validated.blocks){const profile=profiles.find(p=>p.id===b.profileId&&isPracticeProfile(p));if(!profile||!b.protocolSnapshot)throw new Error('A practice block needs a profile and protocol snapshot.');assertProtocolCompatible(b.protocolSnapshot,profile);}}
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
      for(const row of name==='settings'?[data.settings]:(data[name]??[]))table.put(row);
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
    if((source.profiles as unknown[])?.length)source.schemaVersion=2;
    return source as unknown as Data;
  }catch(error){await done.catch(()=>{});throw error;}
}
/** Full-workspace commands serialize against current committed rows, not an old UI copy. */
export async function mutateWorkspace(fn:(data:Data)=>Data):Promise<Data>{
  return write([...STORES],async tx=>{
    const rows=await Promise.all(STORES.map(name=>request(tx.objectStore(name).getAll())));
    const current=Object.fromEntries(STORES.map((name,i)=>[name,name==='settings'?rows[i]?.[0]:rows[i]])) as unknown as Data;
    current.schemaVersion=2;
    const next=validateData(fn(structuredClone(current)));
    for(const name of STORES){
      const table=tx.objectStore(name),previous=name==='settings'?[current.settings]:(current[name]??[]),after=name==='settings'?[next.settings]:(next[name]??[]);
      const old=new Map(previous.map(row=>[row.id,row])),ids=new Set(after.map(row=>row.id));
      for(const row of previous)if(!ids.has(row.id))table.delete(row.id);
      for(const row of after)if(JSON.stringify(old.get(row.id))!==JSON.stringify(row))table.put(row);
    }
    return next;
  });
}
export async function migrationBackup():Promise<Data|undefined>{
  const db=await openDatabase(),tx=db.transaction('migrationBackups','readonly'),done=complete(tx);
  const result=await request(tx.objectStore('migrationBackups').get('before-practice-profiles-v2')) as {data:Data}|undefined;
  await done;return result?.data;
}
export async function initializeDatabase():Promise<void> {
  await write([...STORES,'migrationBackups'],async tx=>{
    const rows=await Promise.all(STORES.map(name=>request(tx.objectStore(name).getAll())));
    const prefs=rows[STORES.indexOf('settings')]?.[0] as Settings|undefined,profileRows=rows[STORES.indexOf('profiles')] as PracticeProfile[]|undefined;
    if(prefs && profileRows?.length){
      const current=Object.fromEntries(STORES.map((name,i)=>[name,name==='settings'?prefs:rows[i]])) as unknown as Data;current.schemaVersion=2;
      const repaired=validateData(normalizeProfileSelection(current));
      if(JSON.stringify(repaired.settings)!==JSON.stringify(prefs))tx.objectStore('settings').put(repaired.settings);
      const previousProfiles=new Map(profileRows.map(profile=>[profile.id,profile]));
      for(const profile of repaired.profiles??[])if(JSON.stringify(previousProfiles.get(profile.id))!==JSON.stringify(profile))tx.objectStore('profiles').put(profile);
      return;
    }
    const previous=prefs ? Object.fromEntries(STORES.filter(n=>n!=='profiles').map(name=>[name,name==='settings'?prefs:rows[STORES.indexOf(name)]])) as unknown as Data : seedData();
    const seed=validateData(migratePracticeData(validateData(previous)));
    if(prefs)tx.objectStore('migrationBackups').put({id:'before-practice-profiles-v2',data:previous});
    for(const name of STORES){const table=tx.objectStore(name);table.clear();for(const row of name==='settings'?[seed.settings]:(seed[name]??[]))table.put(row);}
  });
}

/** Explicit destructive reset only; the UI exports a safety backup first. */
export async function resetWorkspace():Promise<void>{
  const next=validateData(migratePracticeData(seedData()));
  await write([...STORES,'migrationBackups'],tx=>{
    tx.objectStore('migrationBackups').clear();
    for(const name of STORES){const table=tx.objectStore(name);table.clear();for(const row of name==='settings'?[next.settings]:(next[name]??[]))table.put(row);}
  });
}
