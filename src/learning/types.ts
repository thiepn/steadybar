import type { Experience, InstrumentType, PracticeProtocol } from '../domain/practice-types.js';

/** Catalog content ships offline; personal records live in IndexedDB. */
export interface LessonSource { courseId:string; lessonId:string; taskId:string; revision:number }
export interface LearningSource { id:string; title:string; publisher:string; url:string; purpose:string }
export interface LessonQuestion { prompt:string; options:string[]; answer:number; explanation:string }
export interface LessonTask { id:string; title:string; instructions:string; protocol:PracticeProtocol; weight:number }
export interface LessonExample {
  caption:string;
  text:string;
  /** Original short reference, not a recording or an instrument simulation. */
  notes?:number[];
  chords?:{name:string;frets:(number|null)[]}[];
  rhythm?:{counts:string[];rows:{label:string;hits:string[]}[]};
}
export interface Lesson {
  id:string; title:string; skill:string; objective:string; teaching:string[];
  example:LessonExample; tasks:LessonTask[]; checks:string[]; questions:LessonQuestion[];
  easier:string; harder:string; mistake:string; transfer:string;
}
export interface Course {
  id:string; revision:number; instrument:InstrumentType; title:string; stage:'foundation'|'development'|'ensemble';
  level:Experience; summary:string; prerequisites:string; outcomes:string[]; sourceIds:string[];
  /** A placement suggestion is not a proficiency certificate or an access lock. */
  placement:string[]; lessons:Lesson[];
}
export interface LessonAttempt {
  id:string; at:string; revision:number; result:'passed'|'needs-work';
  checks:boolean[]; answers:number[]; confidence:1|2|3|4|5; notes:string;
  evidence:{kind:'session'|'off-app'|'reflection';seconds:number;sessionId?:string};
}
export interface LessonRecord { lessonId:string; notes:string; attempts:LessonAttempt[] }
export interface CourseProgress {
  id:string; profileId:string; courseId:string; courseTitle:string; revision:number;
  active:boolean; createdAt:string; updatedAt:string; placement?:boolean[]; launchOptions?:LessonLaunchOptions; lessons:LessonRecord[];
}
export interface LessonLaunchOptions { minutes:number; tempo?:number; voice?:{startMidi:number;lowMidi:number;highMidi:number} }
