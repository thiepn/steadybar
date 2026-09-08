import type { Data, PracticeSession } from './models.js';
import type { ProtocolOutcome } from './practice-types.js';
const finishedSessions=(sessions:PracticeSession[])=>sessions.filter(s=>s.status!=='active');
import { NOTE_NAMES } from './protocols.js';
export function protocolResults(sessions:PracticeSession[],exerciseId?:string):ProtocolOutcome[]{
  return finishedSessions(sessions).flatMap(s=>s.blocks.filter(b=>!exerciseId||b.sourceExerciseId===exerciseId).flatMap(b=>b.outcomes??[]));
}
export function summarizeResults(results:ProtocolOutcome[]):{label:string;value:string;detail:string}[]{
  const summaries:{label:string;value:string;detail:string}[]=[];
  const count=results.filter(r=>r.kind==='count');
  if(count.length){const clean=count.reduce((n,r)=>n+r.clean,0),total=count.reduce((n,r)=>n+r.total,0);summaries.push({label:'Clean repetitions',value:`${clean} / ${total}`,detail:'Self-reported counts; different tasks are not a speed ranking.'});}
  const recall=results.filter(r=>r.kind==='recall');
  if(recall.length)summaries.push({label:'Note recall',value:`${recall.filter(r=>r.correct).length} / ${recall.length}`,detail:'Scored answers to note prompts, not measured playing.'});
  const scales=results.filter(r=>r.kind==='scale');
  if(scales.length)summaries.push({label:'Keys practiced',value:[...new Set(scales.map(r=>r.key))].sort((a,b)=>a-b).map(k=>NOTE_NAMES[k]).join(' · '),detail:'Recorded passes indicate coverage, not mastery.'});
  const grooves=results.filter(r=>r.kind==='groove');
  if(grooves.length){for(const [key,label] of [['timing','Time'],['control','Control / muting'],['articulation','Articulation']] as const)summaries.push({label,value:`${(grooves.reduce((n,r)=>n+r[key],0)/grooves.length).toFixed(1)} / 5`,detail:`${grooves.length} self-assessments; not audio analysis.`});}
  const vocal=results.filter(r=>r.kind==='voice');
  if(vocal.length){for(const [key,label] of [['ease','Vocal ease'],['fatigue','Vocal fatigue']] as const)summaries.push({label,value:`${(vocal.reduce((n,r)=>n+r[key],0)/vocal.length).toFixed(1)} / 5`,detail:key==='fatigue'?'Self-report; lower means less fatigue. Not a medical assessment.':'Self-report; higher means easier. Do not push range to improve a score.'});}
  const pitch=results.filter(r=>r.kind==='pitch');
  if(pitch.length)summaries.push({label:'Pitch matching',value:`${pitch.filter(r=>r.matched).length} / ${pitch.length}`,detail:'Self-reported matches. No microphone measurement.'});
  const reading=results.filter(r=>r.kind==='reading');
  if(reading.length)summaries.push({label:'First-read attempts',value:String(reading.filter(r=>r.firstRead).length),detail:`${reading.length} reading attempts including repeat practice.`});
  const reflection=results.filter(r=>r.kind==='reflection');
  if(reflection.length)summaries.push({label:'Reflections recorded',value:String(reflection.length),detail:'Review notes and choose a concrete next task.'});
  return summaries;
}
export function outcomeSummary(r:ProtocolOutcome):string{
  switch(r.kind){
    case 'count':return `${r.clean}/${r.total} clean ${r.protocol==='chord-changes'?'changes':'repetitions'} · self-report`;
    case 'groove':return `Time ${r.timing}/5 · control ${r.control}/5 · articulation ${r.articulation}/5 · self-report`;
    case 'scale':return `${NOTE_NAMES[r.key]} ${r.quality.replaceAll('-',' ')} · ${r.hands} · ${r.mistakes} errors${r.bpm?' · '+r.bpm+' BPM':''}`;
    case 'recall':return `String ${r.string}, fret ${r.fret}: ${NOTE_NAMES[r.answer]} — ${r.correct?'correct':'expected '+NOTE_NAMES[r.expected]}`;
    case 'voice':return `Pitch ${r.pitch}/5 · ease ${r.ease}/5 · breath ${r.breath}/5 · fatigue ${r.fatigue}/5 · self-report`;
    case 'pitch':return `${r.matched?'Matched':'Needs another listen'} · self-report`;
    case 'reading':return `${r.firstRead?'First read':'Repeat'} · ${r.errors} errors · continuity ${r.continuity}/5`;
    case 'reflection':return `Reflection ${r.rating}/5${r.note?' · '+r.note:''}`;
  }
}
const focusTokens=(value:string):Set<string>=>new Set(value.toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean).map(word=>word.length>3&&word.endsWith('s')?word.slice(0,-1):word));
const matchedFocus=(skill:string|undefined,focusAreas:string[]):string|undefined=>{
  const skillSet=focusTokens(skill??'');if(!skillSet.size)return undefined;
  return focusAreas.find(focus=>{const focusSet=focusTokens(focus);return [...skillSet].every(token=>focusSet.has(token))||[...focusSet].every(token=>skillSet.has(token));});
};
export function suggestedExercises(data:Data):{id:string;reason:string}[]{
  const p=data.profiles?.find(p=>p.id===data.settings.activeProfileId);if(!p)return [];
  const last=new Map<string,string>();for(const s of finishedSessions(data.sessions))for(const b of s.blocks)if(b.sourceExerciseId&&(!last.has(b.sourceExerciseId)||last.get(b.sourceExerciseId)!<s.startedAt))last.set(b.sourceExerciseId,s.startedAt);
  const selected=data.exercises.filter(e=>e.profileId===p.id&&!e.archived),matches=new Map(selected.map(e=>[e.id,matchedFocus(e.skillArea,p.focusAreas)]));
  const score=(e:Data['exercises'][number])=>data.goals.some(g=>g.exerciseId===e.id&&!g.completed)?2:matches.get(e.id)?1:0;
  const level=(e:Data['exercises'][number])=>e.level===p.level?1:0;
  return selected.sort((a,b)=>score(b)-score(a)||level(b)-level(a)||(last.get(a.id)??'').localeCompare(last.get(b.id)??'')||a.id.localeCompare(b.id)).slice(0,3).map(e=>({id:e.id,reason:score(e)===2?'Linked to an active goal':matches.get(e.id)?`Matches ${matches.get(e.id)}`:last.has(e.id)?'Earlier practice to revisit':'Not practiced yet'}));
}
