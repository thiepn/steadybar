import { store } from '../app/store.js';
import { CATEGORIES } from '../domain/models.js';
import { validateExercise, validateGoal, validateRoutine, validateRoutineBlock, validateSetlist, validateSong, validateTrainer } from '../domain/validation.js';
import { freshBlocks, metadata, titleCase, uuid } from '../domain/utils.js';
import { el } from './dom.js';
import { checkbox, formDialog, formNumber, formText, input, notify, select, textarea } from './components.js';
import { navigate } from '../app/navigation.js';
import { freeBlock } from '../practice/launch.js';
const bpmInput = (name, label, value = 80) => input(name, label, value, 'number', { min: 20, max: 300, step: 1, required: true, inputmode: 'numeric' });
const meterSelect = (meter) => select('meter', 'Time signature', [...new Set(['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8', `${meter.beats}/${meter.beatUnit}`])], `${meter.beats}/${meter.beatUnit}`);
const parseMeter = (data) => { const [beats, beatUnit] = formText(data, 'meter').split('/').map(Number); return { beats: beats || 4, beatUnit: (beatUnit === 8 ? 8 : 4) }; };
export function editExercise(exercise) {
    const e = exercise || { ...metadata(), name: '', instrument: store.snapshot().settings.instrument, category: 'technique', description: '', instructions: '', sticking: '', accents: '', defaultBpm: 80, targetBpm: 120, minBpm: 20, maxBpm: 300, meter: { beats: 4, beatUnit: 4 }, subdivision: 1, tags: [], notes: '', builtin: false, archived: false };
    formDialog(exercise ? 'Edit exercise' : 'New exercise', [
        input('name', 'Name', e.name, 'text', { required: true, maxlength: 200, autofocus: true }),
        el('div', { class: 'form-grid' }, input('instrument', 'Instrument', e.instrument, 'text', { required: true, maxlength: 200 }), select('category', 'Category', CATEGORIES.map(c => [c, titleCase(c)]), e.category)),
        textarea('description', 'Description', e.description, 2), textarea('instructions', 'Practice instructions', e.instructions, 3),
        input('sticking', 'Sticking', e.sticking, 'text', { maxlength: 1000 }), input('accents', 'Accent notes', e.accents, 'text', { maxlength: 1000 }),
        el('div', { class: 'form-grid' }, bpmInput('defaultBpm', 'Starting BPM', e.defaultBpm), input('targetBpm', 'Target clean BPM', e.targetBpm ?? '', 'number', { min: 20, max: 300, step: 1 })),
        el('div', { class: 'form-grid' }, meterSelect(e.meter), select('subdivision', 'Subdivision', [['1', '1 per beat'], ['2', '2 per beat · eighths in x/4'], ['3', '3 per beat · triplets'], ['4', '4 per beat · sixteenths in x/4']], String(e.subdivision))),
        input('tags', 'Tags, separated by commas', e.tags.join(', '), 'text', { maxlength: 2000 }), textarea('notes', 'Personal notes', e.notes),
    ], async (data) => {
        const saved = validateExercise({ ...e, name: formText(data, 'name'), instrument: formText(data, 'instrument'), category: formText(data, 'category'), description: formText(data, 'description'), instructions: formText(data, 'instructions'), sticking: formText(data, 'sticking'), accents: formText(data, 'accents'), defaultBpm: formNumber(data, 'defaultBpm'), targetBpm: formText(data, 'targetBpm') ? formNumber(data, 'targetBpm') : undefined, meter: parseMeter(data), subdivision: formNumber(data, 'subdivision'), tags: formText(data, 'tags').split(',').map(t => t.trim()).filter(Boolean), notes: formText(data, 'notes') });
        await store.save('exercises', saved);
        notify(exercise ? 'Exercise saved.' : 'Exercise created.');
        if (!exercise)
            navigate(`/library/${saved.id}`);
    }, 'Save exercise');
}
export function editRoutine(routine) {
    const r = routine || { ...metadata(), name: '', description: '', blocks: [], scheduledDays: [], tags: [], builtin: false, archived: false };
    formDialog(routine ? 'Routine details' : 'New routine', [
        input('name', 'Name', r.name, 'text', { required: true, maxlength: 200 }), textarea('description', 'Description', r.description),
        el('fieldset', { class: 'weekdays' }, el('legend', {}, 'Optional schedule'), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => checkbox(`day-${i}`, day, r.scheduledDays.includes(i)))),
        input('tags', 'Tags, separated by commas', r.tags.join(', ')),
    ], async (data) => {
        const saved = validateRoutine({ ...r, name: formText(data, 'name'), description: formText(data, 'description'), tags: formText(data, 'tags').split(',').map(t => t.trim()).filter(Boolean), scheduledDays: [0, 1, 2, 3, 4, 5, 6].filter(i => data.has(`day-${i}`)) });
        await store.save('routines', saved);
        notify('Routine saved.');
        if (!routine)
            navigate(`/routines/${saved.id}`);
    }, 'Save routine');
}
export async function duplicateRoutine(routine) { const copy = { ...structuredClone(routine), ...metadata(), name: `${routine.name} (copy)`, blocks: freshBlocks(routine.blocks), builtin: false, archived: false }; await store.save('routines', copy); notify('Routine duplicated.'); navigate(`/routines/${copy.id}`); }
export function editSong(song) {
    const s = song || { ...metadata(), title: '', artist: '', bpm: 80, meter: { beats: 4, beatUnit: 4 }, key: '', difficulty: 2, status: 'learning', notes: '', sections: [] };
    formDialog(song ? 'Edit song' : 'New song', [
        input('title', 'Title', s.title, 'text', { required: true, maxlength: 200 }), input('artist', 'Artist', s.artist, 'text', { maxlength: 200 }),
        el('div', { class: 'form-grid' }, bpmInput('bpm', 'BPM', s.bpm), meterSelect(s.meter)),
        el('div', { class: 'form-grid' }, input('key', 'Key', s.key, 'text', { maxlength: 40, placeholder: 'e.g. G' }), select('difficulty', 'Difficulty', [['1', '1 · Easy'], ['2', '2'], ['3', '3 · Moderate'], ['4', '4'], ['5', '5 · Challenging']], String(s.difficulty))),
        select('status', 'Preparation status', [['learning', 'Learning'], ['practicing', 'Practicing'], ['performance-ready', 'Performance-ready'], ['archived', 'Archived']], s.status),
        textarea('notes', 'Arrangement / practice notes', s.notes),
    ], async (data) => {
        const saved = validateSong({ ...s, title: formText(data, 'title'), artist: formText(data, 'artist'), bpm: formNumber(data, 'bpm'), meter: parseMeter(data), key: formText(data, 'key'), difficulty: formNumber(data, 'difficulty'), status: formText(data, 'status'), notes: formText(data, 'notes') });
        await store.save('songs', saved);
        notify('Song saved.');
        if (!song)
            navigate(`/songs/${saved.id}`);
    }, 'Save song');
}
export function editSection(song, section) {
    const s = section || { id: uuid(), name: '', bars: 8, notes: '', order: song.sections.length };
    formDialog(section ? 'Edit section' : 'New song section', [
        input('name', 'Section name', s.name, 'text', { required: true, maxlength: 200, placeholder: 'e.g. Bridge' }),
        el('div', { class: 'form-grid' }, input('bars', 'Bars', s.bars ?? '', 'number', { min: 1, max: 1000, step: 1 }), input('bpm', 'BPM override', s.bpmOverride ?? '', 'number', { min: 20, max: 300, step: 1, placeholder: String(song.bpm) })),
        textarea('notes', 'Section notes', s.notes),
    ], async (data) => {
        const saved = { ...s, name: formText(data, 'name'), bars: formText(data, 'bars') ? formNumber(data, 'bars') : undefined, bpmOverride: formText(data, 'bpm') ? formNumber(data, 'bpm') : undefined, notes: formText(data, 'notes') };
        const latest = store.snapshot().songs.find(x => x.id === song.id) || song;
        const updated = validateSong({ ...latest, sections: section ? latest.sections.map(x => x.id === s.id ? saved : x) : [...latest.sections, saved] });
        await store.save('songs', updated);
        notify('Section saved.');
    }, 'Save section');
}
export function editSetlist(setlist) {
    const s = setlist || { ...metadata(), name: '', songIds: [], notes: '' };
    formDialog(setlist ? 'Setlist details' : 'New setlist', [
        input('name', 'Name', s.name, 'text', { required: true, maxlength: 200, placeholder: 'e.g. Sunday Worship' }), input('date', 'Performance date', s.date || '', 'date'), textarea('notes', 'Set notes', s.notes),
    ], async (data) => { const saved = validateSetlist({ ...s, name: formText(data, 'name'), date: formText(data, 'date') || undefined, notes: formText(data, 'notes') }); await store.save('setlists', saved); notify('Setlist saved.'); if (!setlist)
        navigate(`/setlists/${saved.id}`); }, 'Save setlist');
}
export function editGoal(goal) {
    const data = store.snapshot();
    const g = goal || { ...metadata(), type: 'bpm', title: '', description: '', targetValue: 120, unit: 'BPM', completed: false };
    const typeField = select('type', 'Goal type', [['bpm', 'Clean BPM'], ['weekly-sessions', 'Weekly sessions'], ['song-mastery', 'Song preparation'], ['custom', 'Custom goal']], g.type);
    const exField = select('exerciseId', 'Exercise', data.exercises.filter(e => !e.archived).map(e => [e.id, e.name]), g.exerciseId || data.exercises[0]?.id || '');
    const songField = select('songId', 'Song', data.songs.filter(s => s.status !== 'archived').map(s => [s.id, s.title]), g.songId || data.songs[0]?.id || '');
    const target = input('targetValue', 'Target', g.targetValue, 'number', { min: 1, max: 300, step: 1, required: true });
    const update = () => { const type = typeField.querySelector('select').value; exField.hidden = type !== 'bpm'; songField.hidden = type !== 'song-mastery'; target.hidden = !['bpm', 'weekly-sessions'].includes(type); target.querySelector('input').required = !target.hidden; if (!goal)
        target.querySelector('input').value = type === 'weekly-sessions' ? '4' : '120'; };
    typeField.addEventListener('change', update);
    update();
    formDialog(goal ? 'Edit goal' : 'New goal', [
        input('title', 'Goal title', g.title, 'text', { required: true, maxlength: 200, placeholder: 'e.g. Relaxed doubles at 120 BPM' }), typeField, exField, songField, target,
        input('deadline', 'Target date (optional)', g.deadline || '', 'date'), textarea('description', 'Why this matters', g.description),
        el('p', { class: 'field-hint' }, 'BPM goals use clean or effortless attempts. A BPM percentage measures tempo, not mastery. Weekly goals reset each Monday.'),
    ], async (form) => {
        const type = formText(form, 'type');
        if (type === 'song-mastery' && !formText(form, 'songId'))
            throw new Error('Add a song before creating a song-preparation goal.');
        if (type === 'bpm' && !formText(form, 'exerciseId'))
            throw new Error('Select an exercise for this BPM goal.');
        const saved = validateGoal({ ...g, title: formText(form, 'title'), type, exerciseId: type === 'bpm' ? formText(form, 'exerciseId') : undefined, songId: type === 'song-mastery' ? formText(form, 'songId') : undefined, targetValue: ['bpm', 'weekly-sessions'].includes(type) ? formNumber(form, 'targetValue') : 1, unit: type === 'bpm' ? 'BPM' : type === 'weekly-sessions' ? 'sessions' : '', deadline: formText(form, 'deadline') || undefined, description: formText(form, 'description') });
        if (type === 'bpm' && (saved.targetValue < 20 || saved.targetValue > 300))
            throw new Error('A BPM target must be between 20 and 300.');
        await store.save('goals', saved);
        notify('Goal saved.');
    }, 'Save goal');
}
export function editBlock(block, onSave) {
    const b = block || freeBlock();
    const data = store.snapshot();
    const typeSelect = select('type', 'Block type', [['exercise', 'Exercise'], ['song', 'Entire song'], ['song-section', 'Song section'], ['free', 'Free practice']], block ? b.type : 'exercise');
    const source = el('div');
    const title = input('title', 'Block title', b.title, 'text', { maxlength: 200 });
    const tempo = bpmInput('bpm', 'Starting BPM', b.bpm);
    const drawSources = () => {
        const type = typeSelect.querySelector('select').value;
        source.replaceChildren();
        title.hidden = type !== 'free';
        title.querySelector('input').required = type === 'free';
        if (type === 'exercise') {
            const options = data.exercises.filter(e => !e.archived || e.id === b.exerciseId), chosen = b.exerciseId || options[0]?.id || '';
            const selection = select('exerciseId', 'Exercise', options.map(e => [e.id, e.name]), chosen);
            source.append(selection);
            selection.addEventListener('change', () => { const e = data.exercises.find(e => e.id === selection.querySelector('select').value); if (e)
                tempo.querySelector('input').value = String(e.defaultBpm); });
            if (!block && options[0])
                tempo.querySelector('input').value = String(options[0].defaultBpm);
        }
        if (type === 'song' || type === 'song-section') {
            const options = data.songs.filter(s => s.status !== 'archived' || s.id === b.songId), chosen = b.songId || options[0]?.id || '';
            const selection = select('songId', 'Song', options.map(s => [s.id, s.title]), chosen), sections = el('div');
            const drawSections = () => { const song = data.songs.find(s => s.id === selection.querySelector('select').value); sections.replaceChildren(); if (type === 'song-section')
                sections.append(select('songSectionId', 'Section', (song?.sections || []).map(s => [s.id, s.name]), b.songSectionId || song?.sections[0]?.id || '')); };
            source.append(selection, sections);
            selection.addEventListener('change', () => { drawSections(); const song = data.songs.find(s => s.id === selection.querySelector('select').value); if (song)
                tempo.querySelector('input').value = String(song.bpm); });
            drawSections();
            if (!options.length)
                source.append(el('p', { class: 'field-hint' }, 'Add a song in Songs first, or use a free-practice block.'));
        }
    };
    typeSelect.addEventListener('change', drawSources);
    drawSources();
    formDialog(block ? 'Edit practice block' : 'Add practice block', [
        typeSelect, source, title,
        el('div', { class: 'form-grid' }, input('minutes', 'Duration (minutes)', b.targetSeconds / 60, 'number', { min: 1 / 60, max: 1440, step: 'any', required: true }), tempo), textarea('notes', 'Practice cue', b.notes),
    ], async (form) => {
        const type = formText(form, 'type'), exercise = data.exercises.find(e => e.id === formText(form, 'exerciseId')), song = data.songs.find(s => s.id === formText(form, 'songId')), section = song?.sections.find(s => s.id === formText(form, 'songSectionId'));
        if (type === 'exercise' && !exercise)
            throw new Error('Choose an exercise.');
        if ((type === 'song' || type === 'song-section') && !song)
            throw new Error('Choose a song.');
        if (type === 'song-section' && !section)
            throw new Error('Choose an existing song section.');
        const saved = validateRoutineBlock({ ...b, type, exerciseId: type === 'exercise' ? exercise?.id : undefined, songId: type === 'song' || type === 'song-section' ? song?.id : undefined, songSectionId: type === 'song-section' ? section?.id : undefined, title: type === 'free' ? formText(form, 'title') : exercise?.name || `${song?.title}${section ? ` · ${section.name}` : ''}`, targetSeconds: Math.round(formNumber(form, 'minutes') * 60), bpm: formNumber(form, 'bpm'), notes: formText(form, 'notes') });
        await onSave(saved);
    }, block ? 'Save block' : 'Add block');
}
export function trainerDialog(initial, onSave, bpm = 80) {
    const mode = select('mode', 'Training mode', [['progressive', 'Progressive · timed increases'], ['repetition', 'Repetition · clean rounds'], ['ladder', 'Ladder · tempo stages'], ['endurance', 'Endurance · steady tempo']], initial?.mode || 'progressive');
    const settings = el('div');
    const render = () => {
        const m = mode.querySelector('select').value;
        settings.replaceChildren();
        if (m === 'progressive' || m === 'repetition') {
            const c = initial?.mode === m ? initial : undefined;
            settings.append(el('div', { class: 'form-grid' }, bpmInput('start', 'Start BPM', c?.start || bpm), bpmInput('max', 'Maximum BPM', c?.max || Math.max(120, bpm))), el('div', { class: 'form-grid' }, input('step', 'Increase by (BPM)', c?.step || 5, 'number', { min: 1, max: 100, step: 1, required: true }), m === 'progressive' ? input('seconds', 'Every (active seconds)', initial?.mode === 'progressive' ? initial.seconds : 120, 'number', { min: 1, max: 86400, step: 1, required: true }) : input('rounds', 'After clean rounds', initial?.mode === 'repetition' ? initial.rounds : 3, 'number', { min: 1, max: 100, step: 1, required: true })));
        }
        else if (m === 'ladder')
            settings.append(input('bpms', 'Ladder BPMs, separated by commas', initial?.mode === 'ladder' ? initial.bpms.join(', ') : '80, 90, 100, 110, 100, 90, 80', 'text', { required: true }), input('seconds', 'Stage duration (seconds)', initial?.mode === 'ladder' ? initial.seconds : 60, 'number', { min: 1, max: 86400, step: 1, required: true }));
        else
            settings.append(el('div', { class: 'form-grid' }, bpmInput('bpm', 'Hold BPM', initial?.mode === 'endurance' ? initial.bpm : bpm), input('seconds', 'Target duration (seconds)', initial?.mode === 'endurance' ? initial.seconds : 600, 'number', { min: 1, max: 86400, step: 1, required: true })));
    };
    mode.addEventListener('change', render);
    render();
    formDialog('Tempo trainer', [mode, settings, el('p', { class: 'field-hint' }, 'Pausing freezes the trainer. Progressive and repetition modes hold at the maximum. The ladder holds its final stage; it never loops unexpectedly.')], async (form) => {
        const m = formText(form, 'mode');
        let config;
        if (m === 'progressive' || m === 'repetition')
            config = { mode: m, start: formNumber(form, 'start'), max: formNumber(form, 'max'), step: formNumber(form, 'step'), ...(m === 'progressive' ? { seconds: formNumber(form, 'seconds') } : { rounds: formNumber(form, 'rounds') }) };
        else if (m === 'ladder')
            config = { mode: m, bpms: formText(form, 'bpms').split(',').map(v => Number(v.trim())), seconds: formNumber(form, 'seconds') };
        else
            config = { mode: m, bpm: formNumber(form, 'bpm'), seconds: formNumber(form, 'seconds') };
        await onSave(validateTrainer(config));
    }, 'Use trainer');
}
export function savePreset(config) { formDialog('Save metronome preset', [input('name', 'Preset name', '', 'text', { required: true, maxlength: 200 })], async (form) => { await store.save('metronomePresets', { ...metadata(), name: formText(form, 'name'), config: structuredClone(config) }); notify('Preset saved.'); }, 'Save preset'); }
export function selectRoutineDialog(onChoose) {
    const routines = store.snapshot().routines.filter(r => !r.archived);
    formDialog('Choose a routine', [select('routine', 'Routine', routines.map(r => [r.id, r.name]), routines[0]?.id || '')], async (form) => { const selected = routines.find(r => r.id === formText(form, 'routine')); if (!selected)
        throw new Error('Create a routine first.'); await onChoose(selected); }, 'Use routine');
}
export function selectSongDialog(onChoose, exclude = []) {
    const songs = store.snapshot().songs.filter(s => s.status !== 'archived' && !exclude.includes(s.id));
    if (!songs.length) {
        notify('Add another song to your library first.', 'info');
        return;
    }
    formDialog('Add a song', [select('song', 'Song', songs.map(s => [s.id, s.title]), songs[0]?.id || '')], async (form) => { const selected = songs.find(s => s.id === formText(form, 'song')); if (!selected)
        throw new Error('Choose a song.'); await onChoose(selected); }, 'Add song');
}
