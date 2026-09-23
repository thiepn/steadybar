import type { InstrumentType } from './practice-types.js';

export interface RepertoireGuide {
  id:string;
  title:string;
  summary:string;
  instructions:string;
  minutes:number;
  scope:'song'|'section';
}

const commonFullTake=(instrument:string):RepertoireGuide=>({
  id:'full-take-repair',title:'Complete take → repair → retake',minutes:12,scope:'song',
  summary:`Finish a bounded ${instrument} take before choosing one high-impact repair.`,
  instructions:'Complete the planned song/form without restarting for minor errors. After the take, identify one recurring or high-impact issue, repair a short contextual window, then retake the same material with the main arrangement choices unchanged.',
});

export function repertoireGuides(type:InstrumentType):readonly RepertoireGuide[]{
  if(type==='drums')return [
    {id:'section-role-map',title:'Section role map',minutes:8,scope:'section',summary:'Stabilize the essential groove role before adding fills.',instructions:'Define the section’s time source, backbeat, kick anchors, dynamic level, and one optional variation. Play the simplest repeatable version first, then add only one planned variation if the pulse remains stable.'},
    {id:'transition-return',title:'Transition and downbeat return',minutes:7,scope:'section',summary:'Practice the section entry/exit around fills and cymbal changes.',instructions:'Include at least one bar before the transition and one bar after it. Keep the next beat one more important than fill complexity; repeat the same transition decision until the return is dependable.'},
    {id:'dynamic-arc',title:'Dynamic arc',minutes:8,scope:'section',summary:'Change intensity without changing tempo or losing the backbeat.',instructions:'Play the section at planned quiet, medium, and stronger levels. Keep the underlying pulse and backbeat placement stable, and practice the return to the quieter texture as carefully as the build.'},
    commonFullTake('drum'),
  ];
  if(type==='guitar')return [
    {id:'texture-map',title:'Section texture map',minutes:8,scope:'section',summary:'Choose one repeatable register/rhythm texture for the section.',instructions:'Choose the essential chord shapes, register, muting, and rhythmic motion for this section. Keep the part repeatable before adding fills, riffs, or alternate voicings.'},
    {id:'transition-window',title:'Contextual chord transition',minutes:7,scope:'section',summary:'Repair a difficult change with its real entrance and exit.',instructions:'Choose the difficult chord or riff event, include the final beat before it and first beat after it, and repeat that short window. Retest inside the complete section after several controlled repetitions.'},
    {id:'rhythm-engine',title:'Continuous rhythm engine',minutes:8,scope:'section',summary:'Keep subdivision motion through chord changes and dynamics.',instructions:'Maintain the chosen subdivision motion even when strokes are muted or omitted. Let chord changes occur inside that motion; compare quiet and stronger versions without changing tempo.'},
    commonFullTake('guitar'),
  ];
  if(type==='bass')return [
    {id:'anchor-map',title:'Bass anchor map',minutes:8,scope:'section',summary:'Define the minimum harmonic and rhythmic anchors first.',instructions:'Mark chord-change roots, important shared drum anchors, and planned note endings. Play the minimum dependable version before adding anticipations, passing tones, or rhythmic decoration.'},
    {id:'length-contrast',title:'Note-length contrast',minutes:7,scope:'section',summary:'Use releases and sustain as arrangement choices.',instructions:'Compare shorter and sustained versions while keeping pitch and attack placement unchanged. Choose the version that supports the section and make every release intentional.'},
    {id:'kick-relationship',title:'Selective kick relationship',minutes:8,scope:'section',summary:'Coordinate with the kick without copying every note.',instructions:'Choose one or two shared rhythmic anchors with the kick/drum reference. Preserve the bass line’s harmonic role and compare the sparse and more coordinated versions at the same tempo.'},
    commonFullTake('bass'),
  ];
  if(type==='piano')return [
    {id:'texture-map',title:'Accompaniment texture map',minutes:8,scope:'section',summary:'Choose a repeatable density, register, and hand role.',instructions:'Define the left-hand role, right-hand voicing texture, register, and rhythmic density for the section. Keep that version stable before adding fills, pedal detail, or extra inner voices.'},
    {id:'voice-leading',title:'Voice-leading window',minutes:7,scope:'section',summary:'Connect chords with economical prepared motion.',instructions:'Identify common tones and nearby chord tones through the section. Practice the most difficult two or three chord connections in context while keeping the harmonic rhythm unchanged.'},
    {id:'form-reading',title:'Chart-to-accompaniment pass',minutes:8,scope:'song',summary:'Reduce a chart/form to the simplest continuous playable part.',instructions:'Mark form, repeats, stops, chord-change locations, and ending cues. Play the simplest accompaniment that preserves those events, recovering forward from small mistakes instead of stopping.'},
    commonFullTake('piano'),
  ];
  if(type==='voice')return [
    {id:'phrase-map',title:'Phrase and breath map',minutes:6,scope:'section',summary:'Plan comfortable breaths, diction priorities, and one intensity peak.',instructions:'Mark comfortable breath points and two diction priorities before singing. Speak the phrase first, then sing the section once at an easy level. Stop if pain, persistent hoarseness, or rising fatigue appears.'},
    {id:'entrance-prep',title:'Prepared entrance',minutes:5,scope:'section',summary:'Separate the reference pitch and count from the lyric entrance.',instructions:'Hear the starting reference, imagine the target, reproduce it briefly if useful, count the entrance, then sing only the opening phrase. Rest between attempts and keep the full interval inside your comfortable range.'},
    {id:'harmony-line',title:'Harmony-line independence',minutes:6,scope:'section',summary:'Stabilize your harmony line before adding another part.',instructions:'Practice the harmony phrase alone at comfortable volume. Add a permitted melody reference only after your own entrance and release are stable. Do not sing louder to compete with the reference.'},
    {...commonFullTake('vocal'),minutes:8,summary:'Use one bounded take, one repair, and enough rest to stay comfortable.',instructions:'Complete one bounded repertoire take, then choose one entrance, breath, lyric, harmony, or phrasing repair. Rest before the repair and retake only if the voice remains comfortable; stop for pain, persistent hoarseness, or rising fatigue.'},
  ];
  return [
    {id:'target',title:'Observable repertoire target',minutes:7,scope:'section',summary:'Define bounded material and one observable criterion.',instructions:'Choose one short passage and one criterion such as continuity, timing, target events, articulation, or another teacher-approved feature. Keep the criterion fixed while judging the attempt.'},
    {id:'context-window',title:'Contextual repair window',minutes:7,scope:'section',summary:'Practice the event with enough entrance and exit context.',instructions:'Include one or two events before the problem and at least one event after it. Simplify one variable if necessary, then retest the same event inside the longer phrase.'},
    commonFullTake('repertoire'),
    {id:'later-day',title:'Later-day retention check',minutes:6,scope:'section',summary:'Attempt a repaired passage before extended repetition.',instructions:'On a later day, try the passage once before warming it up through repeated practice. Record what remained dependable, then repair only what actually needs attention.'},
  ];
}
