import { applySchedule, createWeeklySchedule, editScheduleDay, regenerateSchedule } from '../app/weekly-schedule.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { buildWeeklySchedule, addScheduleDays, scheduleForWeek, weekStartFor, weeklyScheduleActuals } from '../domain/weekly-schedule.js';
import type { TrainingEmphasis, WeeklySchedule, WeeklyScheduleDay, WeeklyScheduleDayKind } from '../domain/models.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, empty, formDialog, formNumber, formText, input, link, notify, pageHeader, sectionHeader, select, stat, textarea } from '../ui/components.js';
import { duration, formatDate, localDate, titleCase } from '../domain/utils.js';
import { calibrationSummary } from '../domain/practice-load.js';

const kindOptions:[WeeklyScheduleDayKind,string][]=[['practice','Practice'],['optional','Optional'],['rest','Rest']];
const intentOptions:[TrainingEmphasis,string][]=[['balanced','Balanced'],['songs','Songs'],['timing','Timing'],['technique','Technique']];
const weekday=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date(date+'T12:00:00'));
const shortDate=(date:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(date+'T12:00:00'));

function scheduleDialog(weekStart:string,schedule?:WeeklySchedule):void{
  const data=store.view(),profile=activeProfile(store.snapshot());
  const adaptivePreview=buildWeeklySchedule(data,{profileId:profile.id,weekStart,adaptiveLoad:true});
  const standardPreview=buildWeeklySchedule(data,{profileId:profile.id,weekStart,adaptiveLoad:false});
  const calibration=adaptivePreview.source.loadCalibration;
  const adaptive=checkbox('adaptiveLoad','Use recent practice calibration',true);
  const targetField=input('targetMinutes','Planned weekly minutes',adaptivePreview.targetMinutes,'number',{min:5,max:1260,step:1,required:true});
  const daysField=input('practiceDays','Planned practice days',adaptivePreview.days.filter(day=>day.kind==='practice').length,'number',{min:1,max:7,step:1,required:true});
  const targetInput=targetField.querySelector('input')!,daysInput=daysField.querySelector('input')!;
  const optional=checkbox('optionalDay','Include one optional / make-up day',schedule?schedule.days.some(day=>day.kind==='optional'):true);
  const calibrationNote=el('p',{class:'field-hint load-calibration-hint'},calibration
    ?calibrationSummary(calibration)+'. Explicit Training Cycle and weekly-minute targets stay authoritative; calibration only adapts profile-default load and day placement.'
    :'Recent practice calibration is unavailable. Standard planning defaults will be used.');
  adaptive.addEventListener('change',()=>{
    const enabled=adaptive.querySelector('input')!.checked,preview=enabled?adaptivePreview:standardPreview;
    targetInput.value=String(preview.targetMinutes);
    daysInput.value=String(preview.days.filter(day=>day.kind==='practice').length);
  });
  formDialog(schedule?'Regenerate week':'Generate week',[
    adaptive,calibrationNote,targetField,daysField,optional,
    el('p',{class:'field-hint'},schedule
      ?'Regenerating replaces this week’s day-by-day edits and returns the schedule to Draft. Practice history and DailyPlans stay unchanged.'
      :'This creates a Draft schedule only. It does not build DailyPlans or start practice.'),
  ],async form=>{
    const options={profileId:profile.id,weekStart,targetMinutes:formNumber(form,'targetMinutes'),practiceDays:formNumber(form,'practiceDays'),includeOptionalDay:form.has('optionalDay'),adaptiveLoad:form.has('adaptiveLoad')};
    if(schedule){await regenerateSchedule(schedule.id,options);notify('Weekly schedule regenerated as a draft.');}
    else{await createWeeklySchedule(options);notify('Weekly schedule created as a draft.');}
  },schedule?'Regenerate schedule':'Generate schedule');
}

