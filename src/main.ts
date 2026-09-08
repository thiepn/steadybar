import { applyAppearance, trackSystemAppearance } from './app/appearance.js';
import { openAppearance } from './ui/appearance.js';
import { store } from './app/store.js';
import { navigate, routePath, type Page } from './app/navigation.js';
import { openSearch } from './app/search.js';
import { showOnboarding } from './app/onboarding.js';
import { applyPwaUpdate, pwaState, registerPwa } from './app/pwa.js';
import { el } from './ui/dom.js';
import { brandMark, icon, type IconName } from './ui/icons.js';
import { button, dialog, iconButton, link, notify } from './ui/components.js';
import { todayPage } from './pages/today.js';
import { libraryPage, exercisePage } from './pages/library.js';
import { routinesPage, routinePage } from './pages/routines.js';
import { songsPage, songPage } from './pages/songs.js';
import { setlistsPage, setlistPage } from './pages/setlists.js';
import { goalsPage } from './pages/goals.js';
import { historyPage, sessionPage } from './pages/history.js';
import { progressPage } from './pages/progress.js';
import { settingsPage } from './pages/settings.js';
import { practicePage, activePracticePage } from './pages/practice.js';
import { metronomePage } from './pages/metronome.js';
import { practice } from './practice/controller.js';
import { errorMessage } from './domain/utils.js';
const navigation:[string,string,IconName][]=[['/','Today','today'],['/practice','Practice','play'],['/metronome','Metronome','pulse'],['/library','Library','library'],['/routines','Routines','routine'],['/songs','Songs','song'],['/setlists','Setlists','setlist'],['/goals','Goals','goal'],['/progress','Progress','progress'],['/history','History','history'],['/settings','Settings','settings']];
let current:Page|undefined,renderedPath='';
const root=document.querySelector('#app')!;
function route(path:string):Page{
  const parts=path.split('/').filter(Boolean),id=parts[1];
  if(path==='/')return todayPage();
  if(path==='/practice/active')return activePracticePage();
  if(path==='/practice')return practicePage();
  if(path==='/metronome')return metronomePage();
  if(parts[0]==='library')return id?exercisePage(id):libraryPage();
  if(parts[0]==='routines')return id?routinePage(id):routinesPage();
  if(parts[0]==='songs')return id?songPage(id):songsPage();
  if(parts[0]==='setlists')return id?setlistPage(id):setlistsPage();
  if(path==='/goals')return goalsPage();
  if(path==='/progress')return progressPage();
  if(parts[0]==='history')return id?sessionPage(id):historyPage();
  if(path==='/settings')return settingsPage();
  return {node:el('div',{class:'empty-state'},el('h1',{},'Page not found.'),el('p',{},'This page does not exist.'),link('Open Today','/','button primary'))};
}
const activeLink=(href:string,path:string)=>href==='/'?path==='/':path===href||path.startsWith(`${href}/`);
function moreMenu():void{
  const menu=el('div',{class:'more-nav'}),handle=dialog('Navigation',[menu]);
  for(const [path,label,symbol] of navigation)menu.append(button(label,()=>{handle.close();navigate(path);},'more-link',symbol));
}
function render():void{
  const path=routePath(),changed=path!==renderedPath;
  current?.cleanup?.();applyAppearance(store.snapshot().settings);
  const active=path==='/practice/active';document.body.classList.toggle('practice-route',active);
  try{current=route(path);}catch(error){current={node:el('div',{class:'empty-state'},el('h1',{},'This view could not open.'),el('p',{},errorMessage(error)),button('Reload workspace',()=>location.reload(),'primary','restart'))};}
  const main=el('main',{id:'main',tabindex:-1,class:active?'active-main':'main-content'},current.node);
  if(active)root.replaceChildren(main);
  else{
    const title=navigation.find(([p])=>activeLink(p,path))?.[1]||'Workspace';
    const nav=el('nav',{'aria-label':'Main navigation',class:'sidebar-nav'});
    for(const [href,label,symbol] of navigation){
      const a=el('a',{href:`#${href}`,title:label,'aria-label':label,class:`nav-link ${activeLink(href,path)?'active':''}`},icon(symbol),el('span',{},label));
      if(activeLink(href,path))a.setAttribute('aria-current','page');
      if(href==='/library'||href==='/goals'||href==='/settings')nav.append(el('div',{class:'nav-divider'}));nav.append(a);
    }
    const sidebar=el('aside',{class:'sidebar'},
      el('a',{href:'#/',class:'brand','aria-label':'Steadybar home'},brandMark(),el('strong',{},'Steadybar')),nav);
    const search=button('Search',openSearch,'search-trigger','search');
    search.setAttribute('aria-label','Search');
    search.append(el('kbd',{'aria-hidden':'true'},'Ctrl K'));
    const appearance=iconButton('Appearance','sun',openAppearance);
    const header=el('header',{class:'topbar'},
      el('a',{href:'#/',class:'mobile-brand','aria-label':'Steadybar home'},brandMark(),el('strong',{},'Steadybar')),
      el('div',{class:'breadcrumb'},el('strong',{},title)),
      el('div',{class:'actions'},search,appearance));
    const mobile=el('nav',{class:'mobile-nav','aria-label':'Mobile navigation'});
    for(const [href,label,symbol] of [navigation[0]!,navigation[1]!,navigation[2]!,navigation[3]!]){
      const a=el('a',{href:`#${href}`,class:activeLink(href,path)?'active':''},icon(symbol,21),el('span',{},label));if(activeLink(href,path))a.setAttribute('aria-current','page');mobile.append(a);
    }
    const more=button('More',moreMenu,'mobile-more','more');more.setAttribute('aria-haspopup','dialog');if(!['/','/practice','/metronome','/library'].some(href=>activeLink(href,path)))more.classList.add('active');mobile.append(more);
    root.replaceChildren(el('div',{class:'app-shell'},sidebar,el('div',{class:'app-body'},header,el('div',{id:'update-banner'}),main),mobile));
    drawPwaState();
  }
  document.title=`${path==='/practice/active'?'Practice':navigation.find(([p])=>activeLink(p,path))?.[1]||'Steadybar'} · Steadybar`;
  renderedPath=path;if(changed){window.scrollTo(0,0);main.focus({preventScroll:true});}
}
function drawPwaState():void{
  const status=document.querySelector('#offline-status');if(status)status.textContent=pwaState.ready?'Available offline':'Local workspace';
  const target=document.querySelector('#update-banner');if(!target)return;target.replaceChildren();
  if(pwaState.waiting)target.append(el('div',{class:'update-banner'},el('span',{},'A new version is ready. Your local data will be kept.'),button('Update now',()=>{if(store.snapshot().sessions.some(s=>s.status==='active')){notify('Finish or end your active session before applying an update.','info');return;}if(current?.isDirty?.()){notify('Save your preferences before applying an update.','info');return;}if(document.querySelector('dialog[open]')){notify('Save or close the current dialog before updating.','info');return;}applyPwaUpdate();},'secondary compact')));
}
async function boot():Promise<void>{
  try{
    await store.initialize();trackSystemAppearance();await practice.recover();render();
    store.subscribe(()=>{
      practice.observePersisted();applyAppearance(store.snapshot().settings);
      if(current?.isDirty?.())return;
      if(routePath()==='/metronome')return;
      if(routePath()==='/practice/active'&&!practice.external&&practice.session?.status==='active')return;
      render();
    });
    let guarding=false;
    window.addEventListener('hashchange',()=>{void (async()=>{
      if(guarding)return;
      const intended=routePath();
      if(intended!==renderedPath && current?.beforeLeave){
        guarding=true;history.replaceState(null,'',`#${renderedPath}`);
        try{if(!await current.beforeLeave())return;history.replaceState(null,'',`#${intended}`);}finally{guarding=false;}
      }
      render();
    })().catch(error=>notify(errorMessage(error),'error'));});
    document.querySelector('.skip-link')?.addEventListener('click',event=>{event.preventDefault();document.querySelector<HTMLElement>('#main')?.focus();});
    window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(!document.querySelector('dialog[open]'))openSearch();}});
    document.addEventListener('visibilitychange',()=>{void practice.onVisibility().catch(e=>notify(errorMessage(e),'error'));});
    window.addEventListener('pwa-state',drawPwaState);void registerPwa();
    if(!store.snapshot().settings.onboardingDone)showOnboarding();
  }catch(error){root.replaceChildren(el('div',{class:'boot storage-error'},brandMark(),el('h1',{},'Your practice data needs a safe place.'),el('p',{},errorMessage(error)),el('p',{class:'muted'},'Enable website storage, leave private browsing if necessary, and reload. No temporary session will be presented as saved.'),button('Try again',()=>location.reload(),'primary','restart')));}
}
void boot();
