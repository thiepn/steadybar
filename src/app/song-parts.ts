import type { Song, SongSection } from '../domain/models.js';
import type { SongPart } from '../domain/practice-types.js';
import { activeProfile } from '../domain/profiles.js';
import { store } from './store.js';

export function currentSongPart(song: Song): SongPart | undefined {
  return song.parts?.find(part => part.profileId === activeProfile(store.snapshot()).id);
}
/** Work against the newest transactional song; concurrent edits cannot replace other parts. */
export async function saveSongPart(songId: string, part: SongPart): Promise<void> {
  await store.workspace(data => {
    const song = data.songs.find(s => s.id === songId);
    if (!song) throw new Error('This song no longer exists.');
    const parts = song.parts ?? [];
    song.parts = parts.some(p => p.id === part.id) ? parts.map(p => p.id === part.id ? part : p) : [...parts, part];
    song.updatedAt = new Date().toISOString();
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
    const before = owner.sections;
    owner.sections = change(before).map((section, order) => ({ ...section, order }));
    const removed = before.filter(section => !owner.sections.some(s => s.id === section.id));
    // Future plan references must not become orphaned. Historic snapshots are independent.
    for (const section of removed) for (const collection of [data.routines, data.dailyPlans]) {
      for (const plan of collection) for (const block of plan.blocks) {
        if (block.songId === songId && block.songSectionId === section.id && block.songPartId === partId) {
          block.type = 'song'; block.songSectionId = undefined;
          block.notes = [block.notes, `Earlier section: ${section.name}. ${section.notes}`].filter(Boolean).join('\n');
        }
      }
    }
    song.updatedAt = new Date().toISOString();
    return data;
  });
}
