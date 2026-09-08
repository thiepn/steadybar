import { store } from '../app/store.js';
import { el } from '../ui/dom.js';
import { badge, button, confirmAction, field, formDialog, formNumber, formText, iconButton, input, notify, pageHeader, sectionHeader, select } from '../ui/components.js';
import { audio } from '../audio/engine.js';
import { defaultAccents, tapTempo } from '../audio/scheduler.js';
import { clampBpm } from '../domain/utils.js';
import { savePreset } from '../ui/editors.js';
export function metronomePage() {
    let config = structuredClone(store.snapshot().settings.metronome), running = false, taps = [], disposed = false;
    let persistTimer;
    const page = el('div', { class: 'page metronome-page' }, pageHeader('THE PULSE', 'Metronome', 'A steady reference. Everything else is your playing.'));
    const status = el('span', { class: 'status-label' }, 'READY'), tempo = el('input', { type: 'number', min: 20, max: 300, step: 1, value: config.bpm, inputmode: 'numeric', class: 'metronome-bpm', 'aria-label': 'BPM' }), slider = el('input', { type: 'range', min: 20, max: 300, step: 1, value: config.bpm, 'aria-label': 'Tempo slider' });
    const signature = el('select', { 'aria-label': 'Time signature' }, ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'].map(m => el('option', { value: m }, m)));
    const subdivision = el('select', { 'aria-label': 'Subdivision' }, [['1', 'Beat · 1 click'], ['2', 'Eighths · 2 clicks'], ['3', 'Triplets · 3 clicks'], ['4', 'Sixteenths · 4 clicks']].map(([v, l]) => el('option', { value: v }, l)));
    const countIn = el('select', { 'aria-label': 'Count-in' }, [['0', 'None'], ['1', '1 bar'], ['2', '2 bars'], ['4', '4 bars']].map(([v, l]) => el('option', { value: v }, l)));
    const volume = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: config.volume, 'aria-label': 'Metronome volume' }), volumeLabel = el('span', { class: 'muted small' }), beats = el('div', { class: 'metronome-beats' }), meterNote = el('p', { class: 'field-hint' }), presets = el('div', { class: 'preset-list' });
    const persist = () => { clearTimeout(persistTimer); persistTimer = setTimeout(() => { void store.settings({ metronome: config }, false).catch(error => notify(error.message, 'error')); }, 200); };
    const apply = (next) => { config = structuredClone(next); if (audio.running)
        audio.update(config); renderControls(); persist(); };
    const setBpm = (bpm) => { config.bpm = clampBpm(bpm); tempo.value = String(config.bpm); slider.value = String(config.bpm); if (audio.running)
        audio.update(config); persist(); };
    const stop = () => { audio.stop(); running = false; status.textContent = 'PAUSED'; play.querySelector('span').textContent = 'Start metronome'; play.setAttribute('aria-pressed', 'false'); Array.from(beats.children).forEach(b => b.classList.remove('on')); };
    const toggle = async () => {
        if (running) {
            stop();
            return;
        }
        await audio.start(config, { onBeat: event => { if (disposed)
                return; status.textContent = event.countingIn ? `COUNT-IN · BAR ${event.bar + 1}` : 'RUNNING'; Array.from(beats.children).forEach((b, i) => b.classList.toggle('on', i === event.beat)); }, onInterrupted: () => { stop(); notify('Audio was suspended. Tap Start to resume.', 'info'); } });
        if (disposed) {
            audio.stop();
            return;
        }
        running = true;
        status.textContent = config.countIn ? 'COUNT-IN' : 'RUNNING';
        play.querySelector('span').textContent = 'Pause metronome';
        play.setAttribute('aria-pressed', 'true');
    };
    const play = button('Start metronome', toggle, 'primary metronome-play', 'play');
    play.setAttribute('aria-pressed', 'false');
    const tap = button('Tap tempo', () => { const result = tapTempo(taps, performance.now()); taps = result.taps; if (result.bpm)
        setBpm(result.bpm); tapCount.textContent = result.bpm ? `${result.bpm} BPM from ${taps.length} taps` : `${taps.length} tap · keep going`; }, 'secondary', 'pulse'), tapCount = el('span', { class: 'muted small' }, 'Tap a steady beat');
    const renderControls = () => {
        if (document.activeElement !== tempo)
            tempo.value = String(config.bpm);
        slider.value = String(config.bpm);
        const meter = `${config.meter.beats}/${config.meter.beatUnit}`;
        if (!Array.from(signature.options).some(o => o.value === meter))
            signature.append(el('option', { value: meter }, `${meter} · custom`));
        signature.value = meter;
        subdivision.value = String(config.subdivision);
        countIn.value = String(config.countIn);
        volume.value = String(config.volume);
        volumeLabel.textContent = `${Math.round(config.volume * 100)}%`;
        meterNote.textContent = `BPM counts ${config.meter.beatUnit === 8 ? 'eighth-note' : 'quarter-note'} beats in ${meter}. Subdivision divides each beat; note names above refer to x/4. Meter and subdivision changes take effect at the next bar.`;
        beats.replaceChildren(...config.accents.map((accent, i) => {
            const b = button(String(i + 1), () => { const next = [...config.accents]; next[i] = ((accent + 2) % 3); apply({ ...config, accents: next }); }, `metronome-beat accent-${accent}`);
            b.setAttribute('aria-label', `Beat ${i + 1}: ${accent === 2 ? 'accent' : accent === 1 ? 'normal' : 'muted'}. Click to change.`);
            b.append(el('small', {}, accent === 2 ? 'accent' : accent === 1 ? 'beat' : 'mute'));
            return b;
        }));
    };
    tempo.addEventListener('change', () => { if (tempo.reportValidity())
        setBpm(Number(tempo.value)); });
    slider.addEventListener('input', () => setBpm(Number(slider.value)));
    signature.addEventListener('change', () => { const [beats, unit] = signature.value.split('/').map(Number); apply({ ...config, meter: { beats: beats || 4, beatUnit: unit === 8 ? 8 : 4 }, accents: defaultAccents(beats || 4, unit || 4) }); });
    subdivision.addEventListener('change', () => apply({ ...config, subdivision: Number(subdivision.value) }));
    countIn.addEventListener('change', () => apply({ ...config, countIn: Number(countIn.value) }));
    volume.addEventListener('input', () => { config.volume = Number(volume.value); volumeLabel.textContent = `${Math.round(config.volume * 100)}%`; if (audio.running)
        audio.update(config); persist(); });
    const customMeter = () => formDialog('Custom time signature', [input('beats', 'Beats per bar', config.meter.beats, 'number', { min: 1, max: 16, step: 1, required: true }), select('unit', 'Beat unit', [['4', 'Quarter note'], ['8', 'Eighth note']], String(config.meter.beatUnit))], async (form) => { const beats = formNumber(form, 'beats'), unit = formText(form, 'unit') === '8' ? 8 : 4; apply({ ...config, meter: { beats, beatUnit: unit }, accents: defaultAccents(beats, unit) }); });
    const main = el('section', { class: 'panel metronome-main' }, status, el('div', { class: 'tempo-display' }, tempo, el('span', { class: 'bpm-unit' }, 'BPM')), beats, el('p', { class: 'muted small accent-help' }, 'Tap a beat to cycle accent → normal → mute.'), el('div', { class: 'standalone-tempo-steps' }, [-10, -5, -1, 1, 5, 10].map(step => button(step > 0 ? `+${step}` : `−${Math.abs(step)}`, () => setBpm(config.bpm + step), 'tempo-step'))), slider, el('div', { class: 'metronome-transport' }, play, el('div', { class: 'tap-tempo' }, tap, tapCount)), el('div', { class: 'metronome-config' }, field('Time signature', signature), field('Subdivision', subdivision), field('Count-in', countIn)), meterNote, el('div', { class: 'volume-row' }, field('Volume', volume), volumeLabel, button('Custom meter', customMeter, 'ghost')));
    const saved = el('aside', { class: 'metronome-side' }, el('section', { class: 'panel' }, sectionHeader('Your presets', undefined, [button('Save current', () => savePreset(config), 'ghost', 'plus')]), presets), el('section', { class: 'panel quiet-panel' }, sectionHeader('Built for keeping time'), el('p', { class: 'muted small' }, 'Sound is scheduled on the Web Audio clock. The visual pulse follows the sound, never the other way around.'), el('p', { class: 'muted small' }, 'Keep this app in the foreground for dependable playback. By default, switching away pauses it.'), el('div', { class: 'keyboard-hints' }, badge('Space · start / pause'), badge('↑ ↓ · ±1 BPM'), badge('Shift + ↑ ↓ · ±5 BPM'))));
    const drawPresets = () => {
        presets.replaceChildren();
        const saved = store.snapshot().metronomePresets;
        if (!saved.length)
            presets.append(el('p', { class: 'muted small inset' }, 'Save a tempo, meter, and accent pattern you return to often.'));
        for (const preset of saved)
            presets.append(el('div', { class: 'preset-row' }, button(preset.name, () => { apply(preset.config); notify('Preset loaded.'); }, 'preset-button'), el('span', { class: 'muted small' }, `${preset.config.bpm} · ${preset.config.meter.beats}/${preset.config.meter.beatUnit}`), iconButton(`Delete preset ${preset.name}`, 'close', async () => { if (await confirmAction('Delete this preset?', `Remove “${preset.name}”?`, 'Delete preset', true))
                await store.delete('metronomePresets', preset.id); })));
    };
    page.append(el('div', { class: 'metronome-grid' }, main, saved));
    renderControls();
    drawPresets();
    const unsubscribe = store.subscribe(drawPresets);
    const key = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
            return;
        const target = event.target;
        if (document.querySelector('dialog[open]') || target.closest('input,textarea,select,[contenteditable=true]'))
            return;
        if (event.code === 'Space' && !target.closest('button,a')) {
            event.preventDefault();
            void toggle().catch(e => notify(e.message, 'error'));
        }
        else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setBpm(config.bpm + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 5 : 1));
        }
    };
    const visibility = () => { if (document.hidden && store.snapshot().settings.pauseWhenHidden && running)
        stop(); };
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return { node: page, cleanup: () => { disposed = true; stop(); clearTimeout(persistTimer); void store.settings({ metronome: config }, false).catch(() => { }); unsubscribe(); window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility); } };
}
