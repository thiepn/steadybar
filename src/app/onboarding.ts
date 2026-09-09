import { store } from './store.js';
import { el } from '../ui/dom.js';
import { button, dialog, notify, select } from '../ui/components.js';
import { advanceISO, localDate, metadata } from '../domain/utils.js';
import { definition, PROFILE_DEFINITIONS, FAMILIES, isPracticeProfile, skillLabel, profiles } from '../domain/profiles.js';
import type { Experience, InstrumentType, InstrumentFamily } from '../domain/practice-types.js';
import { makeProfile, provisionProfile, selectStarterRoutine, fitRoutine } from './profiles.js';
export function showOnboarding():void{
  const instrument=select('instrument','Instrument',PROFILE_DEFINITIONS.map(p=>[p.id,p.label]),'drums');
  const focus=el('div'),summary=el('p',{class:'field-hint'}),family=select('family','Instrument family',FAMILIES.map(f=>[f,skillLabel(f)]),'general');
  const level=select('level','Experience',[['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']],'beginner');
  const duration=select('duration','First session',[['15','15 minutes'],['20','20 minutes'],['30','30 minutes'],['45','45 minutes'],['60','60 minutes']],'20');
  const draw=()=>{const p=definition(instrument.querySelector('select')!.value as InstrumentType);focus.replaceChildren(select('aim','Practice focus',p.focuses.map(s=>s),p.id==='drums'?'Technique':p.focuses[0]!));family.hidden=p.id!=='custom';summary.textContent=p.summary+(p.id==='voice'?' Set comfortable pitch bounds before singing; reference ranges are editable templates, not prescriptions.':'');duration.querySelector('select')!.value=p.id==='drums'?'20':'30';};instrument.addEventListener('change',draw);draw();
  const handle=dialog('Set up Steadybar',[el('p',{class:'welcome-intro'},'Choose what you practice. Exercises, tools and feedback will adapt.'),instrument,summary,family,el('div',{class:'form-grid'},level,duration),focus,el('p',{class:'field-hint'},'Everything stays on this device. You can add more practice profiles in Settings.')]);handle.dialog.classList.add('onboarding-dialog');
  const finish=async(useStarter:boolean)=>{
    const type=instrument.querySelector('select')!.value as InstrumentType,aim=focus.querySelector('select')!.value,minutes=Number(duration.querySelector('select')!.value);
    await store.workspace(data=>{
      let next=data,p=profiles(data).find(p=>p.instrumentType===type&&isPracticeProfile(p));
      if(!p){p=makeProfile({name:definition(type).label,instrumentType:type,family:family.querySelector('select')!.value as InstrumentFamily,level:level.querySelector('select')!.value as Experience,focusAreas:[aim],defaultSessionMinutes:minutes});next=provisionProfile(data,p);}
      p={...p,level:level.querySelector('select')!.value as Experience,focusAreas:[aim],defaultSessionMinutes:minutes,updatedAt:advanceISO(p.updatedAt)};
      // Only hide the unused factory profile on a genuinely new installation.
      const pristine=!data.settings.onboardingDone&&!data.sessions.length&&!data.exercises.some(e=>!e.builtin)&&!data.songs.length&&!data.dailyPlans.length;
      next.profiles=profiles(next).map(item=>item.id===p!.id?p!:pristine&&!item.archived?{...item,archived:true,updatedAt:advanceISO(item.updatedAt)}:item);
      next.settings={...next.settings,instrument:definition(type).label,aim,onboardingDone:true,activeProfileId:p.id,primaryProfileId:p.id};
      if(useStarter){const routine=selectStarterRoutine(next,p,minutes);if(routine)next.dailyPlans.push({...metadata(),profileId:p.id,date:localDate(),sourceRoutineId:routine.id,blocks:fitRoutine(routine,minutes)});}
      return next;
    });
    handle.close();notify(useStarter?'Your first plan is ready.':'Your workspace is ready.');
  };
  handle.dialog.querySelector('.dialog-content')!.append(el('div',{class:'onboarding-actions'},button('Explore first',()=>finish(false),'secondary'),button('Use starter routine',()=>finish(true),'primary','arrow')));
}
