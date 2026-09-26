import test from 'node:test';
import assert from 'node:assert/strict';
import {mirrorRudimentSticking,parseRudimentSticking,rudimentAccentCue,rudimentSubdivisionLabel,rudimentVisual} from '../dist/app/domain/rudiments.js';

test('rudiment parser preserves displayed groups and separates grace notes from primary strokes',()=>{
  const groups=parseRudimentSticking('lR L R  rrL R');
  assert.equal(groups.length,2);
  assert.deepEqual(groups[0].strokes.map(s=>({raw:s.raw,main:s.main,grace:s.grace})),[
    {raw:'lR',main:'R',grace:['l']},{raw:'L',main:'L',grace:[]},{raw:'R',main:'R',grace:[]},
  ]);
  assert.deepEqual(groups[1].strokes[0],{raw:'rrL',main:'L',grace:['r','r']});
});

test('rudiment mirroring swaps right and left in primary and grace strokes without changing grouping',()=>{
  assert.equal(mirrorRudimentSticking('R L R R  lR rrL'),'L R L L  rL llR');
  assert.equal(mirrorRudimentSticking(mirrorRudimentSticking('R L R R  lR rrL')),'R L R R  lR rrL');
  assert.equal(mirrorRudimentSticking('R L custom-label'),'L R custom-label');
});

test('rudiment accent modes mark only primary sticking positions deterministically',()=>{
  const sticking='R L R R  L R L L';
  assert.deepEqual(rudimentVisual(sticking,'none').filter(s=>s.accented).map(s=>s.index),[]);
  assert.deepEqual(rudimentVisual(sticking,'group-start').filter(s=>s.accented).map(s=>s.index),[0,4]);
  assert.deepEqual(rudimentVisual(sticking,'every-fourth').filter(s=>s.accented).map(s=>s.index),[0,4]);
  assert.equal(rudimentVisual('R L R L R L','every-fourth').filter(s=>s.accented).length,2);
});

test('rudiment helpers describe practice cues without implying automatic grading',()=>{
  assert.match(rudimentAccentCue('group-start'),/Accent the first primary stroke/i);
  assert.match(rudimentAccentCue('none'),/dynamically even/i);
  assert.equal(rudimentSubdivisionLabel(2),'Eighth-note subdivision');
  assert.equal(rudimentSubdivisionLabel(3),'Triplet subdivision');
  assert.equal(rudimentSubdivisionLabel(4),'Sixteenth-note subdivision');
});

test('empty or unknown sticking remains safe to render',()=>{
  assert.deepEqual(parseRudimentSticking(''),[]);
  const rows=rudimentVisual('R ? L','none');
  assert.equal(rows.length,3);
  assert.equal(rows[1].main,undefined);
  assert.equal(rows[1].raw,'?');
});
