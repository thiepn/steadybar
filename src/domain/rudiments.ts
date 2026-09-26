export type RudimentHand='R'|'L'|'K';
export type RudimentAccentMode='none'|'group-start'|'every-fourth';

export interface RudimentStroke {
  raw:string;
  main?:RudimentHand;
  grace:string[];
}
export interface RudimentGroup {
  strokes:RudimentStroke[];
}
export interface RudimentVisualStroke extends RudimentStroke {
  index:number;
  groupIndex:number;
  accented:boolean;
}

const swap=(char:string)=>char==='R'?'L':char==='L'?'R':char==='r'?'l':char==='l'?'r':char;

export function parseRudimentSticking(sticking:string):RudimentGroup[]{
  return sticking.trim().split(/\s{2,}/).filter(Boolean).map(group=>({
    strokes:group.trim().split(/\s+/).filter(Boolean).map(raw=>{
      const match=raw.match(/^([rl]*)([RLK])$/);
      return {raw,main:match?.[2] as RudimentHand|undefined,grace:match?.[1]?[...match[1]]:[]};
    }),
  }));
}

export function mirrorRudimentSticking(sticking:string):string {
  return sticking.replace(/\S+/g,token=>/^[RrLlK]+$/.test(token)?token.replace(/[RrLl]/g,swap):token);
}

export function rudimentVisual(sticking:string,accentMode:RudimentAccentMode):RudimentVisualStroke[] {
  const groups=parseRudimentSticking(sticking),rows:RudimentVisualStroke[]=[];
  let index=0;
  groups.forEach((group,groupIndex)=>group.strokes.forEach((stroke,strokeIndex)=>{
    const accented=accentMode==='group-start'?strokeIndex===0:accentMode==='every-fourth'?index%4===0:false;
    rows.push({...stroke,index,groupIndex,accented});index++;
  }));
  return rows;
}

export function rudimentAccentCue(mode:RudimentAccentMode):string {
  if(mode==='group-start')return 'Accent the first primary stroke of each displayed sticking group without compressing the following notes.';
  if(mode==='every-fourth')return 'Accent every fourth primary sticking position while keeping all other strokes lower and evenly spaced.';
  return 'Keep the primary strokes dynamically even unless the rudiment itself calls for a grace note.';
}

export function rudimentSubdivisionLabel(subdivision:1|2|3|4):string {
  return subdivision===1?'Quarter-note pulse':subdivision===2?'Eighth-note subdivision':subdivision===3?'Triplet subdivision':'Sixteenth-note subdivision';
}
