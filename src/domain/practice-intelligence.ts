import type { Data, ExerciseProgression } from './models.js';
import type { LimitationTag, PracticeState, PracticeTargetRef } from './practice-state.js';
import { buildPracticeDiagnostics, type PracticeDiagnostics } from './practice-diagnostics.js';
import { buildExerciseProgression } from './progression-engine.js';
import { rankPracticeTargets, type PriorityCandidate, type PriorityFactorCode } from './priority-engine.js';
import { activeProfile, profileView } from './profiles.js';
import { practiceTargetKey } from './practice-state.js';
import { skillDefinition, skillDefinitionsFor } from './skill-graph.js';
import { learningTarget, lessonStatus, progressFor, recordFor } from '../learning/engine.js';

export const PRACTICE_INTELLIGENCE_ENGINE_VERSION=1 as const;

export type IntelligenceAction='repair'|'retest'|'stabilize'|'apply'|'maintain'|'explore';
export type IntelligenceConfidence='low'|'medium'|'high';
export type RecommendationBand='now'|'soon'|'later';
export type ProgressionDecision='progress'|'hold'|'consolidate'|'regress';

export interface SkillEvidenceSummary {
  targetCount:number;
  evaluatedTargets:number;
  evidenceCount:number;
  notYet:number;
  usable:number;
  solid:number;
  dueReviews:number;
  reduce:number;
  advance:number;
  neglected:number;
  recurringLimitations:{tag:LimitationTag;count:number;evaluatedBlocks:number}[];
}
export interface SkillAssessment {
  skillId:string;
  label:string;
  action:IntelligenceAction;
  band:RecommendationBand;
  confidence:IntelligenceConfidence;
  decision:ProgressionDecision;
  reasons:string[];
  examples:string[];
  evidence:SkillEvidenceSummary;
}
export interface PracticeRecommendation {
  source:'practice-target'|'lesson';
  target:PracticeTargetRef;
  targetKey:string;
  label:string;
  band:RecommendationBand;
  action:IntelligenceAction;
  confidence:IntelligenceConfidence;
  decision:ProgressionDecision;
  reasons:string[];
  evidence:string[];
  skillIds:string[];
  progression?:ExerciseProgression;
}
export interface PracticeIntelligence {
  engineVersion:1;
  profileId:string;
  generatedAt:string;
  diagnostics:PracticeDiagnostics;
  skills:SkillAssessment[];
  recommendations:PracticeRecommendation[];
}
export interface PracticeIntelligenceOptions {
  profileId?:string;
  now?:Date|string|number;
  today?:string;
  from?:string;
  to?:string;
  recommendationLimit?:number;
}

interface CandidateIntelligence {
  candidate:PriorityCandidate;
  recommendation:PracticeRecommendation;
}

const actionOrder:Record<IntelligenceAction,number>={repair:0,retest:1,stabilize:2,apply:3,maintain:4,explore:5};
const bandOrder:Record<RecommendationBand,number>={now:0,soon:1,later:2};
const confidenceOrder:Record<IntelligenceConfidence,number>={high:0,medium:1,low:2};

const LIMITATION_DOMAINS:Record<LimitationTag,readonly string[]>={
  timing:['timing','groove','rhythm','reading','sight-reading'],
  coordination:['coordination','independence','groove','technique'],
  memory:['repertoire','reading','sight-reading','memory'],
  dynamics:['dynamics','tone','articulation'],
  tension:['technique','tone','warmup'],
  sound:['technique','muting','tone','articulation'],
  accuracy:['technique','chords','harmony','scales','pitch','ear-training','fretboard','reading','sight-reading'],
  endurance:['technique','repertoire','coordination'],
  'too-fast':['timing','technique','coordination','rhythm'],
  form:['repertoire','ensemble','reading'],
};
const urgentFactors=new Set<PriorityFactorCode>(['upcoming-performance','active-goal']);
const meaningfulFactorCodes=new Set<PriorityFactorCode>([
  'upcoming-performance','active-goal','active-priority','training-phase','retention-due','recent-weakness',
  'musical-transfer','domain-balance','neglected','profile-focus','manual-priority','prerequisite-gap','skip-pattern',
]);

