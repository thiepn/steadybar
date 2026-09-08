export const SESSION_LOCK = 'music-practice-os-session';
export const AUDIO_LOCK = 'music-practice-os-audio';
export class ExclusiveLease {
    name;
    message;
    manager;
    pending;
    releaseCurrent;
    epoch = 0;
    held = false;
    constructor(name, message, manager = globalThis.navigator?.locks) {
        this.name = name;
        this.message = message;
        this.manager = manager;
    }
    acquire() {
        if (this.held)
            return Promise.resolve();
        if (this.pending)
            return this.pending;
        const epoch = this.epoch;
        if (!this.manager) {
            this.held = true;
            return Promise.resolve();
        }
        const pending = new Promise((resolve, reject) => {
            void this.manager.request(this.name, { ifAvailable: true }, async (lock) => {
                if (epoch !== this.epoch) {
                    reject(new DOMException('This operation was cancelled.', 'AbortError'));
                    return;
                }
                if (!lock) {
                    reject(new Error(this.message));
                    return;
                }
                await new Promise(release => {
                    this.releaseCurrent = release;
                    this.held = true;
                    resolve();
                });
            }).catch(reject);
        });
        this.pending = pending;
        void pending.then(() => { if (this.pending === pending)
            this.pending = undefined; }, () => { if (this.pending === pending)
            this.pending = undefined; });
        return pending;
    }
    release() {
        this.epoch++;
        this.held = false;
        this.pending = undefined;
        this.releaseCurrent?.();
        this.releaseCurrent = undefined;
    }
}
export async function withWorkspaceIdle(action) {
    const session = new ExclusiveLease(SESSION_LOCK, 'Practice is open in another tab. Pause it there before replacing data or updating the app.');
    const audio = new ExclusiveLease(AUDIO_LOCK, 'A metronome is playing in another tab. Stop it there before replacing data or updating the app.');
    try {
        await session.acquire();
        await audio.acquire();
        return await action();
    }
    finally {
        audio.release();
        session.release();
    }
}
