export function navigate(path:string):void{if(location.hash===`#${path}`)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=path;}
export function routePath():string{return (location.hash.slice(1)||'/').split('?')[0] || '/';}
export interface Page {node:HTMLElement;cleanup?:()=>void;beforeLeave?:()=>Promise<boolean>;isDirty?:()=>boolean}
