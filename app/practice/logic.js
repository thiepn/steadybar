import { metadata, nowISO, uuid } from '../domain/utils.js';
import { trainerBpm } from '../domain/trainer.js';
export function snapshotBlock(block, data) {
    const exercise = data.exercises.find(e => e.id === block.exerciseId), song = data.songs.find(s => s.id === block.songId), section = song?.sections.find(s => s.id === block.songSectionId);
    if (block.type === 'exercise' && !exercise)
        throw new Error(`The exercise in “${block.title}” is unavailable. Edit or remove that block first.`);
    if ((block.type === 'song' || block.type === 'song-section') && !song)
        throw new Error(`The song in “${block.title}” is unavailable. Edit or remove that block first.`);
    if (block.type === 'song-section' && !section)
        throw new Error(`A section in “${block.title}” was removed. Select an existing section before practicing.`);
    const bpm = block.tempoTrainer ? trainerBpm(block.tempoTrainer, 0, 0) : block.bpm;
    const title = block.type === 'free' ? block.title : exercise?.name || (song ? (block.title || `${song.title}${section ? ` · ${section.name}` : ''}`) : block.title);
    return { id: uuid(), type: block.type, sourceExerciseId: exercise?.id, sourceSongId: song?.id, sourceSongSectionId: section?.id, titleSnapshot: title, categorySnapshot: exercise?.category || (song ? 'song' : 'other'), stickingSnapshot: exercise?.sticking || '', meterSnapshot: structuredClone(exercise?.meter || song?.meter || data.settings.metronome.meter), subdivisionSnapshot: exercise?.subdivision || data.settings.metronome.subdivision, targetSeconds: block.tempoTrainer?.mode === 'endurance' ? block.tempoTrainer.seconds : block.targetSeconds, actualActiveSeconds: 0, initialBpm: bpm, finalBpm: bpm, tempoAttempts: [], notes: [block.notes, section?.notes].filter(Boolean).join('\n'), completed: false, skipped: false, tempoTrainer: block.tempoTrainer ? structuredClone(block.tempoTrainer) : undefined };
}
export function createSession(blocks, data, source = {}) {
    if (!blocks.length)
        throw new Error('Add at least one block before starting practice.');
    const snapshots = blocks.map(b => snapshotBlock(b, data)), now = nowISO();
    return { ...metadata(), status: 'active', startedAt: now, activeBlockIndex: 0, blocks: snapshots, sessionNotes: '', sourceRoutineId: source.routineId, sourceDailyPlanId: source.planId, runtime: { phase: 'ready', bpm: snapshots[0].initialBpm, trainerCleanRounds: 0, trainerStartSeconds: 0, checkpointAt: now, metronomeOn: true } };
}
export function blockElapsed(session, now = Date.now()) {
    const block = session.blocks[session.activeBlockIndex];
    if (!block)
        return 0;
    const extra = session.status === 'active' && session.runtime.phase === 'running' && session.runtime.runStartedAt ? Math.max(0, (now - Date.parse(session.runtime.runStartedAt)) / 1000) : 0;
    return block.actualActiveSeconds + extra;
}
export function checkpointSession(session, now = Date.now()) {
    const next = structuredClone(session), time = new Date(now).toISOString();
    next.blocks[next.activeBlockIndex].actualActiveSeconds = blockElapsed(next, now);
    if (next.runtime.phase === 'running')
        next.runtime.runStartedAt = time;
    next.runtime.checkpointAt = time;
    next.updatedAt = time;
    return next;
}
export function pauseSession(session, now = Date.now()) {
    const next = checkpointSession(session, now);
    next.runtime.phase = 'paused';
    delete next.runtime.runStartedAt;
    return next;
}
export function recoverSession(session) {
    const next = structuredClone(session);
    if (next.runtime.phase === 'running' || next.runtime.phase === 'countin') {
        next.runtime.phase = 'paused';
        delete next.runtime.runStartedAt;
    }
    return next;
}
export function finishBlock(session, skip = false, now = Date.now()) {
    const next = pauseSession(session, now), block = next.blocks[next.activeBlockIndex];
    block.completed = !skip;
    block.skipped = skip;
    block.endedAt = new Date(now).toISOString();
    block.finalBpm = next.runtime.bpm;
    if (next.activeBlockIndex + 1 < next.blocks.length) {
        next.activeBlockIndex++;
        const upcoming = next.blocks[next.activeBlockIndex];
        next.runtime = { ...next.runtime, phase: 'ready', bpm: upcoming.initialBpm, trainerCleanRounds: 0, trainerStartSeconds: 0 };
    }
    else {
        next.status = 'completed';
        next.endedAt = new Date(now).toISOString();
    }
    return next;
}
export function restartBlock(session, now = Date.now()) {
    const next = pauseSession(session, now), old = next.blocks[next.activeBlockIndex];
    old.endedAt = new Date(now).toISOString();
    const startBpm = old.tempoTrainer ? trainerBpm(old.tempoTrainer, 0, 0) : next.runtime.bpm;
    const fresh = { ...structuredClone(old), id: uuid(), actualActiveSeconds: 0, initialBpm: startBpm, finalBpm: startBpm, tempoAttempts: [], startedAt: undefined, endedAt: undefined, completed: false, skipped: false };
    old.notes = [old.notes, 'Restarted: time and attempts retained in this segment.'].filter(Boolean).join('\n');
    next.blocks.splice(next.activeBlockIndex + 1, 0, fresh);
    next.activeBlockIndex++;
    next.runtime = { ...next.runtime, phase: 'ready', bpm: startBpm, trainerCleanRounds: 0, trainerStartSeconds: 0 };
    return next;
}
