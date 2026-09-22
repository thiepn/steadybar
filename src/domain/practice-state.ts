import type { InstrumentType } from './practice-types.js';

export type MasteryState =
  | 'unassessed'
  | 'discover'
  | 'learn'
  | 'build'
  | 'stabilize'
  | 'retest'
  | 'apply'
  | 'maintain';

export type PracticeResult = 'not-yet' | 'usable' | 'solid';

export type LimitationTag =
  | 'timing'
  | 'coordination'
  | 'memory'
  | 'dynamics'
  | 'tension'
  | 'sound'
  | 'accuracy'
  | 'endurance'
  | 'too-fast'
  | 'form';

export type QualityDimension =
  | 'timing'
  | 'sound'
  | 'physical-control'
  | 'coordination'
  | 'memory'
  | 'musicality';

export type PracticeContext =
  | 'normal'
  | 'cold'
  | 'transfer'
  | 'maintenance'
  | 'performance'
  | 'unknown';

export type PracticeIntent =
  | 'ramp-in'
  | 'learn'
  | 'build'
  | 'stabilize'
  | 'retest'
  | 'apply'
  | 'maintain'
  | 'perform'
  | 'free';

export type PracticeTargetRef =
  | { kind:'skill'; profileId:string; skillId:string }
  | { kind:'exercise'; exerciseId:string }
  | { kind:'song'; songId:string; partId?:string }
  | { kind:'song-section'; songId:string; partId?:string; sectionId:string }
  | { kind:'song-transition'; songId:string; partId?:string; transitionId:string }
  | { kind:'lesson'; profileId:string; courseId:string; lessonId:string; revision:number };

export type PracticeReasonCode =
  | 'active-priority'
  | 'active-goal'
  | 'training-phase'
  | 'retention-due'
  | 'recent-weakness'
  | 'neglected'
  | 'domain-balance'
  | 'upcoming-performance'
  | 'setlist-focus'
  | 'transition-risk'
  | 'performance-simulation'
  | 'prerequisite'
  | 'musical-transfer'
  | 'maintenance'
  | 'user-request';

export type SetPrepStage = 'build' | 'integrate' | 'simulate' | 'taper' | 'performance-day';
export type SetPrepMode = 'focused' | 'run-through';
export type SetPrepRole = 'weak-spot' | 'transition' | 'song' | 'run-through';

export interface SetPrepSnapshot {
  engineVersion: 1;
  setlistId: string;
  setlistName: string;
  performanceDate?: string;
  stage: SetPrepStage;
  mode: SetPrepMode;
  role: SetPrepRole;
  setPosition: number;
}

export interface PracticePrescription {
  target: PracticeTargetRef;
  intent: PracticeIntent;
  reasons: PracticeReasonCode[];
  generatedBy: 'autopilot' | 'learn' | 'set-prep' | 'manual';
  engineVersion?: number;
}

export interface PracticeEvaluation {
  id:string;
  timestamp:string;
  result:PracticeResult;
  context:PracticeContext;
  limitations:LimitationTag[];
  note:string;
}

export interface PlanGeneration {
  kind:'manual'|'routine'|'autopilot'|'set-prep'|'lesson';
  generatedAt:string;
  requestedMinutes?:number;
  sessionIntent?:'balanced'|'songs'|'timing'|'technique';
  setlistId?:string;
  setPrepStage?:SetPrepStage;
  setPrepMode?:SetPrepMode;
  engineVersion?:number;
}

export interface PracticeState {
  id:string;
  createdAt:string;
  updatedAt:string;
  profileId:string;
  targetKey:string;
  target:PracticeTargetRef;
  mastery:MasteryState;
  lastPracticedAt?:string;
  lastEvaluatedAt?:string;
  lastRetestAt?:string;
  lastAppliedAt?:string;
  nextReviewAt?:string;
  latestResult?:PracticeResult;
  limitations:LimitationTag[];
  challenge?: 'reduce'|'hold'|'advance';
  evidenceCount:number;
  tempo?:{
    peak?:number;
    working?:number;
    cold?:number;
    peakAt?:string;
    workingAt?:string;
    coldAt?:string;
  };
  recent:{solid:number;usable:number;notYet:number};
  scheduling:{
    lastScheduledAt?:string;
    lastSkippedAt?:string;
    consecutiveSkips:number;
    snoozedUntil?:string;
    manualPriority:-2|-1|0|1|2;
  };
  engine:{version:1|2;derivedAt:string};
}

export interface PriorityItem {
  id:string;
  skillId:string;
  weight:1|2|3;
  note:string;
}

export interface PriorityCycle {
  id:string;
  createdAt:string;
  updatedAt:string;
  profileId:string;
  name:string;
  status:'active'|'completed'|'archived';
  startedOn:string;
  endedOn?:string;
  items:PriorityItem[];
}

export type EvidenceReliability = 'legacy'|'self-report'|'structured-check'|'objective';

const part=(value:string|undefined)=>value??'shared';

export function practiceTargetKey(target:PracticeTargetRef):string {
  switch(target.kind){
    case 'skill':return `skill|${target.profileId}|${target.skillId}`;
    case 'exercise':return `exercise|${target.exerciseId}`;
    case 'song':return `song|${target.songId}|${part(target.partId)}`;
    case 'song-section':return `section|${target.songId}|${part(target.partId)}|${target.sectionId}`;
    case 'song-transition':return `transition|${target.songId}|${part(target.partId)}|${target.transitionId}`;
    case 'lesson':return `lesson|${target.profileId}|${target.courseId}|${target.lessonId}|${target.revision}`;
  }
}

export function legacyRatingToPracticeResult(rating:'failed'|'messy'|'acceptable'|'clean'|'effortless'):PracticeResult {
  if(rating==='acceptable')return 'usable';
  if(rating==='clean'||rating==='effortless')return 'solid';
  return 'not-yet';
}

export function contextForIntent(intent:PracticeIntent|undefined):PracticeContext {
  switch(intent){
    case 'retest':return 'cold';
    case 'apply':return 'transfer';
    case 'maintain':return 'maintenance';
    case 'perform':return 'performance';
    case 'ramp-in':
    case 'learn':
    case 'build':
    case 'stabilize':
    case 'free':return 'normal';
    default:return 'unknown';
  }
}

export interface SkillDefinition {
  id:string;
  instrument:InstrumentType;
  domain:string;
  label:string;
  description:string;
  parentId?:string;
  prerequisiteIds:string[];
  applicationIds:string[];
  defaultImportance:number;
}
