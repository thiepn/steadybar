import type { DrumGridLane, DrumGridVoice, PracticeProtocol } from './practice-types.js';

export type DrumGridPresetId='accent-grid'|'kick-displacement'|'linear-flow'|'four-limb-cycle'|'independence';
export const DRUM_GRID_PRESETS:readonly {id:DrumGridPresetId;label:string;focus:string}[]=[
  {id:'accent-grid',label:'Accent Grid',focus:'Keep unaccented strokes low and even while the accent moves through the subdivision.'},
  {id:'kick-displacement',label:'Kick Displacement',focus:'Keep the hand ostinato stable while moving kick notes without pulling the backbeat.'},
  {id:'linear-flow',label:'Linear Flow',focus:'One limb at a time. Preserve equal spacing and relaxed transitions between limbs.'},
  {id:'four-limb-cycle',label:'Four-Limb Cycle',focus:'Coordinate all four limbs while keeping the pulse and dynamic hierarchy stable.'},
  {id:'independence',label:'Independence Builder',focus:'Hold the repeating hand/foot ostinatos while the kick pattern changes underneath.'},
];
export const DRUM_GRID_VOICES:readonly {id:DrumGridVoice;label:string;short:string}[]=[
  {id:'right-hand',label:'Right hand',short:'RH'},
  {id:'left-hand',label:'Left hand',short:'LH'},
  {id:'kick',label:'Kick',short:'K'},
  {id:'hihat-foot',label:'Hi-hat foot',short:'HF'},
];

const clampComplexity=(value:number)=>Math.max(1,Math.min(5,Math.round(value)));
const lane=(voice:DrumGridVoice,count:number):DrumGridLane=>({voice,steps:'.'.repeat(count)});
const set=(row:DrumGridLane,index:number,accent=false):void=>{
  const i=((index%row.steps.length)+row.steps.length)%row.steps.length,chars=[...row.steps];
  chars[i]=accent?'X':'x';row.steps=chars.join('');
};
const row=(lanes:DrumGridLane[],voice:DrumGridVoice)=>lanes.find(l=>l.voice===voice)!;
export const drumGridStepCount=(protocol:Extract<PracticeProtocol,{kind:'drum-grid'}>):number=>protocol.pulse.beats*protocol.pulse.subdivision;

export function drumGridStepLabels(beats:number,subdivision:number):string[]{
  const parts=subdivision===4?['1','e','&','a']:subdivision===3?['1','trip','let']:subdivision===2?['1','&']:['1'];
  return Array.from({length:beats*subdivision},(_,index)=>{
    const beat=Math.floor(index/subdivision)+1,part=index%subdivision;
    return part===0?String(beat):parts[part]!;
  });
}

