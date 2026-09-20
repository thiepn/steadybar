import type { Data, PracticeBlock } from './models.js';
import type { ProtocolOutcome } from './practice-types.js';
import type { EvidenceReliability, LimitationTag, PracticeContext, PracticeResult, PracticeTargetRef, QualityDimension } from './practice-state.js';
import { contextForIntent, legacyRatingToPracticeResult, practiceTargetKey } from './practice-state.js';

export interface PracticeEvidence {
  id:string;
  profileId:string;
  targetKeys:string[];
  timestamp:string;
  source:
    | {kind:'block-evaluation';sessionId:string;blockId:string}
    | {kind:'tempo-attempt';sessionId:string;blockId:string;attemptId:string}
    | {kind:'protocol-outcome';sessionId:string;blockId:string;outcomeId:string}
    | {kind:'lesson-review';courseId:string;lessonId:string;attemptId:string}
    | {kind:'objective-measurement';measurementId:string};
  context:PracticeContext;
  reliability:EvidenceReliability;
  result?:PracticeResult;
  bpm?:number;
  limitations:LimitationTag[];
  quality?:{dimension:QualityDimension;value:1|2|3|4|5;source:'self-report'|'structured-check'|'objective'}[];
}

function blockTargets(data:Data,block:PracticeBlock):PracticeTargetRef[] {
  const targets:PracticeTargetRef[]=[];
  const push=(target:PracticeTargetRef|undefined)=>{if(target&&!targets.some(t=>practiceTargetKey(t)===practiceTargetKey(target)))targets.push(target);};
  push(block.prescriptionSnapshot?.target);
  if(block.sourceExerciseId){
    push({kind:'exercise',exerciseId:block.sourceExerciseId});
    const exercise=data.exercises.find(e=>e.id===block.sourceExerciseId);
    if(exercise?.profileId&&exercise.primarySkillId)push({kind:'skill',profileId:exercise.profileId,skillId:exercise.primarySkillId});
  }
  if(block.sourceSongId){
    if(block.sourceSongSectionId)push({kind:'song-section',songId:block.sourceSongId,partId:block.sourceSongPartId,sectionId:block.sourceSongSectionId});
    else push({kind:'song',songId:block.sourceSongId,partId:block.sourceSongPartId});
  }
  if(block.lessonSource&&block.profileId)push({kind:'lesson',profileId:block.profileId,courseId:block.lessonSource.courseId,lessonId:block.lessonSource.lessonId,revision:block.lessonSource.revision});
  return targets;
}

function context(block:PracticeBlock):PracticeContext {
  return block.evaluation?.context??contextForIntent(block.prescriptionSnapshot?.intent);
}

function outcomeQuality(outcome:ProtocolOutcome):PracticeEvidence['quality'] {
  switch(outcome.kind){
    case 'groove':return [
      {dimension:'timing',value:outcome.timing,source:'self-report'},
      {dimension:'physical-control',value:outcome.control,source:'self-report'},
      {dimension:'sound',value:outcome.articulation,source:'self-report'},
    ];
    case 'reading':return [{dimension:'musicality',value:outcome.continuity,source:'self-report'}];
    case 'voice':return [
      {dimension:'sound',value:outcome.pitch,source:'self-report'},
      {dimension:'physical-control',value:outcome.ease,source:'self-report'},
    ];
    case 'reflection':return [{dimension:'musicality',value:outcome.rating,source:'self-report'}];
    default:return undefined;
  }
}

export function evidenceFromSessions(data:Data):PracticeEvidence[] {
  const evidence:PracticeEvidence[]=[];
  for(const session of data.sessions){
    if(session.status==='active')continue;
    for(const block of session.blocks){
      const targets=blockTargets(data,block),targetKeys=targets.map(practiceTargetKey);
      if(!targetKeys.length)continue;
      const profileId=block.profileId??session.profileId;
      if(!profileId)continue;
      if(block.evaluation)evidence.push({
        id:`evaluation:${session.id}:${block.id}:${block.evaluation.id}`,
        profileId,targetKeys,timestamp:block.evaluation.timestamp,
        source:{kind:'block-evaluation',sessionId:session.id,blockId:block.id},
        context:block.evaluation.context,reliability:'self-report',result:block.evaluation.result,
        limitations:[...block.evaluation.limitations],
      });
      for(const attempt of block.tempoAttempts)evidence.push({
        id:`tempo:${session.id}:${block.id}:${attempt.id}`,
        profileId,targetKeys,timestamp:attempt.timestamp,
        source:{kind:'tempo-attempt',sessionId:session.id,blockId:block.id,attemptId:attempt.id},
        context:context(block),reliability:'legacy',result:legacyRatingToPracticeResult(attempt.rating),bpm:attempt.bpm,limitations:[],
      });
      for(const outcome of block.outcomes??[])evidence.push({
        id:`outcome:${session.id}:${block.id}:${outcome.id}`,
        profileId,targetKeys,timestamp:outcome.timestamp,
        source:{kind:'protocol-outcome',sessionId:session.id,blockId:block.id,outcomeId:outcome.id},
        context:context(block),reliability:outcome.kind==='recall'?'structured-check':'self-report',
        limitations:[],quality:outcomeQuality(outcome),
      });
    }
  }
  return evidence;
}

export function evidenceFromLessons(data:Data):PracticeEvidence[] {
  const evidence:PracticeEvidence[]=[];
  for(const progress of data.courseProgress??[]){
    for(const record of progress.lessons){
      for(const attempt of record.attempts){
        const target:PracticeTargetRef={kind:'lesson',profileId:progress.profileId,courseId:progress.courseId,lessonId:record.lessonId,revision:attempt.revision};
        evidence.push({
          id:`lesson:${progress.courseId}:${record.lessonId}:${attempt.id}`,
          profileId:progress.profileId,targetKeys:[practiceTargetKey(target)],timestamp:attempt.at,
          source:{kind:'lesson-review',courseId:progress.courseId,lessonId:record.lessonId,attemptId:attempt.id},
          context:'normal',reliability:'structured-check',result:attempt.result==='passed'?'solid':'not-yet',limitations:[],
        });
      }
    }
  }
  return evidence;
}

export function allPracticeEvidence(data:Data):PracticeEvidence[] {
  return [...evidenceFromSessions(data),...evidenceFromLessons(data)].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));
}

export function evidenceForTarget(data:Data,target:PracticeTargetRef):PracticeEvidence[] {
  const key=practiceTargetKey(target);
  return allPracticeEvidence(data).filter(e=>e.targetKeys.includes(key));
}