function toMillis(value:Date|string|number|undefined):number{
  if(value===undefined)return Date.now();
  if(value instanceof Date)return value.getTime();
  if(typeof value==='number')return value;
  return Date.parse(value);
}
function confidence(evidenceCount:number,evaluatedTargets:number):IntelligenceConfidence{
  if(evidenceCount>=6&&evaluatedTargets>=2)return 'high';
  if(evidenceCount>=2||evaluatedTargets>=1)return 'medium';
  return 'low';
}
function candidateDomains(candidate:PriorityCandidate):string[]{
  return candidate.skillIds.map(id=>skillDefinition(id)?.domain).filter((value):value is string=>!!value);
}
function relevantLimitation(tag:LimitationTag,skillId:string):boolean{
  const domain=skillDefinition(skillId)?.domain;
  return !!domain&&LIMITATION_DOMAINS[tag].includes(domain);
}
function unique(values:string[],limit=5):string[]{
  return values.filter((value,index,array)=>!!value&&array.indexOf(value)===index).slice(0,limit);
}
function actionBand(action:IntelligenceAction):RecommendationBand{
  return action==='repair'||action==='retest'?'now':action==='stabilize'||action==='apply'?'soon':'later';
}
function skillDecision(action:IntelligenceAction,confidenceLevel:IntelligenceConfidence,evidence:Pick<SkillEvidenceSummary,'reduce'|'advance'|'solid'|'usable'|'dueReviews'>):ProgressionDecision{
  if(confidenceLevel==='low')return 'hold';
  if(evidence.reduce>0)return 'regress';
  if(evidence.dueReviews>0)return 'hold';
  if(evidence.advance>0&&evidence.solid>0)return 'progress';
  if(action==='apply')return 'progress';
  if(action==='repair'||action==='stabilize'||evidence.usable>0)return 'consolidate';
  return 'hold';
}
function targetDecision(state:PracticeState|undefined,action:IntelligenceAction,confidenceLevel:IntelligenceConfidence,progression?:ExerciseProgression):ProgressionDecision{
  if(confidenceLevel==='low')return 'hold';
  if(state?.challenge==='reduce'||progression?.direction==='reduce')return 'regress';
  if(state?.mastery==='retest'||action==='retest')return 'hold';
  if(state?.challenge==='advance'||progression?.direction==='advance'||action==='apply')return 'progress';
  if(action==='repair'||action==='stabilize'||state?.latestResult==='usable')return 'consolidate';
  return 'hold';
}
function factorEvidence(candidate:PriorityCandidate):string[]{
  return candidate.factors
    .filter(row=>meaningfulFactorCodes.has(row.code)&&row.points!==0)
    .sort((a,b)=>Math.abs(b.points)-Math.abs(a.points)||a.code.localeCompare(b.code))
    .map(row=>row.detail)
    .filter((value,index,array)=>array.indexOf(value)===index)
    .slice(0,4);
}
function targetStateEvidence(candidate:PriorityCandidate):string[]{
  const state=candidate.state;if(!state)return ['No structured practice-state evidence yet.'];
  const rows:string[]=[];
  if(state.latestResult)rows.push('Latest evaluated result · '+state.latestResult.replaceAll('-',' '));
  rows.push('Mastery state · '+state.mastery);
  if(state.challenge)rows.push('Progression direction · '+state.challenge);
  if(state.evidenceCount)rows.push(state.evidenceCount+' structured evidence event'+(state.evidenceCount===1?'':'s'));
  if(state.limitations.length)rows.push('Current limitations · '+state.limitations.join(', ').replaceAll('-',' '));
  if(state.nextReviewAt)rows.push('Review schedule · '+state.nextReviewAt.slice(0,10));
  return rows;
}

