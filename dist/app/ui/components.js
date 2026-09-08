import { el } from './dom.js';
import { icon } from './icons.js';
import { errorMessage, uuid } from '../domain/utils.js';
export function notify(message, kind = 'success') {
    const root = document.querySelector('#notifications');
    if (!root)
        return;
    const note = el('div', { class: `toast ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, icon(kind === 'error' ? 'help' : kind === 'success' ? 'check' : 'note'), el('span', {}, message));
    const close = el('button', { class: 'icon-button', type: 'button', 'aria-label': 'Dismiss notification', onClick: () => note.remove() }, icon('close', 16));
    if (kind !== 'error')
        for (const previous of root.querySelectorAll('.toast:not(.error)'))
            previous.remove();
    note.append(close);
    root.append(note);
    setTimeout(() => note.remove(), kind === 'error' ? 14000 : 3500);
}
export function button(label, action, variant = 'secondary', symbol) {
    const b = el('button', { type: 'button', class: `button ${variant}` }, symbol ? icon(symbol) : null, el('span', {}, label));
    b.addEventListener('click', async () => {
        b.disabled = true;
        b.setAttribute('aria-busy', 'true');
        try {
            await action();
        }
        catch (error) {
            notify(errorMessage(error), 'error');
        }
        finally {
            b.disabled = false;
            b.removeAttribute('aria-busy');
        }
    });
    return b;
}
export function iconButton(label, symbol, action) { const b = button(label, action, 'icon-button', symbol); b.title = label; b.setAttribute('aria-label', label); b.querySelector('span')?.remove(); return b; }
export function link(label, path, variant = 'text-link', symbol) { return el('a', { href: `#${path}`, class: variant }, symbol ? icon(symbol) : null, label); }
export const badge = (text, variant = 'neutral') => el('span', { class: `badge ${variant}` }, text);
export function pageHeader(eyebrow, title, description, actions = []) { return el('header', { class: 'page-heading' }, el('div', {}, el('div', { class: 'eyebrow' }, eyebrow), el('h1', {}, title), el('p', {}, description)), el('div', { class: 'actions' }, actions)); }
export function sectionHeader(title, meta, actions = []) { return el('div', { class: 'section-heading' }, el('div', { class: 'section-title' }, el('h2', {}, title), meta ? el('span', { class: 'muted small' }, meta) : null), el('div', { class: 'actions' }, actions)); }
export function empty(title, description, action, symbol = 'routine') { return el('div', { class: 'empty-state' }, el('div', { class: 'empty-icon' }, icon(symbol, 25)), el('h3', {}, title), el('p', {}, description), action); }
export function stat(label, value, detail) { return el('div', { class: 'stat' }, el('span', { class: 'label' }, label), el('strong', { class: 'stat-value' }, value), detail ? el('span', { class: 'muted small' }, detail) : null); }
export function field(label, control, hint) {
    const id = control.id || `field-${uuid()}`;
    control.id = id;
    if (hint)
        control.setAttribute('aria-describedby', `${id}-hint`);
    return el('div', { class: 'field' }, el('label', { for: id }, label), control, hint ? el('small', { id: `${id}-hint`, class: 'field-hint' }, hint) : null);
}
export function input(name, label, value = '', type = 'text', attrs = {}) { return field(label, el('input', { name, type, value, ...attrs })); }
export function textarea(name, label, value = '', rows = 3) { return field(label, el('textarea', { name, rows, maxlength: 10000 }, value)); }
export function select(name, label, options, value, hint) {
    const control = el('select', { name }, options.map(option => { const [v, text] = Array.isArray(option) ? option : [option, option]; return el('option', { value: v, selected: v === value }, text); }));
    return field(label, control, hint);
}
export function checkbox(name, label, checked = false) { return el('label', { class: 'checkbox' }, el('input', { type: 'checkbox', name, checked }), el('span', {}, label)); }
export function progressBar(fraction, label) { return el('div', { class: 'progress-track', role: 'progressbar', 'aria-label': label, 'aria-valuenow': Math.round(Math.min(1, Math.max(0, fraction)) * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('div', { class: 'progress-fill', style: `width:${Math.min(1, Math.max(0, fraction)) * 100}%` })); }
export function dialog(title, content, footer = [], onClosed) {
    const before = document.activeElement;
    const headingId = `dialog-${uuid()}`;
    const d = el('dialog', { 'aria-labelledby': headingId, class: 'dialog' });
    let closing = false;
    const close = () => { if (closing)
        return; closing = true; d.close(); d.remove(); if (before?.isConnected)
        before.focus(); onClosed?.(); };
    const closeButton = iconButton('Close dialog', 'close', close);
    d.append(el('div', { class: 'dialog-header' }, el('h2', { id: headingId }, title), closeButton), el('div', { class: 'dialog-content' }, content));
    if (footer.length)
        d.append(el('div', { class: 'dialog-footer' }, footer));
    d.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.querySelector('#dialogs').append(d);
    d.showModal();
    const target = d.querySelector('[autofocus],input:not([type=hidden]),select,textarea');
    (target || closeButton).focus();
    return { dialog: d, close };
}
export async function confirmAction(title, description, confirm = 'Confirm', danger = false) {
    return new Promise(resolve => {
        let settled = false;
        const settle = (value) => { if (settled)
            return; settled = true; resolve(value); handle.close(); };
        const handle = dialog(title, [el('p', {}, description)], [button('Cancel', () => settle(false)), button(confirm, () => settle(true), danger ? 'danger' : 'primary')], () => { if (!settled)
            resolve(false); });
    });
}
export function formDialog(title, children, onSave, submitLabel = 'Save') {
    let dirty = false, saving = false;
    const form = el('form', { class: 'form' }, children), error = el('p', { class: 'form-error', role: 'alert' });
    const save = el('button', { type: 'submit', class: 'button primary' }, submitLabel);
    const attemptClose = async () => { if (saving)
        return; if (!dirty || await confirmAction('Discard unsaved changes?', 'Your edits have not been saved.', 'Discard changes', true))
        handle.close(); };
    const handle = dialog(title, [form]);
    const oldClose = handle.dialog.querySelector('.dialog-header button');
    oldClose?.replaceWith(iconButton('Close dialog', 'close', attemptClose));
    handle.dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopImmediatePropagation(); void attemptClose(); }, true);
    form.append(error, el('div', { class: 'form-actions' }, button('Cancel', attemptClose), save));
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('change', () => { dirty = true; });
    const unload = (event) => { if (dirty) {
        event.preventDefault();
        event.returnValue = '';
    } };
    window.addEventListener('beforeunload', unload);
    handle.dialog.addEventListener('close', () => window.removeEventListener('beforeunload', unload));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.reportValidity() || saving)
            return;
        error.textContent = '';
        save.disabled = true;
        saving = true;
        try {
            await onSave(new FormData(form), form);
            dirty = false;
            handle.close();
        }
        catch (e) {
            error.textContent = errorMessage(e);
            error.scrollIntoView({ block: 'nearest' });
        }
        finally {
            save.disabled = false;
            saving = false;
        }
    });
}
export const formText = (data, name) => String(data.get(name) ?? '').trim();
export const formNumber = (data, name) => Number(formText(data, name));
