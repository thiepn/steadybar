import { store } from '../app/store.js';
import { el } from '../ui/dom.js';
import { badge, button, confirmAction, empty, formDialog, formNumber, formText, iconButton, input, link, notify, pageHeader, sectionHeader, select, stat } from '../ui/components.js';
import { editSection, editSong } from '../ui/editors.js';
import { addToday, launchPractice, songBlock } from '../practice/launch.js';
import { duration, formatDate, reorder, titleCase } from '../domain/utils.js';
import { finishedSessions } from '../domain/analytics.js';
export function songsPage() {
    const data = store.snapshot(), search = el('input', { type: 'search', placeholder: 'Search songs or artists…', 'aria-label': 'Search songs' }), status = el('select', { 'aria-label': 'Filter song status' }, [['active', 'All active songs'], ['learning', 'Learning'], ['practicing', 'Practicing'], ['performance-ready', 'Performance-ready'], ['archived', 'Archived']].map(([v, l]) => el('option', { value: v }, l))), list = el('div', { class: 'song-grid' });
    const draw = () => {
        const query = search.value.toLowerCase(), songs = data.songs.filter(s => (status.value === 'active' ? s.status !== 'archived' : s.status === status.value) && `${s.title} ${s.artist}`.toLowerCase().includes(query)).sort((a, b) => a.title.localeCompare(b.title));
        list.replaceChildren();
        if (!songs.length)
            list.append(empty('Make room for your repertoire.', 'Add a song you are learning or preparing. Keep sections, tempos, and arrangement notes together.', button('Add song', () => editSong(), 'primary', 'plus'), 'song'));
        for (const s of songs)
            list.append(el('article', { class: 'song-card' }, el('div', { class: 'split' }, badge(titleCase(s.status), s.status === 'performance-ready' ? 'accent' : 'neutral'), el('span', { class: 'song-tempo' }, `${s.bpm} `, el('small', {}, 'BPM'))), el('h2', {}, link(s.title, `/songs/${s.id}`)), el('p', { class: 'muted' }, s.artist || 'No artist specified'), el('div', { class: 'split' }, el('span', { class: 'muted small' }, `${s.meter.beats}/${s.meter.beatUnit}${s.key ? ` · Key ${s.key}` : ''} · ${s.sections.length} sections`), iconButton(`Practice ${s.title}`, 'play', () => launchPractice([songBlock(s)])))));
    };
    search.addEventListener('input', draw);
    status.addEventListener('change', draw);
    draw();
    return { node: el('div', { class: 'page' }, pageHeader('PLAY THE MUSIC', 'Song library', 'Prepare the sections. Connect the transitions. Know the arrangement.', [button('Add song', () => editSong(), 'primary', 'plus')]), el('div', { class: 'library-toolbar' }, search, status), list) };
}
export function songPage(id) {
    const data = store.snapshot(), song = data.songs.find(s => s.id === id);
    if (!song)
        return { node: empty('Song not found.', 'Your historical practice remains available in History.', link('Songs', '/songs', 'button primary')) };
    const history = finishedSessions(data.sessions).flatMap(s => s.blocks.filter(b => b.sourceSongId === id).map(b => ({ session: s, block: b }))).sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));
    const transition = () => {
        if (song.sections.length < 2) {
            notify('Add at least two sections to practice a transition.', 'info');
            return;
        }
        formDialog('Practice a transition', [
            select('from', 'From section', song.sections.map(s => [s.id, s.name]), song.sections[0].id), select('to', 'To section', song.sections.map(s => [s.id, s.name]), song.sections[1].id), input('minutes', 'Practice duration (minutes)', 5, 'number', { min: 1, max: 1440, required: true }),
            el('p', { class: 'field-hint' }, 'Loop the last bars of the first section into the first bars of the next. This is saved as one continuous practice block.'),
        ], async (form) => {
            const from = song.sections.find(s => s.id === formText(form, 'from')), to = song.sections.find(s => s.id === formText(form, 'to'));
            if (!from || !to || from === to)
                throw new Error('Choose two different sections.');
            const block = songBlock(song, from.id, formNumber(form, 'minutes') * 60);
            block.title = `${song.title} · ${from.name} → ${to.name}`;
            block.notes = `Transition: ${from.name} → ${to.name}.\n${from.notes}\n${to.notes}`.trim();
            await launchPractice([block]);
        }, 'Start transition');
    };
    const page = el('div', { class: 'page' }, link('Song library', '/songs', 'back-link'), pageHeader(song.artist || 'YOUR REPERTOIRE', song.title, `${song.bpm} BPM · ${song.meter.beats}/${song.meter.beatUnit}${song.key ? ` · Key ${song.key}` : ''}`, [button('Edit song', () => editSong(song), 'secondary', 'edit'), button('Practice song', () => launchPractice([songBlock(song)]), 'primary', 'play')]));
    page.append(el('div', { class: 'stats-strip' }, stat('Preparation', titleCase(song.status)), stat('Sections', song.sections.length), stat('Practice time', duration(history.reduce((s, h) => s + h.block.actualActiveSeconds, 0))), stat('Last practiced', history[0] ? formatDate(history[0].session.startedAt) : '—')));
    const sections = el('section', { class: 'panel' }, sectionHeader('The arrangement', undefined, [button('Practice transition', transition, 'ghost', 'arrow'), button('Add section', () => editSection(song), 'secondary', 'plus')]));
    if (!song.sections.length)
        sections.append(empty('Break down the song.', 'Add an intro, verse, chorus, bridge, or any section that needs focused practice.', button('Add first section', () => editSection(song), 'ghost', 'plus'), 'song'));
    let dragIndex = -1;
    song.sections.forEach((s, index) => {
        const move = async (to) => { await store.save('songs', { ...song, sections: reorder(song.sections, index, to).map((s, order) => ({ ...s, order })) }); };
        const up = iconButton(`Move ${s.name} up`, 'up', () => move(index - 1));
        up.disabled = index === 0;
        const down = iconButton(`Move ${s.name} down`, 'down', () => move(index + 1));
        down.disabled = index === song.sections.length - 1;
        const row = el('div', { class: 'section-row', draggable: true, onDragstart: () => { dragIndex = index; }, onDragover: (e) => e.preventDefault(), onDrop: (e) => { e.preventDefault(); if (dragIndex >= 0)
                void store.save('songs', { ...song, sections: reorder(song.sections, dragIndex, index).map((s, order) => ({ ...s, order })) }).catch(error => notify(error instanceof Error ? error.message : 'The section order could not be saved.', 'error')); dragIndex = -1; } }, el('span', { class: 'block-index' }, String(index + 1).padStart(2, '0')), el('div', { class: 'section-info' }, el('strong', {}, s.name), el('div', { class: 'muted small' }, `${s.bars ? `${s.bars} bars · ` : ''}${s.bpmOverride || song.bpm} BPM`), s.notes ? el('p', { class: 'muted small pre-line' }, s.notes) : null), el('div', { class: 'actions' }, iconButton(`Practice ${s.name}`, 'play', () => launchPractice([songBlock(song, s.id)])), iconButton(`Edit ${s.name}`, 'edit', () => editSection(song, s)), up, down, iconButton(`Remove ${s.name}`, 'close', async () => { if (await confirmAction('Remove this section?', `Remove “${s.name}” from the song? Historical practice remains unchanged.`, 'Remove section', true))
            await store.save('songs', { ...song, sections: song.sections.filter(x => x.id !== s.id).map((x, order) => ({ ...x, order })) }); })));
        sections.append(row);
    });
    page.append(sections);
    if (song.notes)
        page.append(el('section', { class: 'panel' }, sectionHeader('Arrangement notes'), el('p', { class: 'pre-line' }, song.notes)));
    const past = el('section', { class: 'panel' }, sectionHeader('Recent song practice'));
    if (!history.length)
        past.append(el('p', { class: 'muted inset' }, 'Finish a song or section session to see your practice here.'));
    else
        past.append(...history.slice(0, 15).map(h => el('div', { class: 'history-block-row' }, link(formatDate(h.session.startedAt), `/history/${h.session.id}`), el('strong', {}, h.block.titleSnapshot), el('span', { class: 'muted' }, duration(h.block.actualActiveSeconds)), h.block.notes ? el('p', { class: 'small muted pre-line' }, h.block.notes) : null)));
    page.append(past, el('div', { class: 'page-footer' }, button('Add song to today', () => addToday(songBlock(song)), 'secondary', 'plus'), button(song.status === 'archived' ? 'Restore song' : 'Archive song', async () => { await store.save('songs', { ...song, status: song.status === 'archived' ? 'learning' : 'archived' }); notify(song.status === 'archived' ? 'Song restored.' : 'Song archived. Practice history is unchanged.'); }, 'ghost', song.status === 'archived' ? 'restart' : 'trash')));
    return { node: page };
}
