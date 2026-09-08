import { AUDIO_LOCK, ExclusiveLease } from '../platform/locks.js';
import { frequency } from '../domain/protocols.js';
/** Short local reference tones. No microphone, network, or pitch-grading claim. */
export class ReferencePlayer {
  private context?:AudioContext;
  private nodes=new Set<OscillatorNode>();
  private generation=0;
  private lease?:ExclusiveLease;
  private finishTimer?:ReturnType<typeof setTimeout>;
  running=false;
  async play(notes:readonly number[],seconds=.7,volume=.15):Promise<void>{
    if(!notes.length||notes.length>128||notes.some(n=>!Number.isInteger(n)||n<21||n>108)||!Number.isFinite(seconds)||seconds<.2||seconds>3||!Number.isFinite(volume)||volume<0||volume>.5)throw new Error('Invalid reference pattern or volume.');
    this.stop();const generation=this.generation;
    if(!globalThis.AudioContext)throw new Error('Reference audio is unavailable. The timer and manual practice still work.');
    const context=this.context??=new AudioContext({latencyHint:'interactive'});
    const lease=new ExclusiveLease(AUDIO_LOCK,'Stop the metronome or other audio before playing a reference.');this.lease=lease;
    try{
      await context.resume();if(generation!==this.generation)return;
      await lease.acquire();if(generation!==this.generation){lease.release();return;}
      if(context.state!=='running')throw new Error('Tap the reference control again to allow browser audio.');
      this.running=true;
      context.onstatechange=()=>{if(this.running&&context.state!=='running')this.stop();};
      const start=context.currentTime+.04;
      notes.forEach((note,index)=>{
        const oscillator=context.createOscillator(),envelope=context.createGain(),at=start+index*seconds;
        oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency(note),at);
        envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(volume,at+.02);envelope.gain.setValueAtTime(volume,at+seconds*.65);envelope.gain.linearRampToValueAtTime(0,at+seconds*.92);
        oscillator.connect(envelope);envelope.connect(context.destination);this.nodes.add(oscillator);
        oscillator.onended=()=>{this.nodes.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
        oscillator.start(at);oscillator.stop(at+seconds);
      });
      this.finishTimer=setTimeout(()=>{if(generation===this.generation)this.stop();},(notes.length*seconds+.1)*1000);
    }catch(error){lease.release();if(generation!==this.generation)return;this.stop();throw error;}
  }
  stop():void{this.generation++;clearTimeout(this.finishTimer);for(const node of this.nodes){try{node.stop();}catch{/* Already ended. */}}this.nodes.clear();this.running=false;this.lease?.release();this.lease=undefined;}
}
export const reference=new ReferencePlayer();
