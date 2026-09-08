export const pwaState:{ready:boolean;waiting?:ServiceWorkerRegistration;error?:string}={ready:false};
const notify=()=>window.dispatchEvent(new Event('pwa-state'));
export async function registerPwa():Promise<void>{
  if(!('serviceWorker' in navigator)){pwaState.error='Service workers are not supported in this browser.';notify();return;}
  try{
    const base=new URL('./',document.baseURI),registration=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname});
    pwaState.ready=!!registration.active;
    if(registration.waiting){pwaState.waiting=registration;notify();}
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller){pwaState.waiting=registration;notify();}
        if(worker.state==='activated'){pwaState.ready=true;notify();}
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{pwaState.ready=true;notify();});
    void navigator.serviceWorker.ready.then(()=>{pwaState.ready=true;notify();});notify();
  }catch(error){pwaState.error=error instanceof Error?error.message:'Offline shell registration failed.';notify();}
}
export function applyPwaUpdate():void{
  if(!pwaState.waiting?.waiting)return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});pwaState.waiting.waiting.postMessage('APPLY_UPDATE');
}
