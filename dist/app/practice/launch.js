import { metadata, localDate, freshBlocks, uuid } from '../domain/utils.js';
import { store } from '../app/store.js';
import { practice } from './controller.js';
import { navigate } from '../app/navigation.js';
import { confirmAction, notify } from '../ui/components.js';
export function exerciseBlock(exercise, seconds = 600) { return { id: uuid(), type: 'exercise', exerciseId: exercise.id, title: exercise.name, targetSeconds: seconds, bpm: exercise.defaultBpm, notes: '', order: 0 }; }
export function songBlock(song, sectionId, seconds = 600) {
    const section = song.sections.find(s => s.id === sectionId);
    return { id: uuid(), type: section ? 'song-section' : 'song', songId: song.id, songSectionId: section?.id, title: song.title + (section ? ` · ${section.name}` : ''), targetSeconds: seconds, bpm: section?.bpmOverride || song.bpm, notes: '', order: 0 };
}
export function freeBlock(seconds = 600, bpm = 80, title = 'Free Practice') { return { id: uuid(), type: 'free', title, targetSeconds: seconds, bpm, notes: '', order: 0 }; }
export async function launchPractice(blocks, source = {}) {
    const active = await store.activeSession();
    if (active) {
        notify('Your unfinished session is ready to resume. End it before starting a new session.', 'info');
        if (practice.session?.id !== active.id || practice.session?.status !== 'active')
            await practice.recover();
        navigate('/practice/active');
        return;
    }
    await practice.create(blocks, source);
    navigate('/practice/active');
}
export async function addToday(block) {
    const current = store.snapshot().dailyPlans.find(p => p.date === localDate());
    const plan = current ? structuredClone(current) : { ...metadata(), date: localDate(), blocks: [] };
    plan.blocks.push({ ...structuredClone(block), id: uuid(), order: plan.blocks.length });
    await store.save('dailyPlans', plan);
    notify('Added to today’s plan.');
}
export async function routineToday(routine) {
    const current = store.snapshot().dailyPlans.find(p => p.date === localDate());
    if (current?.blocks.length && !await confirmAction('Replace today’s plan?', `Use “${routine.name}” instead of your current ${current.blocks.length}-block plan? This does not change practice history.`, 'Use routine'))
        return;
    await store.save('dailyPlans', { ...(current || metadata()), date: localDate(), sourceRoutineId: routine.id, blocks: freshBlocks(routine.blocks) });
    notify('Today’s plan is ready.');
    navigate('/');
}
