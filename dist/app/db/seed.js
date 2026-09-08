import { DEFAULT_SETTINGS } from '../domain/models.js';
import { nowISO } from '../domain/utils.js';
const rudiments = [
    ['Single Stroke Roll', 'R L R L  R L R L', 'Alternate hands evenly. Match the height, tone, and spacing of both hands before increasing speed.'],
    ['Double Stroke Roll', 'R R L L  R R L L', 'Play two even strokes per hand. Keep the second stroke as clear as the first; use relaxed fingers rather than squeezing.'],
    ['Single Paradiddle', 'R L R R  L R L L', 'Combine two alternating strokes with a double. Let the lead hand change without changing the spacing.'],
    ['Double Paradiddle', 'R L R L R R  L R L R L L', 'Play four alternating strokes followed by a double. Count each six-stroke group steadily.'],
    ['Triple Paradiddle', 'R L R L R L R R  L R L R L R L L L', 'Play six alternating strokes and a double, then switch the leading hand. Keep doubles low and controlled.'],
    ['Paradiddle-Diddle', 'R L R R L L  L R L L R R', 'Start with two alternating strokes followed by two doubles. Practice right- and left-led versions separately, then alternate.'],
    ['Flam', 'lR  rL', 'Use one quiet grace note just before the primary stroke. The hands should not strike at exactly the same time.'],
    ['Flam Accent', 'lR L R  rL R L', 'Play groups of three with a flam on the first primary stroke. Keep the following taps quiet.'],
    ['Flam Tap', 'lR R  rL L', 'Follow each flam with a tap from the primary hand. Prepare the opposite hand for the next grace note.'],
    ['Flam Paradiddle', 'lR L R R  rL R L L', 'Add a flam to the first stroke of each paradiddle. Preserve the even spacing of the primary strokes.'],
    ['Drag', 'llR  rrL', 'Place two quiet grace strokes before a primary stroke. Keep the grace strokes close and the main pulse steady.'],
    ['Single Drag Tap', 'llR L  rrL R', 'Follow a drag with an alternating tap. Separate the grace-stroke timing from the regular primary pulse.'],
    ['Double Drag Tap', 'llR llR L  rrL rrL R', 'Play two dragged primary strokes followed by an alternating tap. Keep the primary strokes evenly spaced.'],
    ['Five Stroke Roll', 'R R L L R  L L R R L', 'Play two doubles followed by a single. Give the finishing single a clear accent without speeding up.'],
    ['Six Stroke Roll', 'R L L R R L  L R R L L R', 'Play a single, two doubles, and a single. Accent the outer singles and let the doubles remain soft.'],
    ['Seven Stroke Roll', 'R R L L R R L  L L R R L L R', 'Join three doubles to a finishing single. Begin slowly enough to control every rebound.'],
    ['Nine Stroke Roll', 'R R L L R R L L R  L L R R L L R R L', 'Play four doubles and one finishing single. Keep the roll level rather than accelerating into the accent.'],
    ['Ten Stroke Roll', 'R R L L R R L L R L', 'Play four doubles followed by two singles. Give both ending singles deliberate space.'],
    ['Eleven Stroke Roll', 'R R L L R R L L R R L', 'Play five doubles and a finishing single. Work on a relaxed transition from the last double to the single.'],
    ['Thirteen Stroke Roll', 'R R L L R R L L R R L L R', 'Play six doubles and a finishing single. Stay even through the middle of the roll.'],
    ['Seventeen Stroke Roll', 'R R L L R R L L R R L L R R L L R', 'Play eight doubles and a finishing single. Keep breathing, and stop if tension replaces control.'],
];
const extras = [
    ['Relaxed Hands Warm-up', 'warmup', 'R L R L', 'Use slow alternating strokes. Start quietly, release unnecessary tension, and gradually explore a comfortable dynamic range.'],
    ['8th-Note Groove Builder', 'groove', '', 'Play even eighth notes on the hi-hat, snare on beats 2 and 4, and a simple kick pattern. Keep the hi-hat pulse unchanged as you move the kick.'],
    ['16th-Note Groove Builder', 'groove', '', 'Keep a quiet, even sixteenth-note hand pattern. Add snare backbeats, then experiment with one kick placement at a time.'],
    ['Ghost Note Control', 'technique', '', 'Alternate a clear backbeat with very quiet snare taps. Make the dynamic contrast obvious while keeping the pulse steady.'],
    ['Hi-Hat Dynamics', 'technique', '', 'Repeat a simple groove while moving between quiet, medium, and strong hi-hat levels. Leave the snare and kick consistent.'],
    ['Kick Independence', 'coordination', '', 'Keep an eighth-note hand pulse and move a single kick stroke through successive sixteenth-note positions. Change one position at a time.'],
    ['Linear Coordination', 'coordination', 'R L K R L K', 'Play one limb at a time, using K for kick. Begin with equal spacing; add accents only when the pattern is stable.'],
    ['Accent Grid', 'timing', 'R L R L  R L R L', 'Move one accent through an otherwise quiet stream of alternating strokes. The unaccented notes must remain evenly spaced.'],
    ['Left-Hand Lead', 'technique', 'L R L R  L R L R', 'Lead alternating strokes with the left hand. Keep the sound and motion balanced; mirror the exercise with the right hand.'],
];
export function seedData(timestamp = nowISO()) {
    const base = { createdAt: timestamp, updatedAt: timestamp, instrument: 'Drums', accents: '', defaultBpm: 80, minBpm: 20, maxBpm: 300, meter: { beats: 4, beatUnit: 4 }, subdivision: 1, notes: '', builtin: true, archived: false };
    const exercises = rudiments.map(([name, sticking, description], i) => ({ ...base, id: `rudiment-${i + 1}`, name, sticking, description, instructions: description, category: 'rudiment', tags: ['hands', 'rudiment'] }));
    exercises.push(...extras.map(([name, category, sticking, description], i) => ({ ...base, id: `exercise-${i + 1}`, name, category, sticking, description, instructions: description, tags: [category] })));
    const ex = (id, minutes) => {
        const exercise = exercises.find(e => e.id === id);
        return { id: `block-${id}-${minutes}`, type: 'exercise', exerciseId: id, title: exercise.name, targetSeconds: minutes * 60, bpm: exercise.defaultBpm, notes: '', order: 0 };
    };
    const free = (title, minutes) => ({ id: `block-${title.toLowerCase().replaceAll(' ', '-')}`, type: 'free', title, targetSeconds: minutes * 60, bpm: 80, notes: title.startsWith('Song') ? 'Replace this free block with a song from your library, or use it for song practice without a saved song.' : '', order: 0 });
    const definitions = [
        ['20-Minute Technique', 'A compact daily reset: relaxed hands, even strokes, and clean transitions.', [ex('exercise-1', 5), ex('rudiment-1', 5), ex('rudiment-2', 5), ex('rudiment-3', 5)]],
        ['30-Minute Drum Practice', 'A balanced session for technique, groove, and a little exploration.', [ex('exercise-1', 5), ex('rudiment-2', 10), ex('exercise-2', 10), free('Free Practice', 5)]],
        ['45-Minute General Drum Practice', 'A full session that connects hand control with musical application.', [ex('exercise-1', 5), ex('rudiment-3', 10), ex('exercise-4', 10), ex('exercise-2', 10), free('Song Practice', 10)]],
        ['60-Minute Worship Preparation', 'Prepare the music, not just the notes. Replace song blocks with your own repertoire.', [ex('exercise-1', 10), ex('exercise-5', 10), free('Song 1', 15), free('Song 2', 15), free('Transitions', 10)]],
    ];
    const routines = definitions.map(([name, description, blocks], i) => ({ id: `routine-${i + 1}`, name, description, blocks: blocks.map((b, order) => ({ ...b, id: `template-${i}-${order}`, order })), scheduledDays: [], tags: ['starter'], builtin: true, archived: false, createdAt: timestamp, updatedAt: timestamp }));
    return { exercises, songs: [], routines, dailyPlans: [], sessions: [], goals: [], setlists: [], metronomePresets: [], settings: structuredClone(DEFAULT_SETTINGS) };
}
