export type RhythmLabMode='swing'|'subdivision-switch'|'polyrhythm';
export type RhythmLayer='primary'|'secondary';
export type RhythmSubdivision=1|2|3|4;
export interface SwingRhythmConfig {mode:'swing';bpm:number;beats:2|3|4|5|6|7;ratio:number}
export interface SubdivisionSwitchRhythmConfig {mode:'subdivision-switch';bpm:number;beats:2|3|4|5|6|7;sequence:RhythmSubdivision[];barsPerStage:1|2|4}
export interface PolyrhythmRhythmConfig {mode:'polyrhythm';bpm:number;primary:2|3|4|5;secondary:2|3|4|5}
export type RhythmLabConfig=SwingRhythmConfig|SubdivisionSwitchRhythmConfig|PolyrhythmRhythmConfig;
export interface RhythmCycleEvent {offsetSeconds:number;layer:RhythmLayer;accent:1|2;cyclePosition:number;label:string}
export interface RhythmCycle {durationSeconds:number;events:RhythmCycleEvent[];divisions:number;summary:string}

const rounded=(value:number)=>Math.round(value*1e9)/1e9;
const assertBpm=(bpm:number)=>{if(!Number.isFinite(bpm)||bpm<20||bpm>300)throw new Error('Rhythm Lab BPM must be between 20 and 300.');};
const assertBeats=(beats:number)=>{if(!Number.isInteger(beats)||beats<2||beats>7)throw new Error('Rhythm Lab meter must use 2–7 beats.');};

export function validateRhythmLabConfig(config:RhythmLabConfig):RhythmLabConfig{
  assertBpm(config.bpm);
  if(config.mode==='swing'){
    assertBeats(config.beats);
    if(!Number.isFinite(config.ratio)||config.ratio<50||config.ratio>75)throw new Error('Swing ratio must be between 50% and 75%.');
  }else if(config.mode==='subdivision-switch'){
    assertBeats(config.beats);
    if(!config.sequence.length||config.sequence.length>8||config.sequence.some(value=>![1,2,3,4].includes(value)))throw new Error('Subdivision switching needs 1–8 valid stages.');
    if(![1,2,4].includes(config.barsPerStage))throw new Error('Bars per subdivision stage must be 1, 2, or 4.');
  }else{
    if(![2,3,4,5].includes(config.primary)||![2,3,4,5].includes(config.secondary)||config.primary===config.secondary)throw new Error('Polyrhythm layers must be different values between 2 and 5.');
  }
  return structuredClone(config);
}

export function swingFeelLabel(ratio:number):string{
  if(ratio<=51)return 'Straight';
  if(ratio<58)return 'Light swing';
  if(ratio<64)return 'Medium swing';
  if(ratio<69)return 'Triplet swing';
  return 'Deep swing';
}

export function subdivisionName(value:RhythmSubdivision):string{
  return value===1?'Quarter notes':value===2?'Eighth notes':value===3?'Triplets':'Sixteenth notes';
}

export function rhythmCycle(config:RhythmLabConfig):RhythmCycle{
  validateRhythmLabConfig(config);
  const beatSeconds=60/config.bpm;
  if(config.mode==='swing'){
    const events:RhythmCycleEvent[]=[];
    const offbeatPhase=config.ratio/100;
    for(let beat=0;beat<config.beats;beat++){
      const beatStart=beat*beatSeconds;
      events.push({offsetSeconds:rounded(beatStart),layer:'primary',accent:beat===0?2:1,cyclePosition:beat*2,label:`Beat ${beat+1}`});
      events.push({offsetSeconds:rounded(beatStart+beatSeconds*offbeatPhase),layer:'secondary',accent:1,cyclePosition:beat*2+1,label:`Beat ${beat+1} offbeat`});
    }
    return {durationSeconds:rounded(config.beats*beatSeconds),events,divisions:config.beats*2,summary:`${swingFeelLabel(config.ratio)} · ${config.ratio.toFixed(1)}:${(100-config.ratio).toFixed(1)}`};
  }
  if(config.mode==='subdivision-switch'){
    const events:RhythmCycleEvent[]=[];
    let offset=0,position=0;
    for(const stage of config.sequence){
      for(let bar=0;bar<config.barsPerStage;bar++){
        for(let beat=0;beat<config.beats;beat++){
          for(let part=0;part<stage;part++){
            events.push({offsetSeconds:rounded(offset+(beat+part/stage)*beatSeconds),layer:part===0?'primary':'secondary',accent:beat===0&&part===0?2:1,cyclePosition:position++,label:`${subdivisionName(stage)} · bar ${bar+1} · beat ${beat+1}${part?` · part ${part+1}`:''}`});
          }
        }
        offset+=config.beats*beatSeconds;
      }
    }
    return {durationSeconds:rounded(offset),events,divisions:events.length,summary:`${config.sequence.map(subdivisionName).join(' → ')} · ${config.barsPerStage} bar${config.barsPerStage===1?'':'s'} each`};
  }
  const cycleBeats=config.secondary,cycleSeconds=cycleBeats*beatSeconds,events:RhythmCycleEvent[]=[];
  for(let i=0;i<config.secondary;i++)events.push({offsetSeconds:rounded(i*cycleSeconds/config.secondary),layer:'primary',accent:i===0?2:1,cyclePosition:i,label:`Anchor ${i+1}/${config.secondary}`});
  for(let i=0;i<config.primary;i++)events.push({offsetSeconds:rounded(i*cycleSeconds/config.primary),layer:'secondary',accent:i===0?2:1,cyclePosition:i,label:`Overlay ${i+1}/${config.primary}`});
  events.sort((a,b)=>a.offsetSeconds-b.offsetSeconds||(a.layer==='primary'?-1:1));
  return {durationSeconds:rounded(cycleSeconds),events,divisions:config.primary+config.secondary,summary:`${config.primary}:${config.secondary} · ${config.primary} overlay hits across ${config.secondary} quarter-note beats`};
}

export function rhythmCyclePositions(config:RhythmLabConfig):{primary:number[];secondary:number[]}{
  const cycle=rhythmCycle(config),duration=cycle.durationSeconds||1;
  return {primary:cycle.events.filter(event=>event.layer==='primary').map(event=>event.offsetSeconds/duration),secondary:cycle.events.filter(event=>event.layer==='secondary').map(event=>event.offsetSeconds/duration)};
}