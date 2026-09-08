import { store } from './store.js';
import { el } from '../ui/dom.js';
import { button, dialog, notify, select } from '../ui/components.js';
import { brandMark } from '../ui/icons.js';
import { freshBlocks, localDate, metadata } from '../domain/utils.js';
import { freeBlock } from '../practice/launch.js';
export function showOnboarding():void{
  const instrument=select('instrument','01 · What do you play?',['Drums','Guitar','Piano','Bass','Vocals','Other'],'Drums');
  const aim=select('aim','02 · What would you like to improve?',['Technique','Timing','Speed','Songs','Consistency','General Practice'],'Technique');
  const handle=dialog('A little direction. Then play.',[
    el('div',{class:'welcome-mark'},brandMark(),el('span',{class:'eyebrow'},'STEADYBAR')),
    el('p',{class:'welcome-intro'},'A private workspace for deliberate practice. Your instrument, a useful plan, and an honest record of improvement.'),instrument,aim,
    el('p',{class:'field-hint'},'Drums have the richest starter library. Other instruments use the same practice tools with your own exercises and songs. No account. Nothing leaves your device.'),
  ]);handle.dialog.classList.add('onboarding-dialog');
  const finish=async(useStarter:boolean)=>{
    const value=instrument.querySelector('select')!.value,goal=aim.querySelector('select')!.value;
    await store.settings({instrument:value,aim:goal,onboardingDone:true});
    if(useStarter){
      const routine=store.snapshot().routines[0];const blocks=value==='Drums'&&routine?freshBlocks(routine.blocks):[freeBlock(300,60,'Warm-up'),freeBlock(600,80,goal),freeBlock(300,80,'Musical application')];
      await store.save('dailyPlans',{...metadata(),date:localDate(),sourceRoutineId:value==='Drums'?routine?.id:undefined,blocks});
    }
    handle.close();notify(useStarter?'Your first plan is ready.':'Your workspace is ready.');
  };
  handle.dialog.querySelector('.dialog-content')!.append(el('div',{class:'onboarding-actions'},button('Explore first',()=>finish(false),'secondary'),button('Use starter routine',()=>finish(true),'primary','arrow')));
}
