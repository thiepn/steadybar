import type { Exercise, Routine, RoutineBlock } from '../domain/models.js';
import type { Experience, PracticeProfile, PracticeProtocol } from '../domain/practice-types.js';
import { definition } from '../domain/profiles.js';
import { defaultProtocol, exerciseProtocol, protocolPulse, pulse } from '../domain/protocols.js';
import { seedData } from './seed.js';

type ContentRow = [name:string,skill:string,instructions:string,protocol:PracticeProtocol,level?:Experience];
const free=(focus:string):PracticeProtocol=>({kind:'free',focus});
const tempo=(technique:string,bpm=60):PracticeProtocol=>({kind:'tempo',technique,pulse:pulse(bpm)});
const rep=(task:string,target=10):PracticeProtocol=>({kind:'repetitions',task,target});
const chords=(sequence:string[],technique='One clean change at a time',target=30):PracticeProtocol=>({kind:'chord-changes',chords:sequence,technique,target});
const scale=(keys:number[],quality:'major'|'natural-minor'|'minor-pentatonic'|'major-pentatonic'|'chromatic'='major',hands:'left'|'right'|'together'|'not-applicable'='not-applicable',position=''):PracticeProtocol=>({kind:'scale-cycle',keys,quality,octaves:1,hands,motion:'parallel',fingering:'Choose a consistent, comfortable fingering.',position,pulse:pulse(60)});
const groove=(style:string,focus:'time'|'muting'|'articulation'|'coordination'='time',progression='C – F – G – C'):PracticeProtocol=>({kind:'groove',style,focus,progression,key:'C',pulse:pulse(80)});
const fret=(bass=false,minFret=0,maxFret=5,strings=[1,2]):PracticeProtocol=>({kind:'fretboard',tuning:bass?[28,33,38,43]:[40,45,50,55,59,64],strings,minFret,maxFret,target:12});
const reading=(material:string,hands:'left'|'right'|'together'|'not-applicable'='not-applicable'):PracticeProtocol=>({kind:'sight-reading',material,key:'C',hands,firstRead:true});
const repertoire=(focus:string,hands:'left'|'right'|'together'|'not-applicable'='not-applicable'):PracticeProtocol=>({kind:'repertoire',focus,measures:'Choose a short phrase',hands});
const vocal=(offsets=[0,2,4,2,0],syllable='mum'):PracticeProtocol=>({kind:'vocal-pattern',startMidi:60,lowMidi:55,highMidi:67,offsets,syllable,transpose:1,noteSeconds:.7,restSeconds:10});
const pitch=(interval=0,rootMidi=60):PracticeProtocol=>({kind:'pitch-match',rootMidi,interval,target:6});
const guitar:ContentRow[]=[
 ['Relaxed string crossings','warmup','Play adjacent open strings slowly. Keep the picking movement small; stop and reset if you grip harder.',tempo('Adjacent-string picking')],
 ['G to C changes','chords','Alternate G and C for one minute. Count only changes where every intended string sounds clearly. Enter your totals after playing.',chords(['G','C'])],
 ['Am to Em changes','chords','Move between Am and Em. Release unnecessary finger pressure during the change; check for muted notes.',chords(['Am','Em'])],
 ['D to G changes','chords','Alternate D and G without rushing the final beat. Count clean changes, not speed alone.',chords(['D','G'])],
 ['Four-chord cycle','chords','Play G, C, D and Em in order. Use a consistent rhythm and listen for complete chord tone.',chords(['G','C','D','Em'])],
 ['Triads on the top strings','chords','Choose C, F and G triads on the top three strings. Move with minimal position change.',chords(['C','F','G'],'Top-three-string triads',12),'intermediate'],
 ['Major-seventh movement','chords','Move between Cmaj7, Am7, Dm7 and G7. Check individual chord tones before adding a rhythm.',chords(['Cmaj7','Am7','Dm7','G7'],'Voice-leading',16),'intermediate'],
 ['Even downstrokes','rhythm','Strum relaxed quarter notes on one familiar chord. Keep the pulse even through four bars.',tempo('Quarter-note downstrokes',70)],
 ['Down-up eighths','rhythm','Keep the hand moving evenly. Use a familiar chord and listen for balanced down- and upstrokes.',tempo('Down-up eighth-note strumming',60)],
 ['Muted rhythm accents','rhythm','Mute the strings lightly. Play a steady rhythm and accent only beats two and four.',groove('Muted eighth-note strum','articulation')],
 ['Single-string alternate picking','technique','Use alternate down-up strokes on one string. Keep the note lengths even and the hand relaxed.',tempo('Alternate picking on one string')],
 ['Two-string picking','technique','Repeat a two-note pattern across adjacent strings. Check that string changes do not add an extra pause.',tempo('Alternate picking across two strings')],
 ['Fingerstyle alternation','technique','Alternate index and middle fingers on an open string. Match volume before changing strings.',tempo('Index-middle alternation')],
 ['Hammer-on clarity','technique','Play a short two-note hammer-on. Count repetitions where the second note speaks clearly without excessive force.',rep('Two-note hammer-on',12)],
 ['Pull-off clarity','technique','Play a short two-note pull-off. Keep the open or lower note controlled; compare the two note levels.',rep('Two-note pull-off',12)],
 ['Bend and compare','technique','Play a target note first, then a bend to that pitch. Listen rather than pulling farther by habit.',rep('Bend to a heard target pitch',8),'intermediate'],
 ['Vibrato control','technique','Sustain a comfortable note and add slow, even vibrato. Stop after each attempt and compare control.',rep('Controlled vibrato',8),'intermediate'],
 ['Low-string note recall','fretboard','Name the prompted note before selecting an answer. String 1 is the highest-pitched string.',fret(false,0,5,[5,6])],
 ['Top-string note recall','fretboard','Find each note on strings one and two. Sound it on the instrument before answering.',fret(false,0,5,[1,2])],
 ['Middle-string note recall','fretboard','Name notes on strings three and four, using octave relationships when helpful.',fret(false,0,7,[3,4])],
 ['Fifth-position note recall','fretboard','Find notes between frets five and nine. Answer without following a fixed scale shape.',fret(false,5,9,[1,2,3,4,5,6]),'intermediate'],
 ['A minor pentatonic','scales','Play one octave of A minor pentatonic. Use the displayed position and a consistent fingering.',scale([9],'minor-pentatonic','not-applicable','5th position')],
 ['Major scale key cycle','scales','Play a major scale in each selected key. Complete one controlled pass before advancing.',scale([0,7,2],'major','not-applicable','Choose one position')],
 ['Natural minor comparison','scales','Compare A and E natural minor. Name the root before each pass.',scale([9,4],'natural-minor','not-applicable','Comfortable position')],
 ['Triad arpeggio clarity','arpeggios','Choose a major triad and play its notes separately. Let only the intended notes ring.',tempo('Triad arpeggio with controlled muting')],
 ['Two-note improvisation','improvisation','Improvise using only two notes over a chord you can hear or imagine. Vary rhythm, space and dynamics.',free('Two-note improvisation; prioritize phrasing')],
 ['Transcribe one short phrase','improvisation','Use a recording you own or are permitted to use. Sing a short phrase, find it on the guitar, then compare.',rep('Sing, find and check a short phrase',5)],
 ['First-read melody','reading','Choose a new short melody from your own score or tab. Keep moving; log the first read separately from later practice.',reading('A new 4–8 bar melody from your own score or tab')],
 ['Repertoire transition','repertoire','Choose two adjacent sections of your song. Practice the last bar of one and the first bar of the next.',repertoire('Section-to-section transition')],
 ['Solo phrase isolation','repertoire','Select a short difficult phrase, identify the specific problem and practice its entry and exit as well as the notes.',repertoire('A short solo phrase'),'intermediate'],
];
const bass:ContentRow[]=[
 ['Even open-string alternation','warmup','Alternate index and middle fingers slowly. Listen for an even level and release unnecessary tension.',tempo('Relaxed alternating fingers')],
 ['Quarter-note pocket','groove','Choose one note. Match a quarter-note click for two minutes without filling the spaces.',groove('Quarter-note foundation')],
 ['Eighth-note pocket','groove','Play even eighth notes. Keep the note lengths and dynamic level consistent through the whole phrase.',groove('Straight eighth-note foundation')],
 ['Sixteenth-note funk','groove','Repeat a short sixteenth-note idea. Keep the rests silent and do not add notes when the groove becomes comfortable.',groove('Sixteenth-note funk','articulation'),'intermediate'],
 ['Root-fifth movement','harmony','Follow C, F and G using roots and fifths. Hear the chord change before moving.',groove('Root and fifth','time','C – F – G – C')],
 ['Unplayed-string muting','muting','Play a simple line across two strings. After each pass listen for unwanted ringing from every unplayed string.',groove('Two-string line','muting')],
 ['Left-hand release','muting','End each note intentionally by releasing pressure without lifting far from the string.',groove('Short quarter-note releases','muting')],
 ['Rest placement','muting','Repeat a one-bar phrase with a rest on beat four. Keep the rest fully silent each time.',groove('One-bar phrase with a rest','muting')],
 ['Long and short notes','technique','Alternate a bar of sustained notes with a bar of short notes. Keep timing unchanged.',groove('Contrasting note lengths','articulation')],
 ['String crossing','technique','Play a small pattern across adjacent strings with consistent alternation and muting.',tempo('Adjacent-string fingerstyle')],
 ['Pick articulation','technique','Use even alternate picking on one note. Compare tone and level across down and up strokes.',tempo('Alternate pick articulation')],
 ['Octave clarity','technique','Play a root and its octave. Stop unwanted ringing and count controlled pairs.',rep('Clean root-octave pair',12)],
 ['Position shifts','technique','Choose two nearby positions. Shift during a planned space, aiming for a relaxed arrival.',rep('Controlled two-position shift',10),'intermediate'],
 ['Low-string recall','fretboard','Name notes on the two lowest strings. String 1 is the highest string in the configured tuning.',fret(true,0,5,[3,4])],
 ['Upper-string recall','fretboard','Sound and name notes on the upper two strings, checking octave relationships.',fret(true,0,7,[1,2])],
 ['Full-neck recall','fretboard','Identify prompted notes between frets five and nine on all four strings.',fret(true,5,9,[1,2,3,4]),'intermediate'],
 ['Major scale roots','harmony','Play C, F and G major. Name the root and third before each controlled pass.',scale([0,5,7])],
 ['Natural minor roots','harmony','Compare A and E natural minor. Listen to the minor third in each key.',scale([9,4],'natural-minor')],
 ['Chord-tone targeting','harmony','Over Dm7, G7 and Cmaj7, aim for a chord tone on each new chord. Write down the note choices afterward.',groove('Chord-tone targeting','time','Dm7 – G7 – Cmaj7'),'intermediate'],
 ['Walking in C','walking','Build a four-note line through each chord. Start with roots on beat one; connect the remaining beats deliberately.',groove('Quarter-note walking','time','Cmaj7 – Am7 – Dm7 – G7'),'intermediate'],
 ['Blues form awareness','walking','Follow a twelve-bar blues you know. Keep the form intact and use simple notes rather than filling every gap.',groove('Twelve-bar blues','time','Use your own 12-bar form'),'intermediate'],
 ['Swing note lengths','groove','Play a familiar swing line with the click. Compare duration and placement; do not equate feel with speed.',groove('Swing articulation','articulation'),'intermediate'],
 ['First-read bass line','reading','Use a new short line from your own score. Preserve the pulse and log the first attempt before rehearsing it.',reading('New 4–8 bar bass line from your own score')],
 ['Repertoire groove','repertoire','Choose the main groove of a song. Practice a whole phrase including its rests and ending.',repertoire('Main groove, rests and ending')],
 ['Fill into the next section','repertoire','Practice one fill together with the groove before and after it. Prioritize arriving at the next section on time.',repertoire('Fill and re-entry'),'intermediate'],
];
const piano:ContentRow[]=[
 ['Five-finger ease','warmup','Play a comfortable five-note pattern quietly. Keep the wrist free and release tension between passes.',tempo('Comfortable five-finger pattern')],
 ['C major right hand','scales','Play one octave ascending and descending. Use a consistent fingering and listen for even tone.',scale([0],'major','right')],
 ['C major left hand','scales','Play one octave with the left hand. Make thumb crossings smooth without forcing speed.',scale([0],'major','left')],
 ['C major hands together','scales','Combine hands only at a tempo where both remain controlled. Pause to reset when coordination is lost.',scale([0],'major','together')],
 ['G major right hand','scales','Name F-sharp before playing. Keep the same tonal balance through the crossing.',scale([7],'major','right')],
 ['G major left hand','scales','Play slowly enough to hear each note clearly. Use a consistent fingering.',scale([7],'major','left')],
 ['F major hands together','scales','Prepare the B-flat and practice the crossing slowly before the full pass.',scale([5],'major','together')],
 ['D and A major cycle','scales','Play each key once, then advance. Log the key and hand configuration actually practiced.',scale([2,9],'major','together'),'intermediate'],
 ['Flat-key cycle','scales','Work through B-flat and E-flat major. Prioritize accurate key signatures and relaxed crossings.',scale([10,3],'major','together'),'intermediate'],
 ['Minor scale comparison','scales','Compare A and E natural minor. Hear the different scale degrees instead of only remembering a shape.',scale([9,4],'natural-minor','right')],
 ['Left-hand minor cycle','scales','Use A and D natural minor. Keep tone even across the thumb and longer fingers.',scale([9,2],'natural-minor','left')],
 ['Chromatic control','technique','Play a one-octave chromatic scale slowly. Choose appropriate chromatic fingering and avoid pressing harder for speed.',scale([0],'chromatic','right'),'intermediate'],
 ['Parallel motion','independence','Play a familiar scale with both hands moving in parallel. Match articulation and release.',scale([0,7],'major','together')],
 ['Contrary motion','independence','Start on a shared C and move hands outward using a familiar contrary-motion fingering.',{...scale([0],'major','together'),kind:'scale-cycle',keys:[0],quality:'major',octaves:1,hands:'together',motion:'contrary',fingering:'Use a familiar C-major contrary-motion fingering.',position:'',pulse:pulse(60)},'intermediate'],
 ['Triad inversions in C','chords','Move through C root position, first inversion and second inversion. Name the bass note each time.',chords(['C','C/E','C/G'],'Triad inversion cycle',12)],
 ['Triad inversions in G','chords','Play G, G/B and G/D. Release before moving and keep the top note controlled.',chords(['G','G/B','G/D'],'Triad inversion cycle',12)],
 ['Common-chord voice leading','chords','Move between C, F, G and Am. Keep common tones where comfortable instead of jumping every voice.',chords(['C','F','G','Am'],'Smooth voice leading',16)],
 ['Seventh-chord voicings','voicings','Choose a comfortable voicing for Dm7, G7 and Cmaj7. Practice slowly and listen to the moving voices.',chords(['Dm7','G7','Cmaj7'],'Seventh-chord voicings',12),'intermediate'],
 ['Left-hand shell voicings','voicings','Use a root and a guide tone from a chord you know. Play the progression with clear releases.',chords(['Dm7','G7','Cmaj7'],'Left-hand shell voicings',12),'intermediate'],
 ['Broken triad arpeggios','arpeggios','Play a familiar triad as separate notes. Keep the hand flexible and avoid reaching ahead rigidly.',tempo('Broken triad arpeggio')],
 ['Melody above accompaniment','independence','Choose a simple phrase. Keep the melody audible while the accompaniment remains softer.',rep('Balanced melody and accompaniment',8),'intermediate'],
 ['Legato versus detached','technique','Repeat one short phrase legato, then detached. Keep tempo stable while changing articulation.',rep('Two articulations of one phrase',8)],
 ['Dynamic contour','technique','Play a five-note pattern with a gentle rise and fall in volume. Keep the loudest note controlled.',rep('Controlled dynamic contour',8)],
 ['Pedal release listening','technique','Use a familiar chord change. Listen for blur and coordinate pedal release with the new harmony.',rep('Clear pedal release at a chord change',8),'intermediate'],
 ['Right-hand first read','sight-reading','Choose unfamiliar, easy material. Read without restarting; log first-read continuity before repeating.',reading('Unfamiliar easy melody from your own score','right')],
 ['Left-hand first read','sight-reading','Choose a short bass-clef line you have not rehearsed. Maintain the pulse and log the attempt.',reading('Unfamiliar short bass-clef line','left')],
 ['Hands-together first read','sight-reading','Use material easier than your rehearsed repertoire. Continue through errors rather than restarting.',reading('Unfamiliar easy two-staff passage','together')],
 ['Left-hand passage','repertoire','Choose a difficult accompaniment phrase. Practice the left hand alone and include its entry.',repertoire('Left-hand accompaniment passage','left')],
 ['Hands-together passage','repertoire','Join a short passage after separate-hand work. Reduce tempo until coordination is secure.',repertoire('Combine a short passage','together')],
 ['Chord-based improvisation','improvisation','Choose two familiar chords. Create a short melody using space and repetition, then reflect on the phrasing.',free('Improvise over two familiar chords')],
];
const voice:ContentRow[]=[
 ['Quiet preparation','warmup','Check how your voice feels. Do not sing through hoarseness, pain or fatigue. Rest instead; adjust reference pitches to your comfortable range.',free('Check comfort; prepare or choose rest')],
 ['Comfortable hum','warmup','At a comfortable pitch and low effort, hum briefly then rest. The reference is optional, not a prescribed range.',pitch(0,60)],
 ['Gentle three-note pattern','warmup','Use a gentle hum or comfortable syllable. Set bounds before starting; stop rather than push through strain.',vocal([0,2,4,2,0],'mm')],
 ['Lip-trill pattern','warmup','Use a familiar easy lip trill only if it feels comfortable. Follow the short pattern, then rest. Do not force the trill.',vocal([0,2,4,2,0],'lip trill')],
 ['Single reference match','pitch','Listen to the reference, then sing it at an easy level. Compare by ear. The app is not listening or scoring your voice.',pitch()],
 ['Another comfortable reference','pitch','Choose a comfortable reference pitch. Listen, reproduce it, then rate your own match.',pitch(0,57)],
 ['Major-second match','ear-training','Hear the root and target. Sing the two-note interval and compare by ear.',pitch(2)],
 ['Minor-third match','ear-training','Listen to the two notes, sing them back, and judge the interval without increasing volume.',pitch(3)],
 ['Major-third match','ear-training','Hear the interval before reproducing it. Rest between attempts.',pitch(4)],
 ['Perfect-fourth match','ear-training','Use the reference to hear the distance. Change the root if the target lies outside your comfortable range.',pitch(5)],
 ['Perfect-fifth match','ear-training','Listen first; sing only where the interval feels easy. Lower the reference rather than reaching.',pitch(7)],
 ['Descending third','ear-training','Hear a descending major third and reproduce it without sliding unless intentionally practicing a glide.',pitch(-4,64)],
 ['Three-note mum','tone','Sing a comfortable three-note pattern on mum. Compare ease and consistency, not loudness.',vocal([0,2,4,2,0],'mum')],
 ['Five-note vowel pattern','tone','Use a comfortable vowel on a five-note pattern. Keep the effort easy and the vowels consistent.',vocal([0,2,4,5,7,5,4,2,0],'oo')],
 ['Triad pattern','agility','Listen to 1–3–5–3–1, then reproduce it slowly. Keep all pitches within your chosen limits.',vocal([0,4,7,4,0],'mum')],
 ['Descending five-note pattern','agility','Start where the top note is comfortable. Keep the descent controlled rather than dropping the last notes.',vocal([7,5,4,2,0],'noo')],
 ['Short articulation pattern','diction','Use a light familiar syllable. Let consonants clarify the phrase without adding jaw tension.',vocal([0,2,4,2,0],'da')],
 ['Vowel consistency','diction','Repeat the short pattern on one chosen vowel. Listen for unintended vowel changes as pitch moves.',vocal([0,4,7,4,0],'ah')],
 ['Phrase breath planning','breath','Mark comfortable breath points in a short lyric. Speak it first, then sing it without holding your breath or forcing a long phrase.',repertoire('Plan comfortable breaths in a short phrase')],
 ['Easy phrase onset','breath','Use a short phrase at comfortable pitch and volume. Reflect on ease; do not treat long breath holds as a target.',repertoire('Comfortable phrase beginning')],
 ['Harmony reference','harmony','Hear a root and third, then reproduce the upper note. This is reference practice, not an automated harmony assessment.',pitch(4)],
 ['Harmony part isolation','harmony','Use your own arrangement. Practice a short harmony phrase, then compare with a permitted reference recording.',repertoire('Isolate your harmony phrase')],
 ['First-read singing','sight-singing','Choose a new short melody within a comfortable range. Hear the starting pitch separately and log the first read.',reading('New short melody from your own score, in a comfortable range')],
 ['Repertoire phrase','repertoire','Choose a short lyric phrase. Mark breathing and diction cues; pause whenever the voice becomes tired.',repertoire('One lyric phrase with breath and diction cues')],
 ['Listening and reflection','repertoire','Listen to a recording you are permitted to use or review your own recording outside the app. Note one concrete change for next time.',free('Listen and choose one next practice goal')],
];
export function starterContent(profile:PracticeProfile):{exercises:Exercise[];routines:Routine[]} {
  const timestamp=profile.createdAt,label=definition(profile.instrumentType).label;
  const base={profileId:profile.id,instrument:label,createdAt:timestamp,updatedAt:timestamp,notes:'',builtin:true,archived:false,tags:['starter'],category:'technique' as const};
  let exercises:Exercise[];
  let oldRoutines:Routine[]=[];
  if(profile.instrumentType==='drums'){
    const legacy=seedData(timestamp);const canonical=profile.id==='profile-drums';
    exercises=legacy.exercises.map(e=>({...e,...base,category:e.category,tags:[...new Set([...e.tags,'starter'])],id:canonical?e.id:`${profile.id}.${e.id}`,skillArea:e.category==='rudiment'?'rudiments':e.category,protocol:exerciseProtocol(e),level:'beginner'}));
    oldRoutines=legacy.routines.map(r=>({...r,profileId:profile.id,id:canonical?r.id:`${profile.id}.${r.id}`,blocks:r.blocks.map(b=>({...b,profileId:profile.id,exerciseId:b.exerciseId?(canonical?b.exerciseId:`${profile.id}.${b.exerciseId}`):undefined}))}));
  }else{
    const fallback:ContentRow[]=[['Prepare and warm up','warmup','Choose a familiar, low-effort task appropriate to your instrument. Stop if it causes pain or strain.',free('Familiar gentle preparation')],['Clean passage repetitions','technique','Choose a short task from your own material. Count clean attempts after each round.',rep('A short familiar passage')],['First-read practice','reading','Use new material from your own score and distinguish first reading from rehearsal.',reading('Your own new short score')],['Repertoire phrase','repertoire','Select a short phrase, define one musical goal and reflect after playing.',repertoire('A phrase from your own repertoire')]];
    const rows=({guitar,bass,piano,voice,custom:fallback} as const)[profile.instrumentType];
    exercises=rows.map(([name,skillArea,instructions,protocol,level='beginner'],i)=>({...base,id:`${profile.id}.exercise-${i+1}`,name,skillArea,description:instructions.split('. ')[0]+'.',instructions,protocol:structuredClone(protocol),level}));
    if(profile.instrumentType==='custom'){
      const kinds=profile.family==='fretted'?['fretboard','scale-cycle'] as const:profile.family==='voice'?['vocal-pattern','pitch-match'] as const:['bowed','wind','pitched','keyboard'].includes(profile.family)?['pitch-match','scale-cycle'] as const:['tempo'] as const;
      for(const kind of kinds)exercises.push({...base,id:`${profile.id}.${kind}`,name:kind.replaceAll('-',' '),skillArea:'technique',description:'Configure this task for your instrument.',instructions:'Set the parameters to match your instrument and teacher’s guidance. This is a configurable task, not a specialist curriculum.',protocol:defaultProtocol(kind,profile),level:'beginner'});
    }
  }
  for(const exercise of exercises){
    const kind=exercise.protocol!.kind;
    exercise.defaultSeconds=kind==='chord-changes'?60:kind==='vocal-pattern'||kind==='pitch-match'?120:kind==='sight-reading'||kind==='fretboard'?180:300;
  }
  const pick=(skills:string[],used:Set<string>):Exercise=>exercises.find(e=>skills.includes(e.skillArea??'')&&!used.has(e.id))??exercises.find(e=>!used.has(e.id))??exercises[0]!;
  const sections:Record<PracticeProfile['instrumentType'],string[][]>={drums:[['warmup'],['rudiments'],['coordination'],['groove']],guitar:[['warmup'],['technique'],['chords'],['fretboard']],bass:[['warmup'],['muting'],['groove'],['harmony']],piano:[['warmup'],['scales'],['chords'],['sight-reading']],voice:[['warmup'],['pitch'],['tone'],['ear-training']],custom:[['warmup'],['technique'],['reading'],['repertoire']]};
  const routines:Routine[]=[...oldRoutines];
  for(const minutes of [15,30,45,60]){
    const used=new Set<string>(),weights=profile.instrumentType==='voice'?[2,3,3,3,3,4,2]:[3,5,5,5,10,2];
    const total=minutes*60,weightTotal=weights.reduce((a,b)=>a+b,0);let remaining=total;
    const blocks:RoutineBlock[]=weights.map((weight,index)=>{
      const seconds=index===weights.length-1?remaining:Math.floor(total*weight/weightTotal);remaining-=seconds;
      const common={id:`${profile.id}.routine-${minutes}-block-${index}`,profileId:profile.id,targetSeconds:seconds,notes:'',order:index};
      if(index<4){const e=pick(sections[profile.instrumentType][index]!,used);used.add(e.id);return {...common,type:'exercise',exerciseId:e.id,title:e.name,...(protocolPulse(e.protocol!)?{bpm:protocolPulse(e.protocol!)!.bpm}:{})};}
      if(index===weights.length-1)return {...common,type:'free',title:'Review',protocol:free('Write one concrete observation and one next step.')};
      if(profile.instrumentType==='voice' && index===4)return {...common,type:'free',title:'Rest and listen',protocol:free('Rest your voice. Listen or mark phrasing in your own score; do not sing continuously.')};
      return {...common,type:'free',title:'Repertoire',protocol:repertoire('Choose a short phrase from your own repertoire.')};
    });
    routines.push({profileId:profile.id,createdAt:timestamp,updatedAt:timestamp,builtin:true,archived:false,tags:['starter'],id:`${profile.id}.routine-${minutes}`,name:`${minutes}-Minute ${label} Practice`,description:profile.instrumentType==='voice'?'Includes rest, listening and reflection. Adjust pitch bounds before singing.':'Technique, musicianship, repertoire and a short review.',blocks,scheduledDays:[]});
  }
  return {exercises,routines};
}
