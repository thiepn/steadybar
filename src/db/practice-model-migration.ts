import type { Data, Exercise, PracticeSession } from '../domain/models.js';
import type { PracticeState } from '../domain/practice-state.js';
import { legacyRatingToPracticeResult, practiceTargetKey } from '../domain/practice-state.js';
import { skillIdForExercise } from '../domain/skill-graph.js';

function latest(values:(string|undefined)[]):string|undefined {
  return values.filter((v):v is string=>!!v).sort().at(-1);
}

function withSkill(exercise:Exercise,data:Data):Exercise {
  if(exercise.primarySkillId)return exercise;
  const profile=data.profiles?.find(p=>p.id===exercise.profileId);
  const primarySkillId=profile?skillIdForExercise(profile.instrumentType,exercise.skillArea,exercise.category):undefined;
  return primarySkillId?{...exercise,primarySkillId}:exercise;
}

function sessionsForExercise(sessions:PracticeSession[],exerciseId:string){
  return sessions.filter(session=>session.status!=='active').flatMap(session=>
    session.blocks.filter(block=>block.sourceExerciseId===exerciseId).map(block=>({session,block})));
}

export function migratePracticeModel(input:Data):Data {
  const data=structuredClone(input);
  if(data.schemaVersion!==2)return data;
  data.practiceModelVersion=1;
  data.priorityCycles??=[];
  data.exercises=data.exercises.map(exercise=>withSkill(exercise,data));
  if(data.practiceStates)return data;

  const states:PracticeState[]=[];
  const exercises=[...data.exercises].sort((a,b)=>a.id.localeCompare(b.id));
  for(const exercise of exercises){
    const rows=sessionsForExercise(data.sessions,exercise.id);
    if(!rows.length)continue;
    const attempts=rows.flatMap(({block})=>block.tempoAttempts).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
    const outcomes=rows.flatMap(({block})=>block.outcomes??[]);
    const evaluations=rows.flatMap(({block})=>block.evaluation?[block.evaluation]:[]);
    const lastPracticedAt=latest(rows.map(({session,block})=>block.endedAt??block.startedAt??session.endedAt??session.startedAt));
    const lastEvaluatedAt=latest([...attempts.map(a=>a.timestamp),...outcomes.map(o=>o.timestamp),...evaluations.map(e=>e.timestamp)]);
    const peakAttempts=attempts.filter(a=>a.rating==='clean'||a.rating==='effortless');
    const peak=peakAttempts.reduce<{bpm:number;at:string}|undefined>((best,a)=>!best||a.bpm>best.bpm?{bpm:a.bpm,at:a.timestamp}:best,undefined);
    const resultEvents=[
      ...attempts.map(a=>({at:a.timestamp,result:legacyRatingToPracticeResult(a.rating)})),
      ...evaluations.map(e=>({at:e.timestamp,result:e.result})),
    ].sort((a,b)=>a.at.localeCompare(b.at));
    const recent=resultEvents.slice(-10).reduce((sum,row)=>{
      if(row.result==='solid')sum.solid++;
      else if(row.result==='usable')sum.usable++;
      else sum.notYet++;
      return sum;
    },{solid:0,usable:0,notYet:0});
    const target={kind:'exercise' as const,exerciseId:exercise.id};
    const derivedAt=lastEvaluatedAt??lastPracticedAt??exercise.updatedAt;
    states.push({
      id:`legacy-state-${states.length+1}`,
      createdAt:exercise.createdAt,
      updatedAt:derivedAt,
      profileId:exercise.profileId!,
      targetKey:practiceTargetKey(target),
      target,
      mastery:'unassessed',
      ...(lastPracticedAt?{lastPracticedAt}:{}),
      ...(lastEvaluatedAt?{lastEvaluatedAt}:{}),
      ...(resultEvents.at(-1)?{latestResult:resultEvents.at(-1)!.result}:{}),
      limitations:[],
      evidenceCount:attempts.length+outcomes.length+evaluations.length,
      ...(peak?{tempo:{peak:peak.bpm,peakAt:peak.at}}:{}),
      recent,
      scheduling:{consecutiveSkips:0,manualPriority:0},
      engine:{version:1,derivedAt},
    });
  }
  data.practiceStates=states;
  return data;
}
