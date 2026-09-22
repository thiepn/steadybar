// Large binary recording assets live outside the structured workspace database.
// Keep the original product identifier so existing origins remain stable across the Steadybar rename.
export const MEDIA_DB_NAME='music-practice-os-media';
const MEDIA_DB_VERSION=1;
const RECORDING_STORE='recordingAssets';

export interface RecordingAsset {
  id:string;
  blob:Blob;
  mimeType:string;
  sizeBytes:number;
  createdAt:string;
}

let connection:IDBDatabase|undefined;
let pending:Promise<IDBDatabase>|undefined;

function request<T>(req:IDBRequest<T>):Promise<T>{
  return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
function complete(tx:IDBTransaction):Promise<void>{
  return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Recording storage transaction failed.'));tx.onerror=()=>reject(tx.error||new Error('Recording storage transaction failed.'));});
}
async function database():Promise<IDBDatabase>{
  if(connection)return connection;
  if(pending)return pending;
  const opening=new Promise<IDBDatabase>((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('Browser storage is unavailable. Recordings cannot be saved on this device.'));return;}
    const req=indexedDB.open(MEDIA_DB_NAME,MEDIA_DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(RECORDING_STORE))db.createObjectStore(RECORDING_STORE,{keyPath:'id'});};
    req.onerror=()=>reject(req.error||new Error('Recording storage could not open.'));
    req.onblocked=()=>reject(new Error('Close other Steadybar tabs, then retry recording storage.'));
    req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();if(connection===db){connection=undefined;pending=undefined;}};connection=db;resolve(db);};
  });
  pending=opening;
  try{return await opening;}finally{if(pending===opening)pending=undefined;}
}
export async function saveRecordingAsset(id:string,blob:Blob,createdAt:string):Promise<void>{
  const db=await database(),tx=db.transaction(RECORDING_STORE,'readwrite'),done=complete(tx);
  tx.objectStore(RECORDING_STORE).put({id,blob,mimeType:blob.type||'application/octet-stream',sizeBytes:blob.size,createdAt} satisfies RecordingAsset);
  await done;
}
export async function getRecordingAsset(id:string):Promise<Blob|undefined>{
  const db=await database(),tx=db.transaction(RECORDING_STORE,'readonly'),done=complete(tx);
  const row=await request(tx.objectStore(RECORDING_STORE).get(id)) as RecordingAsset|undefined;
  await done;return row?.blob;
}
export async function deleteRecordingAsset(id:string):Promise<void>{
  const db=await database(),tx=db.transaction(RECORDING_STORE,'readwrite'),done=complete(tx);
  tx.objectStore(RECORDING_STORE).delete(id);await done;
}
export async function recordingAssetExists(id:string):Promise<boolean>{
  const db=await database(),tx=db.transaction(RECORDING_STORE,'readonly'),done=complete(tx);
  const count=await request(tx.objectStore(RECORDING_STORE).count(id));await done;return count>0;
}
