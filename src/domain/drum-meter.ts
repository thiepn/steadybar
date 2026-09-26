import type { Accent } from './models.js';
import type { DrumGridLane, DrumGridVoice, PracticeProtocol } from './practice-types.js';

export type DrumMeterPresetId=
  | '5-8-2-3' | '5-8-3-2'
  | '7-8-2-2-3' | '7-8-2-3-2' | '7-8-3-2-2'
  | '9-8-3-3-3' | '9-8-2-2-2-3'
  | '5-4-3-2' | '5-4-2-3'
  | '7-4-4-3';
export type DrumMeterPatternId='count'|'anchors'|'start-end'|'alternating-groups';

export interface DrumMeterPreset {
  id:DrumMeterPresetId;
  label:string;
  beats:number;
  beatUnit:4|8;
  grouping:number[];
  defaultBpm:number;
  focus:string;
}

export const DRUM_METER_PRESETS:readonly DrumMeterPreset[]=[
  {id:'5-8-2-3',label:'5/8 · 2+3',beats:5,beatUnit:8,grouping:[2,3],defaultBpm:110,focus:'Hear two clear groups without adding or stealing an eighth note at the boundary.'},
  {id:'5-8-3-2',label:'5/8 · 3+2',beats:5,beatUnit:8,grouping:[3,2],defaultBpm:110,focus:'Keep the three-note group relaxed and let the shorter two-note group arrive without rushing.'},
  {id:'7-8-2-2-3',label:'7/8 · 2+2+3',beats:7,beatUnit:8,grouping:[2,2,3],defaultBpm:105,focus:'Preserve the two short groups and one long group as one repeating phrase.'},
  {id:'7-8-2-3-2',label:'7/8 · 2+3+2',beats:7,beatUnit:8,grouping:[2,3,2],defaultBpm:105,focus:'Keep the middle three-note group centered; do not compress the final pair.'},
  {id:'7-8-3-2-2',label:'7/8 · 3+2+2',beats:7,beatUnit:8,grouping:[3,2,2],defaultBpm:105,focus:'Let the opening three-note group establish the phrase while both following pairs stay equal.'},
  {id:'9-8-3-3-3',label:'9/8 · 3+3+3',beats:9,beatUnit:8,grouping:[3,3,3],defaultBpm:105,focus:'Keep all three compound groups equal and resist turning the phrase into uneven 2+ patterns.'},
  {id:'9-8-2-2-2-3',label:'9/8 · 2+2+2+3',beats:9,beatUnit:8,grouping:[2,2,2,3],defaultBpm:105,focus:'Hold three short groups before the longer ending group without accelerating into the bar line.'},
  {id:'5-4-3-2',label:'5/4 · 3+2',beats:5,beatUnit:4,grouping:[3,2],defaultBpm:80,focus:'Keep the quarter-note pulse unchanged while the larger 3+2 phrase remains obvious.'},
  {id:'5-4-2-3',label:'5/4 · 2+3',beats:5,beatUnit:4,grouping:[2,3],defaultBpm:80,focus:'Keep the two-beat opening group and three-beat answer equally grounded.'},
  {id:'7-4-4-3',label:'7/4 · 4+3',beats:7,beatUnit:4,grouping:[4,3],defaultBpm:76,focus:'Keep seven quarter notes continuous while the 4+3 phrase shape stays audible.'},
];

export const DRUM_METER_PATTERNS:readonly {id:DrumMeterPatternId;label:string;focus:string}[]=[
  {id:'count',label:'Subdivision count',focus:'One hand carries every subdivision; group starts are accented.'},
  {id:'anchors',label:'Group-start anchors',focus:'Keep continuous timekeeping while kick or hi-hat foot marks each group start.'},
  {id:'start-end',label:'Starts + endings',focus:'Anchor each group start and place the opposite hand on the final beat of each group.'},
  {id:'alternating-groups',label:'Alternating groups',focus:'Alternate the timekeeping hand from group to group while preserving identical subdivision spacing.'},
];

