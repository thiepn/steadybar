import { store } from '../app/store.js';
import { createProfile, updateProfile, switchProfile, archiveProfile } from '../app/profiles.js';
import { activeProfile, definition, FAMILIES, isHistoricalProfile, PROFILE_DEFINITIONS, profiles, selectableProfiles, skillLabel } from '../domain/profiles.js';
import { validateProfile } from '../domain/practice-validation.js';
import type { PracticeProfile, InstrumentType, InstrumentFamily, Experience } from '../domain/practice-types.js';
import { button, confirmAction, dialog, formDialog, formNumber, formText, input, notify, sectionHeader, select } from './components.js';
import { el } from './dom.js';
import { navigate } from '../app/navigation.js';

function focusChoices(type:InstrumentType,selected:readonly string[]):HTMLElement{
  const chosen=new Set(selected),group=el('fieldset',{class:'profile-focuses'},el('legend',{},'Practice focus'));
  group.append(el('p',{class:'field-hint'},'Choose one or more priorities. They guide starter suggestions; they do not hide the rest of the library.'));
  const options=el('div',{class:'profile-focus-grid'});
  for(const value of definition(type).focuses)options.append(el('label',{class:'checkbox'},el('input',{type:'checkbox',name:'focusAreas',value,checked:chosen.has(value)}),el('span',{},value)));
  group.append(options);return group;
}
export function profileForm(existing?:PracticeProfile):void{
  if(existing&&isHistoricalProfile(existing)){notify('Earlier practice is a read-only history bucket.','info');return;}
  const type=select('instrumentType','Instrument',PROFILE_DEFINITIONS.map(p=>[p.id,p.label]),existing?.instrumentType??'guitar');
  type.querySelector('select')!.disabled=!!existing;
  const family=select('family','Instrument family',FAMILIES.map(f=>[f,skillLabel(f)]),existing?.family??'fretted');family.querySelector('select')!.disabled=!!existing;
  const focus=el('div'),description=el('p',{class:'field-hint'});
  const draw=()=>{
    const chosen=definition(type.querySelector('select')!.value as InstrumentType);family.hidden=chosen.id!=='custom';
    const selected=existing?.focusAreas.filter(v=>chosen.focuses.includes(v))??[chosen.focuses[0]!];
    focus.replaceChildren(focusChoices(chosen.id,selected.length?selected:[chosen.focuses[0]!]));description.textContent=chosen.summary;
  };type.addEventListener('change',draw);draw();
  formDialog(existing?'Edit practice profile':'Add practice profile',[
    input('name','Profile name',existing?.name??'','text',{maxlength:200,placeholder:'Leave blank for an automatic name'}),type,description,family,
    select('level','Experience',['beginner','intermediate','advanced'].map(v=>[v,skillLabel(v)]),existing?.level??'beginner'),focus,
    select('minutes','Usual session length',[['15','15 minutes'],['20','20 minutes'],['30','30 minutes'],['45','45 minutes'],['60','60 minutes']],String(existing?.defaultSessionMinutes??30)),
    el('p',{class:'field-hint'},'Profiles keep their own exercises, plans, results and goals. Songs and setlists remain shared. Archive profiles without deleting history.'),
  ],async form=>{
    const instrumentType=existing?.instrumentType??formText(form,'instrumentType') as InstrumentType;
    const focusAreas=form.getAll('focusAreas').map(String);
    const values={name:formText(form,'name'),instrumentType,family:existing?.family??formText(form,'family') as InstrumentFamily,level:formText(form,'level') as Experience,focusAreas,defaultSessionMinutes:formNumber(form,'minutes')};
    if(existing)await updateProfile(validateProfile({...existing,...values,name:values.name||existing.name,focusAreas:focusAreas.length?focusAreas:[definition(instrumentType).focuses[0]!]}));else await createProfile(values);
    notify(existing?'Profile saved.':'Profile created with its own exercise library.');
  },existing?'Save profile':'Create profile');
}
export function profilePicker():HTMLElement|null {
  const data=store.snapshot(),available=selectableProfiles(data);
  if(available.length<2)return null;
  const p=activeProfile(data),b=button(p.name,()=>{
    const list=el('div',{class:'profile-picker-list'}),handle=dialog('Practice profile',[list]);
    for(const item of available){const control=button(item.name,async()=>{if(item.id!==p.id)await switchProfile(item.id);handle.close();navigate('/');},'profile-choice');control.setAttribute('aria-pressed',String(p.id===item.id));list.append(control,el('p',{class:'field-hint'},`${definition(item.instrumentType).label} · ${definition(item.instrumentType).summary}`));}
    list.append(button('Manage profiles',()=>{handle.close();navigate('/settings');},'secondary'));
  },'profile-trigger');b.setAttribute('aria-label',`Practice profile: ${p.name}`);b.setAttribute('aria-haspopup','dialog');return b;
}
export interface ProfileManagement {node:HTMLElement;cleanup:()=>void}
export function profileManagement():ProfileManagement {
  const section=el('section',{class:'panel profiles-panel'});
  const draw=()=>{
    const data=store.snapshot(),available=selectableProfiles(data);
    section.replaceChildren(sectionHeader('Practice profiles',`${available.length} available`,[button('Add profile',()=>profileForm(),'secondary','plus')]));
    for(const p of profiles(data)){
      const historical=isHistoricalProfile(p),labels=[historical?'Historical only':definition(p.instrumentType).label,!historical?p.level:'',data.settings.activeProfileId===p.id?'Selected':'',p.archived?'Archived':''].filter(Boolean).join(' · ');
      const actions=el('div',{class:'actions'});
      if(!historical){
        actions.append(button('Edit',()=>profileForm(p),'secondary compact'));
        if(!p.archived&&p.id!==data.settings.activeProfileId)actions.append(button('Use profile',async()=>{await switchProfile(p.id);notify(`${p.name} selected.`);},'secondary compact'));
        actions.append(button(p.archived?'Restore':'Archive',async()=>{
          if(!p.archived&&!await confirmAction('Archive this profile?','Exercises and history are kept. The profile will no longer appear in the switcher.','Archive profile'))return;
          await archiveProfile(p.id,!p.archived);notify(p.archived?'Profile restored.':'Profile archived.');
        },'ghost compact'));
      }
      section.append(el('div',{class:`profile-row${historical?' historical-profile':''}`},el('div',{},el('strong',{},p.name),el('p',{class:'muted small'},labels),historical?el('p',{class:'field-hint'},'Read-only attribution for older sessions whose instrument could not be identified. It can be reviewed in History but cannot own new practice.'):null),actions));
    }
  };
  draw();const unsubscribe=store.subscribe(draw);return {node:section,cleanup:unsubscribe};
}
