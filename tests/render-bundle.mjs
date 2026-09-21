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
const statev=require('../domain/practice-state-validation.js');
const seed=require('./seed.js').seedData;
const migrate=require('./profile-migration.js').migratePracticeData;
const migrateModel=require('./practice-model-migration.js').migratePracticeModel;
const rebuild=require('../domain/practice-state-rebuild.js').rebuildPracticeStates;
const schedule=require('../domain/autopilot.js').applyAutopilotSessionScheduling;
let data;
const validators={courseProgress:v.validateCourseProgress,profiles:v.validateProfile,exercises:v.validateExercise,songs:v.validateSong,routines:v.validateRoutine,dailyPlans:v.validatePlan,sessions:v.validateSession,goals:v.validateGoal,setlists:v.validateSetlist,practiceStates:statev.validatePracticeState,priorityCycles:statev.validatePriorityCycle,metronomePresets:v.validatePreset,settings:v.validateSettings};
const fresh=()=>v.validateData({...migrateModel(migrate(seed())),courseProgress:[]});
exports.initializeDatabase=async()=>{data??=fresh();};
exports.mutateWorkspace=async fn=>{data=v.validateData(fn(structuredClone(data)));return structuredClone(data);};
exports.migrationBackup=async()=>undefined;
exports.resetWorkspace=async()=>{data=fresh();};
exports.readData=async()=>structuredClone(data);
exports.all=async name=>structuredClone(name==='settings'?[data.settings]:data[name]??[]);
exports.get=async(name,id)=>structuredClone(name==='settings'?data.settings:(data[name]??[]).find(x=>x.id===id));
exports.put=async(name,value)=>{const next=validators[name](value),copy=structuredClone(data);if(name==='settings')copy.settings=next;else{copy[name]??=[];const i=copy[name].findIndex(x=>x.id===next.id);if(i<0)copy[name].push(next);else copy[name][i]=next;if(name==='sessions'&&next.status!=='active')copy.practiceStates=schedule(rebuild(copy),next);}data=copy.schemaVersion===2?v.validateData(copy):copy;};
exports.patchSettings=async change=>{await exports.put('settings',{...data.settings,...change});};
exports.remove=async(name,id)=>{const copy=structuredClone(data);copy[name]=copy[name].filter(x=>x.id!==id);if(name==='sessions')copy.practiceStates=rebuild(copy);data=v.validateData(copy);};
exports.updateSession=async(id,fn)=>{const s=data.sessions.find(x=>x.id===id);if(!s)throw new Error('Session missing');if(s.status!=='active')throw new Error('This practice session already ended. Ended practice history is immutable; edit only its reflection through History.');const n=v.validateSession(fn(structuredClone(s)));if(n.status!=='active')throw new Error('Use session finalization to end practice so mastery state is committed atomically.');if(n.id!==s.id)throw new Error('A session update cannot change its identity.');n.updatedAt=new Date(Math.max(Date.now(),Date.parse(s.updatedAt)+1)).toISOString();await exports.put('sessions',n);return structuredClone(n);};
exports.finalizeSession=async(id,fn)=>{const s=data.sessions.find(x=>x.id===id);if(!s)throw new Error('Session missing');if(s.status!=='active')throw new Error('This practice session already ended. Ended practice history is immutable; edit only its reflection through History.');const n=v.validateSession(fn(structuredClone(s)));if(n.status==='active')throw new Error('Finalizing a session requires an ended session state.');if(n.id!==s.id)throw new Error('A session update cannot change its identity.');n.updatedAt=new Date(Math.max(Date.now(),Date.parse(s.updatedAt)+1)).toISOString();const copy=structuredClone(data);copy.sessions=copy.sessions.map(row=>row.id===id?n:row);copy.practiceStates=schedule(rebuild(copy),n);data=v.validateData(copy);return structuredClone(n);};
exports.insertActiveSession=async s=>{if(data.sessions.some(s=>s.status==='active'))throw new Error('Active session exists');await exports.put('sessions',s);};
exports.replaceData=async value=>{data=v.validateData(value);};
`;
modules['app/pwa.js']=`exports.pwaState={ready:false,error:'Service-worker verification is unavailable in the in-document test harness.'};exports.registerPwa=async()=>{};exports.applyPwaUpdate=()=>{throw new Error('Service workers must be tested against a real localhost server.');};`;
const header=`(() => {
const modules={\n`;
const body=Object.entries(modules).map(([id,code])=>`${JSON.stringify(id)}:(exports,require,module)=>{\n${code}\n}`).join(',\n');
const tail=`};const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;const require=spec=>{const parts=(id.slice(0,id.lastIndexOf('/')+1)+spec).split('/'),out=[];for(const p of parts){if(p==='..')out.pop();else if(p!=='.')out.push(p);}return load(out.join('/'));};if(!modules[id])throw new Error('Module not found: '+id);modules[id](module.exports,require,module);return module.exports;}
window.__qa={load,kind:'in-document UI harness; validated memory storage; NOT production IndexedDB'};load('main.js');})();`;
fs.mkdirSync(path.join(root,'.qa'),{recursive:true});fs.writeFileSync(path.join(root,'.qa','render-bundle.js'),header+body+tail);
console.log('Built test-only render harness; production code is unchanged.');
