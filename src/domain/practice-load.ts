import type { Data, PracticeLoadConfidence, WeeklyScheduleLoadCalibration } from './models.js';
import { finishedSessions, sessionTime } from './analytics.js';
import { localDate } from './utils.js';

export const PRACTICE_LOAD_ENGINE_VERSION=1 as const;
export const PRACTICE_LOAD_WINDOW_DAYS=42;
const MAX_WEEKLY_MINUTES=1260;
const FALLBACK_WEEKDAY_PRIORITY=[0,2,4,1,3,5,6] as const;

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round5=(value:number)=>Math.max(5,Math.round(value/5)*5);
const dateAtNoon=(value:string)=>new Date(value+'T12:00:00');
function addDays(value:string,days:number):string{const date=dateAtNoon(value);date.setDate(date.getDate()+days);return localDate(date);}
function weekdayIndex(value:string):number{return (dateAtNoon(value).getDay()+6)%7;}
function weekStart(value:string):string{return addDays(value,-weekdayIndex(value));}
function median(values:number[]):number{
  if(!values.length)return 0;
  const rows=[...values].sort((a,b)=>a-b),middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]!:(rows[middle-1]!+rows[middle]!)/2;
}
function confidence(activeWeeks:number,activeDays:number,sessions:number):PracticeLoadConfidence{
  if(activeWeeks>=4&&activeDays>=8&&sessions>=8)return 'high';
  if(activeWeeks>=2&&activeDays>=4&&sessions>=4)return 'medium';
  return 'low';
}
function fallbackSessionMinutes(data:Data,profileId:string,baselineWeeklyMinutes:number):number{
  const profile=data.profiles?.find(row=>row.id===profileId);
  return clamp(Math.round(profile?.defaultSessionMinutes??Math.max(5,baselineWeeklyMinutes/3)),5,180);
}

export function buildPracticeLoadCalibration(data:Data,profileId:string,targetWeekStart:string,baselineWeeklyMinutes:number):WeeklyScheduleLoadCalibration{
  const windowEnd=addDays(targetWeekStart,-1),windowStart=addDays(targetWeekStart,-PRACTICE_LOAD_WINDOW_DAYS);
  const sessions=finishedSessions(data.sessions)
    .filter(session=>session.profileId===profileId)
    .map(session=>({session,date:localDate(session.startedAt),seconds:sessionTime(session)}))
    .filter(row=>row.seconds>0&&row.date>=windowStart&&row.date<=windowEnd);

  const byDate=new Map<string,number>();
  for(const row of sessions)byDate.set(row.date,(byDate.get(row.date)??0)+row.seconds);

  const weekTotals=new Map<string,number>(),weekDays=new Map<string,Set<string>>();
  const weekdayStats=Array.from({length:7},(_,index)=>({index,days:0,seconds:0}));
  for(const [date,seconds] of byDate){
    const week=weekStart(date);weekTotals.set(week,(weekTotals.get(week)??0)+seconds);
    const dates=weekDays.get(week)??new Set<string>();dates.add(date);weekDays.set(week,dates);
    const stat=weekdayStats[weekdayIndex(date)]!;stat.days++;stat.seconds+=seconds;
  }

  const activeWeeks=[...weekTotals.values()].filter(seconds=>seconds>0),activeDays=byDate.size,observedSessions=sessions.length;
  const level=confidence(activeWeeks.length,activeDays,observedSessions);
  const defaultSession=fallbackSessionMinutes(data,profileId,baselineWeeklyMinutes);
  const typicalActiveDayMinutes=activeDays?clamp(Math.round(median([...byDate.values()].map(seconds=>seconds/60))),5,180):defaultSession;
  const medianActiveWeekMinutes=activeWeeks.length?Math.round(median(activeWeeks.map(seconds=>seconds/60))):0;

  let suggestedWeeklyMinutes=Math.max(5,Math.round(baselineWeeklyMinutes));
  if(level!=='low'&&medianActiveWeekMinutes>0){
    const lower=round5(baselineWeeklyMinutes*.7),upper=Math.min(MAX_WEEKLY_MINUTES,round5(baselineWeeklyMinutes*1.3));
    suggestedWeeklyMinutes=clamp(round5(medianActiveWeekMinutes),Math.min(lower,upper),Math.max(lower,upper));
  }

  const historicalDays=weekDays.size?median([...weekDays.values()].map(days=>days.size)):0;
  const durationDays=Math.max(1,Math.round(suggestedWeeklyMinutes/Math.max(5,typicalActiveDayMinutes)));
  let suggestedPracticeDays=level==='low'?Math.max(1,Math.round(suggestedWeeklyMinutes/defaultSession)):Math.round((historicalDays+durationDays)/2);
  suggestedPracticeDays=clamp(suggestedPracticeDays,1,7);
  suggestedPracticeDays=Math.max(suggestedPracticeDays,Math.ceil(suggestedWeeklyMinutes/180));
  suggestedPracticeDays=Math.min(suggestedPracticeDays,Math.max(1,Math.floor(suggestedWeeklyMinutes/5)));

  const fallbackRank=new Map(FALLBACK_WEEKDAY_PRIORITY.map((value,index)=>[value,index]));
  const preferredWeekdays=weekdayStats.sort((a,b)=>
    b.days-a.days||b.seconds-a.seconds||(fallbackRank.get(a.index)??99)-(fallbackRank.get(b.index)??99)
  ).map(row=>row.index);

  return {
    engineVersion:PRACTICE_LOAD_ENGINE_VERSION,
    confidence:level,
    windowStart,windowEnd,
    observedSessions,observedActiveDays:activeDays,observedActiveWeeks:activeWeeks.length,
    typicalActiveDayMinutes,
    medianActiveWeekMinutes,
    suggestedWeeklyMinutes,
    suggestedPracticeDays,
    preferredWeekdays,
  };
}

export function calibrationSummary(calibration:WeeklyScheduleLoadCalibration):string{
  if(calibration.confidence==='low')return `Early calibration · ${calibration.observedActiveDays} active day${calibration.observedActiveDays===1?'':'s'} in the last six weeks`;
  return `${calibration.confidence==='high'?'Established':'Developing'} calibration · typical active day ${calibration.typicalActiveDayMinutes} min · median active week ${calibration.medianActiveWeekMinutes} min`;
}
