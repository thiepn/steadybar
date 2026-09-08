import { changeSongSections } from '../app/song-parts.js';
import { activeProfile, profileName } from '../domain/profiles.js';
import { editSongPart } from '../ui/song-parts.js';
import { store } from '../app/store.js';
import { navigate, type Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { button, confirmAction, empty, formDialog, formNumber, formText, iconButton, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { editSection, editSong } from '../ui/editors.js';
import { addToday, launchPractice, songBlock } from '../practice/launch.js';
import { duration, formatDate, nowISO, reorder, titleCase } from '../domain/utils.js';
import { finishedSessions } from '../domain/analytics.js';
const selectedParts = new Map<string,string>();
const songView = { query: '', status: 'active', visible: 60 };
export function songsPage(): Page {
  const data = store.snapshot();
  const search = el('input', { type: 'search', value: songView.query, placeholder: 'Search songs or artists…', 'aria-label': 'Search songs' });
  const status = el('select', { 'aria-label': 'Filter song status' }, [['active', 'All active songs'], ['learning', 'Learning'], ['practicing', 'Practicing'], ['performance-ready', 'Performance-ready'], ['archived', 'Archived']].map(([v, l]) => el('option', { value: v }, l)));
  status.value = songView.status;
  const list = el('div', { class: 'song-collection' });
  const count = el('span', { class: 'muted small', role: 'status' });
  const more = button('Show more songs', () => { songView.visible += 60; draw(); }, 'secondary');
  const draw = () => {
    songView.query = search.value; songView.status = status.value;
    const query = search.value.toLocaleLowerCase();
    const songs = data.songs.filter(s => (status.value === 'active' ? s.status !== 'archived' : s.status === status.value) && `${s.title} ${s.artist}`.toLocaleLowerCase().includes(query)).sort((a, b) => a.title.localeCompare(b.title));
    list.replaceChildren(); count.textContent = `${songs.length} songs`; more.hidden = songs.length <= songView.visible;
    if (!songs.length) list.append(empty('No songs found', 'Add a song, then break it into sections for practice.', button('Add song', () => editSong(), 'secondary', 'plus')));
    for (const s of songs.slice(0, songView.visible)) list.append(el('article', { class: 'song-card song-row' },
      el('div', { class: 'repertoire-identity' }, el('h2', {}, link(s.title, `/songs/${s.id}`)), s.artist ? el('p', { class: 'muted small' }, s.artist) : null),
      el('div', { class: 'repertoire-arrangement' }, el('span', { class: 'song-status', 'data-status': s.status }, titleCase(s.status)), el('span', { class: 'muted tiny' }, `${s.meter.beats}/${s.meter.beatUnit}${s.key ? ` · ${s.key}` : ''} · ${s.sections.length} sections`)),
      el('div', { class: 'song-tempo' }, el('strong', {}, s.bpm), el('small', {}, 'BPM')),
      iconButton(`Practice ${s.title}`, 'play', () => launchPractice([songBlock(s)]))));
  };
  search.addEventListener('input', () => { songView.visible = 60; draw(); });
  status.addEventListener('change', () => { songView.visible = 60; draw(); }); draw();
  return { node: el('div', { class: 'page' }, pageHeader('', 'Songs', 'Repertoire, sections, and arrangement notes.', [button('Add song', () => editSong(), 'primary', 'plus')]),
    el('div', { class: 'library-toolbar' }, search, status), el('div', { class: 'result-meta' }, count), list, el('div', { class: 'page-footer' }, more)) };
}
export function songPage(id:string,requestedPart?:string):Page{
  const data=store.snapshot(),original=data.songs.find(s=>s.id===id);if(!original)return {node:empty('Song not found.','Your historical practice remains available in History.',link('Songs','/songs','button primary'))};
  const profile=activeProfile(data),selectionKey=`${profile.id}/${id}`,chosen=requestedPart??selectedParts.get(selectionKey);
  const part=chosen!==undefined?original.parts?.find(p=>p.id===chosen&&p.profileId===profile.id):original.parts?.find(p=>p.profileId===profile.id);
  const song:typeof original={...original,sections:part?.sections??original.sections,key:part?.key||original.key,status:part?.status??original.status};
  const partChoice=select('songPart','Practice part',[['shared','Shared arrangement'],...(original.parts??[]).filter(p=>p.profileId===profile.id).map(p=>[p.id,p.name] as [string,string])],part?.id??'shared');
  partChoice.addEventListener('change',()=>{const value=partChoice.querySelector('select')!.value;selectedParts.set(selectionKey,value);navigate(value==='shared'?`/songs/${id}`:`/songs/${id}/parts/${value}`);if(value==='shared'&&!requestedPart)window.dispatchEvent(new HashChangeEvent('hashchange'));});
  const history=finishedSessions(data.sessions).flatMap(s=>s.blocks.filter(b=>b.sourceSongId===id&&(!part||b.sourceSongPartId===part.id)&&(!b.profileId||b.profileId===profile.id)).map(b=>({session:s,block:b}))).sort((a,b)=>b.session.startedAt.localeCompare(a.session.startedAt));
  const transition=()=>{
    if(song.sections.length<2){notify('Add at least two sections to practice a transition.','info');return;}
    formDialog('Practice a transition',[
      select('from','From section',song.sections.map(s=>[s.id,s.name]),song.sections[0]!.id),select('to','To section',song.sections.map(s=>[s.id,s.name]),song.sections[1]!.id),input('minutes','Practice duration (minutes)',5,'number',{min:1,max:1440,required:true}),
      el('p',{class:'field-hint'},'Loop the last bars of the first section into the first bars of the next. This is saved as one continuous practice block.'),
    ],async form=>{
      const from=song.sections.find(s=>s.id===formText(form,'from')),to=song.sections.find(s=>s.id===formText(form,'to'));if(!from||!to||from===to)throw new Error('Choose two different sections.');
      const block=songBlock(original,from.id,formNumber(form,'minutes')*60,part?.id??'shared');block.title=`${song.title} · ${from.name} → ${to.name}`;block.notes=`Transition: ${from.name} → ${to.name}.\n${from.notes}\n${to.notes}`.trim();await launchPractice([block]);
    },'Start transition');
  };
  const page=el('div',{class:'page'},link('Songs','/songs','back-link'),pageHeader(song.artist||'',song.title,`${song.bpm} BPM · ${song.meter.beats}/${song.meter.beatUnit}${song.key?` · Key ${song.key}`:''}`,[button('Edit song',()=>editSong(original),'secondary','edit'),button('Practice song',()=>launchPractice([songBlock(original,undefined,600,part?.id??'shared')]),'primary','play')]));
  page.append(el('section',{class:'song-part-workspace'},el('div',{class:'song-part-toolbar'},partChoice,
    part?button('Edit part',()=>editSongPart(original,part),'secondary','edit'):null,
    button('Add instrument part',()=>{selectedParts.delete(selectionKey);editSongPart(original);},'secondary','plus')),
    el('p',{class:'field-hint'},`${profile.name}. ${(original.parts??[]).length} instrument parts in this shared song.`),
    part?el('div',{class:'part-notes'},el('strong',{},part.name),el('p',{class:'muted small'},[part.key?`Key ${part.key}`:'',part.tuning?`Tuning ${part.tuning}`:'',part.capo!==undefined?`Capo ${part.capo}`:'',part.range].filter(Boolean).join(' · ')),el('p',{class:'pre-line'},[part.role,part.notes].filter(Boolean).join('\n'))):null,
    (original.parts??[]).some(p=>p.profileId!==profile.id)?el('p',{class:'muted small'},'Other parts: '+(original.parts??[]).filter(p=>p.profileId!==profile.id).map(p=>`${p.name} (${profileName(data,p.profileId)})`).join(' · ')):null));
  page.append(el('div',{class:'stats-strip'},stat('Preparation',titleCase(song.status)),stat('Sections',song.sections.length),stat('Practice time',duration(history.reduce((s,h)=>s+h.block.actualActiveSeconds,0))),stat('Last practiced',history[0]?formatDate(history[0].session.startedAt):'—')));
  const sections=el('section',{class:'panel'},sectionHeader('Song sections',undefined,[button('Practice transition',transition,'ghost','arrow'),button('Add section',()=>editSection(original,undefined,part?.id),'secondary','plus')]));
  if(!song.sections.length)sections.append(empty('No sections yet','Add an intro, verse, chorus, bridge, or any section that needs focused practice.',button('Add first section',()=>editSection(original,undefined,part?.id),'ghost','plus'),'song'));
  let dragIndex=-1;
  song.sections.forEach((s,index)=>{
    const move=async(to:number)=>{await changeSongSections(id,part?.id,sections=>reorder(sections,index,to));};
    const up=iconButton(`Move ${s.name} up`,'up',()=>move(index-1));up.disabled=index===0;const down=iconButton(`Move ${s.name} down`,'down',()=>move(index+1));down.disabled=index===song.sections.length-1;
    const row=el('div',{class:'section-row',draggable:true,onDragstart:()=>{dragIndex=index;},onDragover:(e:DragEvent)=>e.preventDefault(),onDrop:(e:DragEvent)=>{e.preventDefault();if(dragIndex>=0)void changeSongSections(id,part?.id,sections=>reorder(sections,dragIndex,index)).catch(error=>notify(error instanceof Error?error.message:'The section order could not be saved.','error'));dragIndex=-1;}},el('span',{class:'block-index'},String(index+1).padStart(2,'0')),el('div',{class:'section-info'},el('strong',{},s.name),el('div',{class:'muted small'},`${s.bars?`${s.bars} bars · `:''}${s.bpmOverride||song.bpm} BPM`),s.notes?el('p',{class:'muted small pre-line'},s.notes):null),el('div',{class:'actions'},iconButton(`Practice ${s.name}`,'play',()=>launchPractice([songBlock(original,s.id,600,part?.id??'shared')])),iconButton(`Edit ${s.name}`,'edit',()=>editSection(original,s,part?.id)),up,down,iconButton(`Remove ${s.name}`,'close',async()=>{if(await confirmAction('Remove this section?',`Remove “${s.name}” from the song? Historical practice remains unchanged.`,'Remove section',true))await changeSongSections(id,part?.id,sections=>sections.filter(x=>x.id!==s.id));})));
    sections.append(row);
  });page.append(sections);
  if(song.notes)page.append(el('section',{class:'panel'},sectionHeader('Arrangement notes'),el('p',{class:'pre-line'},song.notes)));
  const past=el('section',{class:'panel'},sectionHeader('Recent song practice'));
  if(!history.length)past.append(el('p',{class:'muted inset'},'Finish a song or section session to see your practice here.'));
  else past.append(...history.slice(0,15).map(h=>el('div',{class:'history-block-row'},link(formatDate(h.session.startedAt),`/history/${h.session.id}`),el('strong',{},h.block.titleSnapshot),el('span',{class:'muted'},duration(h.block.actualActiveSeconds)),h.block.notes?el('p',{class:'small muted pre-line'},h.block.notes):null)));
  page.append(past,el('div',{class:'page-footer'},button('Add song to today',()=>addToday(songBlock(original,undefined,600,part?.id??'shared')),'secondary','plus'),button(original.status==='archived'?'Restore song':'Archive song',async()=>{
    const status=original.status==='archived'?'learning':'archived';
    await store.workspace(workspace=>{const current=workspace.songs.find(item=>item.id===original.id);if(!current)throw new Error('This song no longer exists.');current.status=status;current.updatedAt=nowISO();return workspace;});
    notify(status==='learning'?'Song restored.':'Song archived. Practice history is unchanged.');
  },'ghost',original.status==='archived'?'restart':'trash')));
  return {node:page};
}
