import test from 'node:test';
import assert from 'node:assert/strict';
import {
  challengeDirection, masteryFromEvidence, nextReviewAt, reviewDue, tempoLevels, validRetentionEvidence
} from '../dist/app/domain/mastery-engine.js';

const target={kind:'exercise',exerciseId:'exercise-1'};
let serial=0;
function e(at,result,{context='normal',reliability='self-report',bpm,limitations=[]}={}){
  const id=`e-${++serial}`;
  return {
    id,profileId:'profile-drums',targetKeys:['exercise|exercise-1'],targets:[target],timestamp:at,
    source:{kind:'objective-measurement',measurementId:id},context,practiced:true,reliability,result,
    ...(bpm===undefined?{}:{bpm}),limitations,
  };
}

test('no evidence is discover; legacy-only evidence remains honestly unassessed',()=>{
  assert.equal(masteryFromEvidence([]),'discover');
  const legacy=[e('2026-09-01T10:00:00.000Z','solid',{reliability:'legacy',bpm:120})];
  assert.equal(masteryFromEvidence(legacy),'unassessed');
  assert.equal(nextReviewAt(legacy,'unassessed'),undefined);
});

test('new evidence progresses learn → build → stabilize without claiming retention',()=>{
  assert.equal(masteryFromEvidence([e('2026-09-01T10:00:00.000Z','not-yet')]),'learn');
  assert.equal(masteryFromEvidence([e('2026-09-01T10:00:00.000Z','usable')]),'build');
  assert.equal(masteryFromEvidence([e('2026-09-01T10:00:00.000Z','solid')]),'stabilize');
});

test('repeatable solid work on separated occasions enters Retest and schedules a later cold check',()=>{
  const events=[e('2026-09-01T08:00:00.000Z','solid'),e('2026-09-02T08:00:00.000Z','solid')];
  assert.equal(masteryFromEvidence(events),'retest');
  assert.equal(nextReviewAt(events,'retest'),'2026-09-05T08:00:00.000Z');
});

test('a genuine later cold success proves retention and moves to Apply',()=>{
  const events=[e('2026-09-01T08:00:00.000Z','solid'),e('2026-09-02T08:00:00.000Z','solid',{context:'cold'})];
  assert.equal(masteryFromEvidence(events),'apply');
  assert.deepEqual(validRetentionEvidence(events),{cold:1,transfer:0});
  assert.equal(nextReviewAt(events,'apply'),'2026-09-05T08:00:00.000Z');
});

test('solid transfer after retained performance enters Maintain',()=>{
  const events=[
    e('2026-09-01T08:00:00.000Z','solid'),
    e('2026-09-02T08:00:00.000Z','solid',{context:'cold'}),
    e('2026-09-03T08:00:00.000Z','solid',{context:'transfer'}),
  ];
  assert.equal(masteryFromEvidence(events),'maintain');
  assert.deepEqual(validRetentionEvidence(events),{cold:1,transfer:1});
  assert.equal(nextReviewAt(events,'maintain'),'2026-09-10T08:00:00.000Z');
});

test('successful maintenance expands review spacing conservatively',()=>{
  const base=[
    e('2026-09-01T08:00:00.000Z','solid'),
    e('2026-09-02T08:00:00.000Z','solid',{context:'cold'}),
    e('2026-09-03T08:00:00.000Z','solid',{context:'transfer'}),
  ];
  const once=[...base,e('2026-09-10T08:00:00.000Z','solid',{context:'maintenance'})];
  const twice=[...once,e('2026-09-24T08:00:00.000Z','solid',{context:'maintenance'})];
  const thrice=[...twice,e('2026-10-24T08:00:00.000Z','solid',{context:'maintenance'})];
  assert.equal(nextReviewAt(once,'maintain'),'2026-09-24T08:00:00.000Z');
  assert.equal(nextReviewAt(twice,'maintain'),'2026-10-24T08:00:00.000Z');
  assert.equal(nextReviewAt(thrice,'maintain'),'2026-12-23T08:00:00.000Z');
});

