import { reference } from '../audio/reference.js';
import type { PracticeProtocol } from '../domain/practice-types.js';
import { validateProtocol, validateOutcome, assertOutcomeMatches, assertProtocolCompatible } from '../domain/practice-validation.js';
import { protocolPulse, patternFits, fretPrompt } from '../domain/protocols.js';
import type { MetronomeConfig, PracticeSession, Rating, RoutineBlock, TrainerConfig } from '../domain/models.js';
import { get, insertActiveSession, updateSession } from '../db/database.js';
import { store } from '../app/store.js';
import { audio } from '../audio/engine.js';
import { defaultAccents, type BeatEvent } from '../audio/scheduler.js';
import { blockElapsed, checkpointSession, createSession, finishBlock, pauseSession, preserveReadingIdentity, recoverSession, restartBlock } from './logic.js';
import { clampBpm, nowISO, uuid } from '../domain/utils.js';
import { trainerBpm } from '../domain/trainer.js';
import { ExclusiveLease, SESSION_LOCK } from '../platform/locks.js';
import { requireActive } from './guards.js';
export class PracticeController {
  session?:PracticeSession;external=false;recovered=false;beat?:BeatEvent;error='';
  private listeners=new Set<()=>void>();private queue:Promise<unknown>=Promise.resolve();
  private heartbeat?:ReturnType<typeof setInterval>;private trainerTimer?:ReturnType<typeof setInterval>;
  private lease=new ExclusiveLease(SESSION_LOCK,'This session is running in another tab. Pause it there before continuing here.');private wake?:WakeLockSentinel;private changingTempo=false;private generation=0;
  subscribe(fn:()=>void):()=>void{this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  private emit():void{this.listeners.forEach(fn=>fn());}
  private report(error:unknown):void{reference.stop();this.generation++;this.error=error instanceof Error ? error.message : 'Practice data could not be saved. Check browser storage permissions.';audio.stop();this.stopTimers();this.unlock();if(this.session)this.session=recoverSession(this.session);this.emit();}
  private async lock():Promise<void>{await this.lease.acquire();}
  /** Reflect committed changes made by another tab without counting its timer locally. */
  observePersisted():void{
    if(this.lease.held)return;
    const data=store.snapshot();
    const next=this.session?data.sessions.find(s=>s.id===this.session!.id):data.sessions.find(s=>s.status==='active');
    if(JSON.stringify(next)===JSON.stringify(this.session))return;
    this.generation++;
    if(this.session?.status==='active' && !this.external && ['running','countin'].includes(this.session.runtime.phase)){
      audio.stop();this.stopTimers();
    }
    this.session=next;
    this.external=!!next && next.status==='active' && ['running','countin'].includes(next.runtime.phase);
    this.recovered=next?.status==='active';this.emit();
  }
  async recover():Promise<boolean>{
    const session=await store.activeSession();if(!session)return false;
    this.session=session;this.recovered=true;
    try{await this.lock();}catch{this.external=true;this.emit();return true;}
    const wasInterrupted=session.runtime.phase==='running' || session.runtime.phase==='countin';
    try{
      this.session=await updateSession(session.id,current=>{requireActive(current);return recoverSession(current);});
      await store.refresh(false);this.external=false;this.emit();return wasInterrupted;
    }finally{this.unlock();}
  }
  async create(blocks:RoutineBlock[],source:{routineId?:string;planId?:string;profileId?:string}={}):Promise<void>{
    const session=createSession(blocks,store.snapshot(),source);await insertActiveSession(session);this.session=session;this.error='';this.external=false;this.recovered=false;
    await store.refresh();store.broadcast();this.emit();
  }
  private mutate(fn:(s:PracticeSession)=>PracticeSession):Promise<void>{
    const id=this.session?.id,blockId=this.session?.blocks[this.session.activeBlockIndex]?.id;
    if(!id)return Promise.reject(new Error('No active session.'));
    if(this.external)return Promise.reject(new Error('Pause the session in the other tab before editing it here.'));
    const task=this.queue.then(async()=>{
      await this.lock();
      try {
        const next=await updateSession(id,current=>{requireActive(current,blockId);return fn(current);});
        this.session=next;await store.refresh(false);store.broadcast();this.emit();
      }catch(error){
        // A rejected stale command must show the committed state, never revive its old UI copy.
        const current=await get('sessions',id).catch(()=>this.session);
        this.session=current;await store.refresh(false).catch(()=>{});throw error;
      }
      finally {if(!this.session || this.session.status!=='active' || !['running','countin'].includes(this.session.runtime.phase))this.unlock();}
    });
    this.queue=task.catch(error=>this.report(error));return task;
  }
  elapsed():number{return this.session ? blockElapsed(this.session) : 0;}
  private config():MetronomeConfig{
    const s=this.session!,block=s.blocks[s.activeBlockIndex]!,settings=store.snapshot().settings.metronome;
    return {...structuredClone(settings),bpm:s.runtime.bpm,meter:block.meterSnapshot,subdivision:block.subdivisionSnapshot,accents:settings.meter.beats===block.meterSnapshot.beats && settings.meter.beatUnit===block.meterSnapshot.beatUnit ? [...settings.accents] : defaultAccents(block.meterSnapshot.beats,block.meterSnapshot.beatUnit)};
  }
  private async requestWake():Promise<void>{
    if(!store.snapshot().settings.wakeLock || !('wakeLock' in navigator) || document.hidden)return;
    try{this.wake=await navigator.wakeLock.request('screen');}catch{/* Optional; audio and persistence do not depend on wake lock. */}
  }
  private stopTimers():void{
    clearInterval(this.heartbeat);clearInterval(this.trainerTimer);this.heartbeat=undefined;this.trainerTimer=undefined;
    void this.wake?.release().catch(()=>{});this.wake=undefined;
  }
  private unlock():void{this.lease.release();}
  private startTimers():void{
    clearInterval(this.heartbeat);clearInterval(this.trainerTimer);
    this.heartbeat=setInterval(()=>{if(this.session?.runtime.phase==='running')void this.mutate(s=>checkpointSession(s)).catch(()=>{});},5000);
    this.trainerTimer=setInterval(()=>{void this.tickTrainer().catch(error=>this.report(error));},200);void this.requestWake();
  }
  private async tickTrainer():Promise<void>{
    const s=this.session,block=s?.blocks[s.activeBlockIndex];
    if(!s || !block?.tempoTrainer || s.runtime.phase!=='running' || this.changingTempo)return;
    const bpm=trainerBpm(block.tempoTrainer,this.elapsed()-s.runtime.trainerStartSeconds,s.runtime.trainerCleanRounds);
    if(bpm!==s.runtime.bpm){this.changingTempo=true;try{await this.mutate(current=>{current=checkpointSession(current);current.runtime.bpm=bpm;current.blocks[current.activeBlockIndex]!.finalBpm=bpm;return current;});if(audio.running)audio.update(this.config());}finally{this.changingTempo=false;}}
  }
  async toggle():Promise<void>{
    if(this.session?.runtime.phase==='running' || this.session?.runtime.phase==='countin')await this.pause();else await this.start();
  }
  async start():Promise<void>{
    if(!this.session || this.session.status!=='active' || ['running','countin'].includes(this.session.runtime.phase))return;
    reference.stop();const generation=++this.generation;this.error='';await this.lock();
    if(generation!==this.generation){this.unlock();return;}
    this.external=false;this.recovered=false;
    const countIn=this.session.runtime.metronomeOn ? this.config().countIn : 0;
    const startRunning=async(time:number)=>{
      if(generation!==this.generation)return;
      await this.mutate(s=>{if(generation!==this.generation || s.status!=='active' || (s.runtime.phase!=='countin' && s.runtime.phase!=='ready' && s.runtime.phase!=='paused'))return s;const block=s.blocks[s.activeBlockIndex]!;const iso=new Date(time).toISOString();block.startedAt??=iso;s.runtime.phase='running';s.runtime.runStartedAt=iso;s.runtime.checkpointAt=iso;return s;});if(generation===this.generation&&this.session?.runtime.phase==='running')this.startTimers();
    };
    try{
      if(this.session.runtime.metronomeOn){
        await this.mutate(s=>{if(generation!==this.generation)return s;s.runtime.phase='countin';delete s.runtime.runStartedAt;return s;});
        if(generation!==this.generation)return;
        await audio.start({...this.config(),countIn},{onReady:time=>{void startRunning(time).catch(error=>this.report(error));},onBeat:event=>{this.beat=event;this.emit();},onInterrupted:()=>{void this.pause().then(()=>{this.error='Audio was suspended by the browser. The session is paused; tap Resume when ready.';this.emit();}).catch(error=>this.report(error));}});
      }else await startRunning(Date.now());
    }catch(error){if(generation!==this.generation)return;this.stopTimers();await this.mutate(s=>pauseSession(s)).catch(()=>{});throw error;}
  }
  async pause():Promise<void>{
    this.generation++;reference.stop();audio.stop();this.stopTimers();
    if(this.session?.status==='active'){await this.mutate(s=>pauseSession(s));this.beat=undefined;this.emit();}
  }
  async setBpm(value:number):Promise<void>{
    const current=this.session?.blocks[this.session.activeBlockIndex];if(current?.protocolSnapshot&&!protocolPulse(current.protocolSnapshot))throw new Error('This exercise has no tempo target.');
    const bpm=clampBpm(value);
    await this.mutate(s=>{s=checkpointSession(s);s.runtime.bpm=bpm;const block=s.blocks[s.activeBlockIndex]!;block.finalBpm=bpm;delete block.tempoTrainer;return s;});
    if(audio.running)audio.update(this.config());
  }
  async toggleAudio():Promise<void>{
    const wasRunning=this.session?.runtime.phase==='running';
    await this.pause();await this.mutate(s=>{s.runtime.metronomeOn=!s.runtime.metronomeOn;return s;});
    if(wasRunning)await this.start();
  }
  async attempt(rating:Rating):Promise<void>{
    const current=this.session?.blocks[this.session.activeBlockIndex];if(current?.protocolSnapshot&&current.protocolSnapshot.kind!=='tempo')throw new Error('Use this exercise’s task results instead of a tempo rating.');
    if(!this.session || ['ready','countin'].includes(this.session.runtime.phase))throw new Error('Start this block before recording an attempt.');
    await this.mutate(s=>{if(['ready','countin'].includes(s.runtime.phase))throw new Error('Start this block before recording an attempt.');s=checkpointSession(s);const block=s.blocks[s.activeBlockIndex]!;block.tempoAttempts.push({id:uuid(),bpm:s.runtime.bpm,rating,timestamp:nowISO(),durationSeconds:block.actualActiveSeconds,note:''});
      if((rating==='clean' || rating==='effortless') && block.tempoTrainer?.mode==='repetition')s.runtime.trainerCleanRounds++;
      return s;});
    await this.tickTrainer();
  }
  /** Validate against the committed block, preserving the same stale-command guards as tempo attempts. */
  async outcome(value:unknown,expectedStep?:number):Promise<void>{
    const submitted=validateOutcome(value);
    await this.mutate(s=>{
      if(['ready','countin'].includes(s.runtime.phase))throw new Error('Start this block before logging a result.');
      s=checkpointSession(s);const b=s.blocks[s.activeBlockIndex]!,p=b.protocolSnapshot;
      if(!p)throw new Error('This older block only supports tempo attempts.');
      assertOutcomeMatches(submitted,p);
      const state=b.protocolState??={step:0,clean:0,total:0};
      if(expectedStep!==undefined&&state.step!==expectedStep)throw new Error('The task has advanced. Check the current prompt before answering.');
      const result=structuredClone(submitted);
      if((b.outcomes??[]).some(o=>o.id===result.id))throw new Error('This result has already been saved.');
      if(result.kind==='reading')result.firstRead=p.kind==='sight-reading'&&p.firstRead&&!(b.outcomes??[]).some(o=>o.kind==='reading');
      if(result.kind==='count'){state.clean+=result.clean;state.total+=result.total;}
      if(result.kind==='recall'&&p.kind==='fretboard'){
        const prompt=fretPrompt(p,state.step);
        if(prompt.string!==result.string||prompt.fret!==result.fret||prompt.pitchClass!==result.expected)throw new Error('This answer belongs to a different prompt.');
        state.total++;if(result.correct)state.clean++;
      }
      if(result.kind==='scale'&&p.kind==='scale-cycle'&&p.keys[state.step%p.keys.length]!==result.key)throw new Error('This scale result belongs to a different key.');
      if(result.kind==='voice'&&p.kind==='vocal-pattern'&&(state.rootMidi??p.startMidi)!==result.rootMidi)throw new Error('This result belongs to a different reference root.');
      if(result.kind==='pitch'){state.total++;if(result.matched)state.clean++;}
      (b.outcomes??=[]).push(result);state.step++;return s;
    });
  }
  async moveTask(delta:number):Promise<void>{
    reference.stop();await this.mutate(s=>{
      const b=s.blocks[s.activeBlockIndex]!,p=b.protocolSnapshot,state=b.protocolState??={step:0,clean:0,total:0};
      if(p?.kind==='vocal-pattern'){
        const root=(state.rootMidi??p.startMidi)+delta*p.transpose;
        if(!patternFits(p,root))throw new Error('Range boundary reached. Rest or repeat within your comfortable range.');state.rootMidi=root;
      }else if(p?.kind==='scale-cycle')state.step=Math.max(0,state.step+delta);
      else throw new Error('This task does not have a selectable step.');return s;
    });
  }
  async configureProtocol(input:PracticeProtocol):Promise<void>{
    const requested=validateProtocol(input);await this.pause();
    await this.mutate(s=>{
      let b=s.blocks[s.activeBlockIndex]!;const profile=store.snapshot().profiles?.find(p=>p.id===b.profileId);
      if(!profile)throw new Error('The session profile is unavailable.');
      const practiced=Boolean(b.startedAt)||b.actualActiveSeconds>0||(b.outcomes?.length??0)>0||b.tempoAttempts.length>0;
      const config=preserveReadingIdentity(b.protocolSnapshot,requested,practiced);assertProtocolCompatible(config,profile);
      if(b.actualActiveSeconds>0||(b.outcomes?.length??0)>0||b.tempoAttempts.length){s=restartBlock(s);b=s.blocks[s.activeBlockIndex]!;}
      delete b.lessonSource;
      b.protocolSnapshot=config;b.protocolState={step:0,clean:0,total:0,...(config.kind==='vocal-pattern'?{rootMidi:config.startMidi}:{})};
      b.outcomes=[];b.tempoAttempts=[];b.initialBpm=protocolPulse(config)?.bpm;b.finalBpm=b.initialBpm;
      const timing=protocolPulse(config);b.meterSnapshot=timing?{beats:timing.beats,beatUnit:timing.beatUnit}:s.blocks[s.activeBlockIndex]!.meterSnapshot;b.subdivisionSnapshot=timing?.subdivision??1;
      b.stickingSnapshot=config.kind==='tempo'?config.sticking??'':'';delete b.tempoTrainer;
      s.runtime.bpm=b.initialBpm??80;s.runtime.metronomeOn=b.initialBpm!==undefined;s.runtime.phase='ready';return s;
    });
  }
  async note(text:string):Promise<void>{await this.mutate(s=>{s.blocks[s.activeBlockIndex]!.notes=text;return s;});}
  async trainer(config:TrainerConfig | undefined):Promise<void>{
    await this.pause();await this.mutate(s=>{const block=s.blocks[s.activeBlockIndex]!;if(block.protocolSnapshot&&block.protocolSnapshot.kind!=='tempo')throw new Error('Tempo trainers apply to tempo-practice tasks only.');block.tempoTrainer=config;s.runtime.trainerStartSeconds=block.actualActiveSeconds;s.runtime.trainerCleanRounds=0;if(config){s.runtime.bpm=trainerBpm(config,0,0);block.finalBpm=s.runtime.bpm;if(config.mode==='endurance')block.targetSeconds=Math.ceil(block.actualActiveSeconds)+config.seconds;}return s;});
  }
  async finishBlock(skip=false):Promise<void>{this.generation++;reference.stop();audio.stop();this.stopTimers();await this.mutate(s=>finishBlock(s,skip));this.beat=undefined;this.emit();}
  async restart():Promise<void>{this.generation++;reference.stop();audio.stop();this.stopTimers();await this.mutate(restartBlock);this.beat=undefined;this.emit();}
  async finish(abandon=false):Promise<void>{
    this.generation++;this.recovered=false;reference.stop();audio.stop();this.stopTimers();await this.mutate(s=>{
      s=pauseSession(s);const now=nowISO();
      s.blocks.forEach((b,i)=>{if(i===s.activeBlockIndex){b.completed=!abandon;b.endedAt=now;if(!b.protocolSnapshot||protocolPulse(b.protocolSnapshot))b.finalBpm=s.runtime.bpm;}else if(i>s.activeBlockIndex){b.skipped=true;b.endedAt=now;}});
      s.status=abandon?'abandoned':'completed';s.endedAt=now;return s;
    });
  }
  async discard():Promise<void>{this.generation++;reference.stop();audio.stop();this.stopTimers();await this.lock();try{if(this.session){await store.delete('sessions',this.session.id);this.session=undefined;this.recovered=false;this.emit();}}finally{this.unlock();}}
  async onVisibility():Promise<void>{
    if(!this.session || this.session.status!=='active')return;
    if(document.hidden && store.snapshot().settings.pauseWhenHidden && ['running','countin'].includes(this.session.runtime.phase)){await this.pause();this.error='Paused when the app went into the background. Tap Resume to continue.';this.emit();}
    else if(!document.hidden && this.session.runtime.phase==='running')await this.requestWake();
  }
}
export const practice=new PracticeController();
