import type { Accent, MetronomeConfig } from '../domain/models.js';
export interface BeatEvent {time:number;beat:number;part:number;bar:number;accent:Accent;countingIn:boolean;firstPracticeBeat:boolean}
/** Pure audio-time clock. Rendering and wall-clock timers never determine note positions. */
export class ScheduleClock {
  nextTime=0;beat=0;part=0;bar=0;
  /** Preserved even if the corresponding click was skipped after scheduler throttling. */
  practiceStartTime?:number;
  private config:MetronomeConfig;
  private structural?:MetronomeConfig;
  constructor(config:MetronomeConfig, startTime=0){this.config=structuredClone(config);this.nextTime=startTime;}
  update(config:MetronomeConfig):void{
    // A changed count-in applies to the next start, never to an already-running count-in.
    this.config={...this.config,bpm:config.bpm,volume:config.volume,accents:config.meter.beats===this.config.meter.beats ? [...config.accents] : this.config.accents};
    if(config.meter.beats!==this.config.meter.beats || config.meter.beatUnit!==this.config.meter.beatUnit || config.subdivision!==this.config.subdivision)this.structural={...structuredClone(config),countIn:this.config.countIn};
    else this.structural=undefined;
  }
  next():BeatEvent {
    if(this.beat===0 && this.part===0 && this.structural){this.config={...this.structural,bpm:this.config.bpm,volume:this.config.volume};this.structural=undefined;}
    const c=this.config;
    const event:BeatEvent={time:this.nextTime,beat:this.beat,part:this.part,bar:this.bar,accent:(c.accents[this.beat] ?? 1)===0 ? 0 : this.part===0 ? c.accents[this.beat] ?? 1 : 1,countingIn:this.bar<c.countIn,firstPracticeBeat:this.bar===c.countIn && this.beat===0 && this.part===0};
    if(event.firstPracticeBeat)this.practiceStartTime=event.time;
    this.nextTime+=60/c.bpm/c.subdivision;
    this.part++;
    if(this.part>=c.subdivision){this.part=0;this.beat++;if(this.beat>=c.meter.beats){this.beat=0;this.bar++;}}
    return event;
  }
  private skipBefore(limit:number):void {
    // Resolve at most one pending bar transition before arithmetic catch-up.
    while(this.structural && this.nextTime<limit)this.next();
    if(this.nextTime>=limit)return;
    const c=this.config,interval=60/c.bpm/c.subdivision;
    const steps=Math.max(0,Math.ceil((limit-this.nextTime)/interval));
    const perBar=c.meter.beats*c.subdivision;
    const cursor=this.bar*perBar+this.beat*c.subdivision+this.part;
    const onset=c.countIn*perBar;
    if(this.practiceStartTime===undefined && cursor<=onset && onset<cursor+steps){
      this.practiceStartTime=this.nextTime+(onset-cursor)*interval;
    }
    this.nextTime+=steps*interval;
    const target=cursor+steps;
    this.bar=Math.floor(target/perBar);
    this.beat=Math.floor((target%perBar)/c.subdivision);
    this.part=target%c.subdivision;
  }
  scheduleThrough(horizon:number,now:number):BeatEvent[]{
    const out:BeatEvent[]=[];
    // Never burst stale notes after suspension, and never loop through hours of missed beats.
    this.skipBefore(now-0.025);
    while(this.nextTime<horizon)out.push(this.next());
    return out;
  }
}
export function defaultAccents(beats:number,unit:number):Accent[]{return Array.from({length:beats},(_,i)=>i===0 || (unit===8 && beats%3===0 && i%3===0) ? 2 : 1);}
export function tapTempo(taps:number[],now:number):{taps:number[];bpm?:number}{
  const last=taps.at(-1);let next=last===undefined || now-last>4000 ? [now] : [...taps,now].slice(-8);
  if(last!==undefined && now-last<120)return {taps};
  if(next.length<2)return {taps:next};
  const intervals=next.slice(1).map((time,i)=>time-next[i]!).sort((a,b)=>a-b);
  const mid=Math.floor(intervals.length/2);
  const median=intervals.length%2 ? intervals[mid]! : (intervals[mid-1]!+intervals[mid]!)/2;
  const bpm=Math.round(60000/median);
  if(bpm<20 || bpm>300){next=[now];return {taps:next};}
  return {taps:next,bpm};
}
