import { midiDeviceKey } from '../domain/midi-analysis.js';

export interface MidiInputDescriptor {
  id:string;
  name:string;
  manufacturer:string;
  state:string;
  connection:string;
  deviceKey:string;
}
export interface MidiNoteEvent {
  time:number;
  note:number;
  velocity:number;
  channel:number;
  receivedTime:number;
}
interface MidiMessageLike {
  data?:Uint8Array;
  receivedTime?:number;
  timeStamp:number;
}
interface MidiInputLike {
  id:string;
  name?:string|null;
  manufacturer?:string|null;
  state?:string;
  connection?:string;
  onmidimessage:((event:MidiMessageLike)=>void)|null;
  open?:()=>Promise<unknown>;
  close?:()=>Promise<unknown>;
}
interface MidiAccessLike {
  inputs:Map<string,MidiInputLike>;
  onstatechange:((event:unknown)=>void)|null;
}
type MidiNavigator=Navigator&{requestMIDIAccess?:(options?:{sysex?:boolean;software?:boolean})=>Promise<MidiAccessLike>};

export function parseMidiNoteMessage(event:MidiMessageLike):Omit<MidiNoteEvent,'time'>|undefined{
  const data=event.data;if(!data||data.length<3)return undefined;
  const status=data[0]!,command=status&0xf0,channel=(status&0x0f)+1,note=data[1]!,velocity=data[2]!;
  if(command!==0x90||velocity===0)return undefined;
  if(note<0||note>127||velocity<1||velocity>127)return undefined;
  const receivedTime=Number.isFinite(event.receivedTime)?event.receivedTime!:event.timeStamp;
  return {note,velocity,channel,receivedTime};
}

export function midiTimestampToAudioTime(receivedTime:number,performanceAnchor:number,audioAnchor:number):number{
  return audioAnchor+(receivedTime-performanceAnchor)/1000;
}

export class MidiInputManager {
  private access?:MidiAccessLike;
  private active?:MidiInputLike;
  private stateListener?:()=>void;

  static supported():boolean{return typeof (navigator as MidiNavigator).requestMIDIAccess==='function';}

  async request():Promise<MidiInputDescriptor[]>{
    const request=(navigator as MidiNavigator).requestMIDIAccess;
    if(!request)throw new Error('Web MIDI is not supported by this browser. Use a Chromium-based browser for MIDI drum input.');
    try{
      this.access=await request.call(navigator,{sysex:false,software:false});
      this.access.onstatechange=()=>this.stateListener?.();
      return this.inputs();
    }catch(error){
      if(error instanceof DOMException&&error.name==='SecurityError')throw new Error('MIDI access is blocked in this browser or context. Use Steadybar over HTTPS in a Web MIDI-capable browser.');
      if(error instanceof DOMException&&error.name==='NotAllowedError')throw new Error('MIDI permission was denied. Allow MIDI device access, then retry.');
      throw new Error(error instanceof Error?`MIDI access failed: ${error.message}`:'MIDI access failed.');
    }
  }

  inputs():MidiInputDescriptor[]{
    if(!this.access)return [];
    return [...this.access.inputs.values()].map(input=>({
      id:input.id,name:(input.name??'MIDI input').trim()||'MIDI input',manufacturer:(input.manufacturer??'').trim(),
      state:input.state??'unknown',connection:input.connection??'unknown',
      deviceKey:midiDeviceKey(input.manufacturer??'',input.name??'MIDI input'),
    })).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  }

  onStateChange(listener:(inputs:MidiInputDescriptor[])=>void):()=>void{
    this.stateListener=()=>listener(this.inputs());
    return ()=>{if(this.stateListener)this.stateListener=undefined;};
  }

  async listen(inputId:string,context:AudioContext,onNote:(event:MidiNoteEvent)=>void):Promise<MidiInputDescriptor>{
    if(!this.access)await this.request();
    this.stopListening();
    const input=this.access?.inputs.get(inputId);
    if(!input)throw new Error('That MIDI input is no longer connected. Refresh the device list and choose an available input.');
    await input.open?.();
    const performanceAnchor=performance.now(),audioAnchor=context.currentTime;
    input.onmidimessage=(event)=>{
      const parsed=parseMidiNoteMessage(event);if(!parsed)return;
      onNote({...parsed,time:midiTimestampToAudioTime(parsed.receivedTime,performanceAnchor,audioAnchor)});
    };
    this.active=input;
    return {
      id:input.id,name:(input.name??'MIDI input').trim()||'MIDI input',manufacturer:(input.manufacturer??'').trim(),
      state:input.state??'unknown',connection:input.connection??'unknown',deviceKey:midiDeviceKey(input.manufacturer??'',input.name??'MIDI input'),
    };
  }

  stopListening():void{
    if(this.active)this.active.onmidimessage=null;
    this.active=undefined;
  }

  async close():Promise<void>{
    const active=this.active;this.stopListening();
    try{await active?.close?.();}catch{/* Device may already be disconnected. */}
    if(this.access)this.access.onstatechange=null;
    this.access=undefined;this.stateListener=undefined;
  }
}

export const midiInput=new MidiInputManager();
