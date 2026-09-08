import type { Data, Goal, PracticeSession, TempoAttempt } from './models.js';
import { isoWeekStart, localDate } from './utils.js';
export const calculateBestCleanBpm = (attempts: TempoAttempt[]): number | undefined => {
  return attempts.reduce<number|undefined>((best,a)=>(a.rating==='clean'||a.rating==='effortless') ? Math.max(best??0,a.bpm) : best,undefined);
};
export const calculateHighestAttemptedBpm = (attempts: TempoAttempt[]): number | undefined => attempts.reduce<number|undefined>((best,a)=>Math.max(best??0,a.bpm),undefined);
export const latestSuccessfulBpm = (attempts: TempoAttempt[]): number | undefined => [...attempts].filter(a => ['acceptable','clean','effortless'].includes(a.rating)).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0]?.bpm;
export const sessionTime = (session: PracticeSession): number => session.blocks.reduce((sum,b) => sum+b.actualActiveSeconds,0);
/** Abandoned sessions still represent real practice; only active sessions are excluded. */
export const finishedSessions = (sessions: PracticeSession[]): PracticeSession[] => sessions.filter(s => s.status !== 'active');
export const calculateTotalPracticeTime = (sessions: PracticeSession[]): number => finishedSessions(sessions).reduce((sum,s) => sum+sessionTime(s),0);
export const calculateAverageSessionLength = (sessions: PracticeSession[]): number => {
  const finished = finishedSessions(sessions); return finished.length ? calculateTotalPracticeTime(finished)/finished.length : 0;
};
export const calculateWeeklySessionCount = (sessions: PracticeSession[], today = new Date()): number => {
  const start = isoWeekStart(today), end = new Date(start); end.setDate(end.getDate()+7);
  return sessions.filter(s => s.status === 'completed' && new Date(s.startedAt) >= start && new Date(s.startedAt) < end).length;
};
export function exerciseAttempts(sessions: PracticeSession[], exerciseId: string): TempoAttempt[] {
  return finishedSessions(sessions).flatMap(s => s.blocks.filter(b => b.sourceExerciseId === exerciseId).flatMap(b => b.tempoAttempts));
}
export function calculatePracticeDistribution(sessions: PracticeSession[]): { category:string; seconds:number; percent:number }[] {
  const categories = new Map<string, number>();
  for(const session of finishedSessions(sessions)) for(const block of session.blocks) {
    const category = block.categorySnapshot || 'other';
    categories.set(category, (categories.get(category) || 0)+block.actualActiveSeconds);
  }
  const total = [...categories.values()].reduce((a,b) => a+b,0);
  return [...categories].filter(([,seconds]) => seconds > 0).map(([category,seconds]) => ({category,seconds,percent:total ? seconds/total*100 : 0})).sort((a,b) => b.seconds-a.seconds);
}
export function buildTempoProgressionSeries(attempts: TempoAttempt[]): { date:string; bpm:number; timestamp:string }[] {
  const daily = new Map<string,{bpm:number;timestamp:string}>(); let best = 0;
  for(const attempt of [...attempts].sort((a,b) => a.timestamp.localeCompare(b.timestamp))) {
    if(attempt.rating !== 'clean' && attempt.rating !== 'effortless') continue;
    best = Math.max(best,attempt.bpm);
    daily.set(localDate(attempt.timestamp),{bpm:best,timestamp:attempt.timestamp});
  }
  return [...daily].map(([date,entry]) => ({date,...entry}));
}
export function practiceByDay(sessions: PracticeSession[]): {date:string;seconds:number}[] {
  const days = new Map<string,number>();
  for(const session of finishedSessions(sessions)) {
    const day=localDate(session.startedAt); days.set(day,(days.get(day)||0)+sessionTime(session));
  }
  return [...days].sort(([a],[b]) => a.localeCompare(b)).map(([date,seconds]) => ({date,seconds}));
}
export const routineDuration = (blocks: {targetSeconds:number}[]): number => blocks.reduce((s,b) => s+b.targetSeconds,0);
export function goalProgress(goal: Goal, data: Data, now = new Date()): { value:number;target:number;label:string;done:boolean;fraction:number } {
  let value = 0, target = goal.targetValue, label = '';
  switch(goal.type) {
    case 'bpm': value = calculateBestCleanBpm(exerciseAttempts(data.sessions,goal.exerciseId || '')) || 0; label = `${value || '—'} / ${target} clean BPM`; break;
    case 'weekly-sessions': value=calculateWeeklySessionCount(data.sessions,now);label=`${value} / ${target} sessions this week`;break;
    case 'song-mastery': {
      const song = data.songs.find(s => s.id === goal.songId);
      value = song?.status === 'performance-ready' ? 1 : 0;target=1;
      label = song ? song.status.replaceAll('-',' ') : 'Song unavailable';break;
    }
    case 'custom':value=goal.completed ? 1 : 0;target=1;label=goal.completed ? 'Complete' : 'In progress';break;
  }
  return {value,target,label,done:value >= target,fraction:Math.min(1,value/target)};
}
export function filterSessions(sessions: PracticeSession[], from?: string, to?: string): PracticeSession[] {
  return finishedSessions(sessions).filter(s => { const date=localDate(s.startedAt);return (!from || date>=from) && (!to || date<=to); });
}