function skillAssessments(
  data:Data,
  profileId:string,
  candidates:PriorityCandidate[],
  diagnostics:PracticeDiagnostics,
):SkillAssessment[]{
  const profile=data.profiles?.find(row=>row.id===profileId);if(!profile)return [];
  const definitions=skillDefinitionsFor(profile.instrumentType);
  const recurring=diagnostics.limitations.filter(row=>row.count>=3&&row.evaluatedBlocks>0&&row.count/row.evaluatedBlocks>=.3);
  const dueKeys=new Set(diagnostics.dueReviews.map(row=>row.targetKey));
  return definitions.map(definition=>{
    const rows=candidates.filter(candidate=>candidate.skillIds.includes(definition.id));
    const states=rows.map(row=>row.state).filter((state):state is PracticeState=>!!state);
    const evaluated=states.filter(state=>!!state.latestResult);
    const evidenceCount=states.reduce((sum,state)=>sum+state.evidenceCount,0);
    const notYet=evaluated.filter(state=>state.latestResult==='not-yet').length;
    const usable=evaluated.filter(state=>state.latestResult==='usable').length;
    const solid=evaluated.filter(state=>state.latestResult==='solid').length;
    const dueReviews=states.filter(state=>dueKeys.has(state.targetKey)||state.mastery==='retest').length;
    const reduce=states.filter(state=>state.challenge==='reduce').length;
    const advance=states.filter(state=>state.challenge==='advance').length;
    const neglected=rows.filter(row=>row.factors.some(factor=>factor.code==='neglected'&&factor.points>0)).length;
    const limitations=recurring.filter(row=>relevantLimitation(row.tag,definition.id)).map(row=>({tag:row.tag,count:row.count,evaluatedBlocks:row.evaluatedBlocks}));
    const externalUrgency=rows.some(row=>row.factors.some(factor=>factor.points>0&&urgentFactors.has(factor.code)));
    const musicalTransfer=rows.some(row=>row.reasons.includes('musical-transfer'))||states.some(state=>state.mastery==='apply');
    let action:IntelligenceAction;
    if(reduce>0||notYet>=2||limitations.length)action='repair';
    else if(dueReviews>0)action='retest';
    else if(usable>0||states.some(state=>['learn','build','stabilize'].includes(state.mastery)))action='stabilize';
    else if(musicalTransfer)action='apply';
    else if(states.some(state=>state.mastery==='maintain'))action='maintain';
    else action='explore';
    let band=actionBand(action);
    if(externalUrgency)band='now';
    const reasons:string[]=[];
    if(limitations[0])reasons.push(`${limitations[0].tag.replaceAll('-',' ')} recurred in ${limitations[0].count} of ${limitations[0].evaluatedBlocks} evaluated blocks.`);
    if(reduce)reasons.push(`${reduce} target${reduce===1?' is':'s are'} currently asking for reduced challenge.`);
    if(notYet>=2)reasons.push(`${notYet} current target${notYet===1?' has':'s have'} a latest Not Yet result.`);
    if(dueReviews)reasons.push(`${dueReviews} target${dueReviews===1?' is':'s are'} due for a retention/retest check.`);
    if(action==='stabilize'&&usable)reasons.push(`${usable} target${usable===1?' is':'s are'} usable but not yet consistently solid.`);
    if(action==='apply')reasons.push('Recorded state indicates readiness for musical transfer/application.');
    if(action==='maintain')reasons.push('Established targets are currently stable; keep maintenance bounded.');
    if(action==='explore')reasons.push('Structured evidence is still sparse; establish a baseline before increasing difficulty.');
    const urgent=rows.flatMap(row=>row.factors.filter(factor=>factor.points>0&&urgentFactors.has(factor.code)).map(factor=>factor.detail));
    reasons.unshift(...urgent);
    const confidenceLevel=confidence(evidenceCount,evaluated.length);
    const evidence={targetCount:rows.length,evaluatedTargets:evaluated.length,evidenceCount,notYet,usable,solid,dueReviews,reduce,advance,neglected,recurringLimitations:limitations};
    return {
      skillId:definition.id,label:definition.label,action,band,confidence:confidenceLevel,decision:skillDecision(action,confidenceLevel,evidence),
      reasons:unique(reasons,4),
      examples:rows.slice(0,3).map(row=>row.label),
      evidence,
    };
  }).sort((a,b)=>bandOrder[a.band]-bandOrder[b.band]||actionOrder[a.action]-actionOrder[b.action]||confidenceOrder[a.confidence]-confidenceOrder[b.confidence]||b.evidence.evidenceCount-a.evidence.evidenceCount||a.label.localeCompare(b.label));
}

function associatedAssessment(candidate:PriorityCandidate,skills:SkillAssessment[]):SkillAssessment|undefined{
  const options=skills.filter(skill=>candidate.skillIds.includes(skill.skillId));
  return options.sort((a,b)=>bandOrder[a.band]-bandOrder[b.band]||actionOrder[a.action]-actionOrder[b.action]||confidenceOrder[a.confidence]-confidenceOrder[b.confidence])[0];
}
function candidateRecommendation(data:Data,candidate:PriorityCandidate,skills:SkillAssessment[]):PracticeRecommendation{
  const assessment=associatedAssessment(candidate,skills);
  let action=assessment?.action??(candidate.state?.mastery==='maintain'?'maintain':'explore');
  let band=assessment?.band??actionBand(action);
  if(candidate.factors.some(factor=>factor.points>0&&urgentFactors.has(factor.code)))band='now';
  if(candidate.state?.challenge==='reduce'){action='repair';band='now';}
  if(candidate.state?.mastery==='retest'||candidate.reasons.includes('retention-due')){action='retest';band='now';}
  const evidence=targetStateEvidence(candidate);
  let progression:ExerciseProgression|undefined;
  if(candidate.target.kind==='exercise'){
    const exercise=data.exercises.find(row=>row.id===candidate.target.exerciseId);
    if(exercise)progression=buildExerciseProgression(data,exercise);
    if(progression)evidence.push('Next progression · '+progression.summary);
  }
  const confidenceLevel=assessment?.confidence??confidence(candidate.state?.evidenceCount??0,candidate.state?.latestResult?1:0);
  return {
    source:'practice-target',target:structuredClone(candidate.target),targetKey:candidate.targetKey,label:candidate.label,
    band,action,confidence:confidenceLevel,decision:targetDecision(candidate.state,action,confidenceLevel,progression),
    reasons:unique([...(assessment?.reasons??[]),...factorEvidence(candidate)],4),
    evidence:unique(evidence,6),skillIds:[...candidate.skillIds],...(progression?{progression}:{}),
  };
}

