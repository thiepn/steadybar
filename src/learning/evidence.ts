import type { PracticeSession } from '../domain/models.js';
import type { Course, Lesson } from './types.js';

/**
 * Derive eligible lesson practice from immutable session provenance.
 * This is evidence that both guided tasks were actually run, not a proficiency score.
 */
export function sessionEvidenceSeconds(session:PracticeSession,profileId:string,course:Course,lesson:Lesson):number{
  if(session.status==='active'||session.profileId!==profileId)return 0;
  const blocks=session.blocks.filter(b=>b.profileId===profileId&&b.lessonSource?.courseId===course.id&&b.lessonSource.lessonId===lesson.id&&b.lessonSource.revision===course.revision&&b.completed&&!b.skipped&&b.startedAt&&b.endedAt&&b.actualActiveSeconds>=5);
  if(!lesson.tasks.every(task=>blocks.some(b=>b.lessonSource?.taskId===task.id)))return 0;
  const seconds=blocks.reduce((n,b)=>n+b.actualActiveSeconds,0);
  return seconds>=30?seconds:0;
}
