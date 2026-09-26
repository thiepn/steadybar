import type { DrumGridLane, DrumGridVoice, PracticeProtocol } from './practice-types.js';

export type DrumGroovePresetId='backbeat'|'four-floor'|'half-time'|'syncopated';
export type DrumFillPresetId='alternating'|'linear-r-l-k'|'hands-kick'|'quarters';
export type DrumFillLength='beat'|'half-bar'|'bar';

export const DRUM_GROOVE_PRESETS:readonly {id:DrumGroovePresetId;label:string;focus:string}[]=[
  {id:'backbeat',label:'Straight backbeat',focus:'Keep the timekeeping voice even while the backbeat and kick stay independent.'},
  {id:'four-floor',label:'Four on the floor',focus:'Keep every quarter-note kick centered without making the hands rush.'},
  {id:'half-time',label:'Half-time backbeat',focus:'Let the phrase breathe around the beat-3 backbeat; avoid filling the space early.'},
  {id:'syncopated',label:'Syncopated kick',focus:'Keep the timekeeping voice stable while the kick moves around the beat.'},
];
export const DRUM_FILL_PRESETS:readonly {id:DrumFillPresetId;label:string;focus:string}[]=[
  {id:'alternating',label:'Alternating hands',focus:'Keep the fill spacing identical to the groove subdivision.'},
  {id:'linear-r-l-k',label:'Linear R-L-K',focus:'No two limbs together; keep every hand-foot transition evenly spaced.'},
  {id:'hands-kick',label:'Hands → kick',focus:'Keep the hand run relaxed and land the kick without shortening the final hand stroke.'},
  {id:'quarters',label:'Quarter-note setup',focus:'Use a simple sparse fill and prioritize the return to beat 1.'},
];

const voices:DrumGridVoice[]=['right-hand','left-hand','kick','hihat-foot'];
const lane=(voice:DrumGridVoice,count:number):DrumGridLane=>({voice,steps:'.'.repeat(count)});
const lanes=(count:number)=>voices.map(voice=>lane(voice,count));
const row=(rows:DrumGridLane[],voice:DrumGridVoice)=>rows.find(r=>r.voice===voice)!;
const put=(target:DrumGridLane,index:number,value:'x'|'X')=>{const chars=[...target.steps];if(index>=0&&index<chars.length){chars[index]=value;target.steps=chars.join('');}};
const timekeepingParts=(subdivision:number)=>subdivision===4?[0,2]:subdivision===3?[0,2]:subdivision===2?[0,1]:[0];

export function buildGrooveBar(preset:DrumGroovePresetId,subdivision:1|2|3|4,variation=0):DrumGridLane[]{
  const beats=4,count=beats*subdivision,rows=lanes(count),rh=row(rows,'right-hand'),lh=row(rows,'left-hand'),kick=row(rows,'kick'),foot=row(rows,'hihat-foot');
  for(let beat=0;beat<beats;beat++)for(const part of timekeepingParts(subdivision))put(rh,beat*subdivision+part,part===0&&beat===0?'X':'x');
  if(preset==='half-time')put(lh,2*subdivision,'X');
  else {put(lh,1*subdivision,'X');put(lh,3*subdivision,'X');}
  if(preset==='four-floor')for(let beat=0;beat<beats;beat++)put(kick,beat*subdivision,beat===0?'X':'x');
  else if(preset==='half-time'){put(kick,0,'X');put(kick,2*subdivision,'x');}
  else if(preset==='syncopated'){
    put(kick,0,'X');put(kick,2*subdivision,'x');
    const off=subdivision>1?Math.max(1,subdivision-1):0;
    put(kick,subdivision+((off+variation)%subdivision),'x');
    put(kick,3*subdivision+((Math.max(1,Math.floor(subdivision/2))+variation)%subdivision),'x');
  }else{
    put(kick,0,'X');put(kick,2*subdivision,'x');
    if(variation%2&&subdivision>1)put(kick,3*subdivision+Math.floor(subdivision/2),'x');
  }
  if(variation>=2)for(let beat=0;beat<beats;beat+=2)put(foot,beat*subdivision,'x');
  return rows;
}

