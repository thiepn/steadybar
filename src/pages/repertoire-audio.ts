import { audio } from '../audio/engine.js';
import { RepertoireTrackPlayer } from '../audio/track-player.js';
import { resolvedTiming } from '../audio/scheduler.js';
import { deleteRepertoireCue, repertoireTrackBlob, replaceRepertoireTrackFile, saveRepertoireCue, updateRepertoireTrackRate } from '../app/repertoire-audio.js';
import { store } from '../app/store.js';
import type { RepertoireAudioTrack, SongSection } from '../domain/models.js';
import { addToday, launchPractice, songBlock } from '../practice/launch.js';
import type { Page } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { badge, button, checkbox, confirmAction, empty, field, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';

const rates:[string,string][]=[['0.5','50%'],['0.6','60%'],['0.7','70%'],['0.75','75%'],['0.8','80%'],['0.85','85%'],['0.9','90%'],['0.95','95%'],['1','100%'],['1.05','105%'],['1.1','110%'],['1.15','115%'],['1.25','125%'],['1.5','150%']];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
function clock(seconds:number):string{
  const value=Math.max(0,Number.isFinite(seconds)?seconds:0),minutes=Math.floor(value/60),rest=value-minutes*60;
  return `${minutes}:${rest.toFixed(1).padStart(4,'0')}`;
}
function fileInput(label:string):HTMLInputElement{
  return el('input',{type:'file',accept:'audio/*','aria-label':label,hidden:true});
}

export function repertoireAudioPage(trackId:string):Page{
  let track=(store.snapshot().audioTracks??[]).find(row=>row.id===trackId);
  if(!track)return {node:empty('Local track not found.','The track metadata no longer exists.',link('Songs','/songs','button primary'))};
  const song=store.snapshot().songs.find(row=>row.id===track!.songId);
  if(!song)return {node:empty('Song not found.','The track points to a song that no longer exists.',link('Songs','/songs','button primary'))};
  const part=track.songPartId?song.parts?.find(row=>row.id===track!.songPartId):undefined;
  const sections=part?.sections??song.sections;
  const player=new RepertoireTrackPlayer();
  let markA=0,markB=track.durationSeconds,loaded=false,loadFailed=false,disposed=false;
  let detachPlayer=()=>{};

  const page=el('div',{class:'page repertoire-audio-page'},link(song.title,track.songPartId?`/songs/${song.id}/parts/${track.songPartId}`:`/songs/${song.id}`,'back-link'),
    pageHeader('Local repertoire audio',track.title,`${song.title}${part?` · ${part.name}`:''} · stored only in this browser`,[
      button('Practice song',()=>launchPractice([songBlock(song,undefined,600,part?.id??'shared')]),'primary','play'),
    ]));

  const status=el('p',{class:'track-status',role:'status'},'Loading local audio…');
  const timeText=el('strong',{class:'track-time'},'0:00.0');
  const durationText=el('span',{class:'muted'},clock(track.durationSeconds));
  const seek=el('input',{type:'range',min:0,max:track.durationSeconds,step:.01,value:0,'aria-label':'Track position'});
  const rate=select('trackRate','Playback speed',rates,String(track.lastPlaybackRate));
  const effective=el('span',{class:'muted small'},`Approx. ${Math.round(song.bpm*track.lastPlaybackRate)} BPM relative to song tempo`);
  const pitch=el('span',{class:'muted small'},player.pitchPreservationSupported?'Pitch preservation available in this browser.':'This browser does not expose pitch preservation; speed changes may alter pitch.');
  const preRoll=checkbox('trackPreroll','Use one-bar metronome pre-roll',true);
  const loopState=el('span',{class:'muted small'},'Loop off');
  const markText=el('span',{class:'muted small'},`A ${clock(markA)} · B ${clock(markB)}`);
  const cueSection=select('cueSection','Save loop for section',sections.map(section=>[section.id,section.name] as [string,string]),sections[0]?.id??'');
  if(!sections.length)cueSection.querySelector('select')!.disabled=true;
  const relink=fileInput('Relink local audio file');

  let playButton!:HTMLButtonElement,loopButton!:HTMLButtonElement;

  const refreshTrack=()=>{track=(store.snapshot().audioTracks??[]).find(row=>row.id===trackId)??track;};
  const setLoopFromMarks=()=>{
    player.setLoop(markA,markB,true);loopState.textContent=`Loop on · ${clock(markA)} → ${clock(markB)}`;
    loopButton.querySelector('span')!.textContent='Disable loop';
  };
  const clearLoop=()=>{
    player.clearLoop();loopState.textContent='Loop off';loopButton.querySelector('span')!.textContent='Enable loop';
  };
  const loadTrack=async()=>{
    const blob=await repertoireTrackBlob(track);
    if(!blob){
      loaded=false;loadFailed=true;status.textContent='Audio file is missing on this device. Relink the original/local copy to use the saved cues.';
      playButton.disabled=true;return;
    }
    await player.load(blob);loaded=true;loadFailed=false;player.setRate(track.lastPlaybackRate);
    markA=0;markB=player.duration;seek.max=String(player.duration);status.textContent='Ready · local audio loaded.';
    playButton.disabled=false;markText.textContent=`A ${clock(markA)} · B ${clock(markB)}`;
  };

  const play=async()=>{
    if(!loaded)throw new Error('Relink the local audio file before playback.');
    if(!player.paused){player.pause();return;}
    const wantsPreroll=preRoll.querySelector('input')!.checked;
    if(!wantsPreroll){await player.play();return;}
    status.textContent='One-bar count-in…';
    const config={...structuredClone(store.snapshot().settings.metronome),bpm:song.bpm,meter:structuredClone(song.meter),subdivision:1 as const,countIn:1 as const,timing:{...resolvedTiming(store.snapshot().settings.metronome),mode:'standard' as const}};
    await audio.start(config,{onReady:()=>{audio.stop();if(disposed)return;void player.play().then(()=>{status.textContent='Playing after one-bar pre-roll.';}).catch(error=>notify(error instanceof Error?error.message:'Track playback failed.','error'));}});
  };
  playButton=button('Play',play,'primary','play');playButton.disabled=true;
  const stopButton=button('Stop',()=>{audio.stop();player.stop();status.textContent='Stopped.';},'secondary');
  loopButton=button('Enable loop',()=>{const loop=player['loop'];if(loop?.enabled){player.toggleLoop(false);loopState.textContent='Loop off';loopButton.querySelector('span')!.textContent='Enable loop';}else setLoopFromMarks();},'secondary');

  seek.addEventListener('input',()=>player.seek(Number(seek.value)));
  rate.querySelector('select')!.addEventListener('change',()=>{
    const value=Number(rate.querySelector('select')!.value);player.setRate(value);effective.textContent=`Approx. ${Math.round(song.bpm*value)} BPM relative to song tempo`;
    void updateRepertoireTrackRate(track.id,value).catch(()=>{});
  });

  const saveCue=async()=>{
    if(!sections.length)throw new Error('Add song sections before saving section cues.');
    const sectionId=cueSection.querySelector('select')!.value,section=sections.find(row=>row.id===sectionId);
    if(!section)throw new Error('Choose a valid song section.');
    await saveRepertoireCue(track.id,{sectionId,label:section.name,startSeconds:markA,endSeconds:markB});refreshTrack();renderCues();notify(`Saved loop for ${section.name}.`);
  };

  const playerPanel=el('section',{class:'panel track-player-panel'},sectionHeader('Player',`${track.fileName} · ${(track.sizeBytes/1024/1024).toFixed(track.sizeBytes<10*1024*1024?1:0)} MB`,[
    button('Relink file',()=>relink.click(),'ghost'),
  ]),
    el('div',{class:'track-time-row'},timeText,durationText),
    seek,
    el('div',{class:'actions wrap'},playButton,stopButton,loopButton),
    el('div',{class:'form-grid track-player-grid'},rate,preRoll),
    el('div',{class:'track-meta-row'},effective,pitch),
    status,relink);

  const loopPanel=el('section',{class:'panel track-loop-panel'},sectionHeader('A/B loop','Set loop boundaries from the current playhead; save them to a song section when useful.'),
    el('div',{class:'actions wrap'},
      button('Set A',()=>{markA=Math.min(player.currentTime,markB-.08);markText.textContent=`A ${clock(markA)} · B ${clock(markB)}`;},'secondary'),
      button('Set B',()=>{markB=Math.max(player.currentTime,markA+.08);markText.textContent=`A ${clock(markA)} · B ${clock(markB)}`;},'secondary'),
      button('Use full track',()=>{markA=0;markB=player.duration||track.durationSeconds;markText.textContent=`A ${clock(markA)} · B ${clock(markB)}`;clearLoop();},'ghost'),
      button('Save section cue',saveCue,'secondary')),
    el('div',{class:'track-loop-meta'},markText,loopState),cueSection);

  const cueHost=el('section',{class:'panel track-cue-panel'});
  const renderCues=()=>{
    refreshTrack();cueHost.replaceChildren(sectionHeader('Section cues',track.cues.length?`${track.cues.length} saved loop${track.cues.length===1?'':'s'}`:'No saved section loops yet'));
    if(!sections.length){cueHost.append(el('p',{class:'muted'},'Add sections to the song before saving section-linked loops.'));return;}
    for(const section of sections){
      const cue=track.cues.find(row=>row.sectionId===section.id);
      const row=el('div',{class:'track-cue-row'},
        el('div',{},el('strong',{},section.name),el('span',{class:'muted small'},cue?`${clock(cue.startSeconds)} → ${clock(cue.endSeconds)}`:'No local-audio cue saved')),
        el('div',{class:'actions wrap'},
          cue?button('Loop section',()=>{markA=cue.startSeconds;markB=cue.endSeconds;player.seek(markA);setLoopFromMarks();markText.textContent=`A ${clock(markA)} · B ${clock(markB)}`;},'secondary','play'):null,
          button('Practice section',()=>launchPractice([songBlock(song,section.id,600,part?.id??'shared')]),'ghost','play'),
          button('Add to Today',()=>addToday(songBlock(song,section.id,600,part?.id??'shared')),'ghost','plus'),
          cue?button('Remove cue',async()=>{if(await confirmAction('Remove this audio cue?',`Remove the saved loop for “${section.name}”? The song section and audio file stay unchanged.`,'Remove cue',true)){await deleteRepertoireCue(track.id,cue.id);refreshTrack();renderCues();}},'ghost danger-text'):null));
      cueHost.append(row);
    }
  };
  renderCues();

  const info=el('section',{class:'panel'},sectionHeader('Local-audio behavior','Practice aid, not a streaming library.'),
    el('p',{},'Playback speed uses the browser media engine. Pitch is preserved where the browser exposes that capability. A/B looping seeks back to the saved start point in the local file.'),
    el('p',{class:'field-hint'},'Track audio is stored only in this browser profile and is not included in JSON backups. Saved track metadata and section cues are backed up; relink the local audio file after restoring on another browser/device.'));

  page.append(el('div',{class:'two-column wide-left'},playerPanel,loopPanel),cueHost,info);

  relink.addEventListener('change',()=>{void (async()=>{
    const file=relink.files?.[0];relink.value='';if(!file)return;
    track=await replaceRepertoireTrackFile(track.id,file);await loadTrack();notify('Local audio relinked.');
  })().catch(error=>notify(error instanceof Error?error.message:'The local audio file could not be relinked.','error'));});

  detachPlayer=player.onChange(snapshot=>{
    seek.value=String(snapshot.currentTime);timeText.textContent=clock(snapshot.currentTime);durationText.textContent=clock(snapshot.duration||track.durationSeconds);
    playButton.querySelector('span')!.textContent=snapshot.paused?'Play':'Pause';
    if(snapshot.loop?.enabled){loopState.textContent=`Loop on · ${clock(snapshot.loop.startSeconds)} → ${clock(snapshot.loop.endSeconds)}`;loopButton.querySelector('span')!.textContent='Disable loop';}
    else{loopState.textContent='Loop off';loopButton.querySelector('span')!.textContent='Enable loop';}
  });
  void loadTrack().catch(error=>{loadFailed=true;status.textContent=error instanceof Error?error.message:'The local track could not be loaded.';playButton.disabled=true;});

  return {
    node:page,
    beforeLeave:async()=>player.paused||await confirmAction('Leave local audio practice?','Track playback will stop. Saved section cues remain available.','Leave player'),
    isDirty:()=>!player.paused,
    cleanup:()=>{disposed=true;audio.stop();detachPlayer();player.destroy();},
  };
}
