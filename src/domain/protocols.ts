import type { Exercise, Meter, Subdivision } from './models.js';
import type { PracticeProfile, PracticeProtocol, ProtocolKind, Pulse } from './practice-types.js';
export const NOTE_NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'] as const;
export function noteName(midi:number):string{return `${NOTE_NAMES[((midi%12)+12)%12]}${Math.floor(midi/12)-1}`;}
export function frequency(midi:number):number{return 440*2**((midi-69)/12);}
export function pulse(bpm=80):Pulse{return {bpm,beats:4,beatUnit:4,subdivision:1};}
export function exerciseProtocol(e:Exercise):PracticeProtocol {
  return e.protocol ?? {kind:'tempo',pulse:{bpm:e.defaultBpm??80,beats:e.meter?.beats??4,beatUnit:e.meter?.beatUnit??4,subdivision:e.subdivision??1},technique:e.instructions,...(e.sticking?{sticking:e.sticking}: {})};
}
export function protocolPulse(p:PracticeProtocol):Pulse|undefined {return 'pulse' in p ? p.pulse : undefined;}
export function exerciseBpm(e:Exercise):number|undefined {return protocolPulse(exerciseProtocol(e))?.bpm;}
export function exerciseMeter(e:Exercise):Meter {const p=protocolPulse(exerciseProtocol(e));return {beats:p?.beats??4,beatUnit:p?.beatUnit??4};}
export function exerciseSubdivision(e:Exercise):Subdivision {return protocolPulse(exerciseProtocol(e))?.subdivision??1;}
export function defaultProtocol(kind:ProtocolKind,profile:PracticeProfile):PracticeProtocol {
  switch(kind){
    case 'free':return {kind,focus:'Choose one musical goal.'};
    case 'tempo':return {kind,pulse:pulse(80),technique:'Even tone and relaxed movement',...(profile.family==='percussion'?{sticking:'R L R L'}:{})};
    case 'repetitions':return {kind,task:'Repeat a short passage with control.',target:10};
    case 'chord-changes':return {kind,chords:['G','C','D','Em'],target:30,technique:'Slow clean changes'};
    case 'groove':return {kind,pulse:pulse(80),key:'C',style:'Straight eighths',focus:profile.instrumentType==='bass'?'muting':'time',progression:'C – F – G – C'};
    case 'scale-cycle':return {kind,keys:[0,7,2,5],quality:'major',octaves:1,hands:profile.family==='keyboard'?'right':'not-applicable',motion:'parallel',fingering:'Use a comfortable consistent fingering.',position:'',pulse:pulse(60)};
    case 'fretboard':return {kind,tuning:profile.instrumentType==='bass'?[28,33,38,43]:[40,45,50,55,59,64],strings:[1,2],minFret:0,maxFret:5,target:12};
    case 'vocal-pattern':return {kind,startMidi:60,lowMidi:55,highMidi:67,offsets:[0,4,7,4,0],syllable:'mum',transpose:1,noteSeconds:.6,restSeconds:10};
    case 'pitch-match':return {kind,rootMidi:60,interval:0,target:6};
    case 'sight-reading':return {kind,material:'Use a new, short passage from your own score.',key:'C',hands:profile.family==='keyboard'?'together':'not-applicable',firstRead:true};
    case 'repertoire':return {kind,focus:'Choose a phrase from your own repertoire.',measures:'',hands:profile.family==='keyboard'?'together':'not-applicable'};
  }
}
export function protocolSummary(p:PracticeProtocol):string {
  switch(p.kind){
    case 'free':return p.focus;
    case 'tempo':return [p.sticking,p.technique,`${p.pulse.bpm} BPM`].filter(Boolean).join(' · ');
    case 'repetitions':return `${p.target} clean repetitions · ${p.task}`;
    case 'chord-changes':return `${p.chords.join(' → ')} · ${p.target} clean changes`;
    case 'groove':return `${p.style} · ${p.key} · ${p.focus} · ${p.pulse.bpm} BPM`;
    case 'scale-cycle':return `${p.keys.map(k=>NOTE_NAMES[k]).join(' / ')} · ${p.quality.replaceAll('-',' ')} · ${p.hands==='not-applicable'?p.position:p.hands+' hands'} · ${p.octaves} octave${p.octaves===1?'':'s'}`;
    case 'fretboard':return `Strings ${p.strings.join(', ')} · frets ${p.minFret}–${p.maxFret} · ${p.target} notes`;
    case 'vocal-pattern':return `${p.syllable} · ${noteName(p.startMidi)} · range ${noteName(p.lowMidi)}–${noteName(p.highMidi)}`;
    case 'pitch-match':return `${noteName(p.rootMidi)} · ${p.interval===0?'match pitch':p.interval+' semitones'} · self-assessed`;
    case 'sight-reading':return `${p.firstRead?'First read':'Repeat reading'} · ${p.material}`;
    case 'repertoire':return [p.measures,p.focus].filter(Boolean).join(' · ');
  }
}
/** Deterministic permutation, independent of frame-rate or Math.random. */
export function fretPrompt(p:Extract<PracticeProtocol,{kind:'fretboard'}>,step:number):{string:number;fret:number;midi:number;pitchClass:number}{
  const width=p.maxFret-p.minFret+1,index=step%(p.strings.length*width);
  const string=p.strings[index%p.strings.length]!,fret=p.minFret+Math.floor(index/p.strings.length);
  const midi=p.tuning[p.tuning.length-string]!+fret;return {string,fret,midi,pitchClass:midi%12};
}
export function patternFits(p:Extract<PracticeProtocol,{kind:'vocal-pattern'}>,root:number):boolean{
  return p.offsets.every(n=>root+n>=p.lowMidi && root+n<=p.highMidi);
}
export function scaleOffsets(quality:Extract<PracticeProtocol,{kind:'scale-cycle'}>['quality']):number[]{
  return {major:[0,2,4,5,7,9,11,12],'natural-minor':[0,2,3,5,7,8,10,12],'minor-pentatonic':[0,3,5,7,10,12],'major-pentatonic':[0,2,4,7,9,12],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11,12]}[quality];
}
/** Scientific pitch names; e.g. C4, F#3, B♭2. */
export function parseNote(value:string):number {
  const match=/^([A-Ga-g])([#♯b♭]?)(-?\d)$/.exec(value.trim());
  if(!match)throw new Error(`Use a pitch such as C4 or F♯3, not “${value}”.`);
  const base=({C:0,D:2,E:4,F:5,G:7,A:9,B:11} as Record<string,number>)[match[1]!.toUpperCase()]!;
  return (Number(match[3])+1)*12+base+(['#','♯'].includes(match[2]!)?1:['b','♭'].includes(match[2]!)?-1:0);
}