const voices:DrumGridVoice[]=['right-hand','left-hand','kick','hihat-foot'];
const lanes=(count:number):DrumGridLane[]=>voices.map(voice=>({voice,steps:'.'.repeat(count)}));
const lane=(rows:DrumGridLane[],voice:DrumGridVoice)=>rows.find(row=>row.voice===voice)!;
const put=(target:DrumGridLane,index:number,value:'x'|'X')=>{
  const chars=[...target.steps];
  if(index>=0&&index<chars.length){chars[index]=value;target.steps=chars.join('');}
};
export function drumMeterGroupStarts(grouping:readonly number[]):number[]{
  const starts:number[]=[];let cursor=0;
  for(const size of grouping){starts.push(cursor);cursor+=size;}
  return starts;
}
export function drumMeterAccents(grouping:readonly number[]):Accent[]{
  const beats=grouping.reduce((sum,value)=>sum+value,0),starts=new Set(drumMeterGroupStarts(grouping));
  return Array.from({length:beats},(_,index)=>starts.has(index)?2:1);
}
export function drumMeterGroupingText(grouping:readonly number[]):string{return grouping.join('+');}
export function drumMeterStepGroupStarts(grouping:readonly number[],subdivision:number):number[]{
  return drumMeterGroupStarts(grouping).map(beat=>beat*subdivision);
}

export function buildDrumMeter(
  presetId:DrumMeterPresetId='7-8-2-2-3',
  pattern:DrumMeterPatternId='anchors',
  bpm?:number,
  subdivision:1|2|3|4=1,
  variation=0,
):Extract<PracticeProtocol,{kind:'drum-meter'}>{
  const preset=DRUM_METER_PRESETS.find(row=>row.id===presetId)!;
  const count=preset.beats*subdivision,rows=lanes(count),rh=lane(rows,'right-hand'),lh=lane(rows,'left-hand'),kick=lane(rows,'kick'),foot=lane(rows,'hihat-foot');
  const starts=drumMeterGroupStarts(preset.grouping),anchor=variation%2?kick:foot;
  const fillHand=(target:DrumGridLane,startBeat:number,size:number,strongStart=true)=>{
    for(let step=startBeat*subdivision;step<(startBeat+size)*subdivision;step++)put(target,step,strongStart&&step===startBeat*subdivision?'X':'x');
  };
  if(pattern==='count'){
    fillHand(variation%2?lh:rh,0,preset.beats,true);
    for(const start of starts)put(variation%2?lh:rh,start*subdivision,'X');
  }else if(pattern==='alternating-groups'){
    let cursor=0;
    preset.grouping.forEach((size,index)=>{fillHand((index+variation)%2?lh:rh,cursor,size,true);put(kick,cursor*subdivision,index===0?'X':'x');cursor+=size;});
  }else{
    fillHand(rh,0,preset.beats,true);
    for(const start of starts){put(rh,start*subdivision,'X');put(anchor,start*subdivision,start===0?'X':'x');}
    if(pattern==='start-end'){
      let cursor=0;
      for(const size of preset.grouping){const finalBeat=cursor+size-1;put(lh,finalBeat*subdivision,'x');cursor+=size;}
    }
  }
  const patternDef=DRUM_METER_PATTERNS.find(row=>row.id===pattern)!;
  return {
    kind:'drum-meter',
    pulse:{bpm:bpm??preset.defaultBpm,beats:preset.beats,beatUnit:preset.beatUnit,subdivision},
    name:`${preset.label} · ${patternDef.label}`,
    focus:`${preset.focus} ${patternDef.focus}`,
    grouping:[...preset.grouping],
    lanes:rows.filter(row=>/[xX]/.test(row.steps)),
  };
}

export function drumMeterText(protocol:Extract<PracticeProtocol,{kind:'drum-meter'}>):string{
  const short:Record<DrumGridVoice,string>={'right-hand':'RH','left-hand':'LH',kick:'K','hihat-foot':'HF'};
  return protocol.lanes.map(row=>`${short[row.voice]}  ${[...row.steps].map(cell=>cell==='.'?'·':cell).join(' ')}`).join('\n');
}
