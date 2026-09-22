export interface CapturedRecording {
  blob:Blob;
  mimeType:string;
  durationSeconds:number;
}

const MIME_CANDIDATES=[
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function preferredMimeType():string|undefined{
  if(typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function')return undefined;
  return MIME_CANDIDATES.find(type=>MediaRecorder.isTypeSupported(type));
}

export class PracticeRecorder {
  private stream?:MediaStream;
  private recorder?:MediaRecorder;
  private chunks:Blob[]=[];
  private startedAt=0;
  private stopping?:Promise<CapturedRecording>;

  static supported():boolean{
    return typeof MediaRecorder!=='undefined'&&!!navigator.mediaDevices?.getUserMedia;
  }
  get active():boolean{return !!this.recorder&&this.recorder.state!=='inactive';}

  async start():Promise<void>{
    if(this.active)throw new Error('A practice recording is already running.');
    if(!PracticeRecorder.supported())throw new Error('Audio recording is not supported by this browser.');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    try{
      const mimeType=preferredMimeType();
      const recorder=mimeType?new MediaRecorder(stream,{mimeType}):new MediaRecorder(stream);
      this.stream=stream;this.recorder=recorder;this.chunks=[];this.startedAt=performance.now();
      recorder.addEventListener('dataavailable',event=>{if(event.data.size)this.chunks.push(event.data);});
      recorder.start(250);
    }catch(error){
      for(const track of stream.getTracks())track.stop();
      throw error;
    }
  }

  async stop():Promise<CapturedRecording>{
    if(this.stopping)return this.stopping;
    const recorder=this.recorder;
    if(!recorder||recorder.state==='inactive')throw new Error('No practice recording is running.');
    const startedAt=this.startedAt;
    this.stopping=new Promise<CapturedRecording>((resolve,reject)=>{
      let settled=false;
      const release=()=>{for(const track of this.stream?.getTracks()??[])track.stop();this.stream=undefined;this.recorder=undefined;this.chunks=[];this.startedAt=0;};
      const fail=(message:string)=>{if(settled)return;settled=true;release();reject(new Error(message));};
      recorder.addEventListener('error',()=>fail('The browser could not finish this recording.'),{once:true});
      recorder.addEventListener('stop',()=>{
        if(settled)return;settled=true;
        const mimeType=recorder.mimeType||this.chunks[0]?.type||'audio/webm';
        const blob=new Blob(this.chunks,{type:mimeType});
        const durationSeconds=Math.max(0.01,(performance.now()-startedAt)/1000);
        release();
        if(!blob.size){reject(new Error('The recording was empty. Check microphone access and retry.'));return;}
        resolve({blob,mimeType,durationSeconds});
      },{once:true});
      try{recorder.requestData();recorder.stop();}catch{fail('The recording could not be stopped safely.');}
    }).finally(()=>{this.stopping=undefined;});
    return this.stopping;
  }

  cancel():void{
    const recorder=this.recorder;
    if(recorder&&recorder.state!=='inactive'){
      recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;
      try{recorder.stop();}catch{/* Already stopping. */}
    }
    for(const track of this.stream?.getTracks()??[])track.stop();
    this.stream=undefined;this.recorder=undefined;this.chunks=[];this.startedAt=0;this.stopping=undefined;
  }
}

export const practiceRecorder=new PracticeRecorder();
