import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDrumPhrase,buildFillBar,buildGrooveBar,phraseBarText} from '../dist/app/domain/drum-phrase.js';
import {validateProtocol} from '../dist/app/domain/practice-validation.js';

test('drum phrase always contains groove, one fill, and an explicit landing bar',()=>{
  const phrase=buildDrumPhrase('backbeat','alternating',90,4,4,'bar',0);
  assert.equal(phrase.kind,'drum-phrase');assert.equal(phrase.bars.length,5);
  assert.deepEqual(phrase.bars.map(bar=>bar.role),['groove','groove','groove','fill','return']);
  assert.match(phrase.bars.at(-1).label,/land beat 1/i);
  assert.deepEqual(phrase.bars.at(-1).lanes,phrase.bars[0].lanes);
  assert.deepEqual(phrase.bars[1].lanes,phrase.bars[0].lanes);assert.deepEqual(phrase.bars[2].lanes,phrase.bars[0].lanes);
  assert.deepEqual(validateProtocol(phrase),phrase);
});

test('short fills preserve the groove before the configured fill window',()=>{
  const groove=buildGrooveBar('backbeat',4,0),fill=buildFillBar('linear-r-l-k',4,0);
  const beat=buildDrumPhrase('backbeat','linear-r-l-k',80,4,2,'beat',0).bars.at(-2);
  const half=buildDrumPhrase('backbeat','linear-r-l-k',80,4,2,'half-bar',0).bars.at(-2);
  for(const voice of ['right-hand','left-hand','kick','hihat-foot']){
    const source=groove.find(row=>row.voice===voice).steps;
    const beatSteps=beat.lanes.find(row=>row.voice===voice).steps,halfSteps=half.lanes.find(row=>row.voice===voice).steps;
    assert.equal(beatSteps.slice(0,12),source.slice(0,12));
    assert.equal(beatSteps.slice(12),fill.find(row=>row.voice===voice).steps.slice(12));
    assert.equal(halfSteps.slice(0,8),source.slice(0,8));
    assert.equal(halfSteps.slice(8),fill.find(row=>row.voice===voice).steps.slice(8));
  }
});

test('phrase generation is deterministic and variation changes authored material without removing return',()=>{
  const a=buildDrumPhrase('syncopated','hands-kick',105,3,8,'half-bar',3),b=buildDrumPhrase('syncopated','hands-kick',105,3,8,'half-bar',3),c=buildDrumPhrase('syncopated','hands-kick',105,3,8,'half-bar',4);
  assert.deepEqual(a,b);assert.notDeepEqual(a.bars[0].lanes,c.bars[0].lanes);
  assert.equal(a.bars.at(-1).role,'return');assert.equal(c.bars.at(-1).role,'return');
  assert.ok(a.bars.every(bar=>bar.lanes.every(lane=>lane.steps.length===12)));
});

test('phrase validation rejects missing landing, reordered roles and malformed lane lengths',()=>{
  const phrase=buildDrumPhrase('backbeat','alternating',80,4,4,'bar',0);
  assert.throws(()=>validateProtocol({...phrase,bars:phrase.bars.slice(0,-1)}),/return/i);
  const reordered=structuredClone(phrase);[reordered.bars[0],reordered.bars[3]]=[reordered.bars[3],reordered.bars[0]];
  assert.throws(()=>validateProtocol(reordered),/order/i);
  const malformed=structuredClone(phrase);malformed.bars[0].lanes[0].steps='x';
  assert.throws(()=>validateProtocol(malformed),/pulse length/i);
  const duplicate=structuredClone(phrase);duplicate.bars[0].lanes[1].voice=duplicate.bars[0].lanes[0].voice;
  assert.throws(()=>validateProtocol(duplicate),/unique/i);
  const noLanding=structuredClone(phrase);for(const lane of noLanding.bars.at(-1).lanes)lane.steps='.'+lane.steps.slice(1);
  assert.throws(()=>validateProtocol(noLanding),/beat 1/i);

});

test('phrase text notation names all four drum voices',()=>{
  const phrase=buildDrumPhrase('four-floor','quarters',80,2,2,'beat',0),text=phraseBarText(phrase.bars.at(-1));
  for(const label of ['RH','LH','K','HF'])assert.match(text,new RegExp('^'+label,'m'));
});
