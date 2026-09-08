import type { Song } from '../domain/models.js';
import type { SongPart } from '../domain/practice-types.js';
import { activeProfile, capabilities, definition } from '../domain/profiles.js';
import { validateSongPart } from '../domain/practice-validation.js';
import { uuid } from '../domain/utils.js';
import { store } from '../app/store.js';
import { saveSongPart } from '../app/song-parts.js';
import { formDialog, input, textarea, select, formText, formNumber, notify } from './components.js';
import { el } from './dom.js';

export function editSongPart(song: Song, initial?: SongPart): void {
  const profile = store.snapshot().profiles?.find(p => p.id === initial?.profileId) ?? activeProfile(store.snapshot());
  const cap = capabilities(profile);
  const part: SongPart = initial ?? { id: uuid(), profileId: profile.id, instrumentType: profile.instrumentType,
    name: `${profile.name} part`, notes: '', key: song.key, status: 'learning', tuning: '', role: '', range: '', sections: [] };
  const roleLabel = cap.includes('voice') ? 'Melody / harmony responsibility' : cap.includes('hands') ? 'Voicing / hand assignments' : profile.instrumentType === 'bass' ? 'Groove / harmonic role' : cap.includes('sticking') ? 'Groove / fill cues' : 'Arrangement role';
  const role=textarea('role',roleLabel,part.role,2);role.querySelector('textarea')!.maxLength=200;
  formDialog(initial ? 'Edit song part' : 'New song part', [
    el('p', { class: 'field-hint' }, `${profile.name} · ${definition(profile.instrumentType).label}`),
    input('name', 'Part name', part.name, 'text', { required: true, maxlength: 200 }),
    el('div', { class: 'form-grid' }, input('key', 'Part key', part.key, 'text', { maxlength: 40 }),
      select('status', 'Part readiness', [['learning', 'Learning'], ['practicing', 'Practicing'], ['performance-ready', 'Performance-ready']], part.status)),
    cap.includes('fretboard') ? el('div', { class: 'form-grid' }, input('tuning', 'Tuning', part.tuning, 'text', { maxlength: 200 }), input('capo', 'Capo (optional)', part.capo ?? '', 'number', { min: 0, max: 12, step: 1 })) : null,
    cap.includes('voice') ? input('range', 'Comfortable part range / breath marks', part.range, 'text', { maxlength: 100 }) : null,
    role, textarea('notes', 'Part practice notes', part.notes, 3),
    el('p', { class: 'field-hint' }, 'This part has its own sections and readiness. Shared song details and other profiles remain unchanged.'),
  ], async form => {
    const latest = store.snapshot().songs.find(s => s.id === song.id)?.parts?.find(p => p.id === part.id);
    const saved = validateSongPart({ ...part, sections: latest?.sections ?? part.sections, name: formText(form, 'name'), key: formText(form, 'key'), status: formText(form, 'status'), notes: formText(form, 'notes'), role: formText(form, 'role'), tuning: cap.includes('fretboard') ? formText(form, 'tuning') : part.tuning, capo: form.has('capo') && formText(form, 'capo') ? formNumber(form, 'capo') : undefined, range: cap.includes('voice') ? formText(form, 'range') : part.range });
    await saveSongPart(song.id, saved); notify('Song part saved.');
  }, 'Save part');
}
