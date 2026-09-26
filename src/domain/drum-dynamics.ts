import type { DrumDynamicsLane, DrumDynamicSurface, PracticeProtocol } from './practice-types.js';

export type DrumDynamicsPresetId='accent-tap'|'ghost-backbeat'|'dynamic-arc'|'voice-balance'|'low-volume';

export const DRUM_DYNAMIC_SURFACES:readonly {id:DrumDynamicSurface;label:string;short:string}[]=[
  {id:'snare',label:'Snare',short:'SN'},
  {id:'hihat',label:'Hi-hat',short:'HH'},
  {id:'kick',label:'Kick',short:'K'},
  {id:'ride',label:'Ride',short:'RD'},
  {id:'tom',label:'Tom',short:'T'},
];

export const DRUM_DYNAMICS_PRESETS:readonly {id:DrumDynamicsPresetId;label:string;focus:string}[]=[
  {id:'accent-tap',label:'Accent / tap control',focus:'Keep taps low and even while the strong stroke stays clearly above them without rushing.'},
  {id:'ghost-backbeat',label:'Ghost notes + backbeat',focus:'Keep ghost notes genuinely soft, backbeats clear, and the timekeeping voice unchanged.'},
  {id:'dynamic-arc',label:'Crescendo / decrescendo',focus:'Change only touch level across the phrase; timing and stroke spacing should stay unchanged.'},
  {id:'voice-balance',label:'Voice balance',focus:'Maintain a deliberate hierarchy between timekeeping, backbeat, and kick instead of letting one voice dominate.'},
  {id:'low-volume',label:'Low-volume groove',focus:'Keep every active note quiet and controlled without losing articulation, pulse, or rebound.'},
];

const surfaces:DrumDynamicSurface[]=['snare','hihat','kick','ride','tom'];
const lane=(surface:DrumDynamicSurface,count:number):DrumDynamicsLane=>({surface,steps:'.'.repeat(count)});
const lanes=(count:number)=>surfaces.map(surface=>lane(surface,count));
const row=(rows:DrumDynamicsLane[],surface:DrumDynamicSurface)=>rows.find(item=>item.surface===surface)!;
const put=(target:DrumDynamicsLane,index:number,level:'1'|'2'|'3')=>{const chars=[...target.steps];if(index>=0&&index<chars.length){chars[index]=level;target.steps=chars.join('');}};
const timeParts=(subdivision:number)=>subdivision===4?[0,2]:subdivision===3?[0,2]:subdivision===2?[0,1]:[0];

export function buildDrumDynamics(
  preset:DrumDynamicsPresetId='accent-tap',
  bpm=80,
  subdivision:1|2|3|4=4,
  variation=0,
):Extract<PracticeProtocol,{kind:'drum-dynamics'}>{
  const beats=4,count=beats*subdivision,rows=lanes(count),snare=row(rows,'snare'),hihat=row(rows,'hihat'),kick=row(rows,'kick'),ride=row(rows,'ride');
  const beat=(index:number)=>index*subdivision;
  if(preset==='accent-tap'){
    const accentPart=((variation%subdivision)+subdivision)%subdivision;
    for(let step=0;step<count;step++)put(snare,step,step%subdivision===accentPart?'3':'1');
  }else if(preset==='ghost-backbeat'){
    for(let b=0;b<beats;b++)for(const part of timeParts(subdivision))put(hihat,beat(b)+part,'2');
    put(snare,beat(1),'3');put(snare,beat(3),'3');put(kick,beat(0),'2');put(kick,beat(2),'2');
    if(subdivision>1){
      const ghostA=beat(0)+((1+variation)%subdivision),ghostB=beat(2)+((Math.max(1,subdivision-1)+variation)%subdivision);
      if(ghostA!==beat(1)&&ghostA!==beat(3))put(snare,ghostA,'1');
      if(ghostB!==beat(1)&&ghostB!==beat(3))put(snare,ghostB,'1');
    }
  }else if(preset==='dynamic-arc'){
    const levels=['1','1','2','2','3','3','2','2'] as const,reverse=variation%2===1;
    for(let step=0;step<count;step++){
      const index=Math.min(levels.length-1,Math.floor(step*levels.length/count));
      put(snare,step,levels[reverse?levels.length-1-index:index]!);
    }
  }else if(preset==='voice-balance'){
    for(let b=0;b<beats;b++)for(const part of timeParts(subdivision))put(hihat,beat(b)+part,'1');
    put(snare,beat(1),'3');put(snare,beat(3),'3');put(kick,beat(0),'2');put(kick,beat(2),'2');
    if(variation%2){for(let b=0;b<beats;b++)put(ride,beat(b),'1');}
  }else{
    for(let b=0;b<beats;b++)for(const part of timeParts(subdivision))put(hihat,beat(b)+part,'1');
    put(snare,beat(1),'1');put(snare,beat(3),'1');put(kick,beat(0),'1');put(kick,beat(2),'1');
  }
  const definition=DRUM_DYNAMICS_PRESETS.find(item=>item.id===preset)!;
  return {kind:'drum-dynamics',pulse:{bpm,beats,beatUnit:4,subdivision},name:definition.label,focus:definition.focus,lanes:rows.filter(item=>/[123]/.test(item.steps))};
}

export function cycleDrumDynamicsCell(protocol:Extract<PracticeProtocol,{kind:'drum-dynamics'}>,surface:DrumDynamicSurface,index:number):Extract<PracticeProtocol,{kind:'drum-dynamics'}>{
  const next=structuredClone(protocol),lane=next.lanes.find(item=>item.surface===surface);
  if(!lane||index<0||index>=lane.steps.length)return next;
  const chars=[...lane.steps],current=chars[index];chars[index]=current==='.'?'1':current==='1'?'2':current==='2'?'3':'.';lane.steps=chars.join('');
  return next;
}

export function drumDynamicsLevelLabel(level:string):string{
  return level==='1'?'Soft / ghost':level==='2'?'Medium':level==='3'?'Strong / accent':'Rest';
}

export function drumDynamicsText(protocol:Extract<PracticeProtocol,{kind:'drum-dynamics'}>):string{
  const labels=new Map(DRUM_DYNAMIC_SURFACES.map(item=>[item.id,item.short]));
  return protocol.lanes.map(lane=>`${labels.get(lane.surface)}  ${[...lane.steps].map(value=>value==='.'?'·':value).join(' ')}`).join('\n');
}
