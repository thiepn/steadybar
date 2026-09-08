import { store } from '../app/store.js';
import { createProfile, updateProfile, switchProfile, archiveProfile, setPrimaryProfile } from '../app/profiles.js';
import { activeProfile, definition, FAMILIES, PROFILE_DEFINITIONS, profiles, skillLabel } from '../domain/profiles.js';
import { validateProfile } from '../domain/practice-validation.js';
import type { PracticeProfile, InstrumentType, InstrumentFamily, Experience } from '../domain/practice-types.js';
import { button, confirmAction, dialog, formDialog, formNumber, formText, input, notify, sectionHeader, select } from './components.js';
import { el } from './dom.js';
import { navigate } from '../app/navigation.js';

export function profileForm(existing?:PracticeProfile):void{
  const type=select('instrumentType','Instrument',PROFILE_DEFINITIONS.map(p=>[p.id,p.label]),existing?.instrumentType??'guitar');
  type.querySelector('select')!.disabled=!!existing;
  const family=select('family','Instrument family',FAMILIES.map(f=>[f,skillLabel(f)]),existing?.family??'fretted');family.querySelector('select')!.disabled=!!existing;
  const focus=el('div'),description=el('p',{class:'field-hint'});
  const draw=()=>{
    const chosen=definition(type.querySelector('select')!.value as InstrumentType);family.hidden=chosen.id!=='custom';
    focus.replaceChildren(select('focus','Practice focus',chosen.focuses.map(v=>v),existing?.focusAreas[0]??chosen.focuses[0]!));description.textContent=chosen.summary;
  };type.addEventListener('change',draw);draw();
  formDialog(existing?'Edit practice profile':'Add practice profile',[
    input('name','Profile name',existing?.name??'','text',{maxlength:200,placeholder:'e.g. Electric guitar'}),type,description,family,
    select('level','Experience',['beginner','intermediate','advanced'].map(v=>[v,skillLabel(v)]),existing?.level??'beginner'),focus,
    select('minutes','Usual session length',[['15','15 minutes'],['20','20 minutes'],['30','30 minutes'],['45','45 minutes'],['60','60 minutes']],String(existing?.defaultSessionMinutes??30)),
    el('p',{class:'field-hint'},'Profiles keep their own exercises, plans, results and goals. Songs and setlists remain shared. Archive profiles without deleting history.'),
  ],async form=>{
    const instrumentType=existing?.instrumentType??formText(form,'instrumentType') as InstrumentType;
    const values={name:formText(form,'name')||definition(instrumentType).label,instrumentType,family:existing?.family??formText(form,'family') as InstrumentFamily,level:formText(form,'level') as Experience,focusAreas:[formText(form,'focus')],defaultSessionMinutes:formNumber(form,'minutes')};
    if(existing)await updateProfile(validateProfile({...existing,...values}));else await createProfile(values);
    notify(existing?'Profile saved.':'Profile created with its own exercise library.');
  },existing?'Save profile':'Create profile');
}
export function profilePicker():HTMLElement|null {
  const data=store.snapshot(),available=profiles(data).filter(p=>!p.archived);
  if(available.length<2)return null;
  const p=activeProfile(data),b=button(p.name,()=>{
    const list=el('div',{class:'profile-picker-list'}),handle=dialog('Practice profile',[list]);
    for(const item of available){const control=button(item.name,async()=>{if(item.id!==p.id)await switchProfile(item.id);handle.close();navigate('/');},'profile-choice');control.setAttribute('aria-pressed',String(p.id===item.id));list.append(control,el('p',{class:'field-hint'},definition(item.instrumentType).summary));}
    list.append(button('Manage profiles',()=>{handle.close();navigate('/settings');},'secondary'));
  },'profile-trigger');b.setAttribute('aria-label',`Practice profile: ${p.name}`);b.setAttribute('aria-haspopup','dialog');return b;
}
export function profileManagement():HTMLElement {
  const data=store.snapshot();
  const section=el('section',{class:'panel profiles-panel'},sectionHeader('Practice profiles',`${profiles(data).filter(p=>!p.archived).length} available`,[button('Add profile',()=>profileForm(),'secondary','plus')]));
  for(const p of profiles(data)){
    const labels=[definition(p.instrumentType).label,p.level,data.settings.activeProfileId===p.id?'Selected':'',data.settings.primaryProfileId===p.id?'Primary':'',p.archived?'Archived':''].filter(Boolean).join(' · ');
    section.append(el('div',{class:'profile-row'},el('div',{},el('strong',{},p.name),el('p',{class:'muted small'},labels),p.attribution==='unresolved-history'?el('p',{class:'field-hint'},'Earlier history without a reliable instrument identity. No attribution was guessed.'):null),
      el('div',{class:'actions'},button('Edit',()=>profileForm(p),'secondary compact'),!p.archived&&p.id!==data.settings.activeProfileId?button('Use profile',async()=>{await switchProfile(p.id);notify(`${p.name} selected.`);},'secondary compact'):null,
        !p.archived&&p.id!==data.settings.primaryProfileId?button('Set primary',()=>setPrimaryProfile(p.id),'ghost compact'):null,
        button(p.archived?'Restore':'Archive',async()=>{if(!p.archived&&!await confirmAction('Archive this profile?','Exercises and history are kept. The profile will no longer appear in the switcher.','Archive profile'))return;await archiveProfile(p.id,!p.archived);},'ghost compact'))));
  }
  return section;
}