function dayDialog(schedule:WeeklySchedule,day:WeeklyScheduleDay):void{
  const kind=select('kind','Day type',kindOptions,day.kind),minutes=input('plannedMinutes','Planned minutes',day.plannedMinutes||15,'number',{min:5,max:180,step:1,required:true}),intent=select('intent','Practice emphasis',intentOptions,day.intent);
  const update=()=>{const rest=kind.querySelector('select')!.value==='rest';minutes.hidden=rest;minutes.querySelector('input')!.disabled=rest;intent.hidden=rest;};
  kind.addEventListener('change',update);update();
  formDialog(`Edit ${weekday(day.date)}`,[
    el('p',{class:'muted small'},formatDate(day.date)),kind,minutes,intent,textarea('note','Day note',day.note),
    el('p',{class:'field-hint'},'Changing a day updates only the calendar schedule. Existing practice history and any DailyPlan for that date are unchanged.'),
  ],async form=>{
    const nextKind=formText(form,'kind') as WeeklyScheduleDayKind;
    await editScheduleDay(schedule.id,day.id,{kind:nextKind,plannedMinutes:nextKind==='rest'?0:formNumber(form,'plannedMinutes'),intent:formText(form,'intent') as TrainingEmphasis,note:formText(form,'note')});
    notify('Scheduled day updated.');
  },'Save day');
}

function dayCard(schedule:WeeklySchedule,day:WeeklyScheduleDay,actual:{activeSeconds:number;sessions:number},events:string[],hasPlan:boolean):HTMLElement{
  const today=day.date===localDate(),label=day.kind==='rest'?'Rest':day.kind==='optional'?'Optional':'Practice';
  return el('article',{class:`calendar-day ${today?'today':''} calendar-${day.kind}`},
    el('div',{class:'calendar-day-head'},
      el('div',{},el('span',{class:'eyebrow'},weekday(day.date)),el('h3',{},shortDate(day.date))),
      el('div',{class:'tag-row'},today?badge('Today','accent'):null,badge(label,day.kind==='practice'?'accent':'neutral'))),
    day.kind!=='rest'?el('div',{class:'calendar-day-plan'},el('strong',{},`${day.plannedMinutes} min`),badge(titleCase(day.intent))):el('p',{class:'muted small'},'No practice time planned.'),
    actual.activeSeconds>0?el('p',{class:'calendar-actual'},`${duration(actual.activeSeconds)} recorded active practice · ${actual.sessions} session${actual.sessions===1?'':'s'}`):el('p',{class:'muted small'},'No recorded practice on this date.'),
    hasPlan?el('p',{class:'muted small'},'DailyPlan exists for this date.'):null,
    events.length?el('div',{class:'calendar-events'},events.map(event=>el('p',{class:'small'},'Performance · '+event))):null,
    day.note?el('p',{class:'small pre-line'},day.note):null,
    el('div',{class:'calendar-day-actions'},button('Edit day',()=>dayDialog(schedule,day),'secondary compact','edit'),today?link('Open Today','/','text-link','today'):null));
}

