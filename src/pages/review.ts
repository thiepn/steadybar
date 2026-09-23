import { applyWeeklyFocus, endWeeklyFocus, restoreWeeklyFocus } from '../app/weekly-review.js';
import { store } from '../app/store.js';
import { activeProfile } from '../domain/profiles.js';
import { buildWeeklyReview, type WeeklyFocusSelection, type WeeklyFocusSuggestion } from '../domain/weekly-review.js';
import { skillDefinition } from '../domain/skill-graph.js';
import { activeTrainingContext } from '../domain/training-plan.js';
import { addScheduleDays, buildWeeklySchedule, weekStartFor } from '../domain/weekly-schedule.js';
import { calibrationSummary } from '../domain/practice-load.js';
import type { PriorityCycle } from '../domain/practice-state.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, field, link, notify, pageHeader, sectionHeader, stat } from '../ui/components.js';
import { duration, formatDate, titleCase } from '../domain/utils.js';

const roleLabel=(value:string)=>value==='primary'?'Primary':value==='secondary'?'Secondary':'Support';
const weightLabel=(value:number)=>value===3?'Primary':value===2?'Secondary':'Support';
const intelligenceAction=(value:string)=>({repair:'Repair',retest:'Retest',stabilize:'Stabilize',apply:'Apply',maintain:'Maintain',explore:'Explore'})[value]??titleCase(value);
const decisionLabel=(value:string)=>({progress:'Progress',hold:'Hold',consolidate:'Consolidate',regress:'Regress'})[value]??titleCase(value);
function resultMix(value:{solid:number;usable:number;notYet:number;total:number}):string{
  return value.total?`${value.solid} Solid · ${value.usable} Usable · ${value.notYet} Not Yet`:'No evaluated blocks';
}
function cycleItems(cycle:PriorityCycle):HTMLElement[]{
  return [...cycle.items].sort((a,b)=>b.weight-a.weight||a.skillId.localeCompare(b.skillId)).map(item=>el('div',{class:'weekly-cycle-item'},
    el('div',{},el('strong',{},skillDefinition(item.skillId)?.label??item.skillId),item.note?el('p',{class:'muted small'},item.note):null),
    badge(weightLabel(item.weight),item.weight===3?'accent':'neutral')));
}

