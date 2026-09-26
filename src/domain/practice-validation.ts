import type { PracticeProfile, PracticeProtocol, ProtocolOutcome, SongPart, SongTransition, ProtocolState } from './practice-types.js';
import { arr, bool, bpm, id, iso, name, num, obj, one, optional, order, text, uniqueIds, fail, type Validator } from './schema.js';
import { definition, supportedProtocols } from './profiles.js';
import { patternFits } from './protocols.js';
const kind=(v:unknown):unknown=>v!==null&&typeof v==='object'&&'kind' in v?v.kind:undefined;
const hands=one('left','right','together','not-applicable');
const quality=one('major','natural-minor','minor-pentatonic','major-pentatonic','chromatic');
const midi=num(21,108,true), pitchClass=num(0,11,true);
const pulse=obj({bpm,beats:num(1,16,true),beatUnit:one(4,8),subdivision:one(1,2,3,4)});
export const validateProfile:Validator<PracticeProfile>=(v,p='Profile')=>{
  const r=obj({id,name,instrumentType:one('drums','guitar','bass','piano','voice','custom'),family:one('percussion','fretted','bowed','keyboard','wind','pitched','voice','general'),level:one('beginner','intermediate','advanced'),focusAreas:arr(text(100,1),12),defaultSessionMinutes:num(5,180,true),archived:bool,createdAt:iso,updatedAt:iso,attribution:optional(one('selected','exercise-instrument','unresolved-history'))})(v,p);
  if(r.instrumentType!=='custom' && definition(r.instrumentType).family!==r.family)fail(p,'instrument and family do not match');
  if(new Set(r.focusAreas).size!==r.focusAreas.length)fail(p,'focus areas must be unique');
  return r;
};
export const validateProtocol:Validator<PracticeProtocol>=(v,p='Protocol')=>{
  switch(kind(v)){
    case 'free':return obj({kind:one('free'),focus:text(),pulse:optional(pulse)})(v,p);
    case 'tempo':return obj({kind:one('tempo'),pulse,technique:text(),sticking:optional(text(1000)),orchestration:optional(text(1000))})(v,p);
    case 'drum-grid':{const r=obj({kind:one('drum-grid'),pulse,name:text(120,1),focus:text(1000,1),lanes:arr(obj({voice:one('right-hand','left-hand','kick','hihat-foot'),steps:text(64,1)}),4)})(v,p);const expected=r.pulse.beats*r.pulse.subdivision;if(!r.lanes.length||new Set(r.lanes.map(l=>l.voice)).size!==r.lanes.length)fail(p,'drum grid lanes must use unique limb voices');if(r.lanes.some(l=>l.steps.length!==expected||!/^[.xX]+$/.test(l.steps)))fail(p,'drum grid steps must match the meter and subdivision pulse length and use only ., x, or X');return r;}
    case 'drum-phrase':{
      const lane=obj({voice:one('right-hand','left-hand','kick','hihat-foot'),steps:text(64,1)}),bar=obj({role:one('groove','fill','return'),label:text(120,1),lanes:arr(lane,4)});
      const r=obj({kind:one('drum-phrase'),pulse,name:text(160,1),focus:text(2000,1),bars:arr(bar,17)})(v,p),expected=r.pulse.beats*r.pulse.subdivision;
      if(r.bars.length<3)fail(p,'drum phrases need groove, fill and return bars');
      for(const [index,phraseBar] of r.bars.entries()){
        if(!phraseBar.lanes.length||new Set(phraseBar.lanes.map(l=>l.voice)).size!==phraseBar.lanes.length)fail(`${p}.bars[${index}]`,'bar lanes must use unique limb voices');
        if(phraseBar.lanes.some(l=>l.steps.length!==expected||!/^[.xX]+$/.test(l.steps)))fail(`${p}.bars[${index}]`,'lane steps must match the pulse length and use only ., x, or X');
      }
      const fills=r.bars.filter(bar=>bar.role==='fill'),returns=r.bars.filter(bar=>bar.role==='return');
      if(fills.length!==1||returns.length!==1)fail(p,'drum phrases need exactly one fill bar and one return bar');
      if(r.bars.at(-1)?.role!=='return'||r.bars.at(-2)?.role!=='fill'||r.bars.slice(0,-2).some(bar=>bar.role!=='groove'))fail(p,'drum phrase order must be groove bars, one fill bar, then one return bar');
      const landing=r.bars.at(-1)!;
      if(!landing.lanes.some(lane=>lane.steps[0]==='x'||lane.steps[0]==='X'))fail(p,'drum phrase return bar needs at least one hit on beat 1');
      return r;
    }
    case 'repetitions':return obj({kind:one('repetitions'),task:text(),target:num(1,10000,true),pulse:optional(pulse)})(v,p);
    case 'chord-changes':{const r=obj({kind:one('chord-changes'),chords:arr(text(40,1),24),target:num(1,10000,true),technique:text(1000),pulse:optional(pulse)})(v,p);if(r.chords.length<2)fail(p,'choose at least two chords');return r;}
    case 'groove':return obj({kind:one('groove'),pulse,key:text(40),style:text(200),focus:one('time','muting','articulation','coordination'),progression:text(1000)})(v,p);
    case 'scale-cycle':{const r=obj({kind:one('scale-cycle'),keys:arr(pitchClass,12),quality,octaves:one(1,2,3,4),hands,motion:one('parallel','contrary'),fingering:text(1000),position:text(200),pulse:optional(pulse)})(v,p);if(!r.keys.length||new Set(r.keys).size!==r.keys.length)fail(p,'select unique keys');return r;}
    case 'fretboard':{const r=obj({kind:one('fretboard'),tuning:arr(midi,12),strings:arr(num(1,12,true),12),minFret:num(0,24,true),maxFret:num(0,24,true),target:num(1,1000,true)})(v,p);if(!r.tuning.length||!r.strings.length||r.minFret>r.maxFret||new Set(r.strings).size!==r.strings.length||r.strings.some(s=>s>r.tuning.length))fail(p,'check string numbers, tuning and fret bounds');return r;}
    case 'vocal-pattern':{const r=obj({kind:one('vocal-pattern'),startMidi:midi,lowMidi:midi,highMidi:midi,offsets:arr(num(-24,24,true),32),syllable:text(60,1),transpose:one(-2,-1,1,2),noteSeconds:num(.2,3),restSeconds:num(5,120,true)})(v,p);if(!r.offsets.length||r.lowMidi>r.highMidi||!patternFits(r,r.startMidi))fail(p,'the complete starting pattern must fit inside the chosen comfortable range');return r;}
    case 'pitch-match':{const r=obj({kind:one('pitch-match'),rootMidi:midi,interval:num(-24,24,true),target:num(1,1000,true)})(v,p);midi(r.rootMidi+r.interval,p);return r;}
    case 'sight-reading':return obj({kind:one('sight-reading'),material:text(),key:text(40),hands,firstRead:bool,pulse:optional(pulse)})(v,p);
    case 'repertoire':return obj({kind:one('repertoire'),focus:text(),measures:text(200),hands,pulse:optional(pulse)})(v,p);
    default:return fail(p,'unknown practice protocol');
  }
};
const base={id,timestamp:iso,note:text()};
const rating=num(1,5,true),durationSeconds=num(0,31536000);
export const validateOutcome:Validator<ProtocolOutcome>=(v,p='Outcome')=>{
  switch(kind(v)){
    case 'count':{const r=obj({...base,kind:one('count'),protocol:one('repetitions','chord-changes'),clean:num(0,10000,true),total:num(1,10000,true),durationSeconds,source:one('self-report')})(v,p);if(r.clean>r.total)fail(p,'clean repetitions cannot exceed all attempts');return r;}
    case 'groove':return obj({...base,kind:one('groove'),timing:rating,control:rating,articulation:rating,durationSeconds,source:one('self-report')})(v,p);
    case 'scale':return obj({...base,kind:one('scale'),key:pitchClass,hands,quality,mistakes:num(0,1000,true),bpm:optional(bpm),source:one('self-report')})(v,p);
    case 'recall':{const r=obj({...base,kind:one('recall'),string:num(1,12,true),fret:num(0,24,true),expected:pitchClass,answer:pitchClass,correct:bool,source:one('scored-input')})(v,p);if(r.correct!==(r.answer===r.expected))fail(p,'recall score contradicts the answer');return r;}
    case 'voice':return obj({...base,kind:one('voice'),rootMidi:midi,pitch:rating,ease:rating,breath:rating,fatigue:num(0,5,true),source:one('self-report')})(v,p);
    case 'pitch':return obj({...base,kind:one('pitch'),rootMidi:midi,interval:num(-24,24,true),matched:bool,source:one('self-report')})(v,p);
    case 'reading':return obj({...base,kind:one('reading'),firstRead:bool,errors:num(0,1000,true),continuity:rating,source:one('self-report')})(v,p);
    case 'reflection':return obj({...base,kind:one('reflection'),rating,source:one('self-report')})(v,p);
    default:return fail(p,'unknown outcome type');
  }
};
export const validateProtocolState:Validator<ProtocolState>=obj({step:num(0,1000000,true),clean:num(0,1000000,true),total:num(0,1000000,true),rootMidi:optional(midi),lastReferenceAt:optional(iso)});
export function assertProtocolCompatible(p:PracticeProtocol,profile:PracticeProfile):void {
  if(!supportedProtocols(profile).some(s=>s.id===p.kind))fail('Protocol',`${p.kind} is not supported by this profile family`);
  if(p.kind==='tempo'&&p.sticking&&profile.family!=='percussion')fail('Protocol','sticking is only available for percussion');
  if((p.kind==='drum-grid'||p.kind==='drum-phrase')&&profile.family!=='percussion')fail('Protocol','drum grid and phrase tasks are only available for percussion profiles');
}
export function assertOutcomeMatches(outcome:ProtocolOutcome,protocol:PracticeProtocol):void {
  const map:Record<PracticeProtocol['kind'],readonly ProtocolOutcome['kind'][]>={free:['reflection'],tempo:['reflection'],'drum-grid':['reflection'],'drum-phrase':['reflection'],repetitions:['count'],'chord-changes':['count'],groove:['groove'],'scale-cycle':['scale'],fretboard:['recall'],'vocal-pattern':['voice'],'pitch-match':['pitch'],'sight-reading':['reading'],repertoire:['reflection']};
  if(!map[protocol.kind].includes(outcome.kind))fail('Outcome','result does not belong to this protocol');
  if(outcome.kind==='count'&&outcome.protocol!==protocol.kind)fail('Outcome','count result belongs to a different protocol');
  if(outcome.kind==='scale'&&protocol.kind==='scale-cycle'&&(!protocol.keys.includes(outcome.key)||outcome.hands!==protocol.hands||outcome.quality!==protocol.quality))fail('Outcome','scale result does not match the exercise');
  if(outcome.kind==='pitch'&&protocol.kind==='pitch-match'&&(outcome.rootMidi!==protocol.rootMidi||outcome.interval!==protocol.interval))fail('Outcome','reference pitch differs from this exercise');
  if(outcome.kind==='reading'&&protocol.kind==='sight-reading'&&outcome.firstRead&&!protocol.firstRead)fail('Outcome','repeat practice cannot claim a first-read result');
  if(outcome.kind==='scale'&&protocol.kind==='scale-cycle'&&outcome.bpm!==undefined&&!protocol.pulse)fail('Outcome','self-paced scales do not have a tempo target');
  if(outcome.kind==='voice'&&protocol.kind==='vocal-pattern'&&!patternFits(protocol,outcome.rootMidi))fail('Outcome','pattern root exceeds the comfortable range');
  if(outcome.kind==='recall'&&protocol.kind==='fretboard'){
    if(!protocol.strings.includes(outcome.string)||outcome.fret<protocol.minFret||outcome.fret>protocol.maxFret)fail('Outcome','recall prompt outside configured bounds');
    const expected=(protocol.tuning[protocol.tuning.length-outcome.string]!+outcome.fret)%12;
    if(expected!==outcome.expected)fail('Outcome','recall pitch does not match tuning');
  }
}
export const validateSongTransition:Validator<SongTransition>=obj({id,fromSectionId:id,toSectionId:id,name:optional(name),notes:text()});
export const validateSongPart:Validator<SongPart>=(v,p='Part')=>{
  const r=obj({id,profileId:id,name,instrumentType:one('drums','guitar','bass','piano','voice','custom'),notes:text(),key:text(40),status:one('learning','practicing','performance-ready'),tuning:text(200),capo:optional(num(0,12,true)),role:text(200),range:text(100),sections:arr(obj({id,name,bars:optional(num(1,1000,true)),bpmOverride:optional(bpm),notes:text(),order}),200),transitions:optional(arr(validateSongTransition,400))})(v,p);
  uniqueIds(r.sections,`${p}.sections`);if(r.transitions){uniqueIds(r.transitions,`${p}.transitions`);const ids=new Set(r.sections.map(s=>s.id));for(const t of r.transitions){if(t.fromSectionId===t.toSectionId)fail(p,'a transition must connect two different sections');if(!ids.has(t.fromSectionId)||!ids.has(t.toSectionId))fail(p,'transition references an unavailable section');}}return r;
};