export function calendarPage(requestedWeek?:string):Page{
  const data=store.view(),profile=activeProfile(store.snapshot()),weekStart=requestedWeek&&weekStartFor(requestedWeek)===requestedWeek?requestedWeek:weekStartFor(),schedule=scheduleForWeek(data,profile.id,weekStart);
  const previous=addScheduleDays(weekStart,-7),next=addScheduleDays(weekStart,7),current=weekStartFor(),weekEnd=addScheduleDays(weekStart,6);
  const pageActions=[link('← Previous','/calendar/'+previous,'button secondary'),...(weekStart!==current?[link('Current week','/calendar/'+current,'button secondary')]:[]),link('Next →','/calendar/'+next,'button secondary')];
  const page=el('div',{class:'page calendar-page'},pageHeader('Weekly orchestration','Practice Calendar',`${profile.name} · ${formatDate(weekStart)} → ${formatDate(weekEnd)}`,pageActions));

  if(!schedule){
    page.append(el('section',{class:'panel calendar-empty'},sectionHeader('This week is not scheduled','Calendar planning is separate from your executable DailyPlans.'),
      empty('No weekly schedule','Generate a draft from the active Training Cycle, weekly goals, current Priority Cycle and profile defaults. Nothing is applied until you choose Apply week.',button('Generate week',()=>scheduleDialog(weekStart),'primary','plus'))));
    return {node:page};
  }

  const actuals=weeklyScheduleActuals(store.snapshot(),schedule),plannedDays=schedule.days.filter(day=>day.kind==='practice').length,optionalDays=schedule.days.filter(day=>day.kind==='optional').length;
  const headerActions=[schedule.status==='draft'?button('Apply week',async()=>{await applySchedule(schedule.id);notify('Weekly schedule applied.');},'primary','check'):badge('Applied','accent'),button('Regenerate',()=>scheduleDialog(weekStart,schedule),'secondary','restart')];
  page.append(el('section',{class:'panel calendar-summary'},sectionHeader('Week plan',schedule.status==='draft'?'Draft · not yet used by Today':'Applied · Today can use the matching day',headerActions),
    el('div',{class:'stats-strip'},
      stat('Planned minutes',schedule.targetMinutes),
      stat('Practice days',plannedDays),
      stat('Optional days',optionalDays),
      stat('Recorded active',duration(actuals.activeSeconds))),
    el('p',{class:'muted small'},`${actuals.practiceDaysWithActivity} of ${actuals.scheduledPracticeDays} planned practice days currently contain recorded activity.`),
    el('p',{class:'field-hint'},'This is schedule context only. Planned-versus-recorded time is not a quality, consistency, or mastery score.')));

  const sources:HTMLElement[]=[];
  if(schedule.source.trainingPlanName)sources.push(badge('Cycle · '+schedule.source.trainingPlanName,'accent'));
  for(const name of schedule.source.trainingPhaseNames)sources.push(badge('Phase · '+name));
  if(schedule.source.priorityCycleName)sources.push(badge('Weekly focus · '+schedule.source.priorityCycleName));
  const load=schedule.source.loadCalibration;
  if(load)sources.push(badge('Load calibration · '+titleCase(load.confidence)));
  if(sources.length)page.append(el('section',{class:'panel calendar-source'},sectionHeader('Generated from','Snapshots taken when this week was generated'),el('div',{class:'tag-row'},sources),
    load?el('div',{class:'calendar-calibration'},el('p',{},calibrationSummary(load)),el('p',{class:'muted small'},`Evidence window ${formatDate(load.windowStart)} → ${formatDate(load.windowEnd)} · ${load.observedSessions} session${load.observedSessions===1?'':'s'} · ${load.observedActiveWeeks} active week${load.observedActiveWeeks===1?'':'s'}.`),
      load.loadAdjusted
        ?el('p',{class:'small'},`Profile-default load adjusted from ${load.baselineWeeklyMinutes} to ${schedule.targetMinutes} min.`)
        :schedule.targetMinutes!==load.baselineWeeklyMinutes
          ?el('p',{class:'small'},`Calendar target edited from the ${load.targetSource.replaceAll('-',' ')} baseline of ${load.baselineWeeklyMinutes} to ${schedule.targetMinutes} min.`)
          :el('p',{class:'muted small'},`Weekly load retained the ${load.targetSource.replaceAll('-',' ')} baseline of ${load.baselineWeeklyMinutes} min.`),
      load.patternAdjusted?el('p',{class:'muted small'},'Practice days were placed using your recent weekday pattern.'):null):null,
    el('p',{class:'field-hint'},'Later changes to a Training Cycle, Priority Cycle or practice history do not silently rewrite this saved week. Regenerate explicitly to use newer planning context.')));

  const byDate=new Map(actuals.byDate.map(row=>[row.date,row]));
  const cards=schedule.days.map(day=>{
    const events=data.setlists.filter(setlist=>setlist.date===day.date).map(setlist=>setlist.name),hasPlan=data.dailyPlans.some(plan=>plan.profileId===profile.id&&plan.date===day.date);
    return dayCard(schedule,day,byDate.get(day.date)??{date:day.date,activeSeconds:0,sessions:0},events,hasPlan);
  });
  page.append(el('section',{class:'calendar-grid','aria-label':'Weekly practice schedule'},cards));
  return {node:page};
}
