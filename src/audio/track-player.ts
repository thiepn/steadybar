import { AUDIO_LOCK, ExclusiveLease } from '../platform/locks.js';

export interface TrackMetadataProbe {
  durationSeconds:number;
  mimeType:string;
}
export interface TrackLoop {
  startSeconds:number;
  endSeconds:number;
  enabled:boolean;
}
export interface TrackPlayerSnapshot {
  currentTime:number;
  duration:number;
  playbackRate:number;
  paused:boolean;
  loop?:TrackLoop;
  pitchPreservation:boolean;
}

type PitchMedia = HTMLMediaElement & {
  preservesPitch?:boolean;
  webkitPreservesPitch?:boolean;
};

function finiteDuration(value:number):number {
  if(!Number.isFinite(value)||value<=0||value>86400)throw new Error('The selected audio file has an invalid or unsupported duration.');
  return value;
}

export async function probeAudioBlob(blob:Blob):Promise<TrackMetadataProbe>{
  const url=URL.createObjectURL(blob),audio=new Audio();
  audio.preload='metadata';audio.src=url;
  try{
    const duration=await new Promise<number>((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Audio metadata could not be read.')),15000);
      audio.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve(audio.duration);},{once:true});
      audio.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('This audio file could not be decoded by the browser.'));},{once:true});
      audio.load();
    });
    return {durationSeconds:finiteDuration(duration),mimeType:blob.type||'application/octet-stream'};
  } finally {
    audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);
  }
}

export class RepertoireTrackPlayer {
  private readonly audio=new Audio();
  private url?:string;
  private lease?:ExclusiveLease;
  private frame?:number;
  private loop?:TrackLoop;
  private listener?: (snapshot:TrackPlayerSnapshot)=>void;

  constructor(){
    this.audio.preload='auto';
    const media=this.audio as PitchMedia;
    if('preservesPitch' in media)media.preservesPitch=true;
    if('webkitPreservesPitch' in media)media.webkitPreservesPitch=true;
    this.audio.addEventListener('ended',()=>{this.lease?.release();this.lease=undefined;this.stopFrame();this.emit();});
    this.audio.addEventListener('pause',()=>{if(this.audio.currentTime>=this.audio.duration-.05){this.lease?.release();this.lease=undefined;}this.emit();});
    this.audio.addEventListener('play',()=>{this.startFrame();this.emit();});
    this.audio.addEventListener('loadedmetadata',()=>this.emit());
  }

  get pitchPreservationSupported():boolean{
    const media=this.audio as PitchMedia;
    return 'preservesPitch' in media || 'webkitPreservesPitch' in media;
  }
  get currentTime():number{return Number.isFinite(this.audio.currentTime)?this.audio.currentTime:0;}
  get duration():number{return Number.isFinite(this.audio.duration)?this.audio.duration:0;}
  get paused():boolean{return this.audio.paused;}
  get playbackRate():number{return this.audio.playbackRate;}

  async load(blob:Blob):Promise<void>{
    this.pause();this.revoke();
    this.url=URL.createObjectURL(blob);this.audio.src=this.url;this.audio.preload='auto';
    await new Promise<void>((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('The local track could not be loaded.')),15000);
      this.audio.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve();},{once:true});
      this.audio.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('The local track could not be decoded by this browser.'));},{once:true});
      this.audio.load();
    });
    finiteDuration(this.audio.duration);
    this.emit();
  }

  onChange(listener:(snapshot:TrackPlayerSnapshot)=>void):()=>void{
    this.listener=listener;this.emit();return ()=>{if(this.listener===listener)this.listener=undefined;};
  }

  setRate(rate:number):void{
    if(!Number.isFinite(rate))throw new Error('Playback speed must be a number.');
    this.audio.playbackRate=Math.max(.5,Math.min(1.5,rate));this.emit();
  }
  setVolume(volume:number):void{this.audio.volume=Math.max(0,Math.min(1,volume));}
  seek(seconds:number):void{
    if(!this.duration)return;
    this.audio.currentTime=Math.max(0,Math.min(this.duration,seconds));this.emit();
  }
  setLoop(startSeconds:number,endSeconds:number,enabled=true):void{
    if(!this.duration)throw new Error('Load the track before setting a loop.');
    const start=Math.max(0,Math.min(this.duration,startSeconds)),end=Math.max(0,Math.min(this.duration,endSeconds));
    if(end-start<.08)throw new Error('Loop end must be at least 0.08 seconds after loop start.');
    this.loop={startSeconds:start,endSeconds:end,enabled};this.emit();
  }
  toggleLoop(enabled:boolean):void{if(this.loop)this.loop={...this.loop,enabled};this.emit();}
  clearLoop():void{this.loop=undefined;this.emit();}

  async play():Promise<void>{
    if(!this.audio.src)throw new Error('Load a local track first.');
    if(!this.lease)this.lease=new ExclusiveLease(AUDIO_LOCK,'Another tab is using audio. Stop it there, then retry track playback.');
    await this.lease.acquire();
    if(this.loop?.enabled&&(this.currentTime<this.loop.startSeconds||this.currentTime>=this.loop.endSeconds))this.audio.currentTime=this.loop.startSeconds;
    try{await this.audio.play();}catch(error){this.lease.release();this.lease=undefined;throw error;}
  }
  pause():void{
    this.audio.pause();this.stopFrame();this.lease?.release();this.lease=undefined;this.emit();
  }
  stop():void{this.pause();this.seek(this.loop?.enabled?this.loop.startSeconds:0);}
  destroy():void{this.pause();this.audio.removeAttribute('src');this.audio.load();this.revoke();this.listener=undefined;this.loop=undefined;}

  private snapshot():TrackPlayerSnapshot{
    return {currentTime:this.currentTime,duration:this.duration,playbackRate:this.playbackRate,paused:this.paused,loop:this.loop?{...this.loop}:undefined,pitchPreservation:this.pitchPreservationSupported};
  }
  private emit():void{this.listener?.(this.snapshot());}
  private startFrame():void{
    this.stopFrame();
    const tick=()=>{
      if(this.audio.paused)return;
      if(this.loop?.enabled&&this.audio.currentTime>=this.loop.endSeconds-.015){
        this.audio.currentTime=this.loop.startSeconds;
      }
      this.emit();this.frame=requestAnimationFrame(tick);
    };
    this.frame=requestAnimationFrame(tick);
  }
  private stopFrame():void{if(this.frame!==undefined)cancelAnimationFrame(this.frame);this.frame=undefined;}
  private revoke():void{if(this.url)URL.revokeObjectURL(this.url);this.url=undefined;}
}
