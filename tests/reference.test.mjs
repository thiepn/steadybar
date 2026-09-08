/** Scheduling/cancellation tests against a deterministic Web Audio test double.
 * Real browser audio remains covered separately; these are not latency measurements. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {ReferencePlayer} from '../dist/app/audio/reference.js';
const players=[];let contexts=[];
class Context {
 constructor(){this.state='running';this.currentTime=10;this.destination={};this.events=[];contexts.push(this);}
 async resume(){}
 createOscillator(){const c=this;return {frequency:{setValueAtTime(value,time){c.events.push({frequency:value,time});}},connect(){},disconnect(){},start(time){c.events.push({start:time});},stop(time){if(time===undefined)this.onended?.();},onended:undefined};}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
}
const player=()=>{globalThis.AudioContext=Context;contexts=[];const p=new ReferencePlayer();players.push(p);return p;};
afterEach(()=>{for(const p of players)p.stop();players.length=0;delete globalThis.AudioContext;});
test('reference notes schedule actual equal-tempered frequencies on the audio clock',async()=>{
 const p=player();await p.play([69,72,76],.5);assert.equal(p.running,true);const events=contexts[0].events;
 assert.equal(events.find(e=>e.frequency).frequency,440);assert.deepEqual(events.filter(e=>'start' in e).map(e=>e.start),[10.04,10.54,11.04]);
 p.stop();assert.equal(p.running,false);
});
test('reference stop cancels delayed browser activation without scheduling later sound',async()=>{
 const p=player();let release;Context.prototype.resume=function(){return new Promise(r=>release=r);};
 const pending=p.play([60]);p.stop();release();await pending;assert.equal(p.running,false);assert.equal(contexts[0].events.length,0);
 Context.prototype.resume=async function(){};
});
test('an older delayed reference cannot stop a newer valid reference',async()=>{
 const p=player();let release;let calls=0;Context.prototype.resume=function(){if(calls++===0)return new Promise(r=>release=r);return Promise.resolve();};
 const first=p.play([60]);const second=p.play([69]);await second;assert.equal(p.running,true);release();await first;assert.equal(p.running,true);
 assert.equal(contexts[0].events.filter(e=>e.frequency).length,1);assert.equal(contexts[0].events.find(e=>e.frequency).frequency,440);
 Context.prototype.resume=async function(){};
});
test('reference interruption stops sound rather than allowing a stale timer to resume it',async()=>{
 const p=player();await p.play([60,64]);contexts[0].state='suspended';contexts[0].onstatechange();assert.equal(p.running,false);
});
test('reference validation rejects impossible notes, unbounded patterns and excessive gain',async()=>{
 const p=player();for(const args of [[[],.7,.1],[[20],.7,.1],[[109],.7,.1],[[60.5],.7,.1],[[60],0,.1],[[60],.7,1],[[60],NaN,.1],[Array(129).fill(60),.7,.1]])await assert.rejects(p.play(...args),/Invalid/);
});
