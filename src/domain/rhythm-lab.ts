import type { DrumRhythmProtocol } from './practice-types.js';
export type RhythmLabMode='swing'|'subdivision-switch'|'polyrhythm';
export type RhythmLayer='primary'|'secondary';
export type RhythmSubdivision=1|2|3|4;
export interface SwingRhythmConfig {mode:'swing';bpm:number;beats:2|3|4|5|6|7;ratio:number}
export interface SubdivisionSwitchRhythmConfig {mode:'subdivision-switch';bpm:number;beats:2|3|4|5|6|7;sequence:RhythmSubdivision[];barsPerStage:1|2|4}
export interface PolyrhythmRhythmConfig {mode:'polyrhythm';bpm:number;primary:2|3|4|5;secondary:2|3|4|5}
export type RhythmLabConfig=SwingRhythmConfig|SubdivisionSwitchRhythmConfig|PolyrhythmRhythmConfig;
export interface RhythmCycleEvent {offsetSeconds:number;layer:RhythmLayer;accent:1|2;cyclePosition:number;beat:number;part:number;stage?:number;label:string}
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

export function rhythmBaseBeats(config:RhythmLabConfig):number{return config.mode==='polyrhythm'?config.secondary:config.beats;}
export function rhythmCountInAccent(config:RhythmLabConfig,index:number):1|2{return index%rhythmBaseBeats(config)===0?2:1;}

export function rhythmLayerLabels(config:RhythmLabConfig):[string,string]{
  return config.mode==='swing'?['Beat','Offbeat']:config.mode==='subdivision-switch'?['Beat','Subdivision']:['Anchor','Overlay'];
}

export function rhythmPracticeCue(config:RhythmLabConfig):string{
  if(config.mode==='swing')return `${swingFeelLabel(config.ratio)}: keep the quarter-note pulse unchanged while the offbeat moves. The ratio is a timing reference, not a “correct groove” score.`;
  if(config.mode==='subdivision-switch')return `Keep one quarter-note pulse while your internal grid changes: ${config.sequence.map(subdivisionName).join(' → ')}. Do not let the BPM move when the note density changes.`;
  return `${config.primary}:${config.secondary}: hear the anchor first, then the overlay, then both together. The overlay contains ${config.primary} evenly spaced hits across ${config.secondary} quarter-note beats.`;
}

export function rhythmPracticeName(config:RhythmLabConfig):string{
  if(config.mode==='swing')return `${swingFeelLabel(config.ratio)} swing placement`;
  if(config.mode==='subdivision-switch')return `Subdivision switch · ${config.sequence.map(subdivisionName).join(' → ')}`;
  return `Polyrhythm ${config.primary}:${config.secondary}`;
}

export function rhythmProtocolFromConfig(config:RhythmLabConfig,primaryOn=true,secondaryOn=true):DrumRhythmProtocol{
  const current=validateRhythmLabConfig(config),name=rhythmPracticeName(current),focus=rhythmPracticeCue(current);
  if(!primaryOn&&!secondaryOn)throw new Error('At least one Rhythm Lab layer must be audible.');
  const layers={primaryOn,secondaryOn};
  if(current.mode==='swing')return {kind:'drum-rhythm',mode:'swing',pulse:{bpm:current.bpm,beats:current.beats,beatUnit:4,subdivision:2},name,focus,ratio:current.ratio,...layers};
  if(current.mode==='subdivision-switch')return {kind:'drum-rhythm',mode:'subdivision-switch',pulse:{bpm:current.bpm,beats:current.beats,beatUnit:4,subdivision:1},name,focus,sequence:[...current.sequence],barsPerStage:current.barsPerStage,...layers};
  return {kind:'drum-rhythm',mode:'polyrhythm',pulse:{bpm:current.bpm,beats:current.secondary,beatUnit:4,subdivision:1},name,focus,primary:current.primary,secondary:current.secondary,...layers};
}

