import { store } from '../app/store.js';
import { createProfile, updateProfile, switchProfile, archiveProfile } from '../app/profiles.js';
import { activeProfile, definition, FAMILIES, practiceProfiles, PROFILE_DEFINITIONS, profiles, profileName, skillLabel } from '../domain/profiles.js';
import { validateProfile } from '../domain/practice-validation.js';
import type { PracticeProfile, InstrumentType, InstrumentFamily, Experience } from '../domain/practice-types.js';
import { badge, button, confirmAction, dialog, formDialog, formNumber, formText, input, notify, sectionHeader, select } from './components.js';
import { el } from './dom.js';
import { navigate } from '../app/navigation.js';

const levelLabel=(value:Experience)=>skillLabel(value);
function focusOptions(chosen:InstrumentType,existing?:PracticeProfile):string[]{
  const base=[...definition(chosen).focuses],saved=existing?.instrumentType===chosen?existing.focusAreas:[];
  return [...saved,...base.filter(value=>!saved.includes(value))];
}
function focusGroup(chosen:InstrumentType,existing?:PracticeProfile):HTMLElement{
  const selected=new Set(existing?.instrumentType===chosen&&existing.focusAreas.length?existing.focusAreas:[definition(chosen).focuses[0]!]);
  return el('fieldset',{class:'profile-focus-group'},el('legend',{},'Practice focuses'),
    el('p',{class:'field-hint'},'Choose one or more. All selected focuses influence recommendations.'),
    el('div',{class:'profile-focus-options'},focusOptions(chosen,existing).map(value=>el('label',{class:'checkbox profile-focus-option'},el('input',{type:'checkbox',name:'focusArea',value,checked:selected.has(value)}),el('span',{},value)))));
}
export function profileForm(existing?:PracticeProfile):void{
  if(existing?.attribution==='unresolved-history'){notify('Earlier practice is a read-only historical bucket.','info');return;}
  const type=select('instrumentType','Instrument',PROFILE_DEFINITIONS.map(p=>[p.id,p.label]),existing?.instrumentType??'guitar');
  type.querySelector('select')!.disabled=!!existing;
  const family=select('family','Instrument family',FAMILIES.map(f=>[f,skillLabel(f)]),existing?.family??'general');family.querySelector('select')!.disabled=!!existing;
  const focus=el('div'),description=el('p',{class:'field-hint'});
  const draw=()=>{
    const chosen=definition(type.querySelector('select')!.value as InstrumentType);family.hidden=chosen.id!=='custom';
    focus.replaceChildren(focusGroup(chosen.id,existing));description.textContent=chosen.summary;
  };type.addEventListener('change',draw);draw();
  formDialog(existing?'Edit practice profile':'Add practice profile',[
    input('name','Profile name',existing?.name??'','text',{maxlength:200,placeholder:existing?'Profile name':'Leave blank for an automatic unique name'}),type,description,family,
    select('level','Experience',['beginner','intermediate','advanced'].map(v=>[v,skillLabel(v)]),existing?.level??'beginner'),focus,
    select('minutes','Usual session length',[['15','15 minutes'],['20','20 minutes'],['30','30 minutes'],['45','45 minutes'],['60','60 minutes']],String(existing?.defaultSessionMinutes??30)),
    el('p',{class:'field-hint'},existing?'Instrument identity is locked so completed history cannot be reinterpreted. Create another profile for a different instrument.':'Profiles keep separate exercises, plans, routines, goals and practice results. Songs and setlists stay shared.'),
  ],async(fd,form)=>{
    const instrumentType=existing?.instrumentType??formText(fd,'instrumentType') as InstrumentType;
    const focusAreas=[...form.querySelectorAll<HTMLInputElement>('input[name="focusArea"]:checked')].map(input=>input.value);
    if(!focusAreas.length)throw new Error('Choose at least one practice focus.');
    const values={name:formText(fd,'name'),instrumentType,family:existing?.family??formText(fd,'family') as InstrumentFamily,level:formText(fd,'level') as Experience,focusAreas,defaultSessionMinutes:formNumber(fd,'minutes')};
    if(existing)await updateProfile(validateProfile({...existing,...values,name:values.name||existing.name}));else await createProfile(values);
    notify(existing?'Profile saved.':'Profile created and selected.');
  },existing?'Save profile':'Create profile');
}
export function profilePicker():HTMLElement|null {
  const data=store.snapshot(),available=practiceProfiles(data);if(available.length<2)return null;
  const selected=activeProfile(data),activeSession=data.sessions.find(session=>session.status==='active');
  const b=button(selected.name,()=>{
    const list=el('div',{class:'profile-picker-list'}),content=[] as HTMLElement[];
    if(activeSession){const owner=profileName(data,activeSession.profileId);content.push(el('div',{class:'info-banner compact-profile-note'},el('strong',{},`Unfinished ${owner} session`),el('span',{},'Switching profiles changes what you browse. The saved session keeps its original instrument and history.')));}
    const handle=dialog('Practice profile',[...content,list]);
    const ordered=[...available].sort((a,b)=>Number(b.id===selected.id)-Number(a.id===selected.id)||a.name.localeCompare(b.name));
    for(const item of ordered){
      const control=button(item.name,async()=>{if(item.id!==store.snapshot().settings.activeProfileId)await switchProfile(item.id);handle.close();navigate('/');},'profile-choice');
      control.setAttribute('aria-pressed',String(item.id===selected.id));control.setAttribute('aria-label',`${item.id===selected.id?'Selected profile':'Use profile'}: ${item.name}, ${definition(item.instrumentType).label}, ${levelLabel(item.level)}`);
      list.append(el('div',{class:'profile-picker-item'},control,el('p',{class:'field-hint'},`${definition(item.instrumentType).label} · ${levelLabel(item.level)}${item.focusAreas.length?` · ${item.focusAreas.join(' · ')}`:''}`)));
    }
    list.append(button('Manage profiles',()=>{handle.close();navigate('/profiles');},'secondary'));
  },'profile-trigger');b.setAttribute('aria-label',`Practice profile: ${selected.name}`);b.setAttribute('aria-haspopup','dialog');return b;
}
export function profileManagement():HTMLElement {
  const data=store.snapshot(),selected=activeProfile(data),usable=practiceProfiles(data),activeSession=data.sessions.find(session=>session.status==='active');
  const section=el('section',{class:'panel profiles-panel'},sectionHeader('Practice profiles',`${usable.length} available`,[button('Add profile',()=>profileForm(),'primary','plus')]),
    el('p',{class:'field-hint'},'The selected profile controls the library, Today plan, routines, goals and progress you browse. Switching does not re-label an unfinished or completed session.'));
  if(activeSession)section.append(el('div',{class:'info-banner profile-session-pin'},el('strong',{},`Unfinished ${profileName(data,activeSession.profileId)} session is pinned`),el('span',{},'You may browse another profile; starting new practice will return you to the unfinished session until it is finished or ended.')));
  const ordered=[...profiles(data)].sort((a,b)=>Number(a.attribution==='unresolved-history')-Number(b.attribution==='unresolved-history')||Number(a.archived)-Number(b.archived)||Number(b.id===selected.id)-Number(a.id===selected.id)||a.name.localeCompare(b.name));
  for(const p of ordered){
    const historical=p.attribution==='unresolved-history',labels=[definition(p.instrumentType).label,levelLabel(p.level),p.id===selected.id?'Selected':'',p.archived?'Archived':''].filter(Boolean).join(' · ');
    const metadata=el('div',{class:'profile-row-main'},el('div',{class:'profile-row-title'},el('strong',{},p.name),historical?badge('History only'):p.id===selected.id?badge('Selected','accent'):p.archived?badge('Archived'):null),el('p',{class:'muted small'},labels));
    if(p.focusAreas.length)metadata.append(el('div',{class:'tag-row profile-focus-tags'},p.focusAreas.map(value=>badge(value))));
    if(historical)metadata.append(el('p',{class:'field-hint'},'Earlier practice contains history whose original instrument could not be identified safely. It is read-only and cannot be selected for new practice.'));
    const actions=historical?null:el('div',{class:'actions'},button('Edit',()=>profileForm(p),'secondary compact'),
      !p.archived&&p.id!==selected.id?button('Use profile',async()=>{await switchProfile(p.id);notify(`${p.name} selected.`);},'primary compact'):null,
      button(p.archived?'Restore':'Archive',async()=>{if(!p.archived&&!await confirmAction('Archive this profile?','Its exercises and completed history are kept. If it owns the unfinished session, finish or end that session first.','Archive profile'))return;await archiveProfile(p.id,!p.archived);notify(p.archived?'Profile restored.':'Profile archived.');},'ghost compact'));
    section.append(el('div',{class:`profile-row${historical?' historical-profile':''}${p.archived?' archived-profile':''}`},metadata,actions));
  }
  return section;
}
