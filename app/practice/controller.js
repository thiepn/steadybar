import { get, insertActiveSession, updateSession } from '../db/database.js';
import { store } from '../app/store.js';
import { audio } from '../audio/engine.js';
import { defaultAccents } from '../audio/scheduler.js';
import { blockElapsed, checkpointSession, createSession, finishBlock, pauseSession, recoverSession, restartBlock } from './logic.js';
import { clampBpm, nowISO, uuid } from '../domain/utils.js';
import { trainerBpm } from '../domain/trainer.js';
import { ExclusiveLease, SESSION_LOCK } from '../platform/locks.js';
import { requireActive } from './guards.js';
export class PracticeController {
    session;
    external = false;
    recovered = false;
    beat;
    error = '';
    listeners = new Set();
    queue = Promise.resolve();
    heartbeat;
    trainerTimer;
    lease = new ExclusiveLease(SESSION_LOCK, 'This session is running in another tab. Pause it there before continuing here.');
    wake;
    changingTempo = false;
    generation = 0;
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit() { this.listeners.forEach(fn => fn()); }
    report(error) { this.generation++; this.error = error instanceof Error ? error.message : 'Practice data could not be saved. Check browser storage permissions.'; audio.stop(); this.stopTimers(); this.unlock(); if (this.session)
        this.session = recoverSession(this.session); this.emit(); }
    async lock() { await this.lease.acquire(); }
    observePersisted() {
        if (this.lease.held)
            return;
        const data = store.snapshot();
        const next = this.session ? data.sessions.find(s => s.id === this.session.id) : data.sessions.find(s => s.status === 'active');
        if (JSON.stringify(next) === JSON.stringify(this.session))
            return;
        this.generation++;
        if (this.session?.status === 'active' && !this.external && ['running', 'countin'].includes(this.session.runtime.phase)) {
            audio.stop();
            this.stopTimers();
        }
        this.session = next;
        this.external = !!next && next.status === 'active' && ['running', 'countin'].includes(next.runtime.phase);
        this.recovered = next?.status === 'active';
        this.emit();
    }
    async recover() {
        const session = await store.activeSession();
        if (!session)
            return false;
        this.session = session;
        this.recovered = true;
        try {
            await this.lock();
        }
        catch {
            this.external = true;
            this.emit();
            return true;
        }
        const wasInterrupted = session.runtime.phase === 'running' || session.runtime.phase === 'countin';
        try {
            this.session = await updateSession(session.id, current => { requireActive(current); return recoverSession(current); });
            await store.refresh(false);
            this.external = false;
            this.emit();
            return wasInterrupted;
        }
        finally {
            this.unlock();
        }
    }
    async create(blocks, source = {}) {
        const session = createSession(blocks, store.snapshot(), source);
        await insertActiveSession(session);
        this.session = session;
        this.error = '';
        this.external = false;
        this.recovered = false;
        await store.refresh();
        store.broadcast();
        this.emit();
    }
    mutate(fn) {
        const id = this.session?.id, blockId = this.session?.blocks[this.session.activeBlockIndex]?.id;
        if (!id)
            return Promise.reject(new Error('No active session.'));
        if (this.external)
            return Promise.reject(new Error('Pause the session in the other tab before editing it here.'));
        const task = this.queue.then(async () => {
            await this.lock();
            try {
                const next = await updateSession(id, current => { requireActive(current, blockId); return fn(current); });
                this.session = next;
                await store.refresh(false);
                store.broadcast();
                this.emit();
            }
            catch (error) {
                const current = await get('sessions', id).catch(() => this.session);
                this.session = current;
                await store.refresh(false).catch(() => { });
                throw error;
            }
            finally {
                if (!this.session || this.session.status !== 'active' || !['running', 'countin'].includes(this.session.runtime.phase))
                    this.unlock();
            }
        });
        this.queue = task.catch(error => this.report(error));
        return task;
    }
    elapsed() { return this.session ? blockElapsed(this.session) : 0; }
    config() {
        const s = this.session, block = s.blocks[s.activeBlockIndex], settings = store.snapshot().settings.metronome;
        return { ...structuredClone(settings), bpm: s.runtime.bpm, meter: block.meterSnapshot, subdivision: block.subdivisionSnapshot, accents: settings.meter.beats === block.meterSnapshot.beats && settings.meter.beatUnit === block.meterSnapshot.beatUnit ? [...settings.accents] : defaultAccents(block.meterSnapshot.beats, block.meterSnapshot.beatUnit) };
    }
    async requestWake() {
        if (!store.snapshot().settings.wakeLock || !('wakeLock' in navigator) || document.hidden)
            return;
        try {
            this.wake = await navigator.wakeLock.request('screen');
        }
        catch { }
    }
    stopTimers() {
        clearInterval(this.heartbeat);
        clearInterval(this.trainerTimer);
        this.heartbeat = undefined;
        this.trainerTimer = undefined;
        void this.wake?.release().catch(() => { });
        this.wake = undefined;
    }
    unlock() { this.lease.release(); }
    startTimers() {
        clearInterval(this.heartbeat);
        clearInterval(this.trainerTimer);
        this.heartbeat = setInterval(() => { if (this.session?.runtime.phase === 'running')
            void this.mutate(s => checkpointSession(s)).catch(() => { }); }, 5000);
        this.trainerTimer = setInterval(() => { void this.tickTrainer().catch(error => this.report(error)); }, 200);
        void this.requestWake();
    }
    async tickTrainer() {
        const s = this.session, block = s?.blocks[s.activeBlockIndex];
        if (!s || !block?.tempoTrainer || s.runtime.phase !== 'running' || this.changingTempo)
            return;
        const bpm = trainerBpm(block.tempoTrainer, this.elapsed() - s.runtime.trainerStartSeconds, s.runtime.trainerCleanRounds);
        if (bpm !== s.runtime.bpm) {
            this.changingTempo = true;
            try {
                await this.mutate(current => { current = checkpointSession(current); current.runtime.bpm = bpm; current.blocks[current.activeBlockIndex].finalBpm = bpm; return current; });
                if (audio.running)
                    audio.update(this.config());
            }
            finally {
                this.changingTempo = false;
            }
        }
    }
    async toggle() {
        if (this.session?.runtime.phase === 'running' || this.session?.runtime.phase === 'countin')
            await this.pause();
        else
            await this.start();
    }
    async start() {
        if (!this.session || this.session.status !== 'active' || ['running', 'countin'].includes(this.session.runtime.phase))
            return;
        const generation = ++this.generation;
        this.error = '';
        await this.lock();
        if (generation !== this.generation) {
            this.unlock();
            return;
        }
        this.external = false;
        this.recovered = false;
        const countIn = this.session.runtime.metronomeOn ? this.config().countIn : 0;
        const startRunning = async (time) => {
            if (generation !== this.generation)
                return;
            await this.mutate(s => { if (generation !== this.generation || s.status !== 'active' || (s.runtime.phase !== 'countin' && s.runtime.phase !== 'ready' && s.runtime.phase !== 'paused'))
                return s; const block = s.blocks[s.activeBlockIndex]; const iso = new Date(time).toISOString(); block.startedAt ??= iso; s.runtime.phase = 'running'; s.runtime.runStartedAt = iso; s.runtime.checkpointAt = iso; return s; });
            if (generation === this.generation && this.session?.runtime.phase === 'running')
                this.startTimers();
        };
        try {
            if (this.session.runtime.metronomeOn) {
                await this.mutate(s => { if (generation !== this.generation)
                    return s; s.runtime.phase = 'countin'; delete s.runtime.runStartedAt; return s; });
                if (generation !== this.generation)
                    return;
                await audio.start({ ...this.config(), countIn }, { onReady: time => { void startRunning(time).catch(error => this.report(error)); }, onBeat: event => { this.beat = event; this.emit(); }, onInterrupted: () => { void this.pause().then(() => { this.error = 'Audio was suspended by the browser. The session is paused; tap Resume when ready.'; this.emit(); }).catch(error => this.report(error)); } });
            }
            else
                await startRunning(Date.now());
        }
        catch (error) {
            if (generation !== this.generation)
                return;
            this.stopTimers();
            await this.mutate(s => pauseSession(s)).catch(() => { });
            throw error;
        }
    }
    async pause() {
        this.generation++;
        audio.stop();
        this.stopTimers();
        if (this.session?.status === 'active') {
            await this.mutate(s => pauseSession(s));
            this.beat = undefined;
            this.emit();
        }
    }
    async setBpm(value) {
        const bpm = clampBpm(value);
        await this.mutate(s => { s = checkpointSession(s); s.runtime.bpm = bpm; const block = s.blocks[s.activeBlockIndex]; block.finalBpm = bpm; delete block.tempoTrainer; return s; });
        if (audio.running)
            audio.update(this.config());
    }
    async toggleAudio() {
        const wasRunning = this.session?.runtime.phase === 'running';
        await this.pause();
        await this.mutate(s => { s.runtime.metronomeOn = !s.runtime.metronomeOn; return s; });
        if (wasRunning)
            await this.start();
    }
    async attempt(rating) {
        if (!this.session || ['ready', 'countin'].includes(this.session.runtime.phase))
            throw new Error('Start this block before recording an attempt.');
        await this.mutate(s => {
            if (['ready', 'countin'].includes(s.runtime.phase))
                throw new Error('Start this block before recording an attempt.');
            s = checkpointSession(s);
            const block = s.blocks[s.activeBlockIndex];
            block.tempoAttempts.push({ id: uuid(), bpm: s.runtime.bpm, rating, timestamp: nowISO(), durationSeconds: block.actualActiveSeconds, note: '' });
            if ((rating === 'clean' || rating === 'effortless') && block.tempoTrainer?.mode === 'repetition')
                s.runtime.trainerCleanRounds++;
            return s;
        });
        await this.tickTrainer();
    }
    async note(text) { await this.mutate(s => { s.blocks[s.activeBlockIndex].notes = text; return s; }); }
    async trainer(config) {
        await this.pause();
        await this.mutate(s => { const block = s.blocks[s.activeBlockIndex]; block.tempoTrainer = config; s.runtime.trainerStartSeconds = block.actualActiveSeconds; s.runtime.trainerCleanRounds = 0; if (config) {
            s.runtime.bpm = trainerBpm(config, 0, 0);
            block.finalBpm = s.runtime.bpm;
            if (config.mode === 'endurance')
                block.targetSeconds = Math.ceil(block.actualActiveSeconds) + config.seconds;
        } return s; });
    }
    async finishBlock(skip = false) { this.generation++; audio.stop(); this.stopTimers(); await this.mutate(s => finishBlock(s, skip)); this.beat = undefined; this.emit(); }
    async restart() { this.generation++; audio.stop(); this.stopTimers(); await this.mutate(restartBlock); this.beat = undefined; this.emit(); }
    async finish(abandon = false) {
        this.generation++;
        this.recovered = false;
        audio.stop();
        this.stopTimers();
        await this.mutate(s => {
            s = pauseSession(s);
            const now = nowISO();
            s.blocks.forEach((b, i) => { if (i === s.activeBlockIndex) {
                b.completed = !abandon;
                b.endedAt = now;
                b.finalBpm = s.runtime.bpm;
            }
            else if (i > s.activeBlockIndex) {
                b.skipped = true;
                b.endedAt = now;
            } });
            s.status = abandon ? 'abandoned' : 'completed';
            s.endedAt = now;
            return s;
        });
    }
    async discard() { this.generation++; audio.stop(); this.stopTimers(); await this.lock(); try {
        if (this.session) {
            await store.delete('sessions', this.session.id);
            this.session = undefined;
            this.recovered = false;
            this.emit();
        }
    }
    finally {
        this.unlock();
    } }
    async onVisibility() {
        if (!this.session || this.session.status !== 'active')
            return;
        if (document.hidden && store.snapshot().settings.pauseWhenHidden && ['running', 'countin'].includes(this.session.runtime.phase)) {
            await this.pause();
            this.error = 'Paused when the app went into the background. Tap Resume to continue.';
            this.emit();
        }
        else if (!document.hidden && this.session.runtime.phase === 'running')
            await this.requestWake();
    }
}
export const practice = new PracticeController();