export function buildDrumGrid(preset:DrumGridPresetId,bpm=80,subdivision:1|2|3|4=4,variation=0,complexity=2):Extract<PracticeProtocol,{kind:'drum-grid'}>{
  const beats=4,count=beats*subdivision,c=clampComplexity(complexity),v=Math.max(0,Math.round(variation));
  const lanes=DRUM_GRID_VOICES.map(voice=>lane(voice.id,count));
  const rh=row(lanes,'right-hand'),lh=row(lanes,'left-hand'),kick=row(lanes,'kick'),foot=row(lanes,'hihat-foot');
  const beat=(n:number)=>n*subdivision;
  if(preset==='accent-grid'){
    const slot=v%subdivision,second=subdivision>1?(slot+Math.max(1,Math.floor(subdivision/2)))%subdivision:slot;
    for(let i=0;i<count;i++)set(i%2===0?rh:lh,i,i%subdivision===slot||(c>=4&&i%subdivision===second));
    if(c>=2){set(kick,beat(0),true);set(kick,beat(2));}
    if(c>=3){set(foot,beat(1));set(foot,beat(3));}
    if(c>=5){for(let b=0;b<beats;b++)set(kick,beat(b)+((slot+b)%subdivision));}
  }else if(preset==='kick-displacement'){
    const handEvery=subdivision===4?2:1;
    for(let i=0;i<count;i+=handEvery)set(rh,i,i%subdivision===0);
    set(lh,beat(1),true);set(lh,beat(3),true);
    set(kick,0,true);if(c>=2)set(kick,(v%(count-1))+1);if(c>=3)set(kick,beat(2));
    if(c>=4){set(kick,beat(1)-1);set(kick,beat(3)-1);}
    if(c>=5)for(let b=0;b<beats;b++)set(foot,beat(b),b===1||b===3);
  }else if(preset==='linear-flow'){
    const sequence:DrumGridVoice[]=c>=4?['right-hand','left-hand','kick','hihat-foot']:['right-hand','left-hand','kick'];
    for(let i=0;i<count;i++){const voice=sequence[(i+v)%sequence.length]!;set(row(lanes,voice),i,i%subdivision===0);}
    if(c>=2){set(kick,0,true);if(c>=3)set(lh,beat(3),true);}
    if(c>=5)for(let b=0;b<beats;b++)set(rh,beat(b),true);
  }else if(preset==='four-limb-cycle'){
    const sequence:DrumGridVoice[]=['right-hand','kick','left-hand','hihat-foot'];
    for(let i=0;i<count;i++)set(row(lanes,sequence[(i+v)%sequence.length]!),i,i%subdivision===0);
    if(c>=2)for(let b=0;b<beats;b++)set(rh,beat(b),true);
    if(c>=3){set(kick,beat(0),true);set(kick,beat(2));}
    if(c>=4){set(lh,beat(1),true);set(lh,beat(3),true);}
    if(c>=5)for(let b=0;b<beats;b++)set(foot,beat(b),b===1||b===3);
  }else{
    const handEvery=subdivision===4?2:1;
    for(let i=0;i<count;i+=handEvery)set(rh,i,i%subdivision===0);
    for(let b=0;b<beats;b++)set(foot,beat(b),b===1||b===3);
    set(lh,beat(1),true);set(lh,beat(3),true);
    set(kick,0,true);set(kick,(beat(2)+(v%subdivision))%count,c>=4);
    if(c>=2)set(kick,(beat(1)+((v+1)%subdivision))%count);
    if(c>=3)set(kick,(beat(3)+((v+2)%subdivision))%count);
    if(c>=5)for(let b=0;b<beats;b++)set(lh,beat(b)+((v+b)%subdivision),b===1||b===3);
  }
  const definition=DRUM_GRID_PRESETS.find(item=>item.id===preset)!;
  return {kind:'drum-grid',pulse:{bpm,beats,beatUnit:4,subdivision},name:definition.label,focus:definition.focus,lanes};
}

export function rotateDrumGrid(protocol:Extract<PracticeProtocol,{kind:'drum-grid'}>,steps=1):Extract<PracticeProtocol,{kind:'drum-grid'}>{
  const next=structuredClone(protocol),count=drumGridStepCount(next),shift=((Math.round(steps)%count)+count)%count;
  for(const lane of next.lanes)lane.steps=lane.steps.slice(shift)+lane.steps.slice(0,shift);
  return next;
}

export function mirrorDrumGrid(protocol:Extract<PracticeProtocol,{kind:'drum-grid'}>):Extract<PracticeProtocol,{kind:'drum-grid'}>{
  const next=structuredClone(protocol);
  for(const lane of next.lanes){
    if(lane.voice==='right-hand')lane.voice='left-hand';
    else if(lane.voice==='left-hand')lane.voice='right-hand';
  }
  next.lanes.sort((a,b)=>DRUM_GRID_VOICES.findIndex(v=>v.id===a.voice)-DRUM_GRID_VOICES.findIndex(v=>v.id===b.voice));
  return next;
}

export function cycleDrumGridCell(protocol:Extract<PracticeProtocol,{kind:'drum-grid'}>,voice:DrumGridVoice,index:number):Extract<PracticeProtocol,{kind:'drum-grid'}>{
  const next=structuredClone(protocol),lane=next.lanes.find(row=>row.voice===voice);
  if(!lane||index<0||index>=lane.steps.length)return next;
  const chars=[...lane.steps],current=chars[index];chars[index]=current==='.'?'x':current==='x'?'X':'.';lane.steps=chars.join('');
  return next;
}

export function drumGridText(protocol:Extract<PracticeProtocol,{kind:'drum-grid'}>):string{
  const labels=new Map(DRUM_GRID_VOICES.map(v=>[v.id,v.short]));
  return protocol.lanes.map(lane=>`${labels.get(lane.voice)}  ${[...lane.steps].map(v=>v==='.'?'·':v).join(' ')}`).join('\n');
}
