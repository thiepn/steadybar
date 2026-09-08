/** Generated service-worker logic in a Node VM, NOT a browser offline test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
function worker(){
 const scope='https://example.test/music/',events={},stores=new Map(),calls={skip:0,claim:0,fetch:[]};
 const key=input=>new URL(typeof input==='string'?input:input.url,scope).href;
 const context={URL,self:{registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>calls.claim++},skipWaiting:()=>calls.skip++,addEventListener:(type,handler)=>{events[type]=handler;}},caches:{open:async name=>{
  if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
  return{addAll:async assets=>{for(const asset of assets){assert.ok(fs.existsSync(path.join('dist',asset)));data.set(key(asset),'cached:'+asset);}},match:async input=>data.get(key(input))};
 },keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)},fetch:async request=>{calls.fetch.push(request);return 'network';}};
 vm.runInNewContext(source,context);
 const lifecycle=async type=>{let pending;events[type]({waitUntil:p=>{pending=p;}});await pending;};
 const fetchEvent=async(url,mode='same-origin',method='GET')=>{let response;events.fetch({request:{url,mode,method},respondWith:p=>{response=p;}});return await response;};
 return{scope,events,stores,calls,lifecycle,fetchEvent};
}
test('PWA installation precaches every generated app asset from disk',async()=>{
 const w=worker();await w.lifecycle('install');const assets=[...w.stores.values()][0];assert.ok(assets.size>30);assert.ok(assets.has(w.scope+'index.html'));assert.ok(assets.has(w.scope+'app/main.js'));assert.ok(assets.has(w.scope+'styles.css'));assert.ok(assets.has(w.scope+'manifest.webmanifest'));
});
test('PWA installation does not unexpectedly activate an update',async()=>{const w=worker();await w.lifecycle('install');assert.equal(w.calls.skip,0);w.events.message({data:'OTHER'});assert.equal(w.calls.skip,0);w.events.message({data:'APPLY_UPDATE'});assert.equal(w.calls.skip,1);});
test('PWA activation cleans only older caches for its own scope',async()=>{
 const w=worker();w.stores.set('mp-os-'+w.scope+'old',new Map());w.stores.set('another-app',new Map());w.stores.set('mp-os-https://example.test/other/old',new Map());await w.lifecycle('install');await w.lifecycle('activate');assert.equal(w.stores.has('mp-os-'+w.scope+'old'),false);assert.equal(w.stores.has('another-app'),true);assert.equal(w.stores.has('mp-os-https://example.test/other/old'),true);assert.equal(w.calls.claim,1);
});
test('PWA returns the cached shell for navigation without network',async()=>{const w=worker();await w.lifecycle('install');assert.equal(await w.fetchEvent(w.scope+'index.html','navigate'),'cached:./index.html');assert.equal(w.calls.fetch.length,0);});
test('PWA returns cached application modules without network',async()=>{const w=worker();await w.lifecycle('install');assert.equal(await w.fetchEvent(w.scope+'app/main.js'),'cached:./app/main.js');assert.equal(w.calls.fetch.length,0);});
test('PWA leaves cross-origin requests and non-GET writes alone',async()=>{const w=worker();assert.equal(await w.fetchEvent('https://other.test/x'),undefined);assert.equal(await w.fetchEvent(w.scope+'x','same-origin','POST'),undefined);assert.equal(w.calls.fetch.length,0);});
test('PWA unknown same-origin assets use the network, not fabricated content',async()=>{const w=worker();await w.lifecycle('install');assert.equal(await w.fetchEvent(w.scope+'unknown'),'network');assert.equal(w.calls.fetch.length,1);});

test('PWA activation preserves caches for child paths on the same origin',async()=>{
 const w=worker();const child='mp-os-'+w.scope+'rehearsal/abc123abc123ab';
 w.stores.set(child,new Map());await w.lifecycle('install');await w.lifecycle('activate');
 assert.equal(w.stores.has(child),true,'Parent-scope updates must not delete child-app caches');
});
