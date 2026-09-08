/**
 * In-document UI test harness for environments that prohibit browser navigation.
 * This test-only bundle replaces IndexedDB with a validated in-memory adapter.
 * It does NOT validate actual persistence, service workers, installation or offline reload.
 * Nothing generated here is included in the production application.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'..'), src=path.join(root,'src');
const modules={};
function walk(folder){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,ent.name);if(ent.isDirectory())walk(p);else if(p.endsWith('.ts')){const id=path.relative(src,p).replaceAll('\\','/').replace(/\.ts$/,'.js');modules[id]=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;}}}
walk(src);
modules['db/database.js']=`
const v=require('../domain/validation.js');
const seed=require('./seed.js').seedData;
const migrate=require('./profile-migration.js').migratePracticeData;
let data;
const validators={profiles:v.validateProfile,exercises:v.validateExercise,songs:v.validateSong,routines:v.validateRoutine,dailyPlans:v.validatePlan,sessions:v.validateSession,goals:v.validateGoal,setlists:v.validateSetlist,metronomePresets:v.validatePreset,settings:v.validateSettings};
exports.initializeDatabase=async()=>{data??=v.validateData(migrate(seed()));};
exports.mutateWorkspace=async fn=>{data=v.validateData(fn(structuredClone(data)));return structuredClone(data);};
exports.migrationBackup=async()=>undefined;
exports.resetWorkspace=async()=>{data=v.validateData(migrate(seed()));};
exports.readData=async()=>structuredClone(data);
exports.all=async name=>structuredClone(name==='settings'?[data.settings]:data[name]);
exports.get=async(name,id)=>structuredClone(name==='settings'?data.settings:data[name].find(x=>x.id===id));
exports.put=async(name,value)=>{const next=validators[name](value),copy=structuredClone(data);if(name==='settings')copy.settings=next;else{const i=copy[name].findIndex(x=>x.id===next.id);if(i<0)copy[name].push(next);else copy[name][i]=next;}data=copy.schemaVersion===2?v.validateData(copy):copy;};
exports.patchSettings=async change=>{await exports.put('settings',{...data.settings,...change});};
exports.remove=async(name,id)=>{data[name]=data[name].filter(x=>x.id!==id);};
exports.updateSession=async(id,fn)=>{const s=data.sessions.find(x=>x.id===id);if(!s)throw new Error('Session missing');const n=v.validateSession(fn(structuredClone(s)));if(n.id!==s.id)throw new Error('A session update cannot change its identity.');n.updatedAt=new Date(Math.max(Date.now(),Date.parse(s.updatedAt)+1)).toISOString();await exports.put('sessions',n);return structuredClone(n);};
exports.insertActiveSession=async s=>{if(data.sessions.some(s=>s.status==='active'))throw new Error('Active session exists');await exports.put('sessions',s);};
exports.replaceData=async value=>{data=v.validateBackup({format:'music-practice-os',version:1,exportedAt:new Date().toISOString(),data:value}).data;};
`;
modules['app/pwa.js']=`exports.pwaState={ready:false,error:'Service-worker verification is unavailable in the in-document test harness.'};exports.registerPwa=async()=>{};exports.applyPwaUpdate=()=>{throw new Error('Service workers must be tested against a real localhost server.');};`;
const header=`(() => {
const modules={\n`;
const body=Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:(exports,require,module)=>{\n${code}\n}`).join(',\n');
const tail=`};const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;const require=spec=>{const parts=(id.slice(0,id.lastIndexOf('/')+1)+spec).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p!=='.')out.push(p);}return load(out.join('/'));};if(!modules[id])throw new Error('Module not found: '+id);modules[id](module.exports,require,module);return module.exports;}
window.__qa={load,kind:'in-document UI harness; validated memory storage; NOT production IndexedDB'};load('main.js');})();`;
fs.mkdirSync(path.join(root,'.qa'),{recursive:true});fs.writeFileSync(path.join(root,'.qa','render-bundle.js'),header+body+tail);
console.log('Built test-only render harness; production code is unchanged.');
