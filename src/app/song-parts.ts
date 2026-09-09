import type { Data, Song, SongSection } from '../domain/models.js';
import type { SongPart } from '../domain/practice-types.js';
import { activeProfile } from '../domain/profiles.js';
import { store } from './store.js';
import { advanceISO } from '../domain/utils.js';

export function currentSongPart(song: Song): SongPart | undefined {
  return song.parts?.find(part => part.profileId === activeProfile(store.snapshot()).id);
}
/** Work against the newest transactional song; concurrent edits cannot replace other parts. */
export function syncSongTitleReferences(data:Data,songId:string,previousTitle:string):void {
  const song=data.songs.find(s=>s.id===songId);if(!song)return;
  for(const collection of [data.routines,data.dailyPlans])for(const plan of collection){
    let changed=false;
    for(const block of plan.blocks){
      if(block.songId!==songId)continue;
      const part=block.songPartId?song.parts?.find(p=>p.id===block.songPartId):undefined;
      const section=block.songSectionId?(part?.sections??song.sections).find(s=>s.id===block.songSectionId):undefined;
      const oldTitle=section?`${previousTitle} · ${section.name}`:previousTitle,nextTitle=section?`${song.title} · ${section.name}`:song.title;
      if(block.title===oldTitle&&block.title!==nextTitle){block.title=nextTitle;changed=true;}
    }
    if(changed)plan.updatedAt=advanceISO(plan.updatedAt);
  }
}
export async function saveSongPart(songId: string, part: SongPart): Promise<void> {
  await store.workspace(data => {
    const song = data.songs.find(s => s.id === songId);
    if (!song) throw new Error('This song no longer exists.');
    const parts = song.parts ?? [];
    song.parts = parts.some(p => p.id === part.id) ? parts.map(p => p.id === part.id ? part : p) : [...parts, part];
    song.updatedAt = advanceISO(song.updatedAt);
    return data;
  });
}
export async function changeSongSections(songId: string, partId: string | undefined, change: (sections: SongSection[]) => SongSection[]): Promise<void> {
  await store.workspace(data => {
    const song = data.songs.find(s => s.id === songId);
    if (!song) throw new Error('This song no longer exists.');
    const part = partId ? song.parts?.find(p => p.id === partId) : undefined;
    if (partId && !part) throw new Error('This song part no longer exists.');
    const owner = part ?? song;
    const before = structuredClone(owner.sections);
    owner.sections = change(structuredClone(before)).map((section, order) => ({ ...section, order }));
    const oldSections=new Map(before.map(section=>[section.id,section])),newSections=new Map(owner.sections.map(section=>[section.id,section]));
    // Future plan references must not become orphaned. Historic snapshots are independent.
    for (const collection of [data.routines, data.dailyPlans]) for (const plan of collection) {
      let changed=false;
      for (const block of plan.blocks) {
        if (block.songId !== songId || block.songPartId !== partId || !block.songSectionId) continue;
        const old=oldSections.get(block.songSectionId),current=newSections.get(block.songSectionId);if(!old)continue;
        const canonical=`${song.title} · ${old.name}`;
        if(!current){
          if(block.title===canonical)block.title=song.title;
          block.type='song';block.songSectionId=undefined;
          block.notes=[block.notes,`Earlier section: ${old.name}. ${old.notes}`].filter(Boolean).join('\n');changed=true;
        }else if(old.name!==current.name&&block.title===canonical){block.title=`${song.title} · ${current.name}`;changed=true;}
      }
      if(changed)plan.updatedAt=advanceISO(plan.updatedAt);
    }
    song.updatedAt = advanceISO(song.updatedAt);
    return data;
  });
}
