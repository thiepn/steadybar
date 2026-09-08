import { ordered, reorder } from '../domain/utils.js';
import { el } from './dom.js';
import { badge, button, iconButton, notify } from './components.js';
import { editBlock, trainerDialog } from './editors.js';
import { icon } from './icons.js';
export function blockList(blocks, onChange, onStart) {
    const list = el('div', { class: 'block-list' });
    let draggingId = '';
    let current = ordered([...blocks]);
    let pending = Promise.resolve();
    const change = (transform) => {
        const next = ordered(transform(current));
        current = next;
        const task = pending.then(() => onChange(next));
        pending = task.catch(() => { });
        return task;
    };
    const moveById = (id, delta) => change(value => {
        const from = value.findIndex(b => b.id === id);
        return from < 0 ? value : reorder(value, from, from + delta);
    });
    blocks.forEach((block, index) => {
        const title = el('div', { class: 'block-title' }, el('strong', {}, block.title), el('div', { class: 'block-subtitle' }, badge(block.type.replaceAll('-', ' ')), block.tempoTrainer ? badge(`${block.tempoTrainer.mode} trainer`, 'accent') : null, block.notes ? el('span', { class: 'muted small truncate', title: block.notes }, block.notes) : null));
        const minutes = el('input', { type: 'number', value: block.targetSeconds / 60, min: 1 / 60, max: 1440, step: 'any', class: 'inline-number', 'aria-label': `${block.title} duration in minutes` });
        const bpm = el('input', { type: 'number', value: block.bpm, min: 20, max: 300, step: 1, class: 'inline-number', 'aria-label': `${block.title} BPM` });
        const updateInput = async (field, value, control) => {
            if (!control.reportValidity())
                return;
            try {
                await change(rows => rows.map(b => b.id === block.id ? { ...b, [field]: value, ...(field === 'targetSeconds' && b.tempoTrainer?.mode === 'endurance' ? { tempoTrainer: { ...b.tempoTrainer, seconds: value } } : {}) } : b));
            }
            catch (error) {
                notify(error instanceof Error ? error.message : 'The block could not be saved.', 'error');
            }
        };
        minutes.addEventListener('change', () => { void updateInput('targetSeconds', Math.round(Number(minutes.value) * 60), minutes); });
        bpm.addEventListener('change', () => { void updateInput('bpm', Number(bpm.value), bpm); });
        const up = iconButton(`Move ${block.title} up`, 'up', () => moveById(block.id, -1));
        up.disabled = index === 0;
        const down = iconButton(`Move ${block.title} down`, 'down', () => moveById(block.id, 1));
        down.disabled = index === blocks.length - 1;
        const row = el('div', { class: 'block-row', 'data-block-id': block.id }, el('div', { class: 'block-index' }, el('span', {}, String(index + 1).padStart(2, '0')), el('span', { class: 'drag-handle', draggable: true, title: 'Drag to reorder', 'aria-hidden': 'true', onDragstart: (event) => { draggingId = block.id; event.dataTransfer?.setData('text/plain', block.id); row.classList.add('dragging'); }, onDragend: () => row.classList.remove('dragging') }, icon('grip', 16))), title, el('div', { class: 'block-numbers' }, el('label', {}, minutes, el('span', {}, 'min')), el('label', {}, bpm, el('span', {}, 'BPM'))), el('div', { class: 'block-actions' }, onStart ? iconButton(`Practice ${block.title}`, 'play', () => onStart(block)) : null, iconButton(`Edit ${block.title}`, 'edit', () => editBlock(block, async (updated) => change(rows => rows.map(b => b.id === block.id ? updated : b)))), iconButton(`Tempo trainer for ${block.title}`,'progress', () => trainerDialog(block.tempoTrainer, async (config) => change(rows => rows.map(b => b.id === block.id ? { ...b, tempoTrainer: config, ...(config.mode === 'endurance' ? { targetSeconds: config.seconds } : {}) } : b)), block.bpm)), up, down, iconButton(`Remove ${block.title}`, 'close', () => change(rows => rows.filter(b => b.id !== block.id)))));
        row.addEventListener('dragover', event => { event.preventDefault(); if (event.dataTransfer)
            event.dataTransfer.dropEffect = 'move'; });
        row.addEventListener('drop', event => {
            event.preventDefault();
            if (draggingId) {
                const targetId = block.id;
                void change(rows => {
                    const from = rows.findIndex(b => b.id === draggingId), to = rows.findIndex(b => b.id === targetId);
                    return from < 0 || to < 0 ? rows : reorder(rows, from, to);
                }).catch(error => notify(error instanceof Error ? error.message : 'Reordering could not be saved.', 'error'));
            }
            draggingId = '';
        });
        list.append(row);
    });
    list.append(el('div', { class: 'block-add' }, button('Add block', () => editBlock(undefined, async (block) => change(rows => [...rows, block])), 'ghost', 'plus')));
    return list;
}
