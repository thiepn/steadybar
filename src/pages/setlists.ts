import { currentSongPart } from '../app/song-parts.js';
import { prepareSetPrepPlan } from '../app/set-prep.js';
import { activeProfile } from '../domain/profiles.js';
import { assessSetlist, SET_PREP_MINUTES, type SetPrepAssessment } from '../domain/set-prep.js';
import type { SetPrepMode } from '../domain/practice-state.js';
import { store } from '../app/store.js';
import { navigate, type Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, formDialog, formNumber, formText, iconButton, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { editSetlist, selectSongDialog } from '../ui/editors.js';
import { formatDate, localDate, metadata, reorder, titleCase } from '../domain/utils.js';
import { finishedSessions } from '../domain/analytics.js';
import type { Routine, RoutineBlock, Setlist } from '../domain/models.js';
import { launchPractice, songBlock } from '../practice/launch.js';

const readinessLabel=(value:SetPrepAssessment['items'][number]['readiness'])=>value==='ready'?'Ready evidence':value==='usable'?'Usable':value==='needs-work'?'Needs work':'Unassessed';
const readinessVariant=(value:SetPrepAssessment['items'][number]['readiness'])=>value==='ready'?'accent':'neutral';
function windowLabel(assessment:SetPrepAssessment):string{
  switch(assessment.window){
    case 'build':return 'Build';
    case 'integrate':return 'Integrate';
    case 'simulate':return 'Simulate';
    case 'taper':return 'Taper';
    case 'performance-day':return 'Performance day';
    case 'past':return 'Past performance';
  }
}
function windowDetail(assessment:SetPrepAssessment):string{
  if(assessment.window==='past')return 'The performance date has passed. Update the date to build new Set Prep.';
  if(assessment.daysUntil===0)return 'Performance today · keep changes small and prioritize running order, cues, and confidence.';
  if(assessment.daysUntil===1)return 'Performance tomorrow · short confidence work and run-throughs take priority.';
  if(assessment.daysUntil!==undefined)return assessment.daysUntil+' days until performance.';
  return 'No performance date · build reliable repertoire before simulation.';
}
function stageGuidance(assessment:SetPrepAssessment):string{
  switch(assessment.window){
    case 'build':return 'Build weak sections and transitions before relying on whole-song run-throughs.';
    case 'integrate':return 'Reconnect weak spots into complete sections and songs; begin more performance-context work.';
    case 'simulate':return 'Favor continuous songs, transitions, running order, and performance-context simulations.';
    case 'taper':return 'Keep sessions shorter and specific. Repair known weak links without introducing large new challenges.';
    case 'performance-day':return 'Use only brief confidence work or an ordered run-through. Do not add new difficulty.';
    case 'past':return 'This set can still be reviewed, but new preparation should use an updated date.';
  }
}

function prepareRoutine(setlist:Setlist):void{
  const data=store.snapshot(),songs=setlist.songIds.map(id=>data.songs.find(s=>s.id===id)).filter(s=>s!==undefined).map(song=>{const part=currentSongPart(song);return {...song,sections:part?.sections??song.sections};});
  if(!songs.length){notify('Add at least one song before generating a routine.','info');return;}
  const mode=select('mode','What to practice',[['whole','Entire songs'],['sections','Selected sections']], 'whole');
  const sections=el('div',{class:'setlist-section-picker',hidden:true},songs.map(song=>el('fieldset',{},el('legend',{},song.title),song.sections.length?song.sections.map(section=>checkbox(`section-${section.id}`,section.name,false)):el('p',{class:'muted small'},'No sections defined. This song will be included in full.'))));
  mode.addEventListener('change',()=>{sections.hidden=mode.querySelector('select')!.value!=='sections';});
  formDialog('Generate preparation routine',[
    input('name','Routine name',`${setlist.name} · Preparation`,'text',{required:true,maxlength:200}),mode,sections,
    input('minutes','Minutes per song / selected section',10,'number',{min:1,max:1440,step:1,required:true}),
    el('p',{class:'field-hint'},'The result is a normal editable routine. It is separate from evidence-based Set Prep.'),
  ],async form=>{
    const seconds=formNumber(form,'minutes')*60;const blocks:RoutineBlock[]=[];
    for(const song of songs){
      if(formText(form,'mode')==='whole'||!song.sections.length)blocks.push(songBlock(song,undefined,seconds));
      else for(const section of song.sections)if(form.has(`section-${section.id}`))blocks.push(songBlock(song,section.id,seconds));
    }
    if(!blocks.length)throw new Error('Select at least one section, or choose Entire songs.');
    const routine:Routine={...metadata(),profileId:activeProfile(data).id,name:formText(form,'name'),description:`Prepared from ${setlist.name}. ${setlist.notes}`.trim(),blocks:blocks.map((b,order)=>({...b,order})),scheduledDays:[],tags:['setlist-preparation'],builtin:false,archived:false};
    await store.save('routines',routine);notify('Preparation routine created.');navigate(`/routines/${routine.id}`);
  },'Generate routine');
}

function setPrepDialog(setlist:Setlist,startNow:boolean):void{
  const data=store.snapshot(),profile=activeProfile(data),assessment=assessSetlist(data,setlist,profile.id);
  if(assessment.window==='past'){notify('Update this setlist’s performance date before building new Set Prep.','info');return;}
  const current=store.view().dailyPlans.find(plan=>plan.date===localDate());
  const defaultMode:SetPrepMode=['simulate','taper','performance-day'].includes(assessment.window)?'run-through':'focused';
  const defaultMinutes=SET_PREP_MINUTES.reduce((best,value)=>Math.abs(value-profile.defaultSessionMinutes)<Math.abs(best-profile.defaultSessionMinutes)?value:best,20);
  const mode=select('prepMode','Preparation mode',[['focused','Focused prep · weak spots first'],['run-through','Run-through · set order']],defaultMode);
  const minutes=select('minutes','Session time',SET_PREP_MINUTES.map(value=>[String(value),value+' min'] as [string,string]),String(defaultMinutes));
  const replacement=current?.blocks.length?el('p',{class:'field-hint warning-hint'},`Today already has ${current.blocks.length} block${current.blocks.length===1?'':'s'}. Building Set Prep will replace today’s plan, not practice history.`):null;
  formDialog(startNow?'Start Set Prep':'Build Set Prep',[
    el('div',{class:'set-prep-dialog-summary'},badge(windowLabel(assessment),assessment.window==='performance-day'?'accent':'neutral'),el('strong',{},windowDetail(assessment)),el('p',{class:'muted small'},stageGuidance(assessment))),
    mode,minutes,replacement,
    el('p',{class:'field-hint'},'Focused prep targets current weak or unassessed repertoire. Run-through keeps the exact set order and records performance-context evidence.'),
  ],async form=>{
    if(startNow&&await store.activeSession()){await launchPractice([]);return;}
    const prepared=await prepareSetPrepPlan(setlist,Number(formText(form,'minutes')),formText(form,'prepMode') as SetPrepMode);
    if(startNow)await launchPractice(prepared.blocks,{planId:prepared.id});
    else {notify('Set Prep plan ready.');navigate('/');}
  },startNow?'Build & start':'Build Today');
}

function readinessSummary(assessment:SetPrepAssessment):string{
  const c=assessment.counts;
  return [
    c.needsWork?`${c.needsWork} need${c.needsWork===1?'s':''} work`:'',
    c.unassessed?`${c.unassessed} unassessed`:'',
    c.usable?`${c.usable} usable`:'',
    c.ready?`${c.ready} ready`:'',
  ].filter(Boolean).join(' · ')||'No songs';
}

export function setlistsPage():Page{
  const data=store.snapshot(),profile=activeProfile(data),page=el('div',{class:'page'},pageHeader('','Setlists','Organize performances, assess repertoire evidence, and build staged preparation.',[button('New setlist',()=>editSetlist(),'primary','plus')]));
  if(!data.setlists.length)page.append(empty('No setlists yet','Create a performance or worship setlist, then use Set Prep to prioritize its weak spots and run-throughs.',button('Create setlist',()=>editSetlist(),'primary','plus'),'setlist'));
  else page.append(el('div',{class:'setlist-collection'},[...data.setlists].sort((a,b)=>(b.date||b.createdAt).localeCompare(a.date||a.createdAt)).map(setlist=>{
    const assessment=assessSetlist(data,setlist,profile.id);
    return el('article',{class:'setlist-card'},el('div',{class:'split'},badge(setlist.date?formatDate(setlist.date):'No date'),badge(windowLabel(assessment),assessment.readiness==='ready-evidence'?'accent':'neutral')),el('h2',{},link(setlist.name,`/setlists/${setlist.id}`)),setlist.notes?el('p',{class:'muted line-clamp'},setlist.notes):null,el('p',{class:'muted small'},readinessSummary(assessment)),el('ol',{class:'setlist-preview'},setlist.songIds.slice(0,5).map(id=>el('li',{},data.songs.find(song=>song.id===id)?.title||'Song unavailable'))),link('Open setlist',`/setlists/${setlist.id}`,'text-link','arrow'));
  })));
  return {node:page};
}

export function setlistPage(id:string):Page{
  const data=store.snapshot(),setlist=data.setlists.find(s=>s.id===id);if(!setlist)return {node:empty('Setlist not found.','Choose another setlist.',link('Setlists','/setlists','button primary'))};
  const profile=activeProfile(data),assessment=assessSetlist(data,setlist,profile.id);
  const page=el('div',{class:'page setlist-page'},link('All setlists','/setlists','back-link'),pageHeader(setlist.date?formatDate(setlist.date):'',setlist.name,setlist.notes,[button('Edit details',()=>editSetlist(setlist),'secondary','edit'),button('Start Set Prep',()=>setPrepDialog(setlist,true),'primary','play')]));

  const prep=el('section',{class:'panel set-prep-panel'},sectionHeader('Set preparation',windowDetail(assessment),[
    button('Build Today',()=>setPrepDialog(setlist,false),'secondary'),
  ]),
    el('div',{class:'stats-strip set-prep-stats'},
      stat('Prep window',windowLabel(assessment)),
      stat('Ready evidence',String(assessment.counts.ready),`of ${assessment.items.length} songs`),
      stat('Needs work',String(assessment.counts.needsWork)),
      stat('Unassessed',String(assessment.counts.unassessed))),
    el('p',{class:'pre-line'},stageGuidance(assessment)),
    el('p',{class:'field-hint'},'Readiness is evidence-based and profile-specific. It is not a performance guarantee, and manually marking a song performance-ready does not manufacture evaluated evidence.'),
    el('div',{class:'actions wrap'},button('Generate practice routine',()=>prepareRoutine(setlist),'ghost','routine')));
  if(assessment.window==='past')prep.append(el('div',{class:'info-banner'},'This performance date has passed. Update the date before generating new Set Prep.'));
  const panel=el('section',{class:'panel'},sectionHeader('Running order',`${setlist.songIds.length} songs · ${readinessSummary(assessment)}`,[button('Add song',()=>selectSongDialog(async song=>{await store.save('setlists',{...setlist,songIds:[...setlist.songIds,song.id]});},setlist.songIds),'secondary','plus')]));
  if(!setlist.songIds.length)panel.append(empty('Add the first song.','Songs remain in your library when removed from a setlist.',button('Choose a song',()=>selectSongDialog(async song=>{await store.save('setlists',{...setlist,songIds:[song.id]});}),'ghost','plus'),'song'));
  let dragged=-1;
  setlist.songIds.forEach((songId,index)=>{
    const song=data.songs.find(s=>s.id===songId),part=song?currentSongPart(song):undefined,item=assessment.items.find(row=>row.setPosition===index);const last=finishedSessions(store.view().sessions).filter(s=>s.blocks.some(b=>b.sourceSongId===songId)).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0];
    const move=async(to:number)=>store.save('setlists',{...setlist,songIds:reorder(setlist.songIds,index,to)});
    const up=iconButton(`Move ${song?.title||'song'} up`,'up',()=>move(index-1));up.disabled=index===0;const down=iconButton(`Move ${song?.title||'song'} down`,'down',()=>move(index+1));down.disabled=index===setlist.songIds.length-1;
    const issueText=item?.issues.slice(0,2).map(issue=>`${issue.kind==='transition'?'Transition':'Section'}: ${issue.label} · ${readinessLabel(issue.readiness)}`).join(' · ');
    const row=el('div',{class:'setlist-song-row',draggable:true,onDragstart:()=>{dragged=index;},onDragover:(event:DragEvent)=>event.preventDefault(),onDrop:(event:DragEvent)=>{event.preventDefault();if(dragged>=0)void store.save('setlists',{...setlist,songIds:reorder(setlist.songIds,dragged,index)}).catch(error=>notify(error instanceof Error?error.message:'The setlist order could not be saved.','error'));dragged=-1;}},
      el('span',{class:'block-index'},String(index+1).padStart(2,'0')),el('div',{class:'song-row-title'},song?link(song.title,`/songs/${song.id}`):el('strong',{},'Song unavailable'),el('span',{class:'muted small'},song?.artist||''),item?el('span',{class:'muted small set-prep-song-summary'},item.summary):null),
      el('div',{class:'song-row-meta'},song?el('strong',{},`${song.bpm} BPM · ${song.meter.beats}/${song.meter.beatUnit}`):null,song?badge(titleCase(part?.status??song.status),(part?.status??song.status)==='performance-ready'?'accent':'neutral'):null,item?badge(readinessLabel(item.readiness),readinessVariant(item.readiness)):null,part?el('span',{class:'muted small'},[part.name,part.key,part.role,part.notes].filter(Boolean).join(' · ')):null,issueText?el('span',{class:'muted small set-prep-issues'},issueText):null,el('span',{class:'muted small'},last?`Practiced ${formatDate(last.startedAt)}`:'Not practiced yet')),
      el('div',{class:'actions'},up,down,iconButton(`Remove ${song?.title||'song'} from setlist`,'close',async()=>{await store.save('setlists',{...setlist,songIds:setlist.songIds.filter((_,i)=>i!==index)});})));panel.append(row);
  });
  page.append(prep,panel,el('div',{class:'page-footer'},button('Delete setlist',async()=>{if(await confirmAction('Delete this setlist?','The songs and practice history will remain unchanged. Historical Set Prep snapshots also remain in History.','Delete setlist',true)){await store.delete('setlists',id);navigate('/setlists');}},'ghost','trash')));
  return {node:page};
}