test('one bad retained-skill day does not erase mastery; repeated weakness at the established level does',()=>{
  const base=[
    e('2026-09-01T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-02T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-03T08:00:00.000Z','solid',{context:'cold',bpm:100}),
    e('2026-09-04T08:00:00.000Z','solid',{context:'transfer',bpm:100}),
  ];
  const one=[...base,e('2026-09-10T08:00:00.000Z','not-yet',{bpm:100})];
  const two=[...one,e('2026-09-11T08:00:00.000Z','not-yet',{bpm:100})];
  assert.equal(masteryFromEvidence(one),'maintain');
  assert.equal(nextReviewAt(one,'maintain'),'2026-09-11T08:00:00.000Z');
  assert.equal(masteryFromEvidence(two),'build');
  assert.equal(challengeDirection(two),'reduce');
});

test('failed experiments above working tempo do not demote an established skill',()=>{
  const base=[
    e('2026-09-01T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-02T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-03T08:00:00.000Z','solid',{context:'cold',bpm:100}),
    e('2026-09-04T08:00:00.000Z','solid',{context:'transfer',bpm:100}),
  ];
  const experiments=[...base,e('2026-09-10T08:00:00.000Z','not-yet',{bpm:120}),e('2026-09-11T08:00:00.000Z','not-yet',{bpm:120})];
  assert.equal(tempoLevels(experiments).working,100);
  assert.equal(masteryFromEvidence(experiments),'maintain');
  assert.equal(challengeDirection(experiments),'hold');
});

test('tempo levels keep lifetime peak separate from repeated working and cold reliability',()=>{
  const events=[
    e('2026-08-01T08:00:00.000Z','solid',{reliability:'legacy',bpm:130}),
    e('2026-09-01T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-02T08:00:00.000Z','solid',{bpm:100}),
    e('2026-09-03T08:00:00.000Z','solid',{context:'cold',bpm:90}),
    e('2026-09-04T08:00:00.000Z','solid',{context:'cold',bpm:90}),
  ];
  assert.deepEqual(tempoLevels(events),{
    peak:130,peakAt:'2026-08-01T08:00:00.000Z',
    working:100,workingAt:'2026-09-02T08:00:00.000Z',
    cold:90,coldAt:'2026-09-04T08:00:00.000Z',
  });
  const stronger=[...events,e('2026-09-05T08:00:00.000Z','solid',{context:'cold',bpm:110}),e('2026-09-06T08:00:00.000Z','solid',{context:'cold',bpm:110})];
  const levels=tempoLevels(stronger);assert.equal(levels.peak,130);assert.equal(levels.cold,110);assert.equal(levels.working,110);
});

test('a single cold success can prove retention but does not yet claim cold-reliable tempo',()=>{
  const events=[e('2026-09-01T08:00:00.000Z','solid',{bpm:100}),e('2026-09-02T08:00:00.000Z','solid',{context:'cold',bpm:100})];
  assert.equal(masteryFromEvidence(events),'apply');
  assert.equal(tempoLevels(events).cold,undefined);
});

test('challenge advances only after separated solid evidence and otherwise holds',()=>{
  const close=[e('2026-09-01T08:00:00.000Z','solid'),e('2026-09-01T10:00:00.000Z','solid')];
  const separated=[e('2026-09-01T08:00:00.000Z','solid'),e('2026-09-02T08:00:00.000Z','solid')];
  assert.equal(challengeDirection(close),'hold');
  assert.equal(challengeDirection(separated),'advance');
});

test('review due is a scheduling signal, not automatic skill decay',()=>{
  const state={nextReviewAt:'2026-09-10T08:00:00.000Z'};
  assert.equal(reviewDue(state,'2026-09-10T07:59:59.999Z'),false);
  assert.equal(reviewDue(state,'2026-09-10T08:00:00.000Z'),true);
  assert.equal(reviewDue(state,'2026-09-30T08:00:00.000Z'),true);
});