function guidedRecommendation(data:Data,profileId:string,skills:SkillAssessment[],now:number):PracticeRecommendation|undefined{
  const profile=data.profiles?.find(row=>row.id===profileId);if(!profile)return undefined;
  const target=learningTarget(data,profile,new Date(now));if(!target)return undefined;
  const progress=progressFor(data,profileId,target.course.id),record=recordFor(progress,target.lesson.id),status=lessonStatus(target.course,record,new Date(now));
  const attempts=(record?.attempts??[]).filter(row=>row.revision===target.course.revision);
  const skill=skillDefinitionsFor(profile.instrumentType).find(row=>row.domain===target.lesson.skill)
    ??(target.course.stage==='repertoire'?skillDefinitionsFor(profile.instrumentType).find(row=>row.domain==='repertoire'):undefined);
  let action:IntelligenceAction=status==='Practice again'?'repair':status==='Review suggested'?'retest':attempts.some(row=>row.result==='passed')?'maintain':'stabilize';
  if(target.nextStage&&!attempts.length)action='explore';
  const band=actionBand(action),targetRef:PracticeTargetRef={kind:'lesson',profileId,courseId:target.course.id,lessonId:target.lesson.id,revision:target.course.revision};
  const reasons=[
    status==='Practice again'?'The latest lesson self-check indicates more practice is needed.':
    status==='Review suggested'?'This lesson has reached its suggested review point.':
    target.nextStage?'The previous course stage is settled; this is the next stage entry point.':
    !attempts.length?'This is the next unreviewed guided lesson.':'This lesson remains the current guided learning target.',
  ];
  return {
    source:'lesson',target:targetRef,targetKey:practiceTargetKey(targetRef),label:target.course.title+' · '+target.lesson.title,
    band,action,confidence:confidence(attempts.length,attempts.length?1:0),decision:attempts.length?(action==='repair'||action==='stabilize'?'consolidate':action==='apply'?'progress':'hold'):'hold',reasons,
    evidence:[status,attempts.length+` review attempt${attempts.length===1?'':'s'}`,target.course.title],
    skillIds:skill?[skill.id]:[],
  };
}

function candidateRows(data:Data,profileId:string,skills:SkillAssessment[],now:number,today?:string):CandidateIntelligence[]{
  const candidates=rankPracticeTargets(data,profileId,{now,today});
  return candidates.map(candidate=>({candidate,recommendation:candidateRecommendation(data,candidate,skills)}))
    .sort((a,b)=>
      bandOrder[a.recommendation.band]-bandOrder[b.recommendation.band]
      ||actionOrder[a.recommendation.action]-actionOrder[b.recommendation.action]
      ||b.candidate.score-a.candidate.score
      ||a.candidate.targetKey.localeCompare(b.candidate.targetKey)
    );
}

export function rankIntelligentPracticeTargets(data:Data,profileId?:string,options:Pick<PracticeIntelligenceOptions,'now'|'today'>={}):PriorityCandidate[]{
  if(data.schemaVersion!==2)return [];
  const pid=profileId??activeProfile(data).id,now=toMillis(options.now);
  const diagnostics=buildPracticeDiagnostics(profileView(data,pid),{now}),raw=rankPracticeTargets(data,pid,{now,today:options.today});
  const skills=skillAssessments(data,pid,raw,diagnostics);
  return candidateRows(data,pid,skills,now,options.today).map(row=>row.candidate);
}

export function buildPracticeIntelligence(data:Data,options:PracticeIntelligenceOptions={}):PracticeIntelligence{
  const now=toMillis(options.now),profileId=options.profileId??activeProfile(data).id,generatedAt=new Date(now).toISOString();
  const diagnostics=buildPracticeDiagnostics(profileView(data,profileId),{from:options.from,to:options.to,now});
  const raw=rankPracticeTargets(data,profileId,{now,today:options.today}),skills=skillAssessments(data,profileId,raw,diagnostics),rows=candidateRows(data,profileId,skills,now,options.today);
  const recommendations=rows.map(row=>row.recommendation),guided=guidedRecommendation(data,profileId,skills,now);
  if(guided)recommendations.push(guided);
  recommendations.sort((a,b)=>bandOrder[a.band]-bandOrder[b.band]||actionOrder[a.action]-actionOrder[b.action]||confidenceOrder[a.confidence]-confidenceOrder[b.confidence]||a.label.localeCompare(b.label));
  const limit=Math.max(1,Math.min(12,options.recommendationLimit??5));
  return {engineVersion:PRACTICE_INTELLIGENCE_ENGINE_VERSION,profileId,generatedAt,diagnostics,skills,recommendations:recommendations.slice(0,limit)};
}
