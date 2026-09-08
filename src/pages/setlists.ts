import { store } from '../app/store.js';
import { navigate, type Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, formDialog, formNumber, formText, iconButton, input, link, notify, pageHeader, sectionHeader, select } from '../ui/components.js';
import { editSetlist, selectSongDialog } from '../ui/editors.js';
import { formatDate, metadata, reorder, titleCase } from '../domain/utils.js';
import { finishedSessions } from '../domain/analytics.js';
import type { Routine, RoutineBlock, Setlist } from '../domain/models.js';
import { songBlock } from '../practice/launch.js';
function prepareRoutine(setlist:Setlist):void{
  const data=store.snapshot(),songs=setlist.songIds.map(id=>data.songs.find(s=>s.id===id)).filter(s=>s!==undefined);
  if(!songs.length){notify('Add at least one song before generating a routine.','info');return;}
  const mode=select('mode','What to practice',[['whole','Entire songs'],['sections','Selected sections']], 'whole');
  const sections=el('div',{class:'setlist-section-picker',hidden:true},songs.map(song=>el('fieldset',{},el('legend',{},song.title),song.sections.length?song.sections.map(section=>checkbox(`section-${section.id}`,section.name,false)):el('p',{class:'muted small'},'No sections defined. This song will be included in full.'))));
  mode.addEventListener('change',()=>{sections.hidden=mode.querySelector('select')!.value!=='sections';});
  formDialog('Generate preparation routine',[
    input('name','Routine name',`${setlist.name} · Preparation`,'text',{required:true,maxlength:200}),mode,sections,
    input('minutes','Minutes per song / selected section',10,'number',{min:1,max:1440,step:1,required:true}),
    el('p',{class:'field-hint'},'The result is a normal editable routine. In section mode, songs with sections but no selections are omitted.'),
  ],async form=>{
    const seconds=formNumber(form,'minutes')*60;const blocks:RoutineBlock[]=[];
    for(const song of songs){
      if(formText(form,'mode')==='whole'||!song.sections.length)blocks.push(songBlock(song,undefined,seconds));
      else for(const section of song.sections)if(form.has(`section-${section.id}`))blocks.push(songBlock(song,section.id,seconds));
    }
    if(!blocks.length)throw new Error('Select at least one section, or choose Entire songs.');
    const routine:Routine={...metadata(),name:formText(form,'name'),description:`Prepared from ${setlist.name}. ${setlist.notes}`.trim(),blocks:blocks.map((b,order)=>({...b,order})),scheduledDays:[],tags:['setlist-preparation'],builtin:false,archived:false};
    await store.save('routines',routine);notify('Preparation routine created.');navigate(`/routines/${routine.id}`);
  },'Generate routine');
}
export function setlistsPage():Page{
  const data=store.snapshot(),page=el('div',{class:'page'},pageHeader('','Setlists','Organize songs and prepare a rehearsal plan.',[button('New setlist',()=>editSetlist(),'primary','plus')]));
  if(!data.setlists.length)page.append(empty('No setlists yet','Create a performance or worship setlist, then turn it into a practice routine.',button('Create setlist',()=>editSetlist(),'primary','plus'),'setlist'));
  else page.append(el('div',{class:'setlist-collection'},[...data.setlists].sort((a,b)=>(b.date||b.createdAt).localeCompare(a.date||a.createdAt)).map(s=>el('article',{class:'setlist-card'},el('div',{class:'split'},badge(s.date?formatDate(s.date):'No date'),el('span',{class:'muted small'},`${s.songIds.length} songs`)),el('h2',{},link(s.name,`/setlists/${s.id}`)),s.notes?el('p',{class:'muted line-clamp'},s.notes):null,el('ol',{class:'setlist-preview'},s.songIds.slice(0,5).map(id=>el('li',{},data.songs.find(song=>song.id===id)?.title||'Song unavailable'))),link('Open setlist',`/setlists/${s.id}`,'text-link','arrow')))));
  return {node:page};
}
export function setlistPage(id:string):Page{
  const data=store.snapshot(),setlist=data.setlists.find(s=>s.id===id);if(!setlist)return {node:empty('Setlist not found.','Choose another setlist.',link('Setlists','/setlists','button primary'))};
  const page=el('div',{class:'page'},link('All setlists','/setlists','back-link'),pageHeader(setlist.date?formatDate(setlist.date):'',setlist.name,setlist.notes,[button('Edit details',()=>editSetlist(setlist),'secondary','edit'),button('Generate practice routine',()=>prepareRoutine(setlist),'primary','routine')]));
  const panel=el('section',{class:'panel'},sectionHeader('Running order',`${setlist.songIds.length} songs`,[button('Add song',()=>selectSongDialog(async song=>{await store.save('setlists',{...setlist,songIds:[...setlist.songIds,song.id]});},setlist.songIds),'secondary','plus')]));
  if(!setlist.songIds.length)panel.append(empty('Add the first song.','Songs remain in your library when removed from a setlist.',button('Choose a song',()=>selectSongDialog(async song=>{await store.save('setlists',{...setlist,songIds:[song.id]});}),'ghost','plus'),'song'));
  let dragged=-1;
  setlist.songIds.forEach((songId,index)=>{
    const song=data.songs.find(s=>s.id===songId);const last=finishedSessions(data.sessions).filter(s=>s.blocks.some(b=>b.sourceSongId===songId)).sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0];
    const move=async(to:number)=>store.save('setlists',{...setlist,songIds:reorder(setlist.songIds,index,to)});
    const up=iconButton(`Move ${song?.title||'song'} up`,'up',()=>move(index-1));up.disabled=index===0;const down=iconButton(`Move ${song?.title||'song'} down`,'down',()=>move(index+1));down.disabled=index===setlist.songIds.length-1;
    const row=el('div',{class:'setlist-song-row',draggable:true,onDragstart:()=>{dragged=index;},onDragover:(event:DragEvent)=>event.preventDefault(),onDrop:(event:DragEvent)=>{event.preventDefault();if(dragged>=0)void store.save('setlists',{...setlist,songIds:reorder(setlist.songIds,dragged,index)}).catch(error=>notify(error instanceof Error?error.message:'The setlist order could not be saved.','error'));dragged=-1;}},
      el('span',{class:'block-index'},String(index+1).padStart(2,'0')),el('div',{class:'song-row-title'},song?link(song.title,`/songs/${song.id}`):el('strong',{},'Song unavailable'),el('span',{class:'muted small'},song?.artist||'')),
      el('div',{class:'song-row-meta'},song?el('strong',{},`${song.bpm} BPM · ${song.meter.beats}/${song.meter.beatUnit}`):null,song?badge(titleCase(song.status),song.status==='performance-ready'?'accent':'neutral'):null,el('span',{class:'muted small'},last?`Practiced ${formatDate(last.startedAt)}`:'Not practiced yet')),
      el('div',{class:'actions'},up,down,iconButton(`Remove ${song?.title||'song'} from setlist`,'close',async()=>{await store.save('setlists',{...setlist,songIds:setlist.songIds.filter((_,i)=>i!==index)});})));panel.append(row);
  });
  page.append(panel,el('div',{class:'page-footer'},button('Delete setlist',async()=>{if(await confirmAction('Delete this setlist?','The songs and practice history will remain unchanged.','Delete setlist',true)){await store.delete('setlists',id);navigate('/setlists');}},'ghost','trash')));
  return {node:page};
}
