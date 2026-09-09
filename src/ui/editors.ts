import { changeSongSections } from '../app/song-parts.js';
import { protocolEditor } from './protocol-editor.js';
import { activeProfile, definition, supportedProtocols, skillLabel } from '../domain/profiles.js';
import { defaultProtocol, exerciseProtocol, exerciseBpm, protocolPulse } from '../domain/protocols.js';
import type { Experience, ProtocolKind } from '../domain/practice-types.js';
import { store } from '../app/store.js';
import type { Exercise, Goal, Preset, Routine, RoutineBlock, Setlist, Song, SongSection, TrainerConfig } from '../domain/models.js';
import { validateExercise, validateGoal, validateRoutine, validateRoutineBlock, validateSetlist, validateSong, validateTrainer } from '../domain/validation.js';
import { freshBlocks, metadata, nowISO, uuid } from '../domain/utils.js';
import { el } from './dom.js';
import { checkbox, formDialog, formNumber, formText, input, notify, select, textarea } from './components.js';
import { navigate } from '../app/navigation.js';
import { freeBlock } from '../practice/launch.js';

const bpmInput=(name:string,label:string,value=80)=>input(name,label,value,'number',{min:20,max:300,step:1,required:true,inputmode:'numeric'});
const meterSelect=(meter:{beats:number;beatUnit:number})=>select('meter','Time signature',[...new Set(['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8',`${meter.beats}/${meter.beatUnit}`])],`${meter.beats}/${meter.beatUnit}`);
const parseMeter=(data:FormData)=>{const [beats,beatUnit]=formText(data,'meter').split('/').map(Number);return {beats:beats||4,beatUnit:(beatUnit===8?8:4) as 4|8};};
export function editExercise(exercise?:Exercise):void{
  const data=store.snapshot(),profile=data.profiles?.find(p=>p.id===exercise?.profileId)??activeProfile(data);
  const e:Exercise=exercise??{...metadata(),name:'',instrument:definition(profile.instrumentType).label,category:'technique',description:'',instructions:'',tags:[],notes:'',builtin:false,archived:false,profileId:profile.id,skillArea:definition(profile.instrumentType).skills[0]!,protocol:defaultProtocol(profile.family==='percussion'?'tempo':'free',profile),level:profile.level};
  const initial=exerciseProtocol(e),choices=supportedProtocols(profile),kind=select('protocolKind','Practice method',choices.map(p=>[p.id,p.label]),initial.kind);
  const targetTempo=input('targetBpm','Target clean BPM',e.targetBpm??'','number',{min:20,max:300,step:1});
  const editors=new Map<ProtocolKind,ReturnType<typeof protocolEditor>>(),host=el('div');
  const draw=()=>{const key=kind.querySelector('select')!.value as ProtocolKind;let editor=editors.get(key);if(!editor){editor=protocolEditor(key===initial.kind?initial:defaultProtocol(key,profile),profile);editors.set(key,editor);}targetTempo.hidden=key!=='tempo';targetTempo.querySelector('input')!.disabled=targetTempo.hidden;host.replaceChildren(editor.node);};
  kind.addEventListener('change',draw);draw();
  const skills=[...new Set([...definition(profile.instrumentType).skills,e.skillArea??e.category])];
  formDialog(exercise?'Edit exercise':'New exercise',[
    input('name','Name',e.name,'text',{required:true,maxlength:200,autofocus:true}),el('p',{class:'field-hint'},`${profile.name} · ${definition(profile.instrumentType).summary}`),
    el('div',{class:'form-grid'},select('skillArea','Skill area',skills.map(k=>[k,skillLabel(k)]),e.skillArea??e.category),select('level','Experience',['beginner','intermediate','advanced'].map(k=>[k,skillLabel(k)]),e.level??profile.level)),kind,host,targetTempo,input('defaultMinutes','Default practice duration (minutes)',(e.defaultSeconds??600)/60,'number',{min:1/60,max:1440,step:'any',required:true}),
    textarea('instructions','Practice instructions',e.instructions,3),textarea('description','Description',e.description,2),
    input('tags','Tags, separated by commas',e.tags.join(', '),'text',{maxlength:2000}),textarea('notes','Personal notes',e.notes),
  ],async form=>{
    const protocol=editors.get(kind.querySelector('select')!.value as ProtocolKind)!.read(form),timing=protocolPulse(protocol);
    const saved=validateExercise({...e,name:formText(form,'name'),instrument:definition(profile.instrumentType).label,profileId:profile.id,skillArea:formText(form,'skillArea'),level:formText(form,'level') as Experience,defaultSeconds:Math.round(formNumber(form,'defaultMinutes')*60),protocol,
      description:formText(form,'description'),instructions:formText(form,'instructions'),tags:formText(form,'tags').split(',').map(t=>t.trim()).filter(Boolean),notes:formText(form,'notes'),
      defaultBpm:timing?.bpm,minBpm:undefined,maxBpm:undefined,targetBpm:protocol.kind==='tempo'&&formText(form,'targetBpm')?formNumber(form,'targetBpm'):undefined,meter:timing?{beats:timing.beats,beatUnit:timing.beatUnit}:undefined,subdivision:timing?.subdivision,sticking:protocol.kind==='tempo'?protocol.sticking:undefined,accents:undefined});
    await store.workspace(data=>{
      data.exercises=data.exercises.some(e=>e.id===saved.id)?data.exercises.map(e=>e.id===saved.id?saved:e):[...data.exercises,saved];
      for(const plans of [data.routines,data.dailyPlans])for(const plan of plans)for(const block of plan.blocks)if(block.exerciseId===saved.id&&!block.protocol){
        if(!timing)block.bpm=undefined;
        if(protocol.kind!=='tempo')block.tempoTrainer=undefined;
      }
      return data;
    });notify(exercise?'Exercise saved.':'Exercise created.');if(!exercise)navigate(`/library/${saved.id}`);
  },'Save exercise');
}
export function editRoutine(routine?:Routine):void{
  const r=routine||{...metadata(),profileId:activeProfile(store.snapshot()).id,name:'',description:'',blocks:[],scheduledDays:[],tags:[],builtin:false,archived:false};
  formDialog(routine?'Routine details':'New routine',[
    input('name','Name',r.name,'text',{required:true,maxlength:200}),textarea('description','Description',r.description),
    el('fieldset',{class:'weekdays'},el('legend',{},'Optional schedule'),['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day,i)=>checkbox(`day-${i}`,day,r.scheduledDays.includes(i)))),
    input('tags','Tags, separated by commas',r.tags.join(', ')),
  ],async data=>{
    const saved=validateRoutine({...r,name:formText(data,'name'),description:formText(data,'description'),tags:formText(data,'tags').split(',').map(t=>t.trim()).filter(Boolean),scheduledDays:[0,1,2,3,4,5,6].filter(i=>data.has(`day-${i}`))});
    await store.save('routines',saved);notify('Routine saved.');if(!routine)navigate(`/routines/${saved.id}`);
  },'Save routine');
}
export async function duplicateRoutine(routine:Routine):Promise<void>{const copy={...structuredClone(routine),...metadata(),name:`${routine.name} (copy)`,blocks:freshBlocks(routine.blocks),builtin:false,archived:false};await store.save('routines',copy);notify('Routine duplicated.');navigate(`/routines/${copy.id}`);}
export function editSong(song?:Song):void{
  const s=song||{...metadata(),title:'',artist:'',bpm:80,meter:{beats:4,beatUnit:4 as const},key:'',difficulty:2 as const,status:'learning' as const,notes:'',sections:[]};
  formDialog(song?'Edit song':'New song',[
    input('title','Title',s.title,'text',{required:true,maxlength:200}),input('artist','Artist',s.artist,'text',{maxlength:200}),
    el('div',{class:'form-grid'},bpmInput('bpm','BPM',s.bpm),meterSelect(s.meter)),
    el('div',{class:'form-grid'},input('key','Key',s.key,'text',{maxlength:40,placeholder:'e.g. G'}),select('difficulty','Difficulty',[['1','1 · Easy'],['2','2'],['3','3 · Moderate'],['4','4'],['5','5 · Challenging']],String(s.difficulty))),
    select('status','Preparation status',[['learning','Learning'],['practicing','Practicing'],['performance-ready','Performance-ready'],['archived','Archived']],s.status),
    textarea('notes','Arrangement / practice notes',s.notes),
  ],async data=>{
    const changes={title:formText(data,'title'),artist:formText(data,'artist'),bpm:formNumber(data,'bpm'),meter:parseMeter(data),key:formText(data,'key'),difficulty:formNumber(data,'difficulty'),status:formText(data,'status'),notes:formText(data,'notes')};
    let saved:Song|undefined;
    if(song){
      await store.workspace(workspace=>{
        const current=workspace.songs.find(item=>item.id===song.id);if(!current)throw new Error('This song no longer exists.');
        const merged=validateSong({...current,...changes,updatedAt:nowISO()});saved=merged;
        workspace.songs=workspace.songs.map(item=>item.id===song.id?merged:item);return workspace;
      });
    }else{saved=validateSong({...s,...changes});await store.save('songs',saved);}
    if(!saved)throw new Error('The song could not be saved.');notify('Song saved.');if(!song)navigate(`/songs/${saved.id}`);
  },'Save song');
}
export function editSection(song:Song,section?:SongSection,partId?:string):void{
  const part=partId?song.parts?.find(p=>p.id===partId):undefined;
  const s=section||{id:uuid(),name:'',bars:8,notes:'',order:(part?.sections??song.sections).length};
  formDialog(section?'Edit section':'New song section',[
    input('name','Section name',s.name,'text',{required:true,maxlength:200,placeholder:'e.g. Bridge'}),
    el('div',{class:'form-grid'},input('bars','Bars',s.bars??'','number',{min:1,max:1000,step:1}),input('bpm','BPM override',s.bpmOverride??'','number',{min:20,max:300,step:1,placeholder:String(song.bpm)})),
    textarea('notes','Section notes',s.notes),
  ],async data=>{
    const saved={...s,name:formText(data,'name'),bars:formText(data,'bars')?formNumber(data,'bars'):undefined,bpmOverride:formText(data,'bpm')?formNumber(data,'bpm'):undefined,notes:formText(data,'notes')};
    await changeSongSections(song.id,partId,sections=>section?sections.map(x=>x.id===s.id?saved:x):[...sections,saved]);notify('Section saved.');
  },'Save section');
}
export function editSetlist(setlist?:Setlist):void{
  const s=setlist||{...metadata(),name:'',songIds:[],notes:''};
  formDialog(setlist?'Setlist details':'New setlist',[
    input('name','Name',s.name,'text',{required:true,maxlength:200,placeholder:'e.g. Sunday Worship'}),input('date','Performance date',s.date||'','date'),textarea('notes','Set notes',s.notes),
  ],async data=>{const saved=validateSetlist({...s,name:formText(data,'name'),date:formText(data,'date')||undefined,notes:formText(data,'notes')});await store.save('setlists',saved);notify('Setlist saved.');if(!setlist)navigate(`/setlists/${saved.id}`);},'Save setlist');
}
export function editGoal(goal?:Goal):void{
  const all=store.snapshot(),profile=all.profiles?.find(p=>p.id===goal?.profileId)??activeProfile(all);
  const exercises=all.exercises.filter(e=>e.profileId===profile.id&&!e.archived);
  const timed=exercises.filter(e=>exerciseProtocol(e).kind==='tempo');
  const g:Goal=goal??{...metadata(),profileId:profile.id,type:timed.length?'bpm':'weekly-sessions',title:'',description:'',targetValue:timed.length?120:4,unit:timed.length?'BPM':'sessions',completed:false};
  const typeField=select('type','Goal type',[...(timed.length||g.type==='bpm'?[['bpm','Clean BPM'] as [string,string]]:[]),['weekly-sessions','Weekly sessions'],['weekly-minutes','Weekly minutes'],['protocol','Task result'],['song-mastery','Song / part preparation'],['custom','Custom goal']],g.type);
  const taskMetrics:[string,string][]=[];
  if(exercises.some(e=>['chord-changes','repetitions'].includes(exerciseProtocol(e).kind)))taskMetrics.push(['clean-count','Clean repetitions recorded']);
  if(exercises.some(e=>exerciseProtocol(e).kind==='scale-cycle'))taskMetrics.push(['keys-practiced','Different keys practiced']);
  if(exercises.some(e=>exerciseProtocol(e).kind==='fretboard'))taskMetrics.push(['recall-correct','Correct fretboard answers']);
  if(exercises.some(e=>['pitch-match','vocal-pattern'].includes(exerciseProtocol(e).kind)))taskMetrics.push(['pitch-sessions','Pitch-work sessions']);
  const metric=select('metric','Result to track',taskMetrics,g.metric??taskMetrics[0]?.[0]??'');
  const exerciseField=select('exerciseId','Exercise',[],g.exerciseId??'');
  const songField=select('songId','Song',all.songs.filter(s=>s.status!=='archived').map(s=>[s.id,s.title]),g.songId??all.songs[0]?.id??'');
  const partField=select('songPartId','Song part',[],g.songPartId??'');
  const scope=checkbox('global','Count all practice profiles',!g.profileId);
  const target=input('targetValue','Target',g.targetValue,'number',{min:1,max:100000,step:1,required:true});
  const updateExercises=()=>{
    const type=typeField.querySelector('select')!.value,m=metric.querySelector('select')!.value,control=exerciseField.querySelector('select')!,previous=control.value||g.exerciseId;
    const relevant=type==='bpm'?timed:exercises.filter(e=>{const k=exerciseProtocol(e).kind;return m==='clean-count'?['repetitions','chord-changes'].includes(k):m==='keys-practiced'?k==='scale-cycle':m==='recall-correct'?k==='fretboard':['pitch-match','vocal-pattern'].includes(k);});
    control.replaceChildren(...(type==='protocol'?[el('option',{value:''},'All matching exercises')]:[]),...relevant.map(e=>el('option',{value:e.id},e.name)));
    if(previous&&relevant.some(e=>e.id===previous))control.value=previous;
  };
  const updateParts=()=>{const song=all.songs.find(s=>s.id===songField.querySelector('select')!.value),control=partField.querySelector('select')!;control.replaceChildren(el('option',{value:''},'Shared song readiness'),...(song?.parts??[]).filter(p=>p.profileId===profile.id).map(p=>el('option',{value:p.id},p.name)));if(g.songPartId&&song?.parts?.some(p=>p.id===g.songPartId))control.value=g.songPartId;};
  const update=()=>{const type=typeField.querySelector('select')!.value;metric.hidden=type!=='protocol';exerciseField.hidden=!['bpm','protocol'].includes(type);songField.hidden=partField.hidden=type!=='song-mastery';scope.hidden=!type.startsWith('weekly-');target.hidden=['song-mastery','custom'].includes(type);target.querySelector('input')!.disabled=target.hidden;target.querySelector('input')!.max=type==='bpm'?'300':metric.querySelector('select')!.value==='keys-practiced'&&type==='protocol'?'12':'100000';updateExercises();};
  typeField.addEventListener('change',()=>{if(!goal){const type=typeField.querySelector('select')!.value;target.querySelector('input')!.value=type==='bpm'?'120':type==='weekly-minutes'?'120':type==='weekly-sessions'?'4':'10';}update();});metric.addEventListener('change',update);songField.addEventListener('change',updateParts);updateParts();update();
  formDialog(goal?'Edit goal':'New goal',[
    input('title','Goal title',g.title,'text',{required:true,maxlength:200,placeholder:`A specific target for ${profile.name}`}),el('p',{class:'field-hint'},profile.name),typeField,metric,exerciseField,songField,partField,scope,target,
    input('deadline','Target date (optional)',g.deadline??'','date'),textarea('description','Why this matters',g.description),
    el('p',{class:'field-hint'},'Recorded practice is not proof of mastery. Counts and pitch reviews are self-reported; fretboard answers are scored. Weekly totals restart each Monday.'),
  ],async form=>{
    const type=formText(form,'type'),exerciseId=['bpm','protocol'].includes(type)?formText(form,'exerciseId')||undefined:undefined;
    if(type==='bpm'&&!exerciseId)throw new Error('Choose a tempo exercise.');
    if(type==='protocol'&&!formText(form,'metric'))throw new Error('Create a supported task exercise first.');
    const saved=validateGoal({...g,title:formText(form,'title'),profileId:type.startsWith('weekly-')&&form.has('global')?undefined:profile.id,type,metric:type==='protocol'?formText(form,'metric'):undefined,exerciseId,songId:type==='song-mastery'?formText(form,'songId'):undefined,songPartId:type==='song-mastery'?formText(form,'songPartId')||undefined:undefined,targetValue:target.hidden?1:formNumber(form,'targetValue'),unit:type==='bpm'?'BPM':type==='weekly-sessions'?'sessions':type==='weekly-minutes'?'minutes':'results',deadline:formText(form,'deadline')||undefined,description:formText(form,'description')});
    await store.save('goals',saved);notify('Goal saved.');
  },'Save goal');
}
export function editBlock(block:RoutineBlock|undefined,onSave:(block:RoutineBlock)=>Promise<unknown>):void{
  const b=block||freeBlock(),data=store.view(),profile=activeProfile(store.snapshot());
  if(b.lessonSource&&b.protocol){
    const pulse='pulse' in b.protocol?b.protocol.pulse:undefined;
    formDialog('Edit guided lesson block',[
      el('p',{class:'field-hint'},'This keeps the lesson task and its course identity. Adjust its time, optional tempo and cue here. To practice something different, remove this block and add an ordinary practice block.'),
      input('minutes','Duration (minutes)',b.targetSeconds/60,'number',{min:1/60,max:1440,step:'any',required:true}),
      ...(pulse?[bpmInput('bpm',`Reference tempo · ${pulse.beatUnit===8?'eighth':'quarter'} notes per minute`,b.bpm??pulse.bpm)]:[]),textarea('notes','Practice cue',b.notes),
    ],async form=>{
      const protocol=structuredClone(b.protocol!);
      if('pulse' in protocol&&protocol.pulse)protocol.pulse.bpm=formNumber(form,'bpm');
      await onSave(validateRoutineBlock({...b,protocol,targetSeconds:Math.round(formNumber(form,'minutes')*60),bpm:pulse?formNumber(form,'bpm'):undefined,notes:formText(form,'notes')}));
    },'Save block');return;
  }
  const typeSelect=select('type','Block type',[['exercise','Exercise'],['song','Entire song'],['song-section','Song section'],['free','Free practice']],block?b.type:'exercise');
  const source=el('div'),title=input('title','Block title',b.title,'text',{maxlength:200});
  const tempo=bpmInput('bpm','Starting BPM',b.bpm);
  const click=checkbox('blockClick','Use metronome for free practice',block?b.bpm!==undefined:profile.instrumentType!=='voice');
  const showTempo=(enabled:boolean,value?:number)=>{tempo.hidden=!enabled;tempo.querySelector('input')!.disabled=!enabled;if(value!==undefined)tempo.querySelector('input')!.value=String(value);};
  click.addEventListener('change',()=>showTempo(click.querySelector('input')!.checked));
  const drawSources=()=>{
    const type=typeSelect.querySelector('select')!.value;
    source.replaceChildren();showTempo(true);click.hidden=type!=='free';title.hidden=type!=='free';title.querySelector('input')!.required=type==='free';
    if(type==='free')showTempo(click.querySelector('input')!.checked);
    if(type==='exercise'){
      const options=data.exercises.filter(e=>!e.archived||e.id===b.exerciseId),chosen=b.exerciseId||options[0]?.id||'';
      const selection=select('exerciseId','Exercise',options.map(e=>[e.id,e.name]),chosen);source.append(selection);
      const set=()=>{const e=options.find(e=>e.id===selection.querySelector('select')!.value),value=e?exerciseBpm(e):undefined;showTempo(value!==undefined,value??80);};
      selection.addEventListener('change',set);set();if(block?.bpm!==undefined&&!tempo.hidden)showTempo(true,block.bpm);
    }
    if(type==='song'||type==='song-section'){
      const options=data.songs.filter(s=>s.status!=='archived'||s.id===b.songId),chosen=b.songId||options[0]?.id||'';
      const selection=select('songId','Song',options.map(s=>[s.id,s.title]),chosen),partHost=el('div'),sectionHost=el('div');
      const drawParts=()=>{
        const song=options.find(s=>s.id===selection.querySelector('select')!.value),parts=song?.parts?.filter(p=>p.profileId===profile.id)??[];
        const initial=block&&song?.id===b.songId?b.songPartId??'shared':parts[0]?.id??'shared';
        const partSelect=select('songPartId','Instrument part',[['shared','Shared arrangement'],...parts.map(p=>[p.id,p.name] as [string,string])],initial);
        const drawSections=()=>{
          const part=parts.find(p=>p.id===partSelect.querySelector('select')!.value),sections=part?.sections??song?.sections??[];
          sectionHost.replaceChildren();if(song)showTempo(true,song.bpm);
          if(type==='song-section'){
            const sectionSelect=select('songSectionId','Section',sections.map(s=>[s.id,s.name]),sections.some(s=>s.id===b.songSectionId)?b.songSectionId??'':sections[0]?.id??'');
            const setSectionTempo=()=>{const section=sections.find(s=>s.id===sectionSelect.querySelector('select')!.value);if(song)showTempo(true,section?.bpmOverride??song.bpm);};
            sectionSelect.addEventListener('change',setSectionTempo);sectionHost.append(sectionSelect);setSectionTempo();
            if(!sections.length)sectionHost.append(el('p',{class:'field-hint'},'Add a section to this part in Songs, or practice the entire song.'));
          }
        };
        partHost.replaceChildren(partSelect);partSelect.addEventListener('change',drawSections);drawSections();
      };
      source.append(selection,partHost,sectionHost);selection.addEventListener('change',drawParts);drawParts();
      if(block?.bpm!==undefined)showTempo(true,block.bpm);
      if(!options.length)source.append(el('p',{class:'field-hint'},'Add a song in Songs first, or use a free-practice block.'));
    }
  };
  typeSelect.addEventListener('change',drawSources);drawSources();
  formDialog(block?'Edit practice block':'Add practice block',[
    typeSelect,source,title,click,
    el('div',{class:'form-grid'},input('minutes','Duration (minutes)',b.targetSeconds/60,'number',{min:1/60,max:1440,step:'any',required:true}),tempo),textarea('notes','Practice cue',b.notes),
  ],async form=>{
    const type=formText(form,'type'),exercise=data.exercises.find(e=>e.id===formText(form,'exerciseId')),song=data.songs.find(s=>s.id===formText(form,'songId'));
    const songPart=song?.parts?.find(p=>p.id===formText(form,'songPartId')&&p.profileId===profile.id),section=(songPart?.sections??song?.sections)?.find(s=>s.id===formText(form,'songSectionId'));
    if(type==='exercise'&&!exercise)throw new Error('Choose an exercise.');
    if((type==='song'||type==='song-section')&&!song)throw new Error('Choose a song.');
    if(type==='song-section'&&!section)throw new Error('Choose an existing song section.');
    const saved=validateRoutineBlock({...b,profileId:profile.id,type,
      exerciseId:type==='exercise'?exercise?.id:undefined,songId:type==='song'||type==='song-section'?song?.id:undefined,
      songPartId:type==='song'||type==='song-section'?songPart?.id:undefined,songSectionId:type==='song-section'?section?.id:undefined,
      title:type==='free'?formText(form,'title'):exercise?.name||`${song?.title}${section?` · ${section.name}`:''}`,
      targetSeconds:Math.round(formNumber(form,'minutes')*60),bpm:tempo.hidden?undefined:formNumber(form,'bpm'),
      protocol:type==='free'?{kind:'free',focus:formText(form,'notes'),...(tempo.hidden?{}:{pulse:{bpm:formNumber(form,'bpm'),beats:4,beatUnit:4,subdivision:1}})}:undefined,
      tempoTrainer:type==='exercise'&&exercise&&exerciseProtocol(exercise).kind==='tempo'?b.tempoTrainer:undefined,notes:formText(form,'notes')});
    await onSave(saved);
  },block?'Save block':'Add block');
}
export function trainerDialog(initial:TrainerConfig|undefined,onSave:(config:TrainerConfig)=>Promise<unknown>,bpm=80):void{
  const mode=select('mode','Training mode',[['progressive','Progressive · timed increases'],['repetition','Repetition · clean rounds'],['ladder','Ladder · tempo stages'],['endurance','Endurance · steady tempo']],initial?.mode||'progressive');
  const settings=el('div');
  const render=()=>{
    const m=mode.querySelector('select')!.value;settings.replaceChildren();
    if(m==='progressive'||m==='repetition'){
      const c=initial?.mode===m?initial:undefined;
      settings.append(el('div',{class:'form-grid'},bpmInput('start','Start BPM',c?.start||bpm),bpmInput('max','Maximum BPM',c?.max||Math.max(120,bpm))),el('div',{class:'form-grid'},input('step','Increase by (BPM)',c?.step||5,'number',{min:1,max:100,step:1,required:true}),m==='progressive'?input('seconds','Every (active seconds)',initial?.mode==='progressive'?initial.seconds:120,'number',{min:1,max:86400,step:1,required:true}):input('rounds','After clean rounds',initial?.mode==='repetition'?initial.rounds:3,'number',{min:1,max:100,step:1,required:true})));
    }else if(m==='ladder')settings.append(input('bpms','Ladder BPMs, separated by commas',initial?.mode==='ladder'?initial.bpms.join(', '):'80, 90, 100, 110, 100, 90, 80','text',{required:true}),input('seconds','Stage duration (seconds)',initial?.mode==='ladder'?initial.seconds:60,'number',{min:1,max:86400,step:1,required:true}));
    else settings.append(el('div',{class:'form-grid'},bpmInput('bpm','Hold BPM',initial?.mode==='endurance'?initial.bpm:bpm),input('seconds','Target duration (seconds)',initial?.mode==='endurance'?initial.seconds:600,'number',{min:1,max:86400,step:1,required:true})));
  };mode.addEventListener('change',render);render();
  formDialog('Tempo trainer',[mode,settings,el('p',{class:'field-hint'},'Pausing freezes the trainer. Progressive and repetition modes hold at the maximum. The ladder holds its final stage; it never loops unexpectedly.')],async form=>{
    const m=formText(form,'mode');let config:unknown;
    if(m==='progressive'||m==='repetition')config={mode:m,start:formNumber(form,'start'),max:formNumber(form,'max'),step:formNumber(form,'step'),...(m==='progressive'?{seconds:formNumber(form,'seconds')}:{rounds:formNumber(form,'rounds')})};
    else if(m==='ladder')config={mode:m,bpms:formText(form,'bpms').split(',').map(v=>Number(v.trim())),seconds:formNumber(form,'seconds')};
    else config={mode:m,bpm:formNumber(form,'bpm'),seconds:formNumber(form,'seconds')};
    await onSave(validateTrainer(config));
  },'Use trainer');
}
export function savePreset(config:Preset['config']):void{formDialog('Save metronome preset',[input('name','Preset name','','text',{required:true,maxlength:200})],async form=>{await store.save('metronomePresets',{...metadata(),name:formText(form,'name'),config:structuredClone(config)});notify('Preset saved.');},'Save preset');}
export function selectRoutineDialog(onChoose:(routine:Routine)=>Promise<unknown>):void{
  const routines=store.view().routines.filter(r=>!r.archived);
  formDialog('Choose a routine',[select('routine','Routine',routines.map(r=>[r.id,r.name]),routines[0]?.id||'')],async form=>{const selected=routines.find(r=>r.id===formText(form,'routine'));if(!selected)throw new Error('Create a routine first.');await onChoose(selected);},'Use routine');
}
export function selectSongDialog(onChoose:(song:Song)=>Promise<unknown>,exclude:string[]=[]):void{
  const songs=store.snapshot().songs.filter(s=>s.status!=='archived'&&!exclude.includes(s.id));
  if(!songs.length){notify('Add another song to your library first.','info');return;}
  formDialog('Add a song',[select('song','Song',songs.map(s=>[s.id,s.title]),songs[0]?.id||'')],async form=>{const selected=songs.find(s=>s.id===formText(form,'song'));if(!selected)throw new Error('Choose a song.');await onChoose(selected);},'Add song');
}
