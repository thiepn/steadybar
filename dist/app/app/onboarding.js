import { store } from './store.js';
import { el } from '../ui/dom.js';
import { button, dialog, notify, select } from '../ui/components.js';
import { freshBlocks, localDate, metadata } from '../domain/utils.js';
import { freeBlock } from '../practice/launch.js';
export function showOnboarding() {
    const instrument = select('instrument', 'Instrument', ['Drums', 'Guitar', 'Piano', 'Bass', 'Vocals', 'Other'], 'Drums');
    const aim = select('aim', 'Practice focus', ['Technique', 'Timing', 'Speed', 'Songs', 'Consistency', 'General Practice'], 'Technique');
    const handle = dialog('Set up Steadybar', [
        el('p', { class: 'welcome-intro' }, 'Choose your instrument and practice focus.'), instrument, aim,
        el('p', { class: 'field-hint' }, 'The starter library is for drums. For other instruments, add your own exercises and songs. Your practice data stays on this device.'),
    ]);
    handle.dialog.classList.add('onboarding-dialog');
    const finish = async (useStarter) => {
        const value = instrument.querySelector('select').value, goal = aim.querySelector('select').value;
        await store.settings({ instrument: value, aim: goal, onboardingDone: true });
        if (useStarter) {
            const routine = store.snapshot().routines[0];
            const blocks = value === 'Drums' && routine ? freshBlocks(routine.blocks) : [freeBlock(300, 60, 'Warm-up'), freeBlock(600, 80, goal), freeBlock(300, 80, 'Musical application')];
            await store.save('dailyPlans', { ...metadata(), date: localDate(), sourceRoutineId: value === 'Drums' ? routine?.id : undefined, blocks });
        }
        handle.close();
        notify(useStarter ? 'Your first plan is ready.' : 'Your workspace is ready.');
    };
    handle.dialog.querySelector('.dialog-content').append(el('div', { class: 'onboarding-actions' }, button('Explore first', () => finish(false), 'secondary'), button('Use starter routine', () => finish(true), 'primary', 'arrow')));
}