export function rhythmConfigFromProtocol(protocol:DrumRhythmProtocol,bpm=protocol.pulse.bpm):RhythmLabConfig{
  if(protocol.mode==='swing')return validateRhythmLabConfig({mode:'swing',bpm,beats:protocol.pulse.beats as SwingRhythmConfig['beats'],ratio:protocol.ratio});
  if(protocol.mode==='subdivision-switch')return validateRhythmLabConfig({mode:'subdivision-switch',bpm,beats:protocol.pulse.beats as SubdivisionSwitchRhythmConfig['beats'],sequence:[...protocol.sequence],barsPerStage:protocol.barsPerStage});
  return validateRhythmLabConfig({mode:'polyrhythm',bpm,primary:protocol.primary,secondary:protocol.secondary});
}

export function rhythmCycle(config:RhythmLabConfig):RhythmCycle{
  validateRhythmLabConfig(config);
  const beatSeconds=60/config.bpm;
  if(config.mode==='swing'){
    const events:RhythmCycleEvent[]=[];
    const offbeatPhase=config.ratio/100;
    for(let beat=0;beat<config.beats;beat++){
      const beatStart=beat*beatSeconds;
      events.push({offsetSeconds:rounded(beatStart),layer:'primary',accent:beat===0?2:1,cyclePosition:beat,beat,part:0,label:`Beat ${beat+1}`});
      events.push({offsetSeconds:rounded(beatStart+beatSeconds*offbeatPhase),layer:'secondary',accent:1,cyclePosition:beat,beat,part:1,label:`Beat ${beat+1} offbeat`});
    }
    return {durationSeconds:rounded(config.beats*beatSeconds),events,divisions:config.beats*2,summary:`${swingFeelLabel(config.ratio)} · ${config.ratio.toFixed(1)}:${(100-config.ratio).toFixed(1)}`};
  }
  if(config.mode==='subdivision-switch'){
    const events:RhythmCycleEvent[]=[];
    let offset=0,position=0;
    for(let stageIndex=0;stageIndex<config.sequence.length;stageIndex++){
      const stage=config.sequence[stageIndex]!;
      for(let bar=0;bar<config.barsPerStage;bar++){
        for(let beat=0;beat<config.beats;beat++){
          for(let part=0;part<stage;part++){
            events.push({offsetSeconds:rounded(offset+(beat+part/stage)*beatSeconds),layer:part===0?'primary':'secondary',accent:beat===0&&part===0?2:1,cyclePosition:position++,beat,part,stage:stageIndex,label:`${subdivisionName(stage)} · bar ${bar+1} · beat ${beat+1}${part?` · part ${part+1}`:''}`});
          }
        }
        offset+=config.beats*beatSeconds;
      }
    }
    return {durationSeconds:rounded(offset),events,divisions:events.length,summary:`${config.sequence.map(subdivisionName).join(' → ')} · ${config.barsPerStage} bar${config.barsPerStage===1?'':'s'} each`};
  }
  const cycleBeats=config.secondary,cycleSeconds=cycleBeats*beatSeconds,events:RhythmCycleEvent[]=[];
  for(let i=0;i<config.secondary;i++)events.push({offsetSeconds:rounded(i*cycleSeconds/config.secondary),layer:'primary',accent:i===0?2:1,cyclePosition:i,beat:i,part:0,label:`Anchor ${i+1}/${config.secondary}`});
  for(let i=0;i<config.primary;i++)events.push({offsetSeconds:rounded(i*cycleSeconds/config.primary),layer:'secondary',accent:i===0?2:1,cyclePosition:i,beat:Math.floor(i*config.secondary/config.primary),part:i,label:`Overlay ${i+1}/${config.primary}`});
  events.sort((a,b)=>a.offsetSeconds-b.offsetSeconds||(a.layer==='primary'?-1:1));
  return {durationSeconds:rounded(cycleSeconds),events,divisions:config.primary+config.secondary,summary:`${config.primary}:${config.secondary} · ${config.primary} overlay hits across ${config.secondary} quarter-note beats`};
}

export function rhythmCyclePositions(config:RhythmLabConfig):{primary:number[];secondary:number[]}{
  const cycle=rhythmCycle(config),duration=cycle.durationSeconds||1;
  return {primary:cycle.events.filter(event=>event.layer==='primary').map(event=>event.offsetSeconds/duration),secondary:cycle.events.filter(event=>event.layer==='secondary').map(event=>event.offsetSeconds/duration)};
}