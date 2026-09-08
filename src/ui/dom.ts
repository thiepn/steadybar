export type Child=Node|string|number|null|undefined|false;
export function el<K extends keyof HTMLElementTagNameMap>(tag:K,attributes:Record<string,unknown>={},...children:(Child|Child[])[]):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  for(const [name,value] of Object.entries(attributes)){
    if(value===undefined || value===null)continue;
    // Enumerated HTML/ARIA attributes require literal true/false, not boolean-attribute syntax.
    if(typeof value==='boolean' && (name==='draggable' || name==='spellcheck' || name==='contenteditable' || name.startsWith('aria-'))){node.setAttribute(name,String(value));continue;}
    if(value===false)continue;
    if(name==='class')node.className=String(value);
    else if(name.startsWith('on') && typeof value==='function')node.addEventListener(name.slice(2).toLowerCase(),value as EventListener);
    else if(name==='value' && ('value' in node)) (node as HTMLInputElement).value=String(value);
    else if(name==='checked' && node instanceof HTMLInputElement)node.checked=Boolean(value);
    else node.setAttribute(name,value===true?'':String(value));
  }
  for(const child of children.flat())if(child!==null && child!==undefined && child!==false)node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
export function svg<K extends keyof SVGElementTagNameMap>(tag:K,attrs:Record<string,string|number>={},...children:(Node|string)[]):SVGElementTagNameMap[K]{
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  children.forEach(child=>node.append(child instanceof Node?child:document.createTextNode(child)));return node;
}
export function replace(node:Element,...children:(Child|Child[])[]):void{node.replaceChildren();for(const child of children.flat())if(child!==null&&child!==undefined&&child!==false)node.append(child instanceof Node?child:document.createTextNode(String(child)));}
