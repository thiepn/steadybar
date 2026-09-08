import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { seedData } from '../dist/app/db/seed.js';
import { createBackup, parseBackup } from '../dist/app/db/backup.js';
import { validateSettings } from '../dist/app/domain/validation.js';

import { ACCENTS as accents } from '../dist/app/domain/appearance.js';
test('every appearance mode and accent round-trips in the existing backup format',()=>{
 for(const theme of ['system','light','dark'])for(const accent of accents){
  const data=seedData();data.settings.theme=theme;data.settings.accent=accent;
  const backup=parseBackup(JSON.stringify(createBackup(data)));
  assert.equal(backup.data.settings.theme,theme);assert.equal(backup.data.settings.accent,accent);
  assert.equal(backup.format,'music-practice-os');assert.equal(backup.version,1);
 }
});
test('legacy backups without an accent remain importable',()=>{
 const data=seedData();delete data.settings.accent;
 const parsed=parseBackup(JSON.stringify(createBackup(data)));
 assert.equal(parsed.data.settings.accent,undefined);
 assert.equal(parsed.data.exercises.length,data.exercises.length);
});
test('invalid accent names are rejected before storage',()=>{
 for(const accent of ['unknown','auto','',42])assert.throws(()=>validateSettings({...seedData().settings,accent}));
});
const script=readFileSync(new URL('../dist/theme.js',import.meta.url),'utf8');
function prepaint(hint,dark=false,denied=false){
 const root={dataset:{},style:{}};
 vm.runInNewContext(script,{document:{documentElement:root},matchMedia:()=>({matches:dark}),localStorage:{getItem(){if(denied)throw new Error('SecurityError');return hint;}}});
 return root;
}
test('first paint resolves system mode and honors valid cached choices',()=>{
 assert.equal(prepaint(null,true).dataset.theme,'dark');
 const root=prepaint(JSON.stringify({mode:'light',accent:'blue'}),true);
 assert.equal(root.dataset.theme,'light');assert.equal(root.dataset.accent,'blue');
});
test('first paint tolerates unavailable storage and malformed cached data',()=>{
 for(const hint of ['{broken','null','[]',JSON.stringify({mode:'invalid',accent:'invalid'})]){
  const root=prepaint(hint);assert.equal(root.dataset.theme,'light');assert.equal(root.dataset.accent,'graphite');
 }
 assert.equal(prepaint(null,true,true).dataset.theme,'dark');
});
test('prepaint is relative, loads before CSS, and is included in the offline shell',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="./theme.js"')<html.indexOf('href="./styles.css"'));
 assert.match(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),/\.\/theme\.js/);
});
