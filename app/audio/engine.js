import { validateMetronome } from '../domain/validation.js';
import { AUDIO_LOCK, ExclusiveLease } from '../platform/locks.js';
import { ScheduleClock } from './scheduler.js';
export class AudioEngine {
    context;
    master;
    clock;
    timer;
    frame;
    visuals = [];
    nodes = new Set();
    options = {};
    generation = 0;
    lease;
    readySent = false;
    running = false;
    async start(config, options = {}) {
        this.stop();
        const generation = this.generation;
        validateMetronome(config);
        if (!globalThis.AudioContext)
            throw new Error('Web Audio is unavailable in this browser. Practice timers still work with the metronome turned off.');
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext({ latencyHint: 'interactive' });
            this.master = this.context.createGain();
            this.master.connect(this.context.destination);
            this.context.onstatechange = () => { if (this.running && this.context?.state !== 'running') {
                const fn = this.options.onInterrupted;
                this.stop();
                fn?.();
            } };
        }
        const lease = new ExclusiveLease(AUDIO_LOCK, 'Another tab is using the metronome. Pause it there, then try again.');
        this.lease = lease;
        try {
            await this.context.resume();
            if (generation !== this.generation)
                return;
            if (this.context.state !== 'running')
                throw new Error('Audio could not start. Tap Start again to allow browser audio.');
            await lease.acquire();
            if (generation !== this.generation) {
                lease.release();
                return;
            }
            this.options = options;
            this.readySent = false;
            this.master.gain.value = config.volume;
            this.clock = new ScheduleClock(config, this.context.currentTime + 0.06);
            this.running = true;
            this.schedule();
            this.draw();
        }
        catch (error) {
            lease.release();
            if (generation !== this.generation)
                return;
            this.stop();
            throw error;
        }
    }
    update(config) { validateMetronome(config); this.clock?.update(config); if (this.context && this.master)
        this.master.gain.setTargetAtTime(config.volume, this.context.currentTime, 0.015); }
    schedule = () => {
        if (!this.running || !this.context || !this.clock)
            return;
        const events = this.clock.scheduleThrough(this.context.currentTime + 0.12, this.context.currentTime);
        for (const event of events) {
            this.click(event);
            this.visuals.push(event);
        }
        this.timer = setTimeout(this.schedule, 25);
    };
    click(event) {
        if (!this.context || !this.master || event.accent === 0)
            return;
        const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(event.part > 0 ? 680 : event.accent === 2 ? 1400 : 950, event.time);
        oscillator.frequency.exponentialRampToValueAtTime(event.part > 0 ? 430 : 540, event.time + 0.027);
        envelope.gain.setValueAtTime(0.0001, event.time);
        envelope.gain.exponentialRampToValueAtTime(event.part > 0 ? 0.20 : event.accent === 2 ? 0.7 : 0.46, event.time + 0.0015);
        envelope.gain.exponentialRampToValueAtTime(0.0001, event.time + 0.042);
        oscillator.connect(envelope);
        envelope.connect(this.master);
        this.nodes.add(oscillator);
        oscillator.onended = () => { this.nodes.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(event.time);
        oscillator.stop(event.time + 0.045);
    }
    draw = () => {
        if (!this.context || !this.running)
            return;
        const onset = this.clock?.practiceStartTime;
        if (!this.readySent && onset !== undefined && onset <= this.context.currentTime) {
            this.readySent = true;
            this.options.onReady?.(Date.now() + (onset - this.context.currentTime) * 1000);
        }
        while (this.visuals[0] && this.visuals[0].time <= this.context.currentTime) {
            const event = this.visuals.shift();
            this.options.onBeat?.(event);
        }
        this.frame = requestAnimationFrame(this.draw);
    };
    stop() {
        this.generation++;
        this.running = false;
        clearTimeout(this.timer);
        if (this.frame !== undefined)
            cancelAnimationFrame(this.frame);
        for (const node of this.nodes) {
            try {
                node.stop();
            }
            catch { }
        }
        this.nodes.clear();
        this.visuals = [];
        this.clock = undefined;
        this.options = {};
        this.lease?.release();
        this.lease = undefined;
        this.readySent = false;
    }
    get currentTime() { return this.context?.currentTime ?? 0; }
}
export const audio = new AudioEngine();
