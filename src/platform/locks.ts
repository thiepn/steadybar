/** Cross-tab ownership without queues that silently start audio later. */
export const SESSION_LOCK = 'music-practice-os-session';
export const AUDIO_LOCK = 'music-practice-os-audio';
type Manager = Pick<LockManager, 'request'>;

export class ExclusiveLease {
  private pending?: Promise<void>;
  private releaseCurrent?: () => void;
  private epoch = 0;
  held = false;

  constructor(
    readonly name: string,
    private readonly message: string,
    private readonly manager: Manager | undefined = globalThis.navigator?.locks,
  ) {}

  acquire(): Promise<void> {
    if (this.held) return Promise.resolve();
    if (this.pending) return this.pending;
    const epoch = this.epoch;
    if (!this.manager) { this.held = true; return Promise.resolve(); }
    const pending = new Promise<void>((resolve, reject) => {
      void this.manager!.request(this.name, { ifAvailable: true }, async lock => {
        if (epoch !== this.epoch) {
          reject(new DOMException('This operation was cancelled.', 'AbortError'));
          return;
        }
        if (!lock) { reject(new Error(this.message)); return; }
        await new Promise<void>(release => {
          this.releaseCurrent = release;
          this.held = true;
          resolve();
        });
      }).catch(reject);
    });
    this.pending = pending;
    void pending.then(
      () => { if (this.pending === pending) this.pending = undefined; },
      () => { if (this.pending === pending) this.pending = undefined; },
    );
    return pending;
  }

  release(): void {
    this.epoch++;
    this.held = false;
    this.pending = undefined;
    this.releaseCurrent?.();
    this.releaseCurrent = undefined;
  }
}

/** Restore/reset must never replace the data underneath another playing tab. */
export async function withWorkspaceIdle<T>(action: () => Promise<T>): Promise<T> {
  const session = new ExclusiveLease(SESSION_LOCK, 'Practice is open in another tab. Pause it there before replacing data or updating the app.');
  const audio = new ExclusiveLease(AUDIO_LOCK, 'A metronome is playing in another tab. Stop it there before replacing data or updating the app.');
  try { await session.acquire(); await audio.acquire(); return await action(); }
  finally { audio.release(); session.release(); }
}
