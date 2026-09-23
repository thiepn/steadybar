export interface TimingInputHit {
  time:number;
  strength:number;
}
export interface TimingInputCalibration {
  threshold:number;
  noisePeak:number;
  samples:number;
}

const loadedContexts=new WeakSet<AudioContext>();
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

async function ensureWorklet(context:AudioContext):Promise<void>{
  if(loadedContexts.has(context))return;
  if(!context.audioWorklet || typeof AudioWorkletNode==='undefined')throw new Error('Precision microphone timing is not supported by this browser.');
  const url=new URL('./timing-onset-worklet.js',location.href).href;
  await context.audioWorklet.addModule(url);
  loadedContexts.add(context);
}

export class MicrophoneTimingInput {
  private stream?:MediaStream;
  private source?:MediaStreamAudioSourceNode;
  private node?:AudioWorkletNode;
  private silent?:GainNode;
  private levels:number[]=[];
  private onHit?: (hit:TimingInputHit)=>void;

  static supported():boolean{
    return !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode!=='undefined';
  }
  get active():boolean{return !!this.stream;}

  async start(context:AudioContext,threshold:number,onHit?:(hit:TimingInputHit)=>void):Promise<void>{
    this.stop();
    if(!MicrophoneTimingInput.supported())throw new Error('Timing Lab needs microphone access and AudioWorklet support in this browser.');
    await ensureWorklet(context);
    const stream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},
      video:false,
    });
    try{
      const source=context.createMediaStreamSource(stream);
      const node=new AudioWorkletNode(context,'steadybar-timing-onset',{
        numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],
        processorOptions:{threshold:clamp(threshold,.001,.95),cooldownMs:45},
      });
      const silent=context.createGain();silent.gain.value=0;
      source.connect(node);node.connect(silent);silent.connect(context.destination);
      this.stream=stream;this.source=source;this.node=node;this.silent=silent;this.levels=[];this.onHit=onHit;
      node.port.onmessage=event=>{
        const message=event.data as {type?:string;time?:number;strength?:number;peak?:number};
        if(message.type==='hit'&&Number.isFinite(message.time)&&Number.isFinite(message.strength))this.onHit?.({time:message.time!,strength:message.strength!});
        if(message.type==='level'&&Number.isFinite(message.peak))this.levels.push(message.peak!);
      };
    }catch(error){
      for(const track of stream.getTracks())track.stop();
      throw error;
    }
  }

  async calibrate(context:AudioContext,durationMs=1200):Promise<TimingInputCalibration>{
    await this.start(context,.95);
    try{
      await new Promise(resolve=>setTimeout(resolve,durationMs));
      const levels=[...this.levels].sort((a,b)=>a-b),samples=levels.length;
      const index=Math.max(0,Math.ceil(samples*.95)-1),noisePeak=samples?levels[index]!:0;
      const threshold=clamp(noisePeak*3.5+.005,.015,.35);
      return {threshold:Math.round(threshold*1000)/1000,noisePeak:Math.round(noisePeak*1000)/1000,samples};
    }finally{this.stop();}
  }

  stop():void{
    if(this.node){this.node.port.onmessage=null;try{this.node.disconnect();}catch{/* Already disconnected. */}}
    try{this.source?.disconnect();}catch{/* Already disconnected. */}
    try{this.silent?.disconnect();}catch{/* Already disconnected. */}
    for(const track of this.stream?.getTracks()??[])track.stop();
    this.stream=undefined;this.source=undefined;this.node=undefined;this.silent=undefined;this.onHit=undefined;this.levels=[];
  }
}

export const timingInput=new MicrophoneTimingInput();