export function buildFillBar(preset:DrumFillPresetId,subdivision:1|2|3|4,variation=0):DrumGridLane[]{
  const count=4*subdivision,rows=lanes(count),rh=row(rows,'right-hand'),lh=row(rows,'left-hand'),kick=row(rows,'kick');
  if(preset==='alternating'){
    for(let i=0;i<count;i++)put((i+variation)%2===0?rh:lh,i,i===0?'X':'x');
  }else if(preset==='linear-r-l-k'){
    const sequence=[rh,lh,kick];for(let i=0;i<count;i++)put(sequence[(i+variation)%sequence.length]!,i,i===0?'X':'x');
  }else if(preset==='hands-kick'){
    const cycle=Math.max(2,subdivision);for(let i=0;i<count;i++){const local=i%cycle;put(local===cycle-1?kick:(i%2===0?rh:lh),i,i===0?'X':'x');}
  }else{
    for(let beat=0;beat<4;beat++)put((beat+variation)%2===0?rh:lh,beat*subdivision,beat===0?'X':'x');
    put(kick,3*subdivision,'x');
  }
  return rows;
}

function fillStart(count:number,subdivision:number,length:DrumFillLength):number{
  return length==='bar'?0:length==='half-bar'?Math.floor(count/2):Math.max(0,count-subdivision);
}
function mergeFill(groove:DrumGridLane[],fill:DrumGridLane[],subdivision:number,length:DrumFillLength):DrumGridLane[]{
  const next=structuredClone(groove),count=next[0]?.steps.length??0,start=fillStart(count,subdivision,length);
  for(const target of next){
    const source=fill.find(row=>row.voice===target.voice);if(!source)continue;
    target.steps=target.steps.slice(0,start)+source.steps.slice(start);
  }
  return next;
}

export function buildDrumPhrase(
  groovePreset:DrumGroovePresetId='backbeat',
  fillPreset:DrumFillPresetId='alternating',
  bpm=80,
  subdivision:1|2|3|4=4,
  barCount:2|4|8|16=4,
  fillLength:DrumFillLength='bar',
  variation=0,
):Extract<PracticeProtocol,{kind:'drum-phrase'}>{
  const grooveDef=DRUM_GROOVE_PRESETS.find(row=>row.id===groovePreset)!,fillDef=DRUM_FILL_PRESETS.find(row=>row.id===fillPreset)!;
  const setupBars=Array.from({length:barCount},(_,index)=>{
    const groove=buildGrooveBar(groovePreset,subdivision,variation);
    if(index<barCount-1)return {role:'groove' as const,label:`Groove ${index+1}`,lanes:groove};
    const fill=buildFillBar(fillPreset,subdivision,variation);
    return {role:'fill' as const,label:fillLength==='bar'?'Fill bar':`Groove → ${fillLength==='beat'?'1-beat':'half-bar'} fill`,lanes:mergeFill(groove,fill,subdivision,fillLength)};
  });
  const returnBar={role:'return' as const,label:'Return · land beat 1',lanes:buildGrooveBar(groovePreset,subdivision,variation)};
  return {
    kind:'drum-phrase',
    pulse:{bpm,beats:4,beatUnit:4,subdivision},
    name:`${barCount}-bar ${grooveDef.label} → ${fillDef.label} + return`,
    focus:`${grooveDef.focus} ${fillDef.focus} The phrase is not complete until the return bar lands and settles back into the groove.`,
    bars:[...setupBars,returnBar],
  };
}

export function phraseBarText(bar:Extract<PracticeProtocol,{kind:'drum-phrase'}>['bars'][number]):string{
  const short:Record<DrumGridVoice,string>={'right-hand':'RH','left-hand':'LH',kick:'K','hihat-foot':'HF'};
  return bar.lanes.map(lane=>`${short[lane.voice]}  ${[...lane.steps].map(cell=>cell==='.'?'·':cell).join(' ')}`).join('\n');
}
