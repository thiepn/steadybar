import test from 'node:test';
import assert from 'node:assert/strict';
import {repertoireGuides} from '../dist/app/domain/repertoire-content.js';

for(const type of ['drums','guitar','bass','piano','voice','custom']){
  test(`${type} repertoire guide pack is bounded, actionable and source-scoped`,()=>{
    const guides=repertoireGuides(type);
    assert.equal(guides.length,4);
    assert.equal(new Set(guides.map(row=>row.id)).size,guides.length);
    assert.ok(guides.some(row=>row.scope==='song'));
    assert.ok(guides.some(row=>row.scope==='section'));
    for(const guide of guides){
      assert.ok(guide.title.length>=8);
      assert.ok(guide.summary.length>=35);
      assert.ok(guide.instructions.length>=100);
      assert.ok(guide.minutes>=5&&guide.minutes<=15);
    }
    if(type==='voice')assert.ok(guides.every(row=>/pain|comfortable|voice|harmony|breath|pitch/i.test(row.instructions)));
  });
}
