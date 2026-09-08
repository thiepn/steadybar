import { isoWeekStart, localDate } from './utils.js';
export const calculateBestCleanBpm = (attempts) => {
    return attempts.reduce((best, a) => (a.rating === 'clean' || a.rating === 'effortless') ? Math.max(best ?? 0, a.bpm) : best, undefined);
};
export const calculateHighestAttemptedBpm = (attempts) => attempts.reduce((best, a) => Math.max(best ?? 0, a.bpm), undefined);
export const latestSuccessfulBpm = (attempts) => [...attempts].filter(a => ['acceptable', 'clean', 'effortless'].includes(a.rating)).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.bpm;
export const sessionTime = (session) => session.blocks.reduce((sum, b) => sum + b.actualActiveSeconds, 0);
export const finishedSessions = (sessions) => sessions.filter(s => s.status !== 'active');
export const calculateTotalPracticeTime = (sessions) => finishedSessions(sessions).reduce((sum, s) => sum + sessionTime(s), 0);
export const calculateAverageSessionLength = (sessions) => {
    const finished = finishedSessions(sessions);
    return finished.length ? calculateTotalPracticeTime(finished) / finished.length : 0;
};
export const calculateWeeklySessionCount = (sessions, today = new Date()) => {
    const start = isoWeekStart(today), end = new Date(start);
    end.setDate(end.getDate() + 7);
    return sessions.filter(s => s.status === 'completed' && new Date(s.startedAt) >= start && new Date(s.startedAt) < end).length;
};
export function exerciseAttempts(sessions, exerciseId) {
    return finishedSessions(sessions).flatMap(s => s.blocks.filter(b => b.sourceExerciseId === exerciseId).flatMap(b => b.tempoAttempts));
}
export function calculatePracticeDistribution(sessions) {
    const categories = new Map();
    for (const session of finishedSessions(sessions))
        for (const block of session.blocks) {
            const category = block.categorySnapshot || 'other';
            categories.set(category, (categories.get(category) || 0) + block.actualActiveSeconds);
        }
    const total = [...categories.values()].reduce((a, b) => a + b, 0);
    return [...categories].filter(([, seconds]) => seconds > 0).map(([category, seconds]) => ({ category, seconds, percent: total ? seconds / total * 100 : 0 })).sort((a, b) => b.seconds - a.seconds);
}
export function buildTempoProgressionSeries(attempts) {
    const daily = new Map();
    let best = 0;
    for (const attempt of [...attempts].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
        if (attempt.rating !== 'clean' && attempt.rating !== 'effortless')
            continue;
        best = Math.max(best, attempt.bpm);
        daily.set(localDate(attempt.timestamp), { bpm: best, timestamp: attempt.timestamp });
    }
    return [...daily].map(([date, entry]) => ({ date, ...entry }));
}
export function practiceByDay(sessions) {
    const days = new Map();
    for (const session of finishedSessions(sessions)) {
        const day = localDate(session.startedAt);
        days.set(day, (days.get(day) || 0) + sessionTime(session));
    }
    return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, seconds]) => ({ date, seconds }));
}
export const routineDuration = (blocks) => blocks.reduce((s, b) => s + b.targetSeconds, 0);
export function goalProgress(goal, data, now = new Date()) {
    let value = 0, target = goal.targetValue, label = '';
    switch (goal.type) {
        case 'bpm':
            value = calculateBestCleanBpm(exerciseAttempts(data.sessions, goal.exerciseId || '')) || 0;
            label = `${value || '—'} / ${target} clean BPM`;
            break;
        case 'weekly-sessions':
            value = calculateWeeklySessionCount(data.sessions, now);
            label = `${value} / ${target} sessions this week`;
            break;
        case 'song-mastery': {
            const song = data.songs.find(s => s.id === goal.songId);
            value = song?.status === 'performance-ready' ? 1 : 0;
            target = 1;
            label = song ? song.status.replaceAll('-', ' ') : 'Song unavailable';
            break;
        }
        case 'custom':
            value = goal.completed ? 1 : 0;
            target = 1;
            label = goal.completed ? 'Complete' : 'In progress';
            break;
    }
    return { value, target, label, done: value >= target, fraction: Math.min(1, value / target) };
}
export function filterSessions(sessions, from, to) {
    return finishedSessions(sessions).filter(s => { const date = localDate(s.startedAt); return (!from || date >= from) && (!to || date <= to); });
}
