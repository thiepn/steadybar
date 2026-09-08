import { profileView } from '../domain/profiles.js';
import type { Data, Settings } from '../domain/models.js';
import { all, patchSettings, mutateWorkspace, initializeDatabase, put, readData, remove, type StoreName, type StoreTypes } from '../db/database.js';
import { nowISO } from '../domain/utils.js';
export class AppStore {
  private data?:Data;
  private listeners=new Set<()=>void>();
  private channel=typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('music-practice-os-data') : undefined;
  constructor(){if(this.channel)this.channel.onmessage=()=>{void this.refresh().catch(()=>{});};}
  async initialize():Promise<void>{await initializeDatabase();await this.refresh();}
  snapshot():Data{if(!this.data)throw new Error('The workspace is not ready yet.');return this.data;}
  view():Data{return profileView(this.snapshot());}
  async workspace(fn:(data:Data)=>Data,notify=true):Promise<void>{await mutateWorkspace(fn);await this.refresh(notify);this.channel?.postMessage('changed');}
  subscribe(listener:()=>void):()=>void{this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  async refresh(notify=true):Promise<void>{this.data=await readData();if(notify)this.listeners.forEach(fn=>fn());}
  async save<K extends StoreName>(name:K,value:StoreTypes[K],notify=true):Promise<void>{
    const stamped = 'updatedAt' in value ? {...value,updatedAt:nowISO()} : value;
    await put(name,stamped);await this.refresh(notify);this.channel?.postMessage('changed');
  }
  async delete(name:StoreName,id:string):Promise<void>{await remove(name,id);await this.refresh();this.channel?.postMessage('changed');}
  async settings(change:Partial<Settings>,notify=true):Promise<void>{await patchSettings(change);await this.refresh(notify);this.channel?.postMessage('changed');}
  async activeSession(){return (await all('sessions')).find(s=>s.status==='active');}
  broadcast():void{this.channel?.postMessage('changed');}
}
export const store=new AppStore();
