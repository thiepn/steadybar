import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceRemoteCommand, PRACTICE_SHORTCUTS } from '../dist/app/practice/remote.js';

const key=(code,key,extra={})=>practiceRemoteCommand({code,key,...extra});

test('practice shortcuts map transport, tempo, results and utility controls deterministically',()=>{
  assert.deepEqual(key('Space',' '),{kind:'toggle'});
  assert.deepEqual(key('PageDown','PageDown'),{kind:'toggle'});
  assert.deepEqual(key('PageUp','PageUp'),{kind:'metronome'});
  assert.deepEqual(key('ArrowUp','ArrowUp'),{kind:'tempo',delta:1});
  assert.deepEqual(key('ArrowDown','ArrowDown',{shiftKey:true}),{kind:'tempo',delta:-5});
  assert.deepEqual(key('KeyM','m'),{kind:'metronome'});
  assert.deepEqual(key('Digit1','1'),{kind:'result',result:'not-yet'});
  assert.deepEqual(key('Digit2','2'),{kind:'result',result:'usable'});
  assert.deepEqual(key('Digit3','3'),{kind:'result',result:'solid'});
  assert.deepEqual(key('KeyR','r'),{kind:'record'});
  assert.deepEqual(key('KeyR','R',{shiftKey:true}),{kind:'restart'});
  assert.deepEqual(key('KeyN','n'),{kind:'note'});
  assert.deepEqual(key('KeyF','f'),{kind:'fullscreen'});
  assert.deepEqual(key('Slash','?'),{kind:'help'});
});

test('practice shortcuts ignore modified and repeating commands',()=>{
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{repeat:true}])assert.equal(key('Space',' ',extra),undefined);
  assert.equal(key('KeyX','x'),undefined);
});

test('shortcut reference exposes every command family without hidden bindings',()=>{
  const commands=new Set(PRACTICE_SHORTCUTS.map(row=>row.command));
  for(const command of ['toggle','tempo','metronome','result','record','restart','note','fullscreen','help'])assert.ok(commands.has(command),command);
  assert.equal(PRACTICE_SHORTCUTS.filter(row=>row.command==='result').length,3);
});
