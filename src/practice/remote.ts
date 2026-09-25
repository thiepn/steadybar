import type { PracticeResult } from '../domain/practice-state.js';

export type PracticeRemoteCommand =
  | {kind:'toggle'}
  | {kind:'tempo';delta:number}
  | {kind:'metronome'}
  | {kind:'result';result:PracticeResult}
  | {kind:'record'}
  | {kind:'restart'}
  | {kind:'note'}
  | {kind:'fullscreen'}
  | {kind:'help'};

export interface PracticeShortcutInput {
  code:string;
  key:string;
  shiftKey?:boolean;
  ctrlKey?:boolean;
  metaKey?:boolean;
  altKey?:boolean;
  repeat?:boolean;
}

export interface PracticeShortcutRow {
  keys:string[];
  label:string;
  command:PracticeRemoteCommand['kind'];
}

export const PRACTICE_SHORTCUTS:readonly PracticeShortcutRow[]=[
  {keys:['Space'],label:'Start / pause practice',command:'toggle'},
  {keys:['Page Down'],label:'Start / pause · pedal-friendly alias',command:'toggle'},
  {keys:['Page Up'],label:'Toggle metronome · pedal-friendly alias',command:'metronome'},
  {keys:['↑','↓'],label:'Tempo ±1 BPM',command:'tempo'},
  {keys:['Shift','↑ / ↓'],label:'Tempo ±5 BPM',command:'tempo'},
  {keys:['M'],label:'Toggle metronome',command:'metronome'},
  {keys:['1'],label:'Finish block · Not yet',command:'result'},
  {keys:['2'],label:'Finish block · Usable',command:'result'},
  {keys:['3'],label:'Finish block · Solid',command:'result'},
  {keys:['R'],label:'Start / stop attempt recording',command:'record'},
  {keys:['Shift','R'],label:'Restart block · previous segment stays in history',command:'restart'},
  {keys:['N'],label:'Quick note',command:'note'},
  {keys:['F'],label:'Toggle fullscreen',command:'fullscreen'},
  {keys:['?'],label:'Show practice controls',command:'help'},
];

export function practiceRemoteCommand(input:PracticeShortcutInput):PracticeRemoteCommand|undefined{
  if(input.ctrlKey||input.metaKey||input.altKey||input.repeat)return undefined;
  if(input.code==='Space'||input.code==='PageDown')return {kind:'toggle'};
  if(input.code==='PageUp')return {kind:'metronome'};
  if(input.key==='ArrowUp'||input.key==='ArrowDown'){
    const amount=input.shiftKey?5:1;
    return {kind:'tempo',delta:input.key==='ArrowUp'?amount:-amount};
  }
  const key=input.key.toLowerCase();
  if(key==='m')return {kind:'metronome'};
  if(key==='1')return {kind:'result',result:'not-yet'};
  if(key==='2')return {kind:'result',result:'usable'};
  if(key==='3')return {kind:'result',result:'solid'};
  if(key==='r'&&input.shiftKey)return {kind:'restart'};
  if(key==='r')return {kind:'record'};
  if(key==='n')return {kind:'note'};
  if(key==='f')return {kind:'fullscreen'};
  if(input.key==='?'||(input.shiftKey&&input.key==='/'))return {kind:'help'};
  return undefined;
}
