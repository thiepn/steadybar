import { AUDIO_LOCK, ExclusiveLease } from '../platform/locks.js';
import { rhythmCycle, validateRhythmLabConfig, type RhythmCycleEvent, type RhythmLabConfig, type RhythmLayer } from '../domain/rhythm-lab.js';

export interface RhythmPlaybackSettings {volume:number;countInBeats:0|2|4;primaryOn:boolean;secondaryOn:boolean}
export interface RhythmPlaybackEvent extends RhythmCycleEvent {time:number;cycle:number;countingIn:boolean}
interface RhythmEngineOptions {onReady?:(audioTime:number)=>void;onEvent?:(event:RhythmPlaybackEvent)=>void;onInterrupted?:()=>void}

export class RhythmLabAudioEngine {
  private context?:AudioContext;private master?:GainNode;private timer?:ReturnType<typeof setTimeout>;private frame?:number;
  private nodes=new Set<OscillatorNode>();private lease?:ExclusiveLease;private generation=0;private visuals:RhythmPlaybackEvent[]=[];
  private config?:RhythmLabConfig;private settings:RhythmPlaybackSettings={volume:.65,countInBeats:4,primaryOn:true,secondaryOn:true};private options:RhythmEngineOptions={};
  private startTime=0;private practiceStartTime=0;private countInIndex=0;private cycleIndex=0;private eventIndex=0;private readySent=false;
  running=false;

  private ensureContext():AudioContext{
    if(!globalThis.AudioContext)throw new Error('Web Audio is unavailable in this browser.');
    if(!this.context||this.context.state==='closed'){
      this.context=new AudioContext({latencyHint:'interactive'});this.master=this.context.createGain();this.master.connect(this.context.destination);
      this.context.onstatechange=()=>{if(this.running&&this.context?.state!=='running'){const interrupted=this.options.onInterrupted;this.stop();interrupted?.();}};
    }
    return this.context;
  }

  async start(config:RhythmLabConfig,settings:RhythmPlaybackSettings,options:RhythmEngineOptions={}):Promise<void>{
    this.stop();validateRhythmLabConfig(config);
    if(!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>1)throw new Error('Rhythm Lab volume must be between 0 and 1.');
    const generation=this.generation,context=this.ensureContext(),lease=new ExclusiveLease(AUDIO_LOCK,'Another tab is using audio. Stop it there before starting Rhythm Lab.');this.lease=lease;
    try{
      await context.resume();if(generation!==this.generation)return;if(context.state!=='running')throw new Error('Audio could not start. Tap Start again to allow browser audio.');
      await lease.acquire();if(generation!==this.generation){lease.release();return;}
      this.config=structuredClone(config);this.settings={...settings};this.options=options;this.master!.gain.value=settings.volume;
      this.startTime=context.currentTime+.06;this.practiceStartTime=this.startTime+settings.countInBeats*(60/config.bpm);this.countInIndex=0;this.cycleIndex=0;this.eventIndex=0;this.readySent=false;this.visuals=[];this.running=true;
      this.schedule();this.draw();
    }catch(error){lease.release();if(generation!==this.generation)return;this.stop();throw error;}
  }

  setLayers(primaryOn:boolean,secondaryOn:boolean):void{this.settings.primaryOn=primaryOn;this.settings.secondaryOn=secondaryOn;}
  setVolume(volume:number):void{if(!Number.isFinite(volume)||volume<0||volume>1)return;this.settings.volume=volume;if(this.context&&this.master)this.master.gain.setTargetAtTime(volume,this.context.currentTime,.015);}

  private advanceCycleEvent(eventCount:number):void{
    this.eventIndex++;if(this.eventIndex>=eventCount){this.eventIndex=0;this.cycleIndex++;}
  }

  private schedule=():void=>{
    if(!this.running||!this.context||!this.config)return;
    const now=this.context.currentTime,horizon=now+.12,stale=now-.025,beatSeconds=60/this.config.bpm,cycle=rhythmCycle(this.config);
    while(this.countInIndex<this.settings.countInBeats){
      const time=this.startTime+this.countInIndex*beatSeconds;if(time>=horizon)break;
      const index=this.countInIndex++;if(time<stale)continue;
      const event:RhythmPlaybackEvent={time,layer:'primary',accent:index===0?2:1,cycle:-1,cyclePosition:index,label:`Count-in ${index+1}`,countingIn:true};
      this.click(event);this.visuals.push(event);
    }
    while(this.countInIndex>=this.settings.countInBeats){
      const source=cycle.events[this.eventIndex];if(!source)break;
      const time=this.practiceStartTime+this.cycleIndex*cycle.durationSeconds+source.offsetSeconds;if(time>=horizon)break;
      const cycleIndex=this.cycleIndex;this.advanceCycleEvent(cycle.events.length);if(time<stale)continue;
      const event:RhythmPlaybackEvent={...source,time,cycle:cycleIndex,countingIn:false};this.click(event);this.visuals.push(event);
    }
    this.timer=setTimeout(this.schedule,25);
  };

  private layerOn(layer:RhythmLayer):boolean{return layer==='primary'?this.settings.primaryOn:this.settings.secondaryOn;}
  private click(event:RhythmPlaybackEvent):void{
    if(!this.context||!this.master||(!event.countingIn&&!this.layerOn(event.layer)))return;
    const oscillator=this.context.createOscillator(),envelope=this.context.createGain(),primary=event.layer==='primary';oscillator.type='sine';
    const high=event.countingIn?event.accent===2?1500:1050:primary?event.accent===2?1420:980:event.accent===2?850:650;
    const low=event.countingIn?560:primary?520:390;oscillator.frequency.setValueAtTime(high,event.time);oscillator.frequency.exponentialRampToValueAtTime(low,event.time+.028);
    const peak=event.countingIn?event.accent===2?.72:.48:primary?event.accent===2?.68:.45:event.accent===2?.48:.32;
    envelope.gain.setValueAtTime(.0001,event.time);envelope.gain.exponentialRampToValueAtTime(peak,event.time+.0015);envelope.gain.exponentialRampToValueAtTime(.0001,event.time+.045);
    oscillator.connect(envelope);envelope.connect(this.master);this.nodes.add(oscillator);oscillator.onended=()=>{this.nodes.delete(oscillator);oscillator.disconnect();envelope.disconnect();};oscillator.start(event.time);oscillator.stop(event.time+.05);
  }

  private draw=():void=>{
    if(!this.running||!this.context)return;
    if(!this.readySent&&this.practiceStartTime<=this.context.currentTime){this.readySent=true;this.options.onReady?.(this.practiceStartTime);}
    while(this.visuals[0]&&this.visuals[0].time<=this.context.currentTime)this.options.onEvent?.(this.visuals.shift()!);
    this.frame=requestAnimationFrame(this.draw);
  };

  stop():void{
    this.generation++;this.running=false;clearTimeout(this.timer);if(this.frame!==undefined)cancelAnimationFrame(this.frame);
    for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();this.visuals=[];this.config=undefined;this.options={};this.lease?.release();this.lease=undefined;this.readySent=false;
  }
}

export const rhythmAudio=new RhythmLabAudioEngine();