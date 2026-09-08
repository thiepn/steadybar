import { migrationBackup } from '../db/database.js';
import { downloadText, createBackup } from '../db/backup.js';
import { appearanceControls } from '../ui/appearance.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, field, formDialog, formText, input, link, notify, pageHeader, sectionHeader, select } from '../ui/components.js';
import { exportBackup, parseBackup, restoreBackup } from '../db/backup.js';
import { resetWorkspace } from '../db/database.js';
import { practice } from '../practice/controller.js';
import { audio } from '../audio/engine.js';
import { pwaState } from '../app/pwa.js';
import { withWorkspaceIdle } from '../platform/locks.js';
import { defaultAccents } from '../audio/scheduler.js';
import type { Subdivision } from '../domain/models.js';
import { validateSettings } from '../domain/validation.js';
import { formatDate } from '../domain/utils.js';
import { activeProfile, practiceProfiles } from '../domain/profiles.js';
export function settingsPage():Page{
  const data=store.snapshot(),settings=data.settings;
  let dirty=false;
  const page=el('div',{class:'page settings-page'},pageHeader('','Settings','Appearance, practice defaults, and backups.'));
  const selectedProfile=activeProfile(data);
  const profilePanel=el('section',{class:'panel settings-profile-summary'},sectionHeader('Practice profiles',`${practiceProfiles(data).length} available`),
    el('p',{},el('strong',{},selectedProfile.name),' is the selected practice workspace.'),
    el('p',{class:'muted small'},`${selectedProfile.focusAreas.join(' · ') || 'General practice'} · usual session ${selectedProfile.defaultSessionMinutes} min. Profiles keep separate libraries, plans, routines, goals and results.`),
    el('div',{class:'actions'},link('Manage profiles','/profiles','button secondary')));
  const colors=appearanceControls();
  const appearance=el('section',{class:'panel appearance-panel'},sectionHeader('Appearance'),colors.node);
  const prefs=el('form',{class:'panel settings-form'},sectionHeader('Practice defaults'));
  const bpm=input('bpm','Default BPM',settings.metronome.bpm,'number',{min:20,max:300,step:1,required:true});
  const meter=select('meter','Default meter',[...new Set(['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8',`${settings.metronome.meter.beats}/${settings.metronome.meter.beatUnit}`])],`${settings.metronome.meter.beats}/${settings.metronome.meter.beatUnit}`);
  const subdivision=select('subdivision','Default subdivision',[['1','Beat · 1 click'],['2','Eighths · 2 clicks'],['3','Triplets · 3 clicks'],['4','Sixteenths · 4 clicks']],String(settings.metronome.subdivision));
  const countIn=select('countIn','Count-in',[['0','None'],['1','1 bar'],['2','2 bars'],['4','4 bars']],String(settings.metronome.countIn));
  const volume=el('input',{name:'volume',type:'range',min:0,max:1,step:0.05,value:settings.metronome.volume});
  const wake=checkbox('wake','Keep the screen awake during practice, when supported',settings.wakeLock),focus=checkbox('focus','Open sessions in Focus Mode',settings.defaultFocus),hidden=checkbox('hidden','Pause when the app moves into the background',settings.pauseWhenHidden);

  const error=el('p',{class:'form-error',role:'alert'}),save=el('button',{type:'submit',class:'button primary'},'Save preferences');
  prefs.append(el('div',{class:'form-grid'},bpm,meter,subdivision,countIn),field('Metronome volume',volume),el('div',{class:'settings-toggles'},wake,focus,hidden),el('p',{class:'field-hint'},'Foreground practice is recommended. Mobile browsers can suspend background audio. Count-in and paused time never count as active practice.'),error,save);
  prefs.addEventListener('input',()=>{dirty=true;});prefs.addEventListener('change',()=>{dirty=true;});
  const unload=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);
  prefs.addEventListener('submit',async event=>{
    event.preventDefault();if(!prefs.reportValidity())return;save.disabled=true;error.textContent='';
    try{
      const form=new FormData(prefs),[beats,unit]=formText(form,'meter').split('/').map(Number);
      const validated=validateSettings({...store.snapshot().settings,wakeLock:form.has('wake'),defaultFocus:form.has('focus'),pauseWhenHidden:form.has('hidden'),metronome:{...settings.metronome,bpm:Number(form.get('bpm')),meter:{beats:beats||4,beatUnit:unit===8?8:4},accents:beats===settings.metronome.meter.beats && unit===settings.metronome.meter.beatUnit ? [...settings.metronome.accents] : defaultAccents(beats||4,unit||4),subdivision:Number(form.get('subdivision')) as Subdivision,countIn:Number(form.get('countIn')),volume:Number(form.get('volume'))}});
      dirty=false;await store.save('settings',validated);notify('Practice preferences saved.');
    }catch(e){dirty=true;error.textContent=e instanceof Error?e.message:'Preferences could not be saved.';}finally{save.disabled=false;}
  });
  const file=el('input',{type:'file',accept:'.json,application/json',hidden:true,'aria-label':'Choose backup file'});
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0];if(!selected)return;
    try{
      if(selected.size>100*1024*1024)throw new Error('This backup is larger than the 100 MB import limit. No data was changed.');
      const backup=parseBackup(await selected.text());
      const counts=`${backup.data.exercises.length} exercises, ${backup.data.songs.length} songs, ${backup.data.routines.length} routines, ${backup.data.sessions.length} sessions, and ${backup.data.goals.length} goals`;
      if(!await confirmAction('Replace this device’s practice data?',`Validated backup from ${formatDate(backup.exportedAt,true)}: ${counts}. This replaces all current data, including settings. A safety backup of your current data will be downloaded first.`,'Back up & replace',true))return;
      if(practice.session?.status==='active' && !practice.external)await practice.pause();audio.stop();
      await withWorkspaceIdle(async()=>{await exportBackup();await restoreBackup(backup);});location.reload();
    }catch(e){notify(e instanceof Error?e.message:'The backup could not be restored. Existing data was not changed.','error');}finally{file.value='';}
  });
  const storage=el('p',{class:'muted small'},'Checking browser storage…');
  if(navigator.storage?.estimate)void navigator.storage.estimate().then(estimate=>{storage.textContent=`Using approximately ${((estimate.usage||0)/1024/1024).toFixed(1)} MB${estimate.quota?` of ${(estimate.quota/1024/1024/1024).toFixed(1)} GB available browser quota`:''}. This is browser-origin storage, not cloud storage.`;}).catch(()=>{storage.textContent='Storage quota information is not available in this browser.';});
  else storage.textContent='Storage quota information is not available in this browser.';
  const persist=button('Protect local storage',async()=>{
    if(!navigator.storage?.persist){notify('This browser does not expose persistent-storage requests. Keep regular backups.','info');return;}
    const granted=await navigator.storage.persist();notify(granted?'Persistent storage is enabled. Keep exporting backups as well.':'The browser did not grant persistent storage. Your data is still saved, but backups are important.','info');
  },'secondary');
  const dataPanel=el('section',{class:'panel'},sectionHeader('Your data'),el('p',{},'Everything is stored in this browser on this device. There is no account, sync server, tracking, or cloud backup.'),el('p',{class:'muted small'},'Browser data can be cleared or evicted. Export backups regularly, especially before changing devices or domains. A backup includes exercises, songs, routines, plans, sessions, goals, setlists, presets, and settings.'),el('div',{class:'actions'},button('Export backup',exportBackup,'primary','download'),button('Export pre-upgrade backup',async()=>{const original=await migrationBackup();if(!original){notify('There is no pre-upgrade snapshot on this device.','info');return;}downloadText(JSON.stringify(createBackup(original),null,2),'steadybar-before-profiles-v2.json');},'secondary'),button('Restore backup',()=>file.click(),'secondary','upload'),persist),file,storage);
  const offlineStatus=el('p',{}),offlineError=el('p',{class:'form-error'});
  const refreshOffline=()=>{
    offlineStatus.textContent=pwaState.ready?'The application shell is cached and ready for offline use.':'The offline shell is not ready yet. Keep the app open until its service worker finishes installing.';
    offlineError.textContent=pwaState.error||'';offlineError.hidden=!pwaState.error;
  };
  refreshOffline();window.addEventListener('pwa-state',refreshOffline);
  const offline=el('section',{class:'panel'},sectionHeader('Offline & installation'),offlineStatus,offlineError,el('p',{class:'muted small'},'Use your browser’s Install app / Add to Home Screen command where available. The first load needs a connection; after caching, the core application, starter content, and metronome work locally.'),badge('No microphone access required'));
  const shortcuts=el('section',{class:'panel'},sectionHeader('Keyboard shortcuts'),el('dl',{class:'shortcut-list'},[
    ['Ctrl / Cmd + K','Search & commands'],['Space','Start / pause practice or metronome'],['↑ / ↓','BPM +1 / −1'],['Shift + ↑ / ↓','BPM +5 / −5'],['N','Quick note in practice'],['Esc','Close a dialog / exit Focus Mode'],
  ].map(([key,label])=>el('div',{},el('dt',{},el('kbd',{},key)),el('dd',{},label)))),el('p',{class:'field-hint'},'Practice shortcuts do not override typing in fields or the normal Space action on a focused button.'));
  const reset=()=>formDialog('Reset Steadybar',[
    el('p',{},'This removes all practice data from this browser and restores only the built-in exercises and routine templates. A safety backup will be downloaded first.'),input('confirm','Type RESET to confirm','','text',{required:true,pattern:'RESET',autocomplete:'off'}),
  ],async form=>{
    if(formText(form,'confirm')!=='RESET')throw new Error('Type RESET exactly to confirm.');
    if(practice.session?.status==='active' && !practice.external)await practice.pause();audio.stop();
    await withWorkspaceIdle(async()=>{await exportBackup();await resetWorkspace();});location.reload();
  },'Back up & reset');
  page.append(el('div',{class:'settings-grid'},el('div',{},profilePanel,appearance,prefs),el('div',{},dataPanel,offline,shortcuts)),el('section',{class:'danger-zone'},el('div',{},el('h2',{},'Reset application'),el('p',{class:'muted small'},'A fresh start on this device. Permanent unless you restore a backup.')),button('Reset application',reset,'danger','trash')));
  return {node:page,isDirty:()=>dirty,beforeLeave:async()=>!dirty || await confirmAction('Discard unsaved preferences?','Your changes have not been saved. Stay here to save them, or discard your edits.','Discard edits'),cleanup:()=>{colors.cleanup();window.removeEventListener('beforeunload',unload);window.removeEventListener('pwa-state',refreshOffline);}};
}
