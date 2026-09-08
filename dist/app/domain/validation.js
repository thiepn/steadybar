export class ValidationError extends Error {
    constructor(path, message) { super(`${path}: ${message}`); this.name = 'ValidationError'; }
}
const fail = (path, message) => { throw new ValidationError(path, message); };
const text = (max = 10000, min = 0) => (v, p = 'Value') => typeof v === 'string' && v.length >= min && v.length <= max ? v : fail(p, `expected text (${min}–${max} characters)`);
const num = (min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) => (v, p = 'Value') => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)) ? v : fail(p, `expected ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}`);
const bool = (v, p = 'Value') => typeof v === 'boolean' ? v : fail(p, 'expected true or false');
const one = (...items) => (v, p = 'Value') => items.includes(v) ? v : fail(p, `expected ${items.join(', ')}`);
const optional = (validator) => (v, p) => v === undefined ? undefined : validator(v, p);
const arr = (validator, max = 100000) => (v, p = 'Value') => Array.isArray(v) && v.length <= max ? v.map((x, i) => validator(x, `${p}[${i}]`)) : fail(p, `expected a list (maximum ${max} items)`);
const obj = (shape) => (v, p = 'Value') => {
    if (v === null || typeof v !== 'object' || Array.isArray(v))
        return fail(p, 'expected an object');
    const source = v;
    const out = {};
    for (const [key, validator] of Object.entries(shape)) {
        const result = validator(source[key], `${p}.${key}`);
        if (result !== undefined)
            out[key] = result;
    }
    return out;
};
const iso = (v, p = 'Date') => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v)))
        return fail(p, 'expected an ISO timestamp with a timezone');
    dateOnly(v.slice(0, 10), p);
    if (Number(v.slice(11, 13)) > 23 || Number(v.slice(14, 16)) > 59 || Number(v.slice(17, 19)) > 59)
        return fail(p, 'invalid clock time');
    return new Date(v).toISOString();
};
export const dateOnly = (v, p = 'Date') => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))
        return fail(p, 'use YYYY-MM-DD');
    const date = new Date(`${v}T12:00:00`);
    if (!Number.isFinite(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== v)
        return fail(p, 'invalid calendar date');
    return v;
};
const id = (v, p = 'ID') => {
    const value = text(120, 1)(v, p);
    return /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) ? value : fail(p, 'use a route-safe identifier without spaces, slashes or URL control characters');
};
const name = (v, p = 'Name') => {
    const value = text(200, 1)(v, p);
    return value.trim() ? value : fail(p, 'cannot be blank');
};
const bpm = num(20, 300, true), order = num(0, 10000, true);
function uniqueIds(items, p) {
    if (new Set(items.map(item => item.id)).size !== items.length)
        fail(p, 'contains duplicate IDs; each item must be unique');
}
const entity = { id, createdAt: iso, updatedAt: iso };
const meter = obj({ beats: num(1, 16, true), beatUnit: one(4, 8) });
const subdivision = one(1, 2, 3, 4);
const baseMetronome = obj({ bpm, meter, subdivision, accents: arr(one(0, 1, 2), 16), countIn: one(0, 1, 2, 4), volume: num(0, 1) });
export const validateMetronome = (v, p = 'Metronome') => {
    const config = baseMetronome(v, p);
    if (config.accents.length !== config.meter.beats)
        fail(p, 'accent count must match the meter');
    return config;
};
export const validateTrainer = (v, p = 'Tempo trainer') => {
    const mode = typeof v === 'object' && v !== null && 'mode' in v ? v.mode : undefined;
    switch (mode) {
        case 'progressive': {
            const c = obj({ mode: one('progressive'), start: bpm, step: num(1, 100, true), seconds: num(1, 86400, true), max: bpm })(v, p);
            if (c.max < c.start)
                fail(p, 'maximum BPM must be at least the starting BPM');
            return c;
        }
        case 'repetition': {
            const c = obj({ mode: one('repetition'), start: bpm, step: num(1, 100, true), rounds: num(1, 100, true), max: bpm })(v, p);
            if (c.max < c.start)
                fail(p, 'maximum BPM must be at least the starting BPM');
            return c;
        }
        case 'ladder': {
            const c = obj({ mode: one('ladder'), bpms: arr(bpm, 100), seconds: num(1, 86400, true) })(v, p);
            if (c.bpms.length < 2)
                fail(p, 'enter at least two ladder tempos');
            return c;
        }
        case 'endurance': return obj({ mode: one('endurance'), bpm, seconds: num(1, 86400, true) })(v, p);
        default: return fail(p, 'unknown tempo trainer mode');
    }
};
const rawExercise = obj({ ...entity, name, instrument: name, category: one('rudiment', 'technique', 'groove', 'coordination', 'warmup', 'timing', 'other'), description: text(), instructions: text(), sticking: text(1000), accents: text(1000), defaultBpm: bpm, targetBpm: optional(bpm), minBpm: bpm, maxBpm: bpm, meter, subdivision, tags: arr(text(80), 50), notes: text(), builtin: bool, archived: bool });
export const validateExercise = (v, p = 'Exercise') => {
    const exercise = rawExercise(v, p);
    if (exercise.minBpm > exercise.maxBpm)
        fail(p, 'minimum BPM cannot exceed maximum BPM');
    return exercise;
};
const section = obj({ id, name, bars: optional(num(1, 1000, true)), bpmOverride: optional(bpm), notes: text(), order });
const rawSong = obj({ ...entity, title: name, artist: text(200), bpm, meter, key: text(40), difficulty: one(1, 2, 3, 4, 5), status: one('learning', 'practicing', 'performance-ready', 'archived'), notes: text(), sections: arr(section, 200) });
export const validateSong = (v, p = 'Song') => {
    const song = rawSong(v, p);
    uniqueIds(song.sections, `${p}.sections`);
    return song;
};
const rawRoutineBlock = obj({ id, type: one('exercise', 'song', 'song-section', 'free'), exerciseId: optional(id), songId: optional(id), songSectionId: optional(id), title: name, targetSeconds: num(1, 86400, true), bpm, notes: text(), tempoTrainer: optional(validateTrainer), order });
export const validateRoutineBlock = (v, p = 'Block') => {
    const block = rawRoutineBlock(v, p);
    if (block.type === 'exercise' && !block.exerciseId)
        fail(p, 'an exercise block needs an exercise ID');
    if ((block.type === 'song' || block.type === 'song-section') && !block.songId)
        fail(p, 'a song block needs a song ID');
    if (block.type === 'song-section' && !block.songSectionId)
        fail(p, 'a section block needs a section ID');
    return block;
};
const rawRoutine = obj({ ...entity, name, description: text(), blocks: arr(validateRoutineBlock, 200), scheduledDays: arr(num(0, 6, true), 7), tags: arr(text(80), 50), builtin: bool, archived: bool });
export const validateRoutine = (v, p = 'Routine') => {
    const routine = rawRoutine(v, p);
    uniqueIds(routine.blocks, `${p}.blocks`);
    if (new Set(routine.scheduledDays).size !== routine.scheduledDays.length)
        fail(p, 'scheduled weekdays must be unique');
    return routine;
};
const rawPlan = obj({ ...entity, date: dateOnly, sourceRoutineId: optional(id), blocks: arr(validateRoutineBlock, 200) });
export const validatePlan = (v, p = 'Daily plan') => {
    const plan = rawPlan(v, p);
    uniqueIds(plan.blocks, `${p}.blocks`);
    return plan;
};
const attempt = obj({ id, bpm, rating: one('failed', 'messy', 'acceptable', 'clean', 'effortless'), timestamp: iso, durationSeconds: optional(num(0, 31536000)), note: text() });
const practiceBlock = obj({ id, type: one('exercise', 'song', 'song-section', 'free'), sourceExerciseId: optional(id), sourceSongId: optional(id), sourceSongSectionId: optional(id), titleSnapshot: name, categorySnapshot: text(100), stickingSnapshot: text(1000), meterSnapshot: meter, subdivisionSnapshot: subdivision, targetSeconds: num(1, 86400, true), actualActiveSeconds: num(0, 31536000), initialBpm: bpm, finalBpm: bpm, tempoAttempts: arr(attempt, 10000), notes: text(), startedAt: optional(iso), endedAt: optional(iso), completed: bool, skipped: bool, tempoTrainer: optional(validateTrainer) });
const runtime = obj({ phase: one('ready', 'countin', 'running', 'paused'), runStartedAt: optional(iso), bpm, trainerCleanRounds: num(0, 100000, true), trainerStartSeconds: num(0, 31536000), checkpointAt: iso, metronomeOn: bool });
const rawSession = obj({ ...entity, status: one('active', 'completed', 'abandoned'), startedAt: iso, endedAt: optional(iso), activeBlockIndex: order, blocks: arr(practiceBlock, 200), sessionNotes: text(), sessionRating: optional(one(1, 2, 3, 4, 5)), sourceRoutineId: optional(id), sourceDailyPlanId: optional(id), runtime });
export const validateSession = (v, p = 'Session') => {
    const s = rawSession(v, p);
    if (s.blocks.length === 0 || s.activeBlockIndex >= s.blocks.length)
        fail(p, 'the active block index must refer to an existing block');
    if (s.runtime.phase === 'running' && !s.runtime.runStartedAt)
        fail(p, 'a running session needs a start timestamp');
    if (s.status !== 'active' && (!s.endedAt || s.runtime.phase === 'running' || s.runtime.phase === 'countin'))
        fail(p, 'an ended session needs an end timestamp and a stopped timer');
    if (new Set(s.blocks.map(b => b.id)).size !== s.blocks.length)
        fail(p, 'block IDs must be unique within a session');
    for (const b of s.blocks) {
        if (b.completed && b.skipped)
            fail(p, 'a block cannot be both completed and skipped');
        if (new Set(b.tempoAttempts.map(a => a.id)).size !== b.tempoAttempts.length)
            fail(p, 'attempt IDs must be unique within a block');
    }
    return s;
};
const rawGoal = obj({ ...entity, type: one('bpm', 'weekly-sessions', 'song-mastery', 'custom'), title: name, description: text(), exerciseId: optional(id), songId: optional(id), targetValue: num(1, 10000), unit: text(80), deadline: optional(dateOnly), completed: bool, completedAt: optional(iso) });
export const validateGoal = (v, p = 'Goal') => {
    const goal = rawGoal(v, p);
    if (goal.type === 'bpm') {
        if (!goal.exerciseId)
            fail(p, 'a BPM goal needs an exercise ID');
        bpm(goal.targetValue, `${p}.targetValue`);
    }
    if (goal.type === 'song-mastery' && !goal.songId)
        fail(p, 'a song goal needs a song ID');
    if (goal.type === 'weekly-sessions' && !Number.isInteger(goal.targetValue))
        fail(p, 'a weekly session goal needs a whole-number target');
    return goal;
};
export const validateSetlist = obj({ ...entity, name, date: optional(dateOnly), songIds: arr(id, 200), notes: text() });
export const validatePreset = obj({ ...entity, name, config: validateMetronome });
export const validateSettings = obj({ id: one('preferences'), theme: one('system', 'light', 'dark'), instrument: name, aim: name, onboardingDone: bool, metronome: validateMetronome, wakeLock: bool, defaultFocus: bool, pauseWhenHidden: bool, seedVersion: num(1, 100, true) });
const dataSchema = obj({ exercises: arr(validateExercise), songs: arr(validateSong), routines: arr(validateRoutine), dailyPlans: arr(validatePlan), sessions: arr(validateSession), goals: arr(validateGoal), setlists: arr(validateSetlist), metronomePresets: arr(validatePreset), settings: validateSettings });
export function validateData(input) {
    const d = dataSchema(input, 'Data');
    for (const [key, value] of Object.entries(d))
        if (Array.isArray(value))
            uniqueIds(value, `Data.${key}`);
    if (new Set(d.dailyPlans.map(p => p.date)).size !== d.dailyPlans.length)
        fail('Daily plans', 'contains duplicate dates');
    if (d.sessions.filter(s => s.status === 'active').length > 1)
        fail('Sessions', 'data may contain only one active session');
    return d;
}
export function validateBackup(input) {
    if (typeof input !== 'object' || input === null)
        fail('Backup', 'expected a JSON object');
    const head = input;
    if (head.format !== 'music-practice-os')
        fail('Backup', 'this is not a Steadybar backup');
    if (head.version !== 1)
        fail('Backup', 'this backup uses an unsupported format version');
    return { format: 'music-practice-os', version: 1, exportedAt: iso(head.exportedAt, 'Exported at'), data: validateData(head.data) };
}
