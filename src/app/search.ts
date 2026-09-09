import { coursesFor, lessonLink } from '../learning/engine.js';
import { activeProfile, practiceProfiles, profileName } from '../domain/profiles.js';
import { switchProfile } from './profiles.js';
import { store } from './store.js';
import { navigate } from './navigation.js';
import { el } from '../ui/dom.js';
import { button, dialog } from '../ui/components.js';
import { editExercise, editGoal, editRoutine, editSetlist, editSong } from '../ui/editors.js';
import { exportBackup } from '../db/backup.js';
import { icon, type IconName } from '../ui/icons.js';
interface SearchItem{label:string;type:string;icon:IconName;action:()=>void|Promise<unknown>}
export function openSearch():void{
  if(document.querySelector('dialog[open]'))return;
  const data=store.snapshot(),selectedProfileId=activeProfile(data).id,availableProfileIds=new Set(practiceProfiles(data).map(p=>p.id)),query=el('input',{type:'search',placeholder:'Find a lesson, exercise, song, routine, or action…','aria-label':'Search everything',autocomplete:'off',class:'command-input'}),results=el('div',{class:'command-results',role:'list','aria-label':'Search results'});
  const items:SearchItem[]=[
    {label:'Start practice',type:'Command',icon:'play',action:()=>navigate('/practice')},{label:'Open metronome',type:'Command',icon:'pulse',action:()=>navigate('/metronome')},
    {label:'New exercise',type:'Command',icon:'plus',action:()=>editExercise()},{label:'New routine',type:'Command',icon:'plus',action:()=>editRoutine()},{label:'New song',type:'Command',icon:'plus',action:()=>editSong()},{label:'New setlist',type:'Command',icon:'plus',action:()=>editSetlist()},{label:'New goal',type:'Command',icon:'plus',action:()=>editGoal()},
    {label:'Open progress',type:'Command',icon:'progress',action:()=>navigate('/progress')},{label:'Manage profiles',type:'Command',icon:'settings',action:()=>navigate('/profiles')},{label:'Open settings',type:'Command',icon:'settings',action:()=>navigate('/settings')},{label:'Export backup',type:'Command',icon:'download',action:exportBackup},
    {label:'Open guided courses',type:'Command',icon:'library',action:()=>navigate('/courses')},
    ...coursesFor(activeProfile(data)).flatMap(course=>[
      {label:course.title,type:'Course',icon:'library' as const,action:()=>navigate(`/courses/${course.id}`)},
      ...course.lessons.map(lesson=>({label:lesson.title,type:`Lesson · ${course.title}`,icon:'library' as const,action:()=>navigate(lessonLink(course,lesson,selectedProfileId))})),
    ]),
    ...data.exercises.filter(e=>!e.archived&&(!e.profileId||availableProfileIds.has(e.profileId))).map(e=>({label:e.name,type:`Exercise · ${profileName(data,e.profileId)}`,icon:'library' as const,action:()=>navigate(`/library/${e.id}`)})),
    ...data.songs.flatMap(s=>(s.parts??[]).filter(p=>availableProfileIds.has(p.profileId)).map(p=>({label:`${s.title} · ${p.name}`,type:`Song part · ${profileName(data,p.profileId)}`,icon:'song' as const,action:async()=>{if(p.profileId!==selectedProfileId)await switchProfile(p.profileId);navigate(`/songs/${s.id}/parts/${p.id}`);}}))),
    ...data.songs.filter(s=>s.status!=='archived').map(s=>({label:s.title,type:'Song',icon:'song' as const,action:()=>navigate(`/songs/${s.id}`)})),
    ...data.routines.filter(r=>!r.archived&&(!r.profileId||availableProfileIds.has(r.profileId))).map(r=>({label:r.name,type:`Routine · ${profileName(data,r.profileId)}`,icon:'routine' as const,action:async()=>{if(r.profileId&&r.profileId!==selectedProfileId)await switchProfile(r.profileId);navigate(`/routines/${r.id}`);}})),
    ...data.setlists.map(s=>({label:s.name,type:'Setlist',icon:'setlist' as const,action:()=>navigate(`/setlists/${s.id}`)})),
    ...data.goals.filter(g=>!g.profileId||availableProfileIds.has(g.profileId)).map(g=>({label:g.title,type:`Goal · ${g.profileId?profileName(data,g.profileId):'All profiles'}`,icon:'goal' as const,action:async()=>{if(g.profileId&&g.profileId!==selectedProfileId)await switchProfile(g.profileId);navigate('/goals');}})),
  ];
  const indexed=items.map(item=>({...item,searchText:`${item.label} ${item.type}`.toLocaleLowerCase()}));
  let selected=0;let buttons:HTMLButtonElement[]=[];
  const announcement=el('p',{class:'sr-only',role:'status'});
  const handle=dialog('Search',[query,results,announcement,el('p',{class:'command-hint muted tiny'},'↑ ↓ to move · Enter to open · Esc to close')]);handle.dialog.classList.add('command-dialog');
  const highlight=()=>{announcement.textContent=buttons[selected]?`${buttons[selected]!.textContent}. Result ${selected+1} of ${buttons.length}.`:'';buttons.forEach((b,i)=>{b.classList.toggle('highlighted',i===selected);b.setAttribute('aria-current',String(i===selected));if(i===selected)b.scrollIntoView({block:'nearest'});});};
  const render=()=>{
    const q=query.value.trim().toLowerCase(),filtered=indexed.filter(item=>item.searchText.includes(q)).slice(0,30);selected=0;results.replaceChildren();
    buttons=filtered.map(item=>{
      const b=button(item.label,async()=>{handle.close();await item.action();},'command-item');b.prepend(icon(item.icon));b.append(el('small',{},item.type));results.append(el('div',{role:'listitem'},b));return b;
    });
    if(!filtered.length)results.append(el('p',{class:'muted inset'},'No results. Try another name or command.'));highlight();
  };
  query.addEventListener('input',render);
  handle.dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();selected=Math.max(0,Math.min(buttons.length-1,selected+(event.key==='ArrowDown'?1:-1)));highlight();}
    if(event.key==='Enter'&&document.activeElement===query){event.preventDefault();buttons[selected]?.click();}
  });render();query.focus();
}
