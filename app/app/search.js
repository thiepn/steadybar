import { store } from './store.js';
import { navigate } from './navigation.js';
import { el } from '../ui/dom.js';
import { button, dialog } from '../ui/components.js';
import { editExercise, editGoal, editRoutine, editSetlist, editSong } from '../ui/editors.js';
import { exportBackup } from '../db/backup.js';
import { icon } from '../ui/icons.js';
export function openSearch() {
    if (document.querySelector('dialog[open]'))
        return;
    const data = store.snapshot(), query = el('input', { type: 'search', placeholder: 'Find an exercise, song, routine, or action…', 'aria-label': 'Search everything', autocomplete: 'off', class: 'command-input' }), results = el('div', { class: 'command-results', role: 'list', 'aria-label': 'Search results' });
    const items = [
        { label: 'Start practice', type: 'Command', icon: 'play', action: () => navigate('/practice') }, { label: 'Open metronome', type: 'Command', icon: 'pulse', action: () => navigate('/metronome') },
        { label: 'New exercise', type: 'Command', icon: 'plus', action: () => editExercise() }, { label: 'New routine', type: 'Command', icon: 'plus', action: () => editRoutine() }, { label: 'New song', type: 'Command', icon: 'plus', action: () => editSong() }, { label: 'New setlist', type: 'Command', icon: 'plus', action: () => editSetlist() }, { label: 'New goal', type: 'Command', icon: 'plus', action: () => editGoal() },
        { label: 'Open progress', type: 'Command', icon: 'progress', action: () => navigate('/progress') }, { label: 'Open settings', type: 'Command', icon: 'settings', action: () => navigate('/settings') }, { label: 'Export backup', type: 'Command', icon: 'download', action: exportBackup },
        ...data.exercises.filter(e => !e.archived).map(e => ({ label: e.name, type: 'Exercise', icon: 'library', action: () => navigate(`/library/${e.id}`) })),
        ...data.songs.filter(s => s.status !== 'archived').map(s => ({ label: s.title, type: 'Song', icon: 'song', action: () => navigate(`/songs/${s.id}`) })),
        ...data.routines.filter(r => !r.archived).map(r => ({ label: r.name, type: 'Routine', icon: 'routine', action: () => navigate(`/routines/${r.id}`) })),
        ...data.setlists.map(s => ({ label: s.name, type: 'Setlist', icon: 'setlist', action: () => navigate(`/setlists/${s.id}`) })),
        ...data.goals.map(g => ({ label: g.title, type: 'Goal', icon: 'goal', action: () => navigate('/goals') })),
    ];
    let selected = 0;
    let buttons = [];
    const handle = dialog('Find your next action', [query, results, el('p', { class: 'command-hint muted tiny' }, '↑ ↓ to move · Enter to open · Esc to close')]);
    handle.dialog.classList.add('command-dialog');
    const highlight = () => buttons.forEach((b, i) => { b.classList.toggle('highlighted', i === selected); if (i === selected)
        b.scrollIntoView({ block: 'nearest' }); });
    const render = () => {
        const q = query.value.trim().toLowerCase(), filtered = items.filter(item => `${item.label} ${item.type}`.toLowerCase().includes(q)).slice(0, 30);
        selected = 0;
        results.replaceChildren();
        buttons = filtered.map(item => {
            const b = button(item.label, async () => { handle.close(); await item.action(); }, 'command-item');
            b.prepend(icon(item.icon));
            b.append(el('small', {}, item.type));
            results.append(el('div', { role: 'listitem' }, b));
            return b;
        });
        if (!filtered.length)
            results.append(el('p', { class: 'muted inset' }, 'No results. Try another name or command.'));
        highlight();
    };
    query.addEventListener('input', render);
    handle.dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            selected = Math.max(0, Math.min(buttons.length - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
            highlight();
        }
        if (event.key === 'Enter' && document.activeElement === query) {
            event.preventDefault();
            buttons[selected]?.click();
        }
    });
    render();
    query.focus();
}