export function weeklyReviewPage():Page{
  const data=store.view(),profile=activeProfile(store.snapshot()),review=buildWeeklyReview(data,{profileId:profile.id}),training=activeTrainingContext(store.snapshot(),profile.id),current=review.diagnostics.comparison.current,previous=review.diagnostics.comparison.previous;
  const page=el('div',{class:'page weekly-review-page'},pageHeader('7-day review','Weekly Review',`${formatDate(review.window.from)} → ${formatDate(review.window.to)} · Review evidence first, then choose what should shape the next seven days.`,[
    link('Calendar','/calendar','button secondary','today'),link('Training Cycles','/cycles','button secondary','routine'),link('Full Progress','/progress','button secondary','progress'),
  ]));

  const summary=el('section',{class:'panel weekly-summary'},sectionHeader('This week','Rolling seven-day window'),
    el('div',{class:'stats-strip'},
      stat('Active practice',duration(current.activeSeconds),previous?`Previous · ${duration(previous.activeSeconds)}`:undefined),
      stat('Active days',current.activeDays,previous?`Previous · ${previous.activeDays}`:undefined),
      stat('Evaluated blocks',current.evaluations.total,resultMix(current.evaluations)),
      stat('Generated blocks',current.generated.blocks,current.generated.blocks?`${current.generated.completed} completed · ${current.generated.skipped} skipped`:'No generated work')),
    el('p',{class:'field-hint'},'These are descriptive practice records. More time or more Solid results are not automatically better without considering what was practiced and how difficult it was.'));

  const signals=el('section',{class:'panel weekly-signals'},sectionHeader('What changed','Evidence thresholds from Phase 10 diagnostics'));
  if(!review.diagnostics.insights.length)signals.append(el('p',{class:'muted'},'No diagnostic pattern crossed the current evidence thresholds this week.'));
  else signals.append(el('div',{class:'weekly-signal-list'},review.diagnostics.insights.slice(0,5).map(insight=>el('article',{class:`weekly-signal weekly-${insight.tone}`},
    el('div',{class:'split'},el('strong',{},insight.title),badge(insight.tone==='attention'?'Attention':insight.tone==='positive'?'Positive':'Context',insight.tone==='positive'?'accent':'neutral')),
    el('p',{},insight.detail),el('p',{class:'muted small'},insight.evidence)))));
  page.append(el('div',{class:'two-column wide-left weekly-top'},summary,signals));

  const intelligence=el('section',{class:'panel weekly-intelligence'},sectionHeader('Practice intelligence','Unified evidence view · no hidden score'));
  const intelligentSkills=review.intelligence.skills.slice(0,3);
  if(!intelligentSkills.length)intelligence.append(el('p',{class:'muted'},'No skill-linked recommendations are available yet.'));
  else{
    for(const skill of intelligentSkills)intelligence.append(el('article',{class:'weekly-intelligence-row'},
      el('div',{},el('div',{class:'tag-row'},badge(intelligenceAction(skill.action),skill.band==='now'?'accent':'neutral'),badge(decisionLabel(skill.decision),skill.decision==='progress'?'accent':'neutral'),badge(titleCase(skill.confidence)+' evidence')),el('strong',{},skill.label),
        skill.reasons[0]?el('p',{class:'small'},skill.reasons[0]):null,
        el('p',{class:'muted small'},`${skill.evidence.evidenceCount} evidence event${skill.evidence.evidenceCount===1?'':'s'} · ${skill.evidence.evaluatedTargets} evaluated target${skill.evidence.evaluatedTargets===1?'':'s'}`)),
      skill.examples.length?el('p',{class:'muted small'},'Examples · '+skill.examples.join(' · ')):null));
  }
  intelligence.append(el('p',{class:'field-hint'},'Repair / Retest / Stabilize / Apply / Maintain / Explore describe the next practice action. Progress / Hold / Consolidate / Regress is the separate evidence-gated progression decision. Evidence confidence describes quantity/coverage, not ability.'));
  page.append(intelligence);
  if(training){
    page.append(el('section',{class:'panel weekly-training-context'},sectionHeader('Long-term training cycle',training.phase?`${training.plan.name} · ${training.phase.name}`:training.plan.name,[link('Open cycle','/cycles/'+training.plan.id,'button secondary','arrow')]),
      el('div',{class:'stats-strip inset-stats'},stat('Phase',training.phase?.name??'Outside phase window'),stat('Weekly target',training.phase?`${training.phase.weeklyMinutes} min`:`${training.plan.baselineWeeklyMinutes} min`),stat('Emphasis',training.phase?titleCase(training.phase.emphasis):'—')),
      training.phase?el('p',{class:'muted small'},'Phase focus · '+(training.phase.focuses.map(row=>skillDefinition(row.skillId)?.label??row.skillId).join(' · ')||'No explicit skill focus')):el('p',{class:'muted small'},'The active cycle is currently outside its dated phase window.'),
      el('p',{class:'field-hint'},'This long-term phase contributes a modest, explainable Priority signal. Weekly priorities remain stronger when you apply them.')));
  }

  const nextWeek=addScheduleDays(weekStartFor(),7);
  const standardLoad=buildWeeklySchedule(data,{profileId:profile.id,weekStart:nextWeek,adaptiveLoad:false});
  const adaptiveLoad=buildWeeklySchedule(data,{profileId:profile.id,weekStart:nextWeek,adaptiveLoad:true});
  const load=adaptiveLoad.source.loadCalibration;
  if(load){
    const adaptiveDays=adaptiveLoad.days.filter(day=>day.kind==='practice').length,standardDays=standardLoad.days.filter(day=>day.kind==='practice').length;
    page.append(el('section',{class:'panel weekly-load-preview'},sectionHeader('Next-week scheduling load',calibrationSummary(load),[
      link('Open next week','/calendar/'+nextWeek,'button secondary','today'),
    ]),
      el('div',{class:'stats-strip inset-stats'},
        stat('Planning source',titleCase(load.targetSource)),
        stat('Weekly minutes',adaptiveLoad.targetMinutes,load.loadAdjusted?'Standard · '+standardLoad.targetMinutes:'Explicit / standard target retained'),
        stat('Practice days',adaptiveDays,(load.patternAdjusted||adaptiveDays!==standardDays)?'Standard · '+standardDays:'Standard day count retained'),
        stat('Confidence',titleCase(load.confidence))),
      el('p',{class:'muted small'},load.observedSessions+' recorded session'+(load.observedSessions===1?'':'s')+' · '+load.observedActiveDays+' active day'+(load.observedActiveDays===1?'':'s')+' · '+load.observedActiveWeeks+' active week'+(load.observedActiveWeeks===1?'':'s')+' in the evidence window.'),
      el('p',{class:'field-hint'},load.targetSource==='profile-default'
        ?'With enough evidence, Calendar may gently adapt the profile-default weekly load and weekday placement. Nothing is saved until you generate and apply a week.'
        :'The explicit Training Cycle / weekly-minute target remains authoritative. Calibration may only shape day count or weekday placement unless you edit the target yourself.')));
  }
  const proposal=el('section',{class:'panel weekly-focus-panel'},sectionHeader('Next 7 days focus',review.focus.length?'Suggested from current evidence':'No automatic focus proposal'));
  if(!review.focus.length){
    proposal.append(empty('No focus proposal yet','Steadybar does not have enough eligible skill-linked material to suggest a Priority Cycle. You can continue with Balanced Autopilot and current goals.',link('Open Today','/','button secondary')));
  }else{
    const controls:{include:HTMLInputElement;weight:HTMLSelectElement;suggestion:WeeklyFocusSuggestion}[]=[];
    for(const [index,suggestion] of review.focus.entries()){
      const includeWrap=checkbox(`weekly-focus-${index}`,`Include ${suggestion.label}`,true),include=includeWrap.querySelector('input')!;
      const weight=el('select',{'aria-label':`Priority strength · ${suggestion.label}`},
        [[3,'Primary'],[2,'Secondary'],[1,'Support']].map(([value,label])=>el('option',{value:String(value),selected:value===suggestion.weight},label))) as HTMLSelectElement;
      controls.push({include,weight,suggestion});
      proposal.append(el('article',{class:'weekly-focus-card'},
        el('div',{class:'weekly-focus-heading'},el('div',{},el('span',{class:'eyebrow'},roleLabel(suggestion.role)),el('h3',{},suggestion.label)),includeWrap),
        field('Priority strength',weight,'This is the existing Priority Cycle weight used by the Priority Engine.'),
        suggestion.reasons.length?el('ul',{class:'weekly-reasons'},suggestion.reasons.map(reason=>el('li',{},reason))):el('p',{class:'muted small'},'No strong explanatory factor beyond the current priority ordering.'),
        suggestion.examples.length?el('p',{class:'muted small'},'Examples · '+suggestion.examples.join(' · ')):null));
    }
    const apply=button(review.activeCycle?'Replace active priorities':'Apply priorities',async()=>{
      const selections:WeeklyFocusSelection[]=controls.filter(row=>row.include.checked).map(row=>({
        skillId:row.suggestion.skillId,weight:Number(row.weight.value) as 1|2|3,note:row.suggestion.reasons.slice(0,2).join(' · '),
      }));
      if(!selections.length){notify('Choose at least one weekly priority.','info');return;}
      if(review.activeCycle&&!await confirmAction('Replace the active priority cycle?',`“${review.activeCycle.name}” will be completed and kept in history. The selected weekly priorities will become active.`,'Replace priorities'))return;
      await applyWeeklyFocus(profile.id,selections);notify('Weekly priorities applied.');
    },'primary','goal');
    proposal.append(el('div',{class:'weekly-apply-row'},apply,el('p',{class:'field-hint'},'Nothing changes until you apply this selection. You can exclude suggestions or change their strength first.')));
  }
  page.append(proposal);

  const autopilot=el('section',{class:'panel weekly-autopilot'},sectionHeader('Autopilot emphasis','How the proposed focus maps onto the existing session builder',[
    link('Open Today','/','button secondary','today'),
  ]),el('div',{class:'weekly-intent'},badge(titleCase(review.suggestedIntent),'accent'),el('strong',{},review.suggestedIntentReason)),el('p',{class:'field-hint'},'Applying the Priority Cycle changes which targets Autopilot ranks highly. The session duration and emphasis remain explicit choices on Today.'));
  page.append(autopilot);

  const active=el('section',{class:'panel weekly-cycle-panel'},sectionHeader('Current priority cycle',review.activeCycle?review.activeCycle.name:'No active cycle'));
  if(review.activeCycle){
    active.append(el('p',{class:'muted small'},`Started ${formatDate(review.activeCycle.startedOn)} · ${review.activeCycle.items.length} priorit${review.activeCycle.items.length===1?'y':'ies'}`),...cycleItems(review.activeCycle),
      el('div',{class:'weekly-cycle-actions'},button('End active priorities',async()=>{
        if(await confirmAction('End the active priority cycle?',`“${review.activeCycle!.name}” will be kept in history but will no longer influence scheduling.`,'End priorities')){await endWeeklyFocus(profile.id);notify('Priority cycle ended.');}
      },'ghost')));
  }else active.append(el('p',{class:'muted'},'Without an active cycle, the Priority Engine falls back to goals, profile focus, retention, weakness, balance, repertoire urgency and other evidence.'));
  page.append(active);

  const history=el('section',{class:'panel weekly-cycle-history'},sectionHeader('Recent priority cycles','Restore creates a new active copy; the historical record stays unchanged.'));
  if(!review.recentCycles.length)history.append(el('p',{class:'muted'},'No completed priority cycles yet.'));
  else for(const cycle of review.recentCycles)history.append(el('article',{class:'weekly-history-row'},
    el('div',{},el('strong',{},cycle.name),el('p',{class:'muted small'},`${formatDate(cycle.startedOn)}${cycle.endedOn?` → ${formatDate(cycle.endedOn)}`:''} · ${cycle.items.map(item=>skillDefinition(item.skillId)?.label??item.skillId).join(' · ')}`)),
    button('Restore',async()=>{
      if(review.activeCycle&&!await confirmAction('Restore these priorities?',`The current active cycle will be completed. A new active copy of “${cycle.name}” will be created.`,'Restore priorities'))return;
      await restoreWeeklyFocus(profile.id,cycle.id);notify('Previous priorities restored as a new active cycle.');
    },'secondary compact')));
  page.append(history);
  return {node:page};
}
