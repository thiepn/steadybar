/** Pure domain contracts. Browser behavior and native IndexedDB are verified separately. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {starterContent} from '../dist/app/db/profile-content.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {PROFILE_DEFINITIONS,FAMILIES,activeProfile,definition,practiceProfiles,supportedProtocols,profileView} from '../dist/app/domain/profiles.js';
import {defaultProtocol,exerciseProtocol,protocolPulse,frequency,noteName,parseNote,fretPrompt,patternFits,scaleOffsets} from '../dist/app/domain/protocols.js';
import {validateProfile,validateProtocol,validateOutcome,assertProtocolCompatible,assertOutcomeMatches} from '../dist/app/domain/practice-validation.js';
import {validateData,validateBackup,validateSession,validateGoal} from '../dist/app/domain/validation.js';
import {createBackup,parseBackup} from '../dist/app/db/backup.js';
import {createSession,finishBlock,restartBlock,recoverSession} from '../dist/app/practice/logic.js';
import {calculateBestCleanBpm,exerciseAttempts,goalProgress} from '../dist/app/domain/analytics.js';
import {protocolResults,summarizeResults,suggestedExercises} from '../dist/app/domain/protocol-analytics.js';
const at='2026-09-08T10:00:00.000Z';
const profile=(type,family=definition(type).family)=>({id:`test-${type}-${family}`,name:definition(type).label,instrumentType:type,family,level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:at,updatedAt:at});
const dataset=type=>{const p=profile(type),c=starterContent(p),data=migratePracticeData(seedData(at));return validateData({...data,profiles:[p],exercises:c.exercises,routines:c.routines,sessions:[],dailyPlans:[],goals:[],settings:{...data.settings,activeProfileId:p.id,primaryProfileId:p.id,instrument:p.name}});};
const block=e=>({id:'b',profileId:e.profileId,type:'exercise',exerciseId:e.id,title:e.name,targetSeconds:60,bpm:protocolPulse(exerciseProtocol(e))?.bpm,notes:'',order:0});
const result=extra=>({id:'r',timestamp:at,note:'',source:'self-report',...extra});
const complete=(data,e,r)=>{const s=createSession([block(e)],data);s.blocks[0].outcomes=r?[r]:[];s.blocks[0].actualActiveSeconds=60;return finishBlock(s);};
const baseCounts={drums:30,guitar:30,bass:25,piano:30,voice:25};
for(const type of Object.keys(baseCounts)){
 test(`${type}: original starter library validates with distinct skills and protocols`,()=>{
  const d=dataset(type);assert.equal(d.exercises.length,baseCounts[type]);assert.ok(new Set(d.exercises.map(e=>e.skillArea)).size>=5);
  for(const e of d.exercises){assert.equal(e.profileId,d.settings.activeProfileId);assertProtocolCompatible(e.protocol,d.profiles[0]);assert.ok(e.instructions.length>40);assert.ok(definition(type).skills.includes(e.skillArea));}
  assert.equal(d.sessions.length,0);
 });
 for(const minutes of [15,30,45,60])test(`${type}: ${minutes}-minute template sums exactly and preserves all referenced tasks`,()=>{
  const d=dataset(type),r=d.routines.find(r=>r.id===`${d.profiles[0].id}.routine-${minutes}`);assert.ok(r);assert.equal(r.blocks.reduce((n,b)=>n+b.targetSeconds,0),minutes*60);
  assert.equal(new Set(r.blocks.map(b=>b.id)).size,r.blocks.length);for(const b of r.blocks){assert.equal(b.profileId,r.profileId);assert.ok(b.targetSeconds>0);if(b.exerciseId)assert.ok(d.exercises.some(e=>e.id===b.exerciseId));}
  if(type==='voice')assert.ok(r.blocks.some(b=>b.title==='Rest and listen'));
 });
 test(`${type}: every starter task can enter a session, finish, export and restore`,()=>{
  const d=dataset(type);
  for(const e of d.exercises){const s=createSession([block(e)],d);assert.equal(s.profileId,e.profileId);assert.deepEqual(s.blocks[0].protocolSnapshot,e.protocol);d.sessions.push(finishBlock(s));}
  const b=createBackup(d);assert.equal(b.version,2);assert.deepEqual(parseBackup(JSON.stringify(b)).data,validateData(d));
 });
 test(`${type}: unique profile installations do not collide`,()=>{
  const p=profile(type),a=starterContent(p),b=starterContent({...p,id:p.id+'-second'});assert.equal(a.exercises.filter(e=>b.exercises.some(o=>o.id===e.id)).length,0);
 });
}
for(const family of FAMILIES)test(`custom ${family}: only capability-compatible protocols are offered`,()=>{
 const p=profile('custom',family),c=starterContent(p);validateProfile(p);assert.ok(c.exercises.length>=4);
 for(const e of c.exercises)assertProtocolCompatible(e.protocol,p);
 for(const entry of supportedProtocols(p))assertProtocolCompatible(validateProtocol(defaultProtocol(entry.id,p)),p);
 if(family==='general')assert.ok(!supportedProtocols(p).some(p=>p.id==='vocal-pattern'||p.id==='fretboard'));
});
for(const def of PROFILE_DEFINITIONS)for(const entry of supportedProtocols(profile(def.id)))test(`${def.id}/${entry.id}: defaults are typed and valid`,()=>{
 const p=profile(def.id),proto=defaultProtocol(entry.id,p);assert.deepEqual(validateProtocol(proto),proto);assertProtocolCompatible(proto,p);
});
test('guitar, bass, piano and voice are not copied drum libraries',()=>{
 for(const type of ['guitar','bass','piano','voice']){const d=dataset(type);assert.ok(d.exercises.every(e=>!e.name.includes('Paradiddle')));assert.ok(d.exercises.some(e=>!protocolPulse(e.protocol)));assert.ok(d.exercises.every(e=>!('sticking' in e)));}
 assert.ok(dataset('bass').exercises.some(e=>e.protocol.kind==='groove'&&e.protocol.focus==='muting'));
 assert.ok(dataset('guitar').exercises.some(e=>e.protocol.kind==='chord-changes'));
 assert.ok(dataset('piano').exercises.some(e=>e.protocol.kind==='scale-cycle'&&e.protocol.hands==='together'));
});
test('non-tempo tasks never fabricate BPM or tempo attempts',()=>{
 for(const type of ['guitar','piano','voice'])for(const e of dataset(type).exercises.filter(e=>!protocolPulse(e.protocol))){const s=createSession([block(e)],dataset(type));assert.equal(s.blocks[0].initialBpm,undefined);assert.equal(s.runtime.metronomeOn,false);assert.equal(finishBlock(s).blocks[0].finalBpm,undefined);assert.equal(calculateBestCleanBpm(exerciseAttempts([finishBlock(s)],e.id)),undefined);}
});
test('snapshot uses protocol meter/subdivision, not the global metronome',()=>{
 const d=dataset('bass'),e=d.exercises.find(e=>e.protocol.kind==='groove');e.protocol.pulse={bpm:93,beats:7,beatUnit:8,subdivision:3};const s=createSession([block(e)],d);assert.deepEqual(s.blocks[0].meterSnapshot,{beats:7,beatUnit:8});assert.equal(s.blocks[0].subdivisionSnapshot,3);assert.equal(s.runtime.bpm,93);
});
test('renaming profiles or editing source exercises never rewrites a historical snapshot',()=>{
 const d=dataset('piano'),e=d.exercises.find(e=>e.protocol.kind==='scale-cycle'),s=complete(d,e),before=structuredClone(s);d.profiles[0].name='Concert keyboard';e.name='Different';e.protocol.keys=[9];assert.deepEqual(s,before);assert.equal(s.profileNameSnapshot,'Piano');
});
test('mixed-profile new sessions are rejected rather than relabeled',()=>{
 const d=dataset('drums'),g=dataset('guitar');d.profiles.push(...g.profiles);d.exercises.push(...g.exercises);assert.throws(()=>createSession([block(d.exercises[0]),block(g.exercises[0])],d),/one profile/);
});
test('existing v1 data migrates deterministically and idempotently without time loss',()=>{
 const d=seedData(at),s=createSession(d.routines[0].blocks,d);s.blocks[0].actualActiveSeconds=37.5;s.blocks[0].tempoAttempts=[{id:'a',bpm:93,rating:'clean',timestamp:at,note:'Original'}];d.sessions=[finishBlock(s)];const before=structuredClone(d),m=migratePracticeData(d);validateData(m);assert.deepEqual(d,before);assert.deepEqual(m,migratePracticeData(d));assert.deepEqual(m,migratePracticeData(m));assert.equal(m.sessions[0].blocks[0].actualActiveSeconds,37.5);assert.deepEqual(m.sessions[0].blocks[0].tempoAttempts,d.sessions[0].blocks[0].tempoAttempts);assert.equal(m.sessions[0].profileId,'profile-drums');
});
test('historical attribution buckets cannot become the selected practice workspace',()=>{
 const d=dataset('guitar'),historical={id:'profile-earlier',name:'Earlier practice',instrumentType:'custom',family:'general',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:at,updatedAt:at,attribution:'unresolved-history'};
 d.profiles.push(historical);d.settings.activeProfileId=historical.id;d.settings.primaryProfileId=historical.id;
 const repaired=migratePracticeData(d);assert.equal(repaired.settings.activeProfileId,d.profiles[0].id);assert.equal(repaired.settings.primaryProfileId,d.profiles[0].id);
 assert.equal(activeProfile(repaired).id,d.profiles[0].id);assert.equal(practiceProfiles(repaired).length,1);assert.equal(profileView(repaired).exercises.length,30);
 assert.equal(repaired.profiles.find(p=>p.id===historical.id).attribution,'unresolved-history');
 assert.deepEqual(repaired,migratePracticeData(repaired));
});
test('selection repair restores one real profile if older UI archived every selectable profile',()=>{
 const d=dataset('drums'),historical={...d.profiles[0],id:'profile-earlier-only',name:'Earlier practice',instrumentType:'custom',family:'general',focusAreas:[],attribution:'unresolved-history'};d.profiles[0].archived=true;d.profiles.push(historical);d.settings.activeProfileId=historical.id;d.settings.primaryProfileId=historical.id;
 const repaired=migratePracticeData(d);assert.equal(repaired.profiles[0].archived,false);assert.equal(activeProfile(repaired).id,d.profiles[0].id);
});
test('historical attribution buckets cannot own newly created sessions',()=>{
 const d=dataset('guitar'),historical={...d.profiles[0],id:'profile-earlier-new-session',name:'Earlier practice',instrumentType:'custom',family:'general',focusAreas:[],attribution:'unresolved-history'};d.profiles.push(historical);
 assert.throws(()=>createSession([{id:'history-free',profileId:historical.id,type:'free',title:'New historical practice',targetSeconds:60,notes:'',order:0}],d,{profileId:historical.id}),/Historical attribution buckets cannot own new sessions/);
});
test('practice profiles preserve multiple ordered focus areas',()=>{
 const p=profile('guitar');p.focusAreas=['Fretboard','Chords & rhythm','Reading'];assert.deepEqual(validateProfile(p).focusAreas,p.focusAreas);
});
test('non-drum upgrades preserve drum history and provision the selected discipline',()=>{
 const d=seedData(at);d.settings.instrument='Vocals';d.sessions=[finishBlock(createSession(d.routines[0].blocks,d))];const m=validateData(migratePracticeData(d));assert.equal(m.settings.activeProfileId,'profile-voice');assert.equal(m.sessions[0].profileId,'profile-drums');assert.equal(profileView(m).exercises.length,25);assert.equal(profileView(m).sessions.length,0);
});
test('unattributable legacy free practice is visible under Earlier practice, not guessed',()=>{
 const d=seedData(at);d.sessions=[finishBlock(createSession([{id:'free',type:'free',title:'Earlier solo work',targetSeconds:60,bpm:85,notes:'Original note',order:0}],d))];const m=validateData(migratePracticeData(d));assert.equal(m.sessions[0].profileId,'profile-earlier');assert.equal(m.profiles.find(p=>p.id==='profile-earlier').attribution,'unresolved-history');assert.equal(m.sessions[0].blocks[0].notes,'Original note');
});
test('an active legacy checkpoint stays recoverable and never adds unknown downtime',()=>{
 const d=seedData(at),s=createSession(d.routines[0].blocks,d);s.runtime.phase='running';s.runtime.runStartedAt=at;s.blocks[0].actualActiveSeconds=20;d.sessions=[s];const m=validateData(migratePracticeData(d)),recovered=recoverSession(m.sessions[0]);assert.equal(recovered.runtime.phase,'paused');assert.equal(recovered.blocks[0].actualActiveSeconds,20);assert.equal(recovered.runtime.runStartedAt,undefined);
});
test('per-profile Today plans allow the same date but reject within-profile duplicates',()=>{
 const d=dataset('drums'),g=dataset('guitar');d.profiles.push(...g.profiles);d.exercises.push(...g.exercises);d.routines.push(...g.routines);
 d.dailyPlans=d.profiles.map((p,i)=>({id:'plan'+i,profileId:p.id,date:'2026-09-08',blocks:[],createdAt:at,updatedAt:at}));validateData(d);d.dailyPlans.push({...d.dailyPlans[0],id:'duplicate-date'});assert.throws(()=>validateData(d),/duplicate dates/);
});
test('v2 backup validates every relationship before replacing any data',()=>{
 for(const mutate of [d=>d.exercises[0].profileId='missing',d=>d.routines[0].profileId='missing',d=>d.settings.activeProfileId='missing',d=>d.profiles.push(structuredClone(d.profiles[0])),d=>delete d.exercises[0].protocol,d=>d.routines[0].blocks[0].exerciseId='missing']){const d=dataset('guitar');mutate(d);assert.throws(()=>validateData(d));}
 const d=dataset('voice'),backup=createBackup(d);assert.throws(()=>validateBackup({...backup,version:99}),/unsupported/);assert.throws(()=>validateBackup({...backup,data:seedData(at)}),/version 2/);
});
test('unsupported instrument fields and dishonest outcomes are rejected',()=>{
 const v=profile('voice');assert.throws(()=>assertProtocolCompatible(defaultProtocol('fretboard',profile('guitar')),v),/not supported/);
 assert.throws(()=>assertProtocolCompatible({...defaultProtocol('tempo',v),sticking:'R L'},v),/percussion/);
 assert.throws(()=>validateOutcome(result({kind:'count',protocol:'chord-changes',clean:5,total:3,durationSeconds:10})),/exceed/);
 assert.throws(()=>validateOutcome(result({kind:'recall',source:'scored-input',string:1,fret:0,expected:4,answer:5,correct:true})),/contradicts/);
 assert.throws(()=>assertOutcomeMatches(result({kind:'pitch',rootMidi:62,interval:0,matched:true}),defaultProtocol('pitch-match',v)),/reference pitch/);
});
test('complete vocal pattern—not just its root—must fit the chosen range',()=>{
 const p=defaultProtocol('vocal-pattern',profile('voice'));assert.ok(patternFits(p,p.startMidi));assert.equal(patternFits(p,p.highMidi),false);assert.throws(()=>validateProtocol({...p,startMidi:p.highMidi}),/complete starting pattern/);assert.throws(()=>validateProtocol({...p,lowMidi:p.highMidi+1}),/comfortable range/);
 const d=dataset('voice'),e=d.exercises.find(e=>e.protocol.kind==='vocal-pattern'),s=createSession([block(e)],d);s.blocks[0].protocolState.rootMidi=e.protocol.highMidi;assert.throws(()=>validateSession(s),/vocal root/);
});
test('fretboard tuning uses low-to-high strings and string 1 is highest',()=>{
 const p={...defaultProtocol('fretboard',profile('guitar')),strings:[1],minFret:0,maxFret:2};assert.deepEqual(fretPrompt(p,0),{string:1,fret:0,midi:64,pitchClass:4});assert.equal(fretPrompt(p,2).pitchClass,6);assert.deepEqual(fretPrompt(p,3),fretPrompt(p,0));
 assert.throws(()=>validateProtocol({...p,strings:[7]}));assert.throws(()=>validateProtocol({...p,minFret:5,maxFret:1}));
});
test('pitch conversions and reference scale spelling use real equal-tempered pitches',()=>{
 assert.equal(frequency(69),440);assert.equal(frequency(57),220);assert.equal(noteName(60),'C4');assert.equal(parseNote('E2'),40);assert.equal(parseNote('B♭3'),58);assert.equal(parseNote('F#4'),66);assert.deepEqual(scaleOffsets('major'),[0,2,4,5,7,9,11,12]);
});
test('first read is not awarded again when the same material is restarted or revisited',()=>{
 const d=dataset('piano'),e=d.exercises.find(e=>e.protocol.kind==='sight-reading');let s=createSession([block(e)],d);s.blocks[0].startedAt=at;s.blocks[0].actualActiveSeconds=1;s=restartBlock(s);assert.equal(s.blocks[s.activeBlockIndex].protocolSnapshot.firstRead,false);
 d.sessions=[finishBlock(s)];const later=createSession([block(e)],d);assert.equal(later.blocks[0].protocolSnapshot.firstRead,false);
});
test('goal metrics derive from matching outcomes, never profile labels or a fabricated BPM',()=>{
 const d=dataset('guitar'),e=d.exercises.find(e=>e.protocol.kind==='chord-changes'),r=result({kind:'count',protocol:'chord-changes',clean:16,total:20,durationSeconds:60});d.sessions=[complete(d,e,r)];
 const g={id:'g',profileId:e.profileId,createdAt:at,updatedAt:at,type:'protocol',metric:'clean-count',exerciseId:e.id,title:'Changes',description:'',targetValue:30,unit:'results',completed:false};
 assert.equal(goalProgress(g,d).value,16);assert.equal(goalProgress({...g,profileId:'other'},d).value,0);assert.equal(protocolResults(d.sessions).length,1);assert.ok(summarizeResults([r])[0].detail.includes('Self-reported'));assert.throws(()=>validateData({...d,goals:[{...g,type:'bpm',targetValue:120}]}),/tempo-practice/);
});
test('key coverage ignores repeat passes and is not labeled mastery',()=>{
 const d=dataset('piano'),e=d.exercises.find(e=>e.protocol.kind==='scale-cycle');e.protocol.keys=[0,7];const r=result({kind:'scale',key:0,quality:e.protocol.quality,hands:e.protocol.hands,mistakes:1});d.sessions=[complete(d,e,r),complete(d,e,{...r,id:'r2'}),complete(d,e,{...r,id:'r3',key:7})];
 const g={id:'g',createdAt:at,updatedAt:at,profileId:e.profileId,type:'protocol',metric:'keys-practiced',title:'Keys',description:'',targetValue:12,unit:'keys',completed:false};assert.equal(goalProgress(g,d).value,2);assert.ok(summarizeResults(protocolResults(d.sessions))[0].detail.includes('not mastery'));assert.throws(()=>validateGoal({...g,targetValue:13}),/twelve/);
});
test('song part goals and session snapshots are scoped to the right instrumental part',()=>{
 const d=dataset('voice'),p=d.profiles[0],part={id:'voice-part',profileId:p.id,name:'Harmony',instrumentType:'voice',key:'G',status:'performance-ready',notes:'Enter at chorus',role:'Third above',tuning:'',range:'Comfortable',sections:[{id:'phrase',name:'Chorus',notes:'Breathe before entry',order:0}]};
 const song={id:'song',createdAt:at,updatedAt:at,title:'Original song',artist:'',bpm:90,meter:{beats:4,beatUnit:4},key:'C',difficulty:2,status:'learning',notes:'',sections:[],parts:[part]};d.songs=[song];
 const g={id:'g',profileId:p.id,songId:song.id,songPartId:part.id,type:'song-mastery',createdAt:at,updatedAt:at,title:'Harmony ready',description:'',targetValue:1,unit:'part',completed:false};d.goals=[g];validateData(d);assert.equal(goalProgress(g,d).done,true);assert.match(goalProgress(g,d).label,/Harmony/);
 const s=createSession([{id:'b',profileId:p.id,type:'song-section',songId:'song',songPartId:part.id,songSectionId:'phrase',title:'Original song · Chorus',bpm:90,notes:'',targetSeconds:60,order:0}],d);assert.equal(s.blocks[0].sourceSongPartId,part.id);assert.match(s.blocks[0].instructionsSnapshot,/Breathe/);
 d.songs[0].parts[0].profileId='bad';assert.throws(()=>validateData(d));
});
test('recommendations are deterministic, profile-filtered and explain their priority',()=>{
 const d=dataset('bass'),g=dataset('guitar');d.exercises.push(...g.exercises);d.profiles.push(...g.profiles);const a=suggestedExercises(d),b=suggestedExercises(d);assert.deepEqual(a,b);assert.equal(a.length,3);assert.ok(a.every(r=>r.reason&&d.exercises.find(e=>e.id===r.id).profileId===d.settings.activeProfileId));
});
test('recommendations match compound and hyphenated focus names accurately',()=>{
 const piano=dataset('piano'),pp=piano.profiles[0];pp.focusAreas=['Sight Reading'];const sight=piano.exercises.find(e=>e.skillArea==='sight-reading');assert.ok(sight);for(const e of piano.exercises)e.archived=e.id!==sight.id;sight.level=pp.level;
 const p=suggestedExercises(piano).find(r=>r.id===sight.id);assert.equal(p?.reason,'Matches Sight Reading');
 const voice=dataset('voice'),vp=voice.profiles[0];vp.focusAreas=['Ear Training'];const ear=voice.exercises.find(e=>e.skillArea==='ear-training');assert.ok(ear);for(const e of voice.exercises)e.archived=e.id!==ear.id;ear.level=vp.level;
 const v=suggestedExercises(voice).find(r=>r.id===ear.id);assert.equal(v?.reason,'Matches Ear Training');
 const guitar=dataset('guitar'),gp=guitar.profiles[0];gp.focusAreas=['Chords & Rhythm'];const chord=guitar.exercises.find(e=>e.skillArea==='chords');assert.ok(chord);for(const e of guitar.exercises)e.archived=e.id!==chord.id;chord.level=gp.level;
 assert.equal(suggestedExercises(guitar).find(r=>r.id===chord.id)?.reason,'Matches Chords & Rhythm');
});

test('migration keeps dangling legacy future blocks usable and explains the repair',()=>{
 const d=seedData(at);d.routines[0].blocks[0].exerciseId='deleted-exercise';d.dailyPlans=[{id:'old-plan',createdAt:at,updatedAt:at,date:'2026-09-08',sourceRoutineId:d.routines[0].id,blocks:[{...d.routines[0].blocks[0]}]}];
 d.goals=[{id:'old-goal',createdAt:at,updatedAt:at,type:'bpm',exerciseId:'deleted-exercise',title:'Old target',description:'Keep this note',targetValue:120,unit:'BPM',completed:false}];
 d.setlists=[{id:'old-set',createdAt:at,updatedAt:at,name:'Old rehearsal',songIds:['deleted-song'],notes:'Keep cue'}];
 const before=structuredClone(d),m=validateData(migratePracticeData(d));assert.deepEqual(d,before);
 const b=m.routines.find(r=>r.id===d.routines[0].id).blocks[0];assert.equal(b.type,'free');assert.equal(b.targetSeconds,d.routines[0].blocks[0].targetSeconds);assert.match(b.notes,/deleted-exercise/);assert.equal(m.goals[0].type,'custom');assert.match(m.goals[0].description,/120 BPM/);assert.match(m.setlists[0].notes,/deleted-song/);
 assert.deepEqual(migratePracticeData(m),m);
});
test('mixed legacy routine split avoids collisions and maps each plan to its matching routine',()=>{
 const d=seedData(at);d.exercises.push({...d.exercises[0],id:'my-guitar',instrument:'Guitar',sticking:''});
 d.routines=[{...d.routines[0],id:'mixed',blocks:[d.routines[0].blocks[0],{...d.routines[0].blocks[1],exerciseId:'my-guitar'}]},{...d.routines[1],id:'mixed.profile-1'}];
 d.dailyPlans=[{id:'mixed-plan',createdAt:at,updatedAt:at,date:'2026-09-08',sourceRoutineId:'mixed',blocks:d.routines[0].blocks}];
 const m=validateData(migratePracticeData(d));assert.equal(new Set(m.routines.map(r=>r.id)).size,m.routines.length);
 for(const p of m.dailyPlans)assert.equal(m.routines.find(r=>r.id===p.sourceRoutineId).profileId,p.profileId);
 assert.equal(m.dailyPlans.reduce((n,p)=>n+p.blocks.length,0),2);
});
test('new sessions require protocol snapshots while original version-one sessions still validate',()=>{
 const d=dataset('guitar'),e=d.exercises[0],s=createSession([block(e)],d);delete s.blocks[0].protocolSnapshot;delete s.blocks[0].outcomes;d.sessions=[s];assert.throws(()=>validateData(d),/protocol snapshot/);
 const old=seedData(at),legacy=createSession([{id:'old',type:'free',title:'Old session',targetSeconds:60,bpm:80,notes:'',order:0}],old);validateSession(legacy);
});
test('song parts preserve compound meter and arrangement cues in immutable snapshots',()=>{
 const d=dataset('voice'),p=d.profiles[0],part={id:'part',profileId:p.id,name:'Low harmony',instrumentType:'voice',key:'F',status:'learning',notes:'Soft entry',role:'Third below',tuning:'',range:'Comfortable',sections:[{id:'verse',name:'Verse',order:0,notes:'Breathe at bar four'}]};
 d.songs=[{id:'song',createdAt:at,updatedAt:at,title:'Own song',artist:'',bpm:72,meter:{beats:6,beatUnit:8},key:'C',difficulty:2,status:'learning',notes:'',parts:[part],sections:[]}];
 const s=createSession([{id:'b',type:'song-section',profileId:p.id,songId:'song',songPartId:'part',songSectionId:'verse',title:'Verse',targetSeconds:60,bpm:72,notes:'',order:0}],d),b=s.blocks[0];
 assert.deepEqual(b.meterSnapshot,{beats:6,beatUnit:8});assert.equal(b.protocolSnapshot.pulse.beats,6);assert.match(b.instructionsSnapshot,/Third below/);assert.match(b.instructionsSnapshot,/Breathe at bar four/);part.role='Changed';assert.match(b.instructionsSnapshot,/Third below/);
});
test('pitch-work goals respect their selected exercise rather than every voice session',()=>{
 const d=dataset('voice'),a=d.exercises.find(e=>e.protocol.kind==='pitch-match'),b=d.exercises.find(e=>e.protocol.kind==='vocal-pattern');
 d.sessions=[complete(d,b,result({kind:'voice',rootMidi:b.protocol.startMidi,pitch:3,ease:4,breath:3,fatigue:0}))];
 const g={id:'g',profileId:a.profileId,createdAt:at,updatedAt:at,type:'protocol',metric:'pitch-sessions',exerciseId:a.id,title:'Pitch sessions',description:'',targetValue:3,unit:'sessions',completed:false};
 assert.equal(goalProgress(g,d).value,0);assert.equal(goalProgress({...g,exerciseId:undefined},d).value,1);
});
