import { store } from '../app/store.js';
import { navigate } from '../app/navigation.js';
import { el } from '../ui/dom.js';
import { button, confirmAction, empty, field, formDialog, formText, link, notify, pageHeader, sectionHeader, textarea } from '../ui/components.js';
import { selectRoutineDialog, trainerDialog } from '../ui/editors.js';
import { exerciseBlock, freeBlock, launchPractice } from '../practice/launch.js';
import { practice } from '../practice/controller.js';
import { duration, clock, localDate } from '../domain/utils.js';
import { RATINGS } from '../domain/models.js';
import { trainerLabel } from '../domain/trainer.js';
import { routineDuration } from '../domain/analytics.js';
import { sessionPage } from './history.js';
export function practicePage() {
    const data = store.snapshot(), plan = data.dailyPlans.find(p => p.date === localDate()), active = data.sessions.find(s => s.status === 'active');
    const page = el('div', { class: 'page practice-launcher' }, pageHeader('STEP UP TO THE INSTRUMENT', 'What are we practicing?', 'Start with a plan, one exercise, or a little space to explore.'));
    if (active)
        page.append(el('div', { class: 'recovery-banner' }, el('div', {}, el('strong', {}, 'An unfinished session is saved.'), el('span', {}, active.blocks[active.activeBlockIndex]?.titleSnapshot)), link('Resume session', '/practice/active', 'button primary', 'play')));
    const planned = el('section', { class: 'panel launcher-plan' }, sectionHeader('Today’s session', `${plan?.blocks.length || 0} blocks · ${duration(routineDuration(plan?.blocks || []))}`));
    if (plan?.blocks.length)
        planned.append(el('ol', { class: 'launch-sequence' }, plan.blocks.map(b => el('li', {}, el('span', {}, b.title), el('span', { class: 'muted' }, `${duration(b.targetSeconds)} · ${b.bpm} BPM`)))), button('Start today’s plan', () => launchPractice(plan.blocks, { planId: plan.id }), 'primary', 'play'));
    else
        planned.append(empty('No plan for today yet.', 'Choose a routine or start with a single exercise.', link('Plan today', '/', 'button secondary', 'today')));
    const minutes = el('input', { type: 'number', value: 10, min: 1, max: 1440, step: 1, 'aria-label': 'Free practice duration in minutes' }), bpm = el('input', { type: 'number', value: data.settings.metronome.bpm, min: 20, max: 300, step: 1, 'aria-label': 'Free practice BPM' });
    const free = el('section', { class: 'panel' }, sectionHeader('Free practice'), el('p', { class: 'muted' }, 'A timer, a metronome, and room to work. No exercise required.'), el('div', { class: 'form-grid' }, field('Minutes', minutes), field('BPM', bpm)), button('Start free practice', async () => { if (minutes.reportValidity() && bpm.reportValidity())
        await launchPractice([freeBlock(Number(minutes.value) * 60, Number(bpm.value))]); }, 'primary', 'play'));
    page.append(el('div', { class: 'two-column' }, planned, free), el('div', { class: 'launcher-options' }, link('Choose an exercise', '/library', 'launcher-option', 'library'), button('Use a routine', () => selectRoutineDialog(r => launchPractice(r.blocks, { routineId: r.id })), 'launcher-option', 'routine'), link('Practice a song', '/songs', 'launcher-option', 'song'), link('Just the metronome', '/metronome', 'launcher-option', 'pulse')));
    const recentExercises = data.exercises.filter(e => !e.archived).filter(e => ['rudiment-1', 'rudiment-2', 'rudiment-3'].includes(e.id));
    if (data.settings.instrument === 'Drums')
        page.append(el('section', { class: 'panel' }, sectionHeader('A good place to begin'), el('div', { class: 'quick-exercises' }, recentExercises.map(e => button(e.name, () => launchPractice([exerciseBlock(e)]), 'quick-exercise', 'play')))));
    return { node: page };
}
export function activePracticePage() {
    const active = practice.session;
    if (!active)
        return { node: empty('Ready for a session?', 'Choose something to practice first.', link('Open practice', '/practice', 'button primary', 'play')) };
    if (active.status !== 'active')
        return sessionPage(active.id, true);
    if (practice.external)
        return { node: empty('Practice is running in another tab.', 'Pause it in the other tab, then reload here. This protects your time and prevents duplicate metronomes.', button('Check again', async () => { await practice.recover(); navigate('/practice/active'); }, 'primary', 'restart')) };
    let focus = store.snapshot().settings.defaultFocus;
    const page = el('div', { class: `active-page ${focus ? 'focused' : ''}` }), body = el('div', { class: 'active-grid' });
    const title = el('h1', { class: 'active-title' }), sticking = el('p', { class: 'active-sticking sticking' }), status = el('span', { class: 'status-label' }), blockNumber = el('span', { class: 'eyebrow' }), error = el('div', { class: 'practice-error', role: 'alert', hidden: true });
    const tempo = el('input', { type: 'number', min: 20, max: 300, step: 1, value: active.runtime.bpm, inputmode: 'numeric', class: 'active-bpm', 'aria-label': 'BPM' });
    tempo.addEventListener('change', async () => { if (!tempo.reportValidity())
        return; try {
        await practice.setBpm(Number(tempo.value));
    }
    catch (e) {
        notify(e instanceof Error ? e.message : 'Tempo could not be saved.', 'error');
    } });
    const time = el('span', { class: 'active-time', 'aria-label': 'Elapsed active time' }), target = el('span', { class: 'timer-target' }), fill = el('div', { class: 'progress-fill' }), track = el('div', { class: 'progress-track active-track' }, fill);
    const start = button('Start practice', () => practice.toggle(), 'primary start-practice', 'play');
    const metro = button('Metronome on', () => practice.toggleAudio(), 'ghost', 'volume');
    const progressText = el('p', { class: 'trainer-status' }), notesText = el('p', { class: 'active-note-preview muted small' }), attemptText = el('p', { class: 'attempt-feedback small', role: 'status' });
    const beats = el('div', { class: 'practice-beats', 'aria-hidden': 'true' });
    const note = () => { const current = practice.session.blocks[practice.session.activeBlockIndex]; formDialog('Quick practice note', [textarea('note', 'What did you notice?', current.notes, 4)], async (data) => { await practice.note(formText(data, 'note')); notify('Practice note saved.'); }, 'Save note'); };
    const next = el('div', { class: 'next-block' }), queue = el('aside', { class: 'practice-queue' });
    const setFocus = async (value) => {
        focus = value;
        page.classList.toggle('focused', focus);
        focusButton.querySelector('span').textContent = focus ? 'Exit focus' : 'Focus mode';
        if (focus && document.documentElement.requestFullscreen) {
            try {
                await document.documentElement.requestFullscreen();
            }
            catch { }
        }
        if (!focus && document.fullscreenElement)
            await document.exitFullscreen().catch(() => { });
    };
    const focusButton = button(focus ? 'Exit focus' : 'Focus mode', () => setFocus(!focus), 'ghost', 'focus');
    const header = el('header', { class: 'practice-header' }, button('Save & leave', async () => { await practice.pause(); await store.refresh(); navigate('/'); }, 'ghost', 'exit'), blockNumber, el('div', { class: 'actions' }, focusButton, button('Finish session', async () => { if (await confirmAction('Finish this session?', 'Your time, attempts, and notes will be saved. Unfinished future blocks will be marked skipped.', 'Finish session')) {
        await practice.finish();
        draw();
    } }, 'secondary', 'check')));
    const ratingButtons = RATINGS.map(rating => button(rating === 'acceptable' ? 'Acceptable' : rating[0].toUpperCase() + rating.slice(1), async () => { const bpm = practice.session.runtime.bpm; await practice.attempt(rating); attemptText.textContent = `Recorded ${bpm} BPM · ${rating}.`; }, `rating-button ${rating === 'clean' ? 'clean-rating' : ''}`));
    const main = el('section', { class: 'practice-workspace' }, el('div', { class: 'practice-identity' }, status, title, sticking), el('div', { class: 'tempo-display' }, tempo, el('span', { class: 'bpm-unit' }, 'BPM')), beats, el('div', { class: 'active-timer' }, time, target), track, el('div', { class: 'active-tempo-controls' }, [-5, -1, 1, 5].map(step => button(step > 0 ? `+${step}` : `−${Math.abs(step)}`, () => practice.setBpm(practice.session.runtime.bpm + step), 'tempo-step'))), el('div', { class: 'practice-main-controls' }, start, metro), el('div', { class: 'attempt-section' }, el('div', { class: 'label' }, 'HOW DID THAT ROUND FEEL?'), el('div', { class: 'rating-buttons' }, ratingButtons), attemptText), el('div', { class: 'practice-tools' }, button('Quick note', note, 'ghost', 'note'), button('Tempo trainer', () => trainerDialog(practice.session.blocks[practice.session.activeBlockIndex].tempoTrainer, config => practice.trainer(config), practice.session.runtime.bpm), 'ghost', 'progress')), progressText, notesText, error, el('div', { class: 'block-transition-controls' }, button('Restart block', async () => { await practice.restart(); notify('New segment ready. Previous time and attempts remain in history.', 'info'); }, 'ghost', 'restart'), button('Skip block', () => practice.finishBlock(true), 'ghost', 'skip'), button('Finish block', () => practice.finishBlock(), 'secondary', 'check')), next);
    const recovery = el('section', { class: 'session-recovery', hidden: !practice.recovered }, el('strong', {}, 'Saved session recovered.'), el('p', {}, 'Your saved time, attempts, and notes are intact. Time while the app was closed is not counted. After an abrupt close, up to five seconds since the last checkpoint may be missing.'), el('div', { class: 'actions wrap' }, button('Resume saved session', () => practice.start(), 'primary', 'play'), button('End and keep history', async () => { if (await confirmAction('End this saved session?', 'The session will remain in history as ended early, with its saved time, attempts, and notes.', 'End session')) {
        await practice.finish(true);
        navigate(`/history/${active.id}`);
    } }, 'secondary'), button('Discard saved session', async () => { if (await confirmAction('Discard this session permanently?', 'Only this unfinished session and its attempts will be removed. All other practice history remains.', 'Discard session', true)) {
        await practice.discard();
        navigate('/practice');
    } }, 'ghost danger-text')));
    body.append(main, queue);
    page.append(header, recovery, body);
    let lastIndex = -1, lastId = '', previousPhase = '';
    const tick = () => {
        const session = practice.session;
        if (!session || session.status !== 'active')
            return;
        const block = session.blocks[session.activeBlockIndex], elapsed = practice.elapsed();
        time.textContent = clock(elapsed);
        target.textContent = `/ ${clock(block.targetSeconds)}`;
        fill.style.width = `${Math.min(100, elapsed / block.targetSeconds * 100)}%`;
        if (block.tempoTrainer)
            progressText.textContent = trainerLabel(block.tempoTrainer, Math.max(0, elapsed - session.runtime.trainerStartSeconds), session.runtime.trainerCleanRounds);
        else
            progressText.textContent = elapsed >= block.targetSeconds ? 'Target time reached. Finish when you are ready.' : '';
    };
    function draw() {
        const session = practice.session;
        if (!session)
            return;
        if (session.status !== 'active') {
            page.replaceChildren(sessionPage(session.id, true).node);
            return;
        }
        const block = session.blocks[session.activeBlockIndex], phase = session.runtime.phase;
        recovery.hidden = !practice.recovered;
        title.textContent = block.titleSnapshot;
        sticking.textContent = block.stickingSnapshot;
        sticking.hidden = !block.stickingSnapshot;
        blockNumber.textContent = `BLOCK ${session.activeBlockIndex + 1} OF ${session.blocks.length}`;
        if (document.activeElement !== tempo)
            tempo.value = String(session.runtime.bpm);
        status.textContent = phase === 'running' ? 'PRACTICING' : phase === 'countin' ? `COUNT-IN · BAR ${(practice.beat?.bar || 0) + 1}` : phase === 'paused' ? 'PAUSED · PROGRESS SAVED' : 'READY WHEN YOU ARE';
        start.querySelector('span').textContent = phase === 'running' || phase === 'countin' ? 'Pause' : phase === 'paused' ? 'Resume' : 'Start practice';
        start.setAttribute('aria-label', phase === 'running' || phase === 'countin' ? 'Pause practice' : phase === 'paused' ? 'Resume practice' : 'Start practice');
        metro.querySelector('span').textContent = session.runtime.metronomeOn ? 'Metronome on' : 'Metronome off';
        metro.setAttribute('aria-pressed', String(session.runtime.metronomeOn));
        if (previousPhase !== phase) {
            start.dataset.phase = phase;
            previousPhase = phase;
        }
        ratingButtons.forEach(b => { b.disabled = phase === 'ready' || phase === 'countin'; });
        error.hidden = !practice.error;
        error.textContent = practice.error;
        notesText.textContent = block.notes;
        notesText.hidden = !block.notes;
        if (lastIndex !== session.activeBlockIndex || lastId !== block.id) {
            lastIndex = session.activeBlockIndex;
            lastId = block.id;
            attemptText.textContent = '';
            beats.replaceChildren(...Array.from({ length: block.meterSnapshot.beats }, (_, i) => el('span', { class: 'practice-beat' }, String(i + 1))));
            queue.replaceChildren(sectionHeader('Session sequence'), ...session.blocks.map((b, i) => el('div', { class: `queue-block ${i === session.activeBlockIndex ? 'current' : ''}` }, el('span', { class: 'queue-number' }, b.completed ? '✓' : b.skipped ? '—' : String(i + 1).padStart(2, '0')), el('div', {}, el('strong', {}, b.titleSnapshot), el('span', { class: 'muted small' }, `${duration(b.targetSeconds)} · ${b.initialBpm} BPM`)))));
        }
        Array.from(beats.children).forEach((b, i) => b.classList.toggle('on', !!practice.beat && practice.beat.beat === i && (phase === 'running' || phase === 'countin')));
        const upcoming = session.blocks[session.activeBlockIndex + 1];
        next.replaceChildren(el('span', { class: 'label' }, upcoming ? 'UP NEXT' : 'LAST BLOCK'), el('strong', {}, upcoming ? `${upcoming.titleSnapshot} · ${duration(upcoming.targetSeconds)}` : 'Finish the block to review your session.'));
        tick();
    }
    const onKey = (event) => {
        const target = event.target;
        if (practice.session?.status !== 'active' || event.ctrlKey || event.metaKey || event.altKey || event.repeat)
            return;
        if (document.querySelector('dialog[open]') || target.closest('input,textarea,select,[contenteditable=true]'))
            return;
        if (event.code === 'Space' && !target.closest('button,a')) {
            event.preventDefault();
            void practice.toggle().catch(e => notify(e.message, 'error'));
        }
        else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            void practice.setBpm(practice.session.runtime.bpm + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 5 : 1)).catch(e => notify(e.message, 'error'));
        }
        else if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            note();
        }
        else if (event.key === 'Escape' && focus)
            void setFocus(false);
    };
    window.addEventListener('keydown', onKey);
    const unsubscribe = practice.subscribe(draw), timer = setInterval(tick, 100);
    draw();
    return { node: page, cleanup: () => { unsubscribe(); clearInterval(timer); window.removeEventListener('keydown', onKey); if (!practice.external && practice.session?.status === 'active' && ['running', 'countin'].includes(practice.session.runtime.phase))
            void practice.pause().catch(() => { }); if (document.fullscreenElement)
            void document.exitFullscreen().catch(() => { }); } };
}
