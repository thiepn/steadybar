import type { Course } from './types.js';

/** Original teaching content. External sources benchmark coverage, not endorse these courses. */
export const COURSES:readonly Course[] = [
  {
    "id": "drums-foundation",
    "revision": 1,
    "instrument": "drums",
    "stage": "foundation",
    "title": "Drums: a dependable first groove",
    "level": "beginner",
    "summary": "Build touch, subdivision and coordination, then connect a fill to a musical phrase.",
    "prerequisites": "No previous drum study. A pad works for hand lessons; kit coordination needs a kit or quiet limb simulation.",
    "outcomes": [
      "Produce relaxed, even strokes",
      "Maintain a simple backbeat",
      "Return from a fill without losing beat one"
    ],
    "placement": [
      "I can count eighth notes while playing.",
      "I can hold a backbeat for eight bars.",
      "I can finish a one-beat fill on the next downbeat."
    ],
    "sourceIds": [
      "berklee-drums",
      "pas",
      "drumeo-fills"
    ],
    "lessons": [
      {
        "id": "touch",
        "title": "Rebound and balanced hands",
        "skill": "technique",
        "objective": "Play eight alternating strokes without tightening your grip.",
        "teaching": [
          "Place the pad or snare where your shoulders can stay down. Hold each stick securely but allow it to return after contact; do not press the tip into the surface. Begin with small strokes at a quiet volume. A seated position that forces reaching should be adjusted before repeating.",
          "Play one stroke per spoken count. Listen for left/right differences, not maximum speed. Stop after eight strokes, release unnecessary tension, and restart. Sharp pain is a reason to stop, not an adaptation target."
        ],
        "example": {
          "caption": "Worked example · Rebound and balanced hands",
          "text": "Count: 1 2 3 4 | 1 2 3 4\nHands: R L R L | R L R L\nThen begin with L. R = right hand; L = left hand."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Rebound and balanced hands",
            "instructions": "Play four sets of eight quiet single strokes at 60 quarter-note beats per minute. Rest between sets. Alternate the leading hand. Log Clean only when both hands sound even.",
            "protocol": {
              "kind": "tempo",
              "technique": "Even rebound",
              "sticking": "R L R L",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Rebound and balanced hands",
            "instructions": "Play four bars of alternating strokes. Make bars 1–2 quiet and 3–4 moderately louder without changing spacing, then return to quiet for four more bars.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play four bars of alternating strokes. Make bars 1–2 quiet and 3–4 moderately louder without changing spacing, then return to quiet for four more bars.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Both hands sounded comparably even.",
          "The count stayed steady through volume changes.",
          "I could release my grip after each set."
        ],
        "questions": [
          {
            "prompt": "What is the first useful improvement here?",
            "options": [
              "Even spacing and relaxed rebound",
              "The highest possible BPM",
              "Pressing harder after each stroke"
            ],
            "answer": 0,
            "explanation": "The task is control and consistent sound; speed does not establish either."
          }
        ],
        "easier": "Use one hand for four counts, rest, then the other.",
        "harder": "Switch leading hand every two bars without a pause.",
        "mistake": "A clenched grip or buried stick stops the rebound. Reduce the stroke size.",
        "transfer": "Use the quieter stroke when supporting a soft verse."
      },
      {
        "id": "subdivision",
        "title": "Hear the spaces between beats",
        "skill": "timing",
        "objective": "Move between quarters and eighths without changing the underlying pulse.",
        "teaching": [
          "A quarter-note click marks each numbered beat in 4/4. Two evenly spaced eighth notes fit into each beat: say “1 and 2 and 3 and 4 and.” The “and” is halfway between clicks, not a second beat at the same tempo.",
          "Keep your foot on the numbered counts while the hands change density. Play one bar of quarters followed by one bar of eighths. The busier bar must take exactly the same length of time."
        ],
        "example": {
          "caption": "Worked example · Hear the spaces between beats",
          "text": "Quarters: 1   2   3   4\nEighths:  1 & 2 & 3 & 4 &\nRepeat one bar of each; count aloud."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hear the spaces between beats",
            "instructions": "Alternate a bar of four strokes and a bar of eight strokes for four pairs. Keep the click at 60 BPM and count the eighth-note syllables in both bars.",
            "protocol": {
              "kind": "tempo",
              "technique": "Quarter/eighth subdivision",
              "sticking": "R L R L → R L R L R L R L",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hear the spaces between beats",
            "instructions": "Keep quarter notes with a foot. Play two bars of quarters, two of eighths, then two of quarters without speeding up or stopping.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Keep quarter notes with a foot. Play two bars of quarters, two of eighths, then two of quarters without speeding up or stopping.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Each bar contained four underlying beats.",
          "The foot pulse did not accelerate in the eighth-note bars.",
          "I returned to quarters without a gap."
        ],
        "questions": [
          {
            "prompt": "At 60 quarter-note BPM, what changes when you play eighths?",
            "options": [
              "Each bar has eight quarter-note beats",
              "There are two strokes per beat",
              "The metronome must become 120 BPM"
            ],
            "answer": 1,
            "explanation": "The subdivision changes while the reference beat remains constant."
          }
        ],
        "easier": "Clap the pattern without sticks before adding a foot pulse.",
        "harder": "Speak eighths while the hands leave alternate “and” counts silent.",
        "mistake": "Treating every stroke as a beat doubles the tempo. Keep counting four.",
        "transfer": "Count a song entrance through a silent bar."
      },
      {
        "id": "backbeat",
        "title": "Build the first backbeat",
        "skill": "coordination",
        "objective": "Combine steady eighth-note hi-hat, kick and snare for eight bars.",
        "teaching": [
          "Learn the layers separately. First keep the hi-hat on all eight counts. Add kick on beats 1 and 3; only when that is stable add snare on 2 and 4. Two limbs landing together should sound like one coordinated event.",
          "The snare marks the backbeat. The hi-hat supports the time rather than overpowering the other drums. Work at a volume where you can still hear your counting; use suitable hearing protection with an acoustic kit."
        ],
        "example": {
          "caption": "Worked example · Build the first backbeat",
          "text": "In the grid, x means play; – means no new stroke. Read columns together from left to right.",
          "rhythm": {
            "counts": [
              "1",
              "&",
              "2",
              "&",
              "3",
              "&",
              "4",
              "&"
            ],
            "rows": [
              {
                "label": "Hi hat",
                "hits": [
                  "x",
                  "x",
                  "x",
                  "x",
                  "x",
                  "x",
                  "x",
                  "x"
                ]
              },
              {
                "label": "Snare",
                "hits": [
                  "–",
                  "–",
                  "x",
                  "–",
                  "–",
                  "–",
                  "x",
                  "–"
                ]
              },
              {
                "label": "Kick",
                "hits": [
                  "x",
                  "–",
                  "–",
                  "–",
                  "x",
                  "–",
                  "–",
                  "–"
                ]
              }
            ]
          }
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Build the first backbeat",
            "instructions": "Play two bars of hi-hat only, two with kick, then four with snare added. Restart the simpler layer if the hat stops when another limb plays.",
            "protocol": {
              "kind": "tempo",
              "technique": "Basic backbeat",
              "sticking": "Hi-hat eighths; kick 1/3; snare 2/4",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Build the first backbeat",
            "instructions": "Play eight uninterrupted bars of the full groove. Count the first beat of each bar as “1, 2, …, 8” to track the phrase.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play eight uninterrupted bars of the full groove. Count the first beat of each bar as “1, 2, …, 8” to track the phrase.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The hi-hat stayed even when kick or snare entered.",
          "Kick and snare landed on the intended counts.",
          "All eight bars retained the same pulse."
        ],
        "questions": [
          {
            "prompt": "Which numbered beats carry the snare in this groove?",
            "options": [
              "1 and 3",
              "Every “and”",
              "2 and 4"
            ],
            "answer": 2,
            "explanation": "The snare backbeat is on 2 and 4; kick starts on 1 and 3."
          }
        ],
        "easier": "Use quarter-note hi-hat before returning to eighths.",
        "harder": "Keep the groove while making the hi-hat quieter than the snare.",
        "mistake": "Stopping the hat for a snare hit removes a subdivision. Isolate those two limbs.",
        "transfer": "Use this as a sparse starting texture under a singer."
      },
      {
        "id": "kick",
        "title": "Change the kick, not the clock",
        "skill": "groove",
        "objective": "Add one offbeat kick while keeping the hands unchanged.",
        "teaching": [
          "An offbeat kick can change the feel without changing the hi-hat or backbeat. Keep the previous groove and add a kick on the “and” of beat 3. Say the count before adding the foot.",
          "Play a bar of the original groove, then a bar with the added kick. Listen for the snare on beat 4 arriving early after the new kick. When that happens, slow down and isolate counts “3 and 4 and.”"
        ],
        "example": {
          "caption": "Worked example · Change the kick, not the clock",
          "text": "Original kick: 1       3\nVariation:     1       3 &\nSnare remains on 2 and 4 in both bars."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Change the kick, not the clock",
            "instructions": "Loop counts 3 & 4 & with hat, kick on 3/&, and snare on 4. Then play the full bar four times.",
            "protocol": {
              "kind": "tempo",
              "technique": "Offbeat kick coordination",
              "sticking": "Kick 1, 3, & of 3; snare 2, 4",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Change the kick, not the clock",
            "instructions": "Alternate two original bars and two variation bars. Repeat the four-bar phrase twice; do not add extra kicks.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate two original bars and two variation bars. Repeat the four-bar phrase twice; do not add extra kicks.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Only the intended kick pattern changed.",
          "Beat 4 stayed in time after the extra kick.",
          "I kept the variation consistent for two phrases."
        ],
        "questions": [
          {
            "prompt": "What should remain unchanged when adding the kick?",
            "options": [
              "Hi-hat spacing and snare timing",
              "Every limb must play the extra hit",
              "The length of the bar"
            ],
            "answer": 0,
            "explanation": "Changing one layer makes coordination and timing errors easier to identify."
          }
        ],
        "easier": "Play the foot pattern alone while counting eighths.",
        "harder": "Move the extra kick to the “and” of 1, keeping the rest identical.",
        "mistake": "A louder kick can pull the whole body forward and rush the snare. Use less force.",
        "transfer": "Choose a kick variation that supports the bass part rather than filling every space."
      },
      {
        "id": "doubles",
        "title": "Two even notes from each hand",
        "skill": "rudiments",
        "objective": "Play controlled doubles without a weak second stroke.",
        "teaching": [
          "A double stroke uses two notes from one hand before switching: R R L L. At this stage, make both notes deliberately and evenly; do not chase an uncontrolled bounce. At faster tempos rebound can contribute, but the notes still need balance.",
          "Count the pattern as eighths at a comfortable quarter-note pulse. Compare the second note of each pair with the first. A repeated loud-soft pattern is a diagnostic clue, not the desired result."
        ],
        "example": {
          "caption": "Worked example · Two even notes from each hand",
          "text": "Count: 1 & 2 & 3 & 4 &\nHands: R R L L R R L L\nEight deliberate strokes fill one four-beat bar."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Two even notes from each hand",
            "instructions": "Play four bars of doubles, rest, then four bars beginning L L R R. Log an attempt after listening specifically to each second stroke.",
            "protocol": {
              "kind": "tempo",
              "technique": "Balanced double strokes",
              "sticking": "R R L L R R L L",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Two even notes from each hand",
            "instructions": "Alternate two bars of singles and two bars of doubles for eight bars. Keep all eighth notes equally spaced.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate two bars of singles and two bars of doubles for eight bars. Keep all eighth notes equally spaced.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The second note of each pair remained audible.",
          "Switching singles/doubles preserved spacing.",
          "Neither wrist became rigid."
        ],
        "questions": [
          {
            "prompt": "Which sticking is a double-stroke pattern?",
            "options": [
              "R L R L",
              "R L L R L R R L",
              "R R L L"
            ],
            "answer": 2,
            "explanation": "Consecutive pairs from each hand create the double-stroke pattern."
          }
        ],
        "easier": "Play R R, pause, then L L without a click.",
        "harder": "Alternate leading hand each four-bar phrase.",
        "mistake": "Letting a stick bounce repeatedly can add unintended notes. Return to two deliberate strokes.",
        "transfer": "Use a controlled double inside a short fill rather than making the whole fill louder."
      },
      {
        "id": "paradiddle",
        "title": "Paradiddle accents",
        "skill": "rudiments",
        "objective": "Keep a paradiddle even while making the first stroke of each group clear.",
        "teaching": [
          "A single paradiddle combines singles and a double: R L R R, then L R L L. Its alternating lead is useful for moving between surfaces. Learn the eight-note sticking before adding accents.",
          "Accent means a relatively stronger note, not a forceful strike. Keep the other strokes low and quiet. With eighth-note spacing, the accented group starts fall on beats 1 and 3."
        ],
        "example": {
          "caption": "Worked example · Paradiddle accents",
          "text": "Count: 1 & 2 & 3 & 4 &\nHands: R L R R L R L L\nAccent R on 1 and L on 3."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Paradiddle accents",
            "instructions": "Play four bars without accents, then four with the group-start accents. Pause to reset between attempts.",
            "protocol": {
              "kind": "tempo",
              "technique": "Single paradiddle",
              "sticking": "R L R R L R L L",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Paradiddle accents",
            "instructions": "Move only each accented note to a tom, leaving the quieter notes on the snare. On a pad, represent the difference with volume instead.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Move only each accented note to a tom, leaving the quieter notes on the snare. On a pad, represent the difference with volume instead.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The full sticking remained correct.",
          "The two accents were intentional and balanced.",
          "Quiet notes stayed quiet without disappearing."
        ],
        "questions": [
          {
            "prompt": "Where does the double occur in each four-note group?",
            "options": [
              "There is no double",
              "On the last two strokes",
              "On the first two strokes"
            ],
            "answer": 1,
            "explanation": "R L R R ends with R R; L R L L ends with L L."
          }
        ],
        "easier": "Read and speak four notes at a time before joining both groups.",
        "harder": "Start the phrase on the left and keep the same accent placement.",
        "mistake": "An accent that disturbs the next quiet note is too large. Reduce the height difference.",
        "transfer": "Try one paradiddle group as an organized fill, then return to the groove."
      },
      {
        "id": "fill",
        "title": "One beat out, beat one back",
        "skill": "fills",
        "objective": "Play a one-beat fill and return accurately to a groove.",
        "teaching": [
          "A fill occupies counted time inside a phrase; it does not create extra beats. Keep three bars of the basic groove. In bar 4, replace beat 4 with four sixteenth notes, counted “4 e and a.”",
          "The important target is the next beat 1. Start by playing the fill on the snare only. Adding toms is optional after the return is reliable."
        ],
        "example": {
          "caption": "Worked example · One beat out, beat one back",
          "text": "Bars 1–3: basic groove\nBar 4 beats 1–3: groove; beat 4: R L R L\nNext bar beat 1: kick + hi-hat, on time."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: One beat out, beat one back",
            "instructions": "Count 3 & 4 e & a 1. Play only the four fill notes and the landing kick. Repeat four times with a full bar between attempts.",
            "protocol": {
              "kind": "tempo",
              "technique": "One-beat fill return",
              "sticking": "Beat 4: R L R L (sixteenths)",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: One beat out, beat one back",
            "instructions": "Play three bars of groove plus one fill bar, twice. Finish with a full groove bar so the return is part of the assessment.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play three bars of groove plus one fill bar, twice. Finish with a full groove bar so the return is part of the assessment.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The fill began on beat 4.",
          "It contained four sixteenths rather than four eighths.",
          "The next groove downbeat arrived on time."
        ],
        "questions": [
          {
            "prompt": "Four sixteenth notes occupy how much time in this 4/4 exercise?",
            "options": [
              "Two quarter-note beats",
              "A whole bar",
              "One quarter-note beat"
            ],
            "answer": 2,
            "explanation": "Four equal sixteenths fit within one quarter-note beat."
          }
        ],
        "easier": "Use two eighth notes on beat 4 instead of four sixteenths.",
        "harder": "Orchestrate the final two notes on a tom without changing their timing.",
        "mistake": "Practicing the fill alone omits the hardest part: rejoining the groove. Include the landing.",
        "transfer": "Use a short fill to announce a chorus, not to cover a vocal phrase."
      },
      {
        "id": "first-performance",
        "title": "Foundation performance: 16-bar form",
        "skill": "repertoire",
        "objective": "Perform a planned groove and fill arrangement without restarting.",
        "teaching": [
          "Combine the earlier skills into a short piece with an identifiable beginning and ending. Decide the arrangement before playing: quiet groove for eight bars, moderate groove for eight, and a one-beat fill only in bars 8 and 16.",
          "This is a performance check rather than another repetition drill. Continue after a small error, then identify one specific repair. A correct restart is useful practice, but it is not the same as maintaining a complete phrase."
        ],
        "example": {
          "caption": "Worked example · Foundation performance: 16-bar form",
          "text": "Intro: count 1 2 3 4\nA: 8 bars quiet backbeat; fill on bar 8 beat 4\nB: 8 bars moderate; fill on bar 16 beat 4\nEnd: one coordinated hit on the following beat 1, then silence."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Foundation performance: 16-bar form",
            "instructions": "Rehearse bars 7–9 and the final ending separately. Confirm the fill return and the last silence before the complete take.",
            "protocol": {
              "kind": "tempo",
              "technique": "16-bar foundation assessment",
              "sticking": "Backbeat; fills only bars 8/16 beat 4",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Foundation performance: 16-bar form",
            "instructions": "Perform the entire 16-bar arrangement once without restarting. Log your assessment only after the final silence.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the entire 16-bar arrangement once without restarting. Log your assessment only after the final silence.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I followed the complete 16-bar form.",
          "Both fill returns and the ending stayed on time.",
          "The two sections had a controlled dynamic contrast."
        ],
        "questions": [
          {
            "prompt": "What best demonstrates readiness to continue?",
            "options": [
              "A fast fill played once in isolation",
              "Finishing the timer regardless of the result",
              "A complete controlled take with accurate transitions"
            ],
            "answer": 2,
            "explanation": "The course outcome is integrated performance, not elapsed app time."
          }
        ],
        "easier": "Use eight bars total with one simple fill.",
        "harder": "Repeat on a different day, then begin at bar 9 on a count-in.",
        "mistake": "Overplaying the last bar can hide the ending. Choose the final hit in advance.",
        "transfer": "Apply the same form to an original rehearsal groove or a song you have permission to use."
      }
    ]
  },
  {
    "id": "drums-development",
    "revision": 1,
    "instrument": "drums",
    "stage": "development",
    "title": "Drums: subdivision, feel and reading",
    "level": "intermediate",
    "summary": "Develop sixteenth-note control, ghost notes, compound time and deliberate chart reading.",
    "prerequisites": "A dependable backbeat and fill return, or the foundation course.",
    "outcomes": [
      "Control subdivisions and dynamics independently",
      "Distinguish straight, triplet and compound feels",
      "Interpret a short original chart"
    ],
    "placement": [
      "I keep sixteenths even without rushing.",
      "I can explain the two large pulses in 6/8.",
      "I can follow a written eight-bar form."
    ],
    "sourceIds": [
      "berklee-drums",
      "pas",
      "drumeo-fills"
    ],
    "lessons": [
      {
        "id": "sixteenths",
        "title": "Sixteenths with deliberate rests",
        "skill": "timing",
        "objective": "Leave specific subdivisions silent without compressing the remaining notes.",
        "teaching": [
          "Count each beat as “1 e and a.” A rest has duration even though no note sounds. Keep counting when a stroke is omitted, rather than closing the gap.",
          "Start with a single surface so orchestration does not distract from the rhythm. The example leaves “e” and “a” silent on beats 2 and 4. Listen for four equal beats under the unequal number of notes."
        ],
        "example": {
          "caption": "Worked example · Sixteenths with deliberate rests",
          "text": "Beat 1: 1 e & a\nBeat 2: 2   &\nBeat 3: 3 e & a\nBeat 4: 4   &"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Sixteenths with deliberate rests",
            "instructions": "Speak all sixteen subdivisions; strike only written notes. Loop four bars, then rest and check the missing subdivisions.",
            "protocol": {
              "kind": "tempo",
              "technique": "Sixteenth rests",
              "sticking": "R L R L | R - L - | R L R L | R - L -",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Sixteenths with deliberate rests",
            "instructions": "Keep the same rhythm for four bars on a snare, then use it for a one-bar fill followed by a simple groove bar.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Keep the same rhythm for four bars on a snare, then use it for a one-bar fill followed by a simple groove bar.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The silent subdivisions kept their space.",
          "The quarter-note pulse stayed constant.",
          "The groove return landed correctly."
        ],
        "questions": [
          {
            "prompt": "What happens to the duration of a missing “e” stroke?",
            "options": [
              "The bar becomes shorter",
              "Its space remains as a rest",
              "The next stroke moves earlier"
            ],
            "answer": 1,
            "explanation": "Rests remove a sounded stroke, not its place in the subdivision. Keep counting the silent sixteenth."
          }
        ],
        "easier": "Work on one beat at a time, without a kit pattern.",
        "harder": "Move the omissions to a different beat while preserving the count.",
        "mistake": "A hand moving early often reveals an uncounted rest. Speak all subdivisions.",
        "transfer": "Read a syncopated ensemble accent without filling the spaces."
      },
      {
        "id": "ghosts",
        "title": "Quiet notes beneath the backbeat",
        "skill": "dynamics",
        "objective": "Separate soft snare notes from the main backbeats.",
        "teaching": [
          "Ghost notes are deliberately soft notes within the groove. They should not compete with the snare on beats 2 and 4. First establish a clear quiet-versus-moderate contrast on the snare alone.",
          "Add just one ghost note on the “a” of beat 2. Keep the backbeat on 2 and the next kick on 3 unchanged. More ghost notes are not evidence of better control."
        ],
        "example": {
          "caption": "Worked example · Quiet notes beneath the backbeat",
          "text": "Count sixteenths. Main snare: beats 2 and 4.\nGhost snare: a of 2 only.\nKick: 1 and 3; hi-hat: eighths."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Quiet notes beneath the backbeat",
            "instructions": "Play the snare sequence 2 (main), a (quiet), 4 (main) while counting all beats. Then add the hi-hat.",
            "protocol": {
              "kind": "tempo",
              "technique": "One ghost note",
              "sticking": "Main snare 2/4; ghost on a of 2",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Quiet notes beneath the backbeat",
            "instructions": "Alternate four bars without ghosts and four with the single ghost note. Listen for the same backbeat in both sections.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate four bars without ghosts and four with the single ghost note. Listen for the same backbeat in both sections.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The ghost was clearly softer.",
          "The backbeat remained stable.",
          "The extra note did not rush beat 3."
        ],
        "questions": [
          {
            "prompt": "Which quality defines the ghost note here?",
            "options": [
              "A controlled lower dynamic",
              "A faster tempo",
              "A randomly placed snare hit"
            ],
            "answer": 0,
            "explanation": "Its quiet dynamic gives it a supporting role inside the specified rhythm."
          }
        ],
        "easier": "Practice the two volumes on a pad before adding limbs.",
        "harder": "Add a second ghost only after preserving the first distinction.",
        "mistake": "Making all snare notes equally loud removes the hierarchy. Reduce ghost-note height.",
        "transfer": "Use quiet detail only where the arrangement leaves space."
      },
      {
        "id": "compound",
        "title": "Two large pulses in 6/8",
        "skill": "groove",
        "objective": "Feel six eighth notes as two groups of three.",
        "teaching": [
          "In 6/8, six eighth notes usually group as 1-2-3 and 4-5-6: two large pulses, each divided into three. This differs from 3/4, which has three quarter-note pulses.",
          "Steadybar’s 6/8 transport counts each eighth note. At 120 displayed eighth-note BPM, the two large pulses are 40 per minute. The units matter; do not compare this number directly with a quarter-note BPM target."
        ],
        "example": {
          "caption": "Worked example · Two large pulses in 6/8",
          "text": "Count: 1 2 3 4 5 6\nKick:  1\nSnare:       4\nHi-hat: all six eighth notes."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Two large pulses in 6/8",
            "instructions": "Count groups of three while tapping only 1 and 4. Then fill in the six hi-hat notes and add kick/snare.",
            "protocol": {
              "kind": "tempo",
              "technique": "Compound pulse",
              "sticking": "Hat 1–6; kick 1; snare 4",
              "pulse": {
                "bpm": 120,
                "beats": 6,
                "beatUnit": 8,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Two large pulses in 6/8",
            "instructions": "Play eight bars of the 6/8 groove. Use a quiet first four bars and a moderate second four without changing the grouped pulse.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play eight bars of the 6/8 groove. Use a quiet first four bars and a moderate second four without changing the grouped pulse.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 120,
                "beats": 6,
                "beatUnit": 8,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I felt two large pulses per bar.",
          "The snare landed on eighth-note count 4.",
          "I understood the displayed eighth-note tempo unit."
        ],
        "questions": [
          {
            "prompt": "How many large grouped pulses does this 6/8 exercise have?",
            "options": [
              "Six quarter-note pulses",
              "Two",
              "Three"
            ],
            "answer": 1,
            "explanation": "The six eighth notes group into two dotted-quarter pulses."
          }
        ],
        "easier": "Clap only counts 1 and 4 before adding the other eighths.",
        "harder": "Create a short fill in counts 4–6 and return on 1.",
        "mistake": "Counting all six as equally strong can obscure the two-pulse feel. Accent 1 and 4 lightly.",
        "transfer": "Use this feel for a compound-time ballad rather than forcing straight 4/4."
      },
      {
        "id": "shuffle",
        "title": "Triplets and the shuffle gap",
        "skill": "groove",
        "objective": "Preserve a three-part subdivision while playing the first and third parts.",
        "teaching": [
          "Divide each quarter-note beat into three equal parts, spoken “1 trip let.” A basic triplet shuffle plays the first and third, leaving the middle silent. The second sounded note is therefore later than a straight eighth-note offbeat.",
          "This exercise uses an exact triplet model, not a claim that every musical swing ratio is fixed. Learn the subdivision clearly before adjusting to a particular recording or ensemble feel."
        ],
        "example": {
          "caption": "Worked example · Triplets and the shuffle gap",
          "text": "Triplet grid: 1 trip let 2 trip let\nShuffle:     x   –   x  x   –   x\nSnare backbeat remains on beats 2 and 4."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Triplets and the shuffle gap",
            "instructions": "Tap all triplets, then remove the middle note without moving the others. Repeat four bars each way.",
            "protocol": {
              "kind": "tempo",
              "technique": "Triplet shuffle",
              "sticking": "First and third triplet parts",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 3
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Triplets and the shuffle gap",
            "instructions": "Play the shuffle on hi-hat with kick on 1/3 and snare on 2/4 for eight bars.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the shuffle on hi-hat with kick on 1/3 and snare on 2/4 for eight bars.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 3
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The middle triplet space remained present.",
          "The late note did not become a straight eighth.",
          "The backbeat stayed on the numbered beats."
        ],
        "questions": [
          {
            "prompt": "Which triplet part is silent in this model?",
            "options": [
              "The last part",
              "The middle part",
              "The first part"
            ],
            "answer": 1,
            "explanation": "Sounding the first and third parts leaves the characteristic long-short spacing."
          }
        ],
        "easier": "Use a single surface and spoken triplets.",
        "harder": "Alternate two straight bars and two shuffle bars at the same quarter-note pulse.",
        "mistake": "Uneven timing is not automatically shuffle. Locate all three triplet positions first.",
        "transfer": "Match the band’s intended shuffle feel instead of imposing it on a straight song."
      },
      {
        "id": "foot-ostinato",
        "title": "A steady foot under changing hands",
        "skill": "coordination",
        "objective": "Keep a simple foot pattern while changing a hand rhythm.",
        "teaching": [
          "An ostinato is a repeating pattern. Use hi-hat foot on beats 2 and 4, while hands alternate between quarters and eighths on a pad or snare. Keep the foot motion small enough that it does not throw the upper body off balance.",
          "Change only one layer per attempt. If the foot follows the hands, return to counting and the foot alone. Independence is the ability to maintain the assigned parts, not tension between the limbs."
        ],
        "example": {
          "caption": "Worked example · A steady foot under changing hands",
          "text": "Foot: 2 and 4 every bar\nHands: one bar quarters, one bar eighths\nRepeat four pairs."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A steady foot under changing hands",
            "instructions": "Play four bars of foot alone, then add quarters. Introduce eighths only after the foot remains stable.",
            "protocol": {
              "kind": "tempo",
              "technique": "Foot ostinato independence",
              "sticking": "Hands quarters/eighths; foot 2/4",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A steady foot under changing hands",
            "instructions": "Alternate quarter and eighth hand bars while keeping foot 2/4 for eight bars. End both parts together on a chosen downbeat.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate quarter and eighth hand bars while keeping foot 2/4 for eight bars. End both parts together on a chosen downbeat.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The foot kept its assigned beats.",
          "Changing the hands did not change body balance.",
          "The final stop was coordinated."
        ],
        "questions": [
          {
            "prompt": "What is the ostinato in this exercise?",
            "options": [
              "The repeating foot pattern",
              "A random hand fill",
              "Any increase in tempo"
            ],
            "answer": 0,
            "explanation": "The foot repeats while the hand pattern changes around it."
          }
        ],
        "easier": "Tap the foot on 1 only, then progress to 2/4.",
        "harder": "Use a two-bar hand phrase while the foot repeats its one-bar pattern.",
        "mistake": "Trying to learn two new rhythms at once hides the source of errors. Simplify one.",
        "transfer": "Maintain a clear pulse during a quiet section with fewer hand notes."
      },
      {
        "id": "chart",
        "title": "Read an original drum chart",
        "skill": "reading",
        "objective": "Follow form, rests and a marked fill on a first attempt.",
        "teaching": [
          "Before playing a chart, scan the meter, tempo, number of bars, repeats and ending. Count a full silent bar instead of treating it as a break from the form.",
          "The compact chart below is an original text chart, not standard staff notation. Use it to practice form-reading; consult the linked notation instruction or a teacher for staff-specific reading. A first-read result should represent the first take, not your best repeated take."
        ],
        "example": {
          "caption": "Worked example · Read an original drum chart",
          "text": "4/4, quarter = 60\nBars 1–2: backbeat\nBar 3: no drums; count all four beats\nBars 4–6: backbeat, quieter\nBar 7: backbeat, moderate\nBar 8: groove beats 1–3; eighth-note fill on 4 &\nNext downbeat: final hit, then stop."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read an original drum chart",
            "instructions": "Scan the chart silently, then play one first take without restarting. Log reading errors and continuity honestly. This displayed example is prepared reading, not an unseen first read. Use an unfamiliar teacher-selected excerpt separately when testing first-read ability.",
            "protocol": {
              "kind": "sight-reading",
              "material": "Original drum chart: 1–2 backbeat; 3 silent; 4–6 quiet; 7 moderate; 8 fill on 4 &; final hit next 1.",
              "key": "C",
              "hands": "not-applicable",
              "firstRead": false,
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read an original drum chart",
            "instructions": "Isolate the silent-bar re-entry and the ending. Then perform the complete chart again, labeling it repeat practice.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Isolate the silent-bar re-entry and the ending. Then perform the complete chart again, labeling it repeat practice.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The silent bar retained all four beats.",
          "The re-entry and ending followed the chart.",
          "I separated the first attempt from repeat practice."
        ],
        "questions": [
          {
            "prompt": "After rehearsing this same chart, the next take is what?",
            "options": [
              "Automatically mastered",
              "Repeat practice, not a new first read",
              "Another unseen first read"
            ],
            "answer": 1,
            "explanation": "Repetition improves familiarity but does not recreate first-read conditions."
          }
        ],
        "easier": "Remove the fill and focus on the silent bar.",
        "harder": "Write a new eight-bar chart and exchange it with another player.",
        "mistake": "Skipping the silence loses the arrangement. Count through it.",
        "transfer": "Follow a bandleader’s chart without adding unmarked fills."
      }
    ]
  },
  {
    "id": "drums-ensemble",
    "revision": 1,
    "instrument": "drums",
    "stage": "ensemble",
    "title": "Drums: serve the arrangement",
    "level": "advanced",
    "summary": "Four application studies for dynamics, cues, restraint and a complete rehearsal take.",
    "prerequisites": "Stable time in 4/4 and 6/8; comfortable short fills. “Application” is not an exam-grade claim.",
    "outcomes": [
      "Map a form before playing",
      "Make clear transitions without rushing",
      "Evaluate ensemble support"
    ],
    "placement": [
      "I can keep time while changing texture.",
      "I can enter after a silent count.",
      "I can play a complete arrangement without restarting."
    ],
    "sourceIds": [
      "berklee-drums",
      "pas",
      "drumeo-fills",
      "ensemble"
    ],
    "lessons": [
      {
        "id": "map",
        "title": "Choose a role for each section",
        "skill": "repertoire",
        "objective": "Create contrasting drum textures that support an arrangement.",
        "teaching": [
          "Map the piece before choosing fills. An introduction can establish time with little density; a verse can leave space; a chorus can become broader without becoming faster. Density, register and volume are different controls.",
          "Use the original A–B form below to plan one change per section. Keep the kick/snare skeleton recognizable so the transition communicates form instead of sounding like a different tempo."
        ],
        "example": {
          "caption": "Worked example · Choose a role for each section",
          "text": "Intro 4 bars: hi-hat quarters\nA 8 bars: quiet eighth-note backbeat\nB 8 bars: same kick/snare, ride instead of hat\nEnd: coordinated beat 1, no extra fill."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Choose a role for each section",
            "instructions": "Rehearse the last two bars of A into the first two of B. Change cymbal texture only; keep the pulse and backbeat.",
            "protocol": {
              "kind": "tempo",
              "technique": "Section-role arrangement",
              "sticking": "4 intro + 8 A + 8 B",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Choose a role for each section",
            "instructions": "Play the full 20-bar arrangement. Note whether the section change was audible without a tempo jump.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full 20-bar arrangement. Note whether the section change was audible without a tempo jump.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I followed the planned form.",
          "The texture change did not change tempo.",
          "The part left deliberate space."
        ],
        "questions": [
          {
            "prompt": "Which change can announce a chorus without speeding up?",
            "options": [
              "Changing texture or dynamics",
              "Adding an extra beat",
              "Rushing the fill"
            ],
            "answer": 0,
            "explanation": "Arrangement can become larger through sound and density at the same pulse."
          }
        ],
        "easier": "Use four bars per section.",
        "harder": "Keep B quiet but change texture so the contrast does not depend on volume.",
        "mistake": "A louder section often becomes faster unconsciously. Listen to the click across the boundary.",
        "transfer": "Map a worship or ensemble song using your own chart before rehearsal."
      },
      {
        "id": "transitions",
        "title": "Build intensity without accelerating",
        "skill": "dynamics",
        "objective": "Increase energy over four bars while keeping a constant beat.",
        "teaching": [
          "Plan a four-bar build using a small dynamic rise or denser cymbal pattern. Do not increase every layer at once. Choose a repeatable range from quiet to moderate and leave headroom for the next section.",
          "Compare the first and last bars against the same click. The build is successful when the destination feels intentional and the next downbeat stays stable."
        ],
        "example": {
          "caption": "Worked example · Build intensity without accelerating",
          "text": "Bars 1–2: quiet eighth-note hat\nBar 3: moderate hat, same kick/snare\nBar 4: one-beat fill\nBar 5: return to steady chorus groove."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Build intensity without accelerating",
            "instructions": "Play the four-bar build without a fill first. Add the short fill only after the dynamics are controlled.",
            "protocol": {
              "kind": "tempo",
              "technique": "Controlled four-bar build",
              "sticking": "Build 1–4; return on 5",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Build intensity without accelerating",
            "instructions": "Play A for four bars, the four-bar build, then B for four bars. Maintain the same pulse through all twelve.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play A for four bars, the four-bar build, then B for four bars. Maintain the same pulse through all twelve.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Energy increased without a tempo jump.",
          "The fill used only its planned beat.",
          "The destination groove remained controlled."
        ],
        "questions": [
          {
            "prompt": "What should the build preserve?",
            "options": [
              "Exactly the same volume",
              "Unplanned extra fill notes",
              "The underlying pulse"
            ],
            "answer": 2,
            "explanation": "Intensity changes, but the arrangement’s beat remains the reference."
          }
        ],
        "easier": "Use only a small hi-hat dynamic rise.",
        "harder": "Perform the reverse: a four-bar reduction into a quiet verse.",
        "mistake": "A long fill can overshoot the dynamic target. Shorten it.",
        "transfer": "Support a singer’s phrase ending rather than covering its final words."
      },
      {
        "id": "cues",
        "title": "Entrances, stops and shared endings",
        "skill": "timing",
        "objective": "Count rests and respond to a clear ending cue.",
        "teaching": [
          "Agree on the count-in and ending before playing. A shared stop is a rhythmic event; the silence afterwards matters. During rests, keep counting internally and watch the person responsible for the cue.",
          "Practice both a fixed chart and a partner cue. In solo practice, the printed form substitutes for the partner, but it does not certify live cue responsiveness."
        ],
        "example": {
          "caption": "Worked example · Entrances, stops and shared endings",
          "text": "Count-in: one bar\nPlay 4 bars; rest 2 bars; play 4 bars\nFinal bar: kick/snare together on beats 1 and 3; stop after 3."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Entrances, stops and shared endings",
            "instructions": "Loop one groove bar, one silent counted bar, then one groove bar. Keep feet quiet during the silent bar.",
            "protocol": {
              "kind": "tempo",
              "technique": "Counted rest and ending",
              "sticking": "4 play, 2 rest, 4 play; ending 1/3",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Entrances, stops and shared endings",
            "instructions": "Perform the complete 4+2+4 form and the specified ending. With a partner, agree on a visible cue and repeat.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the complete 4+2+4 form and the specified ending. With a partner, agree on a visible cue and repeat.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I counted both rest bars accurately.",
          "The re-entry was on beat one.",
          "The last note ended with no extra strokes."
        ],
        "questions": [
          {
            "prompt": "What should you do during a counted rest?",
            "options": [
              "Track the form and the next entrance",
              "Stop counting until somebody plays",
              "Add a quiet fill"
            ],
            "answer": 0,
            "explanation": "The rest is part of the arrangement, including its precise duration."
          }
        ],
        "easier": "Use one rest bar and count it aloud.",
        "harder": "Begin the final section from a partner’s count-in.",
        "mistake": "Looking only at the kit can miss a cue. Rehearse looking up.",
        "transfer": "Practice the ending your ensemble actually agreed on, not a habitual fill."
      },
      {
        "id": "rehearsal",
        "title": "Application assessment: one complete take",
        "skill": "repertoire",
        "objective": "Evaluate a full arrangement for time, dynamics and support.",
        "teaching": [
          "Prepare a short arrangement with a count-in, two textures, one transition, a rest and an ending. Rehearse difficult joins first, then perform a complete take without stopping for small errors.",
          "Evaluate one specific moment in each category: time, balance and support. An external recording or partner is optional and remains outside this app; Steadybar records your assessment, not an audio judgment."
        ],
        "example": {
          "caption": "Worked example · Application assessment: one complete take",
          "text": "Original form: intro 2 | A 8 | build 4 | B 8 | rest 1 | final A 4 | ending hit.\nAt quarter = 65, maintain the same tempo throughout."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Application assessment: one complete take",
            "instructions": "Rehearse the build-to-B join and the one-bar rest-to-final-A entrance. Limit each repair to the exact two adjacent bars.",
            "protocol": {
              "kind": "tempo",
              "technique": "Ensemble application assessment",
              "sticking": "2 + 8 + 4 + 8 + 1 + 4 + ending",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Application assessment: one complete take",
            "instructions": "Perform the complete form once. Afterwards name the weakest transition and one concrete change for the next take.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the complete form once. Afterwards name the weakest transition and one concrete change for the next take.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The form and ending were complete.",
          "Time and dynamics stayed controlled.",
          "My reflection identifies a specific musical improvement."
        ],
        "questions": [
          {
            "prompt": "Which reflection is most actionable?",
            "options": [
              "The entrance after the rest was early; count that bar aloud next time",
              "I need to be better",
              "The timer finished"
            ],
            "answer": 0,
            "explanation": "A precise observation identifies a repair that can be practiced and checked."
          }
        ],
        "easier": "Reduce each long section to four bars.",
        "harder": "Repeat on a later day without rereading every cue, then compare.",
        "mistake": "Restarting after every slip prevents practicing recovery. Complete a take before repairing.",
        "transfer": "Bring one supportive groove choice and one question to the next rehearsal."
      }
    ]
  },
  {
    "id": "guitar-foundation",
    "revision": 1,
    "instrument": "guitar",
    "stage": "foundation",
    "title": "Guitar: chords, rhythm and first phrases",
    "level": "beginner",
    "summary": "Learn usable chord shapes and steady rhythm, then combine them in original short arrangements.",
    "prerequisites": "A tuned six-string guitar in standard tuning. Use a tuner or trusted reference; this app is not a tuner.",
    "outcomes": [
      "Read a chord shape and produce clear notes",
      "Change chords without losing time",
      "Play an eight-bar accompaniment"
    ],
    "placement": [
      "I can read a low-to-high chord shape.",
      "I can change between open chords without a long pause.",
      "I can keep strumming through a change."
    ],
    "sourceIds": [
      "justin",
      "berklee-guitar"
    ],
    "lessons": [
      {
        "id": "setup",
        "title": "Strings, tuning and clean contact",
        "skill": "technique",
        "objective": "Identify the strings and play clear fretted notes with economical pressure.",
        "teaching": [
          "Standard guitar tuning, from the thickest string to the thinnest, is E2 A2 D3 G3 B3 E4. In string numbering the thinnest is string 1; the thickest is string 6. Check tuning with a tuner or reliable reference before judging your playing.",
          "Place a fingertip just behind a fret, rather than on its metal bar. Use only enough pressure for a clear note. Keep your wrist comfortable and change the instrument position rather than forcing a reach."
        ],
        "example": {
          "caption": "Worked example · Strings, tuning and clean contact",
          "text": "String 1 open = E4; fret 1 = F4; fret 3 = G4.\nPick E4–F4–G4–F4–E4 slowly. Each fret raises pitch by one semitone.",
          "notes": [
            64,
            65,
            67,
            65,
            64
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Strings, tuning and clean contact",
            "instructions": "Play the five-note example five times slowly. Check one note at a time for buzz and release excess pressure between repetitions.",
            "protocol": {
              "kind": "repetitions",
              "task": "Clear first-string E–F–G notes",
              "target": 5
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Strings, tuning and clean contact",
            "instructions": "Play the example twice, then alternate one clear fretted note and a deliberate silence for eight counts.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the example twice, then alternate one clear fretted note and a deliberate silence for eight counts.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I identified strings 1 and 6 correctly.",
          "The five notes sounded clearly.",
          "The hand remained comfortable without squeezing."
        ],
        "questions": [
          {
            "prompt": "Which is string 1 in standard tuning?",
            "options": [
              "The thinnest high E string",
              "The thickest low E string",
              "The A string"
            ],
            "answer": 0,
            "explanation": "String numbering runs from the highest-pitched string down, opposite the low-to-high tuning list."
          }
        ],
        "easier": "Use open strings only while learning their names.",
        "harder": "Name and play B3–C4–D4 on string 2.",
        "mistake": "Pressing farther from the fret often encourages unnecessary force. Move closer, then reduce pressure.",
        "transfer": "Check tuning before accompanying anybody."
      },
      {
        "id": "chord-boxes",
        "title": "Read and sound a chord shape",
        "skill": "chords",
        "objective": "Translate a low-to-high fret list into an evenly sounding Em chord.",
        "teaching": [
          "The diagrams here label strings from low E to high E. A number is the fret to hold, 0 means open, and × means do not play that string. A diagram shows where to fret, not which finger is compulsory.",
          "For Em, fret the A and D strings at fret 2 while the other strings remain open. Pick each string separately before strumming. Adjust a finger that accidentally touches a neighboring string instead of pressing every finger harder."
        ],
        "example": {
          "caption": "Worked example · Read and sound a chord shape",
          "text": "Em: 0 2 2 0 0 0, read low E → high E.\nSound six strings separately, then one gentle full strum.",
          "chords": [
            {
              "name": "Em",
              "frets": [
                0,
                2,
                2,
                0,
                0,
                0
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read and sound a chord shape",
            "instructions": "Form Em, pick the six strings slowly, release, and repeat eight times. Count a clean repetition only when every intended string rings.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "Em",
                "Em"
              ],
              "target": 8,
              "technique": "Check each string before strumming."
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read and sound a chord shape",
            "instructions": "Strum Em on beat 1 of each bar for four bars. Let it ring for four counts, release pressure, and form it again before the next bar.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Strum Em on beat 1 of each bar for four bars. Let it ring for four counts, release pressure, and form it again before the next bar.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I interpreted open and fretted strings correctly.",
          "All six intended strings sounded.",
          "I could release and reform the shape without tension."
        ],
        "questions": [
          {
            "prompt": "What does 0 mean in a chord shape?",
            "options": [
              "Mute that string",
              "Use fret ten",
              "Play that string open"
            ],
            "answer": 2,
            "explanation": "Zero identifies an unfretted open string; × is the omission symbol."
          }
        ],
        "easier": "Pick only the two fretted strings, then add the open ones.",
        "harder": "Reform Em without watching, then verify by picking each string.",
        "mistake": "Curved fingers may still brush a neighbor. Adjust fingertip angle and guitar position.",
        "transfer": "Check any new chord string by string before using it in a song."
      },
      {
        "id": "minor-changes",
        "title": "Em to Am: prepare the move",
        "skill": "chords",
        "objective": "Move between Em and Am while preserving clear chord tones.",
        "teaching": [
          "Am omits the low E string: x 0 2 2 1 0. Learn its sound separately before switching from Em. Plan which fingers move and keep them close to the strings; do not make the hand hover far away.",
          "Practice changes without a strict speed target first. A clean change means the intended strings ring and the unwanted low E stays out of Am. Then give each chord four counted beats."
        ],
        "example": {
          "caption": "Worked example · Em to Am: prepare the move",
          "text": "Em: 0 2 2 0 0 0\nAm: x 0 2 2 1 0\nFour beats on Em, then four on Am.",
          "chords": [
            {
              "name": "Em",
              "frets": [
                0,
                2,
                2,
                0,
                0,
                0
              ]
            },
            {
              "name": "Am",
              "frets": [
                null,
                0,
                2,
                2,
                1,
                0
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Em to Am: prepare the move",
            "instructions": "Make eight slow Em→Am or Am→Em changes. Pick through each destination chord and log clean/total counts after the set.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "Em",
                "Am"
              ],
              "target": 8,
              "technique": "Move together; keep the pulse."
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Em to Am: prepare the move",
            "instructions": "Play four bars alternating Em and Am, one strum on each beat 1. Keep counting all four beats during each chord.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play four bars alternating Em and Am, one strum on each beat 1. Keep counting all four beats during each chord.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "Am excluded the low E string.",
          "The destination chords sounded clearly.",
          "I prepared the hand before the next downbeat."
        ],
        "questions": [
          {
            "prompt": "Which string is omitted from this Am shape?",
            "options": [
              "The low E string",
              "The high E string",
              "The A string"
            ],
            "answer": 0,
            "explanation": "The first low-to-high position is ×, so low E is not sounded."
          }
        ],
        "easier": "Give each chord eight beats, using the final four to prepare.",
        "harder": "Make the change with two beats per chord while preserving clarity.",
        "mistake": "Rushing the hand can mute a string. Reduce speed until the path is repeatable.",
        "transfer": "Use a two-chord loop to support a simple melody."
      },
      {
        "id": "major-chords",
        "title": "C, G and D: choose the right strings",
        "skill": "chords",
        "objective": "Play three common major chords with deliberate string selection.",
        "teaching": [
          "C, G and D use different lowest sounded strings. Read the omissions before strumming: C starts on A, G can use all six strings, and D starts on the open D string.",
          "Learn each chord separately and test every intended string. The G shown is one common version, not the only legitimate fingering. Use comfortable fingers and judge the sound; do not stretch through pain to match a picture."
        ],
        "example": {
          "caption": "Worked example · C, G and D: choose the right strings",
          "text": "C: x 3 2 0 1 0\nG: 3 2 0 0 0 3\nD: x x 0 2 3 2\nRead low to high; x means do not sound that string.",
          "chords": [
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            },
            {
              "name": "G",
              "frets": [
                3,
                2,
                0,
                0,
                0,
                3
              ]
            },
            {
              "name": "D",
              "frets": [
                null,
                null,
                0,
                2,
                3,
                2
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: C, G and D: choose the right strings",
            "instructions": "Pick C, G and D string by string. Make two slow circuits, fixing one muted note at a time before counting a clean chord.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "G",
                "D"
              ],
              "target": 8,
              "technique": "Choose the starting string for each strum."
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: C, G and D: choose the right strings",
            "instructions": "Play C | G | D | G, one chord per four-count bar. Strum only once on each downbeat until the string choices are dependable.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C | G | D | G, one chord per four-count bar. Strum only once on each downbeat until the string choices are dependable.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "C and D excluded their marked low strings.",
          "The selected chord tones were clear.",
          "The hand stayed comfortable across all three shapes."
        ],
        "questions": [
          {
            "prompt": "Where does the strum begin for the displayed D chord?",
            "options": [
              "The A string",
              "The open D string",
              "The low E string"
            ],
            "answer": 1,
            "explanation": "Both low E and A are marked × in this shape."
          }
        ],
        "easier": "Work on C and G only; add D after each is clear.",
        "harder": "Alternate C–G and G–D changes without looking at the fretting hand.",
        "mistake": "A wide strum can add the unwanted low strings. Narrow the picking-hand motion.",
        "transfer": "Choose chord shapes that fit the key and your current control."
      },
      {
        "id": "on-time",
        "title": "Chord changes have a deadline",
        "skill": "rhythm",
        "objective": "Land a chord change on the next beat one without stopping the count.",
        "teaching": [
          "Fast fingers and reliable rhythm are related but not identical. A chord can form clearly after a long pause and still miss its musical entrance. Set a slow four-beat pulse and reserve the next beat 1 as the destination.",
          "First strum only on beat 1. Use the remaining beats to prepare, then gradually add strums on 2 and 3. Keep the rhythm understandable even while the hand is learning."
        ],
        "example": {
          "caption": "Worked example · Chord changes have a deadline",
          "text": "4/4 at quarter = 50\nG (1 2 3 4) | C (1 2 3 4) | G | D\nFirst version: strum only each 1.",
          "chords": [
            {
              "name": "G",
              "frets": [
                3,
                2,
                0,
                0,
                0,
                3
              ]
            },
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            },
            {
              "name": "D",
              "frets": [
                null,
                null,
                0,
                2,
                3,
                2
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Chord changes have a deadline",
            "instructions": "Loop G–C with one strum per bar for eight changes. Count aloud and judge whether the destination lands on 1, not just whether it eventually rings.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "G",
                "C",
                "G",
                "D"
              ],
              "target": 8,
              "technique": "Land each new chord on the next 1.",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Chord changes have a deadline",
            "instructions": "Play G | C | G | D twice. Add quarter-note strums only when each downbeat remains clear.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play G | C | G | D twice. Add quarter-note strums only when each downbeat remains clear.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Each new chord landed on beat 1.",
          "The spoken count continued through the change.",
          "Adding strums did not introduce a pause."
        ],
        "questions": [
          {
            "prompt": "Which result passes this timing task?",
            "options": [
              "More changes with a broken rhythm",
              "A clear chord on the intended beat",
              "A clear chord after an uncounted pause"
            ],
            "answer": 1,
            "explanation": "The rhythm provides a deadline as well as a chord-quality requirement."
          }
        ],
        "easier": "Use Em and Am, or eight beats per chord.",
        "harder": "Add a gentle strum on beat 4 and still change on the next 1.",
        "mistake": "Counting stops when attention shifts to fingers. Keep the count audible.",
        "transfer": "In accompaniment, simplify the strum before sacrificing the pulse."
      },
      {
        "id": "strumming",
        "title": "Keep the hand moving through rests",
        "skill": "rhythm",
        "objective": "Play an eighth-note strum pattern while leaving deliberate gaps.",
        "teaching": [
          "Use a small down-up hand motion for eighth-note subdivision: down on each number, up on each “and.” A missed strum in the pattern means the hand passes without sounding, not that the clock stops.",
          "Start on muted strings to separate rhythm from chord changes. Then add a familiar Em chord. Keep the amplitude small; the point is consistent spacing and planned silence."
        ],
        "example": {
          "caption": "Worked example · Keep the hand moving through rests",
          "text": "Count: 1 & 2 & 3 & 4 &\nMotion: D U D U D U D U\nSound:  D – D U – U D –\nD/U = down/up; – = silent motion.",
          "rhythm": {
            "counts": [
              "1",
              "&",
              "2",
              "&",
              "3",
              "&",
              "4",
              "&"
            ],
            "rows": [
              {
                "label": "Strum",
                "hits": [
                  "D",
                  "–",
                  "D",
                  "U",
                  "–",
                  "U",
                  "D",
                  "–"
                ]
              }
            ]
          }
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Keep the hand moving through rests",
            "instructions": "On gently muted strings, play the written pattern eight times at a comfortable spoken pulse. Keep every silent motion in place.",
            "protocol": {
              "kind": "repetitions",
              "task": "Eight-count strum with silent motions",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Keep the hand moving through rests",
            "instructions": "Use the pattern for two bars Em and two bars Am. Repeat once; simplify the chord change rather than dropping the subdivision.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Use the pattern for two bars Em and two bars Am. Repeat once; simplify the chord change rather than dropping the subdivision.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "All silent positions retained their time.",
          "The hand maintained down-up motion.",
          "The chord change did not break the pattern."
        ],
        "questions": [
          {
            "prompt": "What does the hand do on a silent subdivision?",
            "options": [
              "Freeze until the next note",
              "Add an extra downstroke",
              "Continue its small motion without sounding"
            ],
            "answer": 2,
            "explanation": "Continuing the subdivision motion can make the planned rests easier to place."
          }
        ],
        "easier": "Use D – D – D – D – before adding upstrums.",
        "harder": "Write a different pattern with the same eight hand motions.",
        "mistake": "Changing direction after every sounded note loses the downbeat/upbeat relationship. Follow the full grid.",
        "transfer": "Leave rhythmic space for other instruments instead of filling every eighth."
      },
      {
        "id": "note-map",
        "title": "Find natural notes near the nut",
        "skill": "fretboard",
        "objective": "Locate named notes on the low E and A strings through fret 5.",
        "teaching": [
          "Each fret raises pitch one semitone. Most neighboring natural-letter notes are two semitones apart, but E–F and B–C are one semitone apart. On low E, frets 0, 1, 3 and 5 are E, F, G and A.",
          "Name the target before playing it. The app can score your note-name response, but it cannot hear whether you played the fret correctly. Verify the physical location separately."
        ],
        "example": {
          "caption": "Worked example · Find natural notes near the nut",
          "text": "Low E: 0 E | 1 F | 3 G | 5 A\nA string: 0 A | 2 B | 3 C | 5 D\nUnlisted frets are chromatic notes, not empty spaces."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Find natural notes near the nut",
            "instructions": "Answer twelve fretboard prompts. Before tapping the answer, locate the requested string/fret and say the note name.",
            "protocol": {
              "kind": "fretboard",
              "tuning": [
                40,
                45,
                50,
                55,
                59,
                64
              ],
              "strings": [
                5,
                6
              ],
              "minFret": 0,
              "maxFret": 5,
              "target": 12
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Find natural notes near the nut",
            "instructions": "Play roots G–C–D–G using low-E fret 3 and A-string frets 3/5. Hold each note four counts and name it.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play roots G–C–D–G using low-E fret 3 and A-string frets 3/5. Hold each note four counts and name it.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I identified E–F and B–C as semitone neighbors.",
          "I answered at least ten of twelve prompts correctly.",
          "I located the named roots on the instrument."
        ],
        "questions": [
          {
            "prompt": "Which pair has only one semitone between natural notes?",
            "options": [
              "E and F",
              "C and D",
              "G and A"
            ],
            "answer": 0,
            "explanation": "E–F and B–C are the natural-note semitone pairs."
          }
        ],
        "easier": "Limit the recall task to one string and frets 0–3 in Task settings.",
        "harder": "Find the same pitch class on another string, then compare the octaves.",
        "mistake": "Confusing string 1 with low E reverses the map. Check the labeled string number.",
        "transfer": "Use root-note locations to understand, not merely memorize, chord shapes."
      },
      {
        "id": "first-song",
        "title": "Foundation assessment: an eight-bar accompaniment",
        "skill": "repertoire",
        "objective": "Perform a short progression with steady time and clear changes.",
        "teaching": [
          "Prepare the four-chord loop G–D–Em–C and repeat it twice. Choose one simple strum pattern you can maintain; there is no reward for selecting the busiest pattern.",
          "Rehearse D→Em and C→G separately, then play the full eight bars. A musical ending includes a deliberate final G and silence. Evaluate clarity, pulse and continuity separately."
        ],
        "example": {
          "caption": "Worked example · Foundation assessment: an eight-bar accompaniment",
          "text": "4/4: | G | D | Em | C | G | D | Em | C |\nOne bar each; finish with G on the next beat 1.\nStart with four downstrums per bar.",
          "chords": [
            {
              "name": "G",
              "frets": [
                3,
                2,
                0,
                0,
                0,
                3
              ]
            },
            {
              "name": "D",
              "frets": [
                null,
                null,
                0,
                2,
                3,
                2
              ]
            },
            {
              "name": "Em",
              "frets": [
                0,
                2,
                2,
                0,
                0,
                0
              ]
            },
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Foundation assessment: an eight-bar accompaniment",
            "instructions": "Practice the two weakest changes in pairs of four counted bars. Keep at least one strum on each destination downbeat.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "G",
                "D",
                "Em",
                "C"
              ],
              "target": 8,
              "technique": "Complete eight bars without a restart.",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Foundation assessment: an eight-bar accompaniment",
            "instructions": "Play the full eight-bar progression and final G once without stopping. Assess after the chord has finished ringing.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full eight-bar progression and final G once without stopping. Assess after the chord has finished ringing.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The eight-bar form was complete.",
          "Downbeats and changes remained recognizable.",
          "The final chord and stop were deliberate."
        ],
        "questions": [
          {
            "prompt": "What should you simplify first when the rhythm collapses?",
            "options": [
              "The need to listen",
              "The strum pattern",
              "The number of beats in the bar"
            ],
            "answer": 1,
            "explanation": "A simpler accompaniment can preserve time while chord changes develop."
          }
        ],
        "easier": "Use only one downstrum per bar.",
        "harder": "Repeat on another day with the eighth-note rest pattern.",
        "mistake": "Restarting every difficult change avoids practicing the complete phrase. Repair, then take a full run.",
        "transfer": "Use the same method on a song chart you are licensed or permitted to use."
      }
    ]
  },
  {
    "id": "guitar-development",
    "revision": 1,
    "instrument": "guitar",
    "stage": "development",
    "title": "Guitar: movable shapes and melodic control",
    "level": "intermediate",
    "summary": "Develop smaller voicings, fingerpicking, minor-pentatonic phrasing and compound rhythm.",
    "prerequisites": "Clear open chords and a reliable counted accompaniment.",
    "outcomes": [
      "Use compact movable chord shapes",
      "Coordinate picking and fretting",
      "Make short melodic phrases"
    ],
    "placement": [
      "I can maintain an open-chord progression.",
      "I understand string numbers and fret lists.",
      "I can alternate pick single notes."
    ],
    "sourceIds": [
      "justin",
      "berklee-guitar"
    ],
    "lessons": [
      {
        "id": "small-f",
        "title": "A small F before a full barre",
        "skill": "chords",
        "objective": "Sound a compact F shape without excessive squeezing.",
        "teaching": [
          "A full barre is not the only way to play an F chord. Begin with the top four-string shape x x 3 2 1 1: F–A–C–F. Your index lightly covers the top two strings at fret 1; the other fingers supply the remaining notes.",
          "Move the guitar or wrist to a comfortable position and use only the required pressure. A full six-string barre can be explored later; pain or a rigid thumb is not a progression criterion."
        ],
        "example": {
          "caption": "Worked example · A small F before a full barre",
          "text": "F small: x x 3 2 1 1\nC: x 3 2 0 1 0\nAlternate four counts on each; omit the bottom two strings for F.",
          "chords": [
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            },
            {
              "name": "F small",
              "frets": [
                null,
                null,
                3,
                2,
                1,
                1
              ]
            },
            {
              "name": "F barre",
              "frets": [
                1,
                3,
                3,
                2,
                1,
                1
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A small F before a full barre",
            "instructions": "Pick the four F notes separately five times. Then make eight slow C–F changes using the stated string boundaries.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "F"
              ],
              "target": 8,
              "technique": "Use the compact F shape shown."
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A small F before a full barre",
            "instructions": "Play | C | F | C | G | twice using one strum per bar, then two only if comfortable.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play | C | F | C | G | twice using one strum per bar, then two only if comfortable.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The four F notes sounded.",
          "The low two strings stayed silent in F.",
          "The change was comfortable and rhythmically placed."
        ],
        "questions": [
          {
            "prompt": "Why start with a compact F?",
            "options": [
              "It teaches the harmony with fewer simultaneous demands",
              "It is the only correct F chord",
              "A barre must always be avoided"
            ],
            "answer": 0,
            "explanation": "The smaller shape reduces initial demands while keeping the chord tones."
          }
        ],
        "easier": "Play only the top three notes x x x 2 1 1.",
        "harder": "Try the six-string F only with relaxed, clear contact.",
        "mistake": "Squeezing harder can hide an awkward angle. Adjust position first.",
        "transfer": "Choose smaller voicings when bass and keyboards already occupy low registers."
      },
      {
        "id": "triads",
        "title": "Three-note voicings that move less",
        "skill": "chords",
        "objective": "Connect C, F and G triads on the top three strings.",
        "teaching": [
          "A major triad contains root, major third and fifth. On the top three strings, C can be played at frets 5–5–3 (G–C–E), F at 5–6–5 (C–F–A), and G at 4–3–3 (B–D–G). The lowest sounding note need not be the root.",
          "Move to the nearest usable inversion rather than jumping to a familiar full chord. Listen for the smooth motion of each note and mute all lower strings."
        ],
        "example": {
          "caption": "Worked example · Three-note voicings that move less",
          "text": "Top three strings G–B–E:\nC: 5 5 3 | F: 5 6 5 | G: 4 3 3\nAll are major triads; C and G begin on non-root chord tones.",
          "chords": [
            {
              "name": "C triad",
              "frets": [
                null,
                null,
                null,
                5,
                5,
                3
              ]
            },
            {
              "name": "F triad",
              "frets": [
                null,
                null,
                null,
                5,
                6,
                5
              ]
            },
            {
              "name": "G triad",
              "frets": [
                null,
                null,
                null,
                4,
                3,
                3
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Three-note voicings that move less",
            "instructions": "Pick each three-note voicing, name its chord, then change slowly through C–F–G–C four times.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "F",
                "G"
              ],
              "target": 8,
              "technique": "Top-three-string triads; mute lower strings."
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Three-note voicings that move less",
            "instructions": "Play one voicing per bar over | C | F | G | C |, first on beat 1, then on beats 2 and 4.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play one voicing per bar over | C | F | G | C |, first on beat 1, then on beats 2 and 4.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I played only the top three strings.",
          "The chord identities remained correct.",
          "The changes used controlled nearby motion."
        ],
        "questions": [
          {
            "prompt": "Must the lowest note of every chord voicing be its root?",
            "options": [
              "Yes, always",
              "Only if all six strings sound",
              "No; an inversion may begin on another chord tone"
            ],
            "answer": 2,
            "explanation": "Changing which chord tone is lowest creates an inversion without changing the triad’s identity."
          }
        ],
        "easier": "Learn only the C and F triads first, releasing the hand between slow changes.",
        "harder": "Find another inversion of the same three chords without relying on a full barre.",
        "mistake": "Letting open lower strings ring can change the intended harmony. Mute them.",
        "transfer": "Leave room for the bass by using higher, smaller chord shapes."
      },
      {
        "id": "fingerpick",
        "title": "A repeatable bass-and-treble pattern",
        "skill": "technique",
        "objective": "Separate thumb and finger roles in a simple picked accompaniment.",
        "teaching": [
          "Assign a clear role: the thumb plays a bass string, and index/middle/ring play G/B/high-E strings. On C, use the A string for the bass. On Am, use the same bass string open.",
          "Pluck with small movements and let each note remain audible. The pattern below has four quarter-note events. Do not call it finger independence if one movement causes extra unintended strings to sound."
        ],
        "example": {
          "caption": "Worked example · A repeatable bass-and-treble pattern",
          "text": "C pattern: A string → G → B → high E, one note per beat.\nAm: same string order, different chord shape.\nRepeat each chord for two bars.",
          "chords": [
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            },
            {
              "name": "Am",
              "frets": [
                null,
                0,
                2,
                2,
                1,
                0
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A repeatable bass-and-treble pattern",
            "instructions": "Hold C and repeat the four-note string pattern eight times slowly. Compare the thumb volume with the treble notes.",
            "protocol": {
              "kind": "repetitions",
              "task": "Thumb–index–middle–ring pattern",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A repeatable bass-and-treble pattern",
            "instructions": "Play two bars C, two Am, two C and two Am. Keep the pattern continuous across each chord change.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play two bars C, two Am, two C and two Am. Keep the pattern continuous across each chord change.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The four intended strings sounded in order.",
          "The bass did not overpower the treble.",
          "The pattern stayed continuous through changes."
        ],
        "questions": [
          {
            "prompt": "What is the thumb’s role in this pattern?",
            "options": [
              "Playing every treble note",
              "Pulling all six strings together",
              "Playing the assigned bass string"
            ],
            "answer": 2,
            "explanation": "A stable thumb assignment makes the alternating roles easier to coordinate."
          }
        ],
        "easier": "Use only thumb and index on two strings.",
        "harder": "Play the pattern in eighth notes while retaining the same four-beat bar.",
        "mistake": "A large finger pull can disturb a neighboring string. Use less motion.",
        "transfer": "Use a sparse picked texture under a quiet vocal."
      },
      {
        "id": "pentatonic",
        "title": "A minor pentatonic: phrase, then rest",
        "skill": "improvisation",
        "objective": "Use a small note set to make a two-bar phrase with an ending.",
        "teaching": [
          "A minor pentatonic uses A C D E G. A compact position is low-E frets 5/8, A-string frets 5/7, and D-string frets 5/7. Name the notes rather than treating the shape as an anonymous ladder.",
          "Make a short phrase that ends on A and leave a full bar of silence. Repeating a small idea with one variation gives the listener something to recognize; running the whole scale nonstop is a different task."
        ],
        "example": {
          "caption": "Worked example · A minor pentatonic: phrase, then rest",
          "text": "Low E: 5 A, 8 C\nA string: 5 D, 7 E\nD string: 5 G, 7 A\nPhrase: A C D E | A (hold), then one silent bar.",
          "notes": [
            57,
            60,
            62,
            64,
            67,
            69
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A minor pentatonic: phrase, then rest",
            "instructions": "Play the six ascending positions and descend four times. Check note names and use a small comfortable position shift if needed.",
            "protocol": {
              "kind": "scale-cycle",
              "keys": [
                9
              ],
              "quality": "minor-pentatonic",
              "octaves": 1,
              "hands": "not-applicable",
              "motion": "parallel",
              "fingering": "Use the displayed frets; alternate pick slowly.",
              "position": "Low E 5/8, A 5/7, D 5/7"
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A minor pentatonic: phrase, then rest",
            "instructions": "Create a two-bar idea from A C D E G, end on A, then leave a silent bar. Repeat the idea with one rhythmic change.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Create a two-bar idea from A C D E G, end on A, then leave a silent bar. Repeat the idea with one rhythmic change.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The selected notes belonged to the intended set.",
          "Each phrase had a deliberate ending.",
          "The silence kept its counted length."
        ],
        "questions": [
          {
            "prompt": "Which note is not in A minor pentatonic?",
            "options": [
              "B",
              "C",
              "G"
            ],
            "answer": 0,
            "explanation": "The five pitch classes are A, C, D, E and G."
          }
        ],
        "easier": "Use only A, C and D with a counted rest after each short phrase.",
        "harder": "Start the same idea on a different beat without losing the bar.",
        "mistake": "Speed can disguise weak phrase endings. Limit the note count.",
        "transfer": "Answer a vocal phrase in an available gap rather than playing through it."
      },
      {
        "id": "six-eight",
        "title": "Fingerpicked 6/8 in two groups",
        "skill": "rhythm",
        "objective": "Play a six-note accompaniment with two grouped pulses.",
        "teaching": [
          "Count 6/8 as two groups of three: 1-2-3 and 4-5-6. On Am, pick A–G–B–high-E–B–G strings in that order. Let counts 1 and 4 identify the two groups without harsh accents.",
          "The six-note pattern is one bar, not six quarter-note beats. The transport uses eighth-note BPM in 6/8, so begin at 120 displayed eighths per minute, equivalent to 40 large dotted-quarter pulses."
        ],
        "example": {
          "caption": "Worked example · Fingerpicked 6/8 in two groups",
          "text": "Count: 1 2 3 4 5 6\nStrings: A G B e B G\nAm for two bars, C for two bars."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Fingerpicked 6/8 in two groups",
            "instructions": "Hold Am for four bars and establish the six-note pattern. Count both groups aloud.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "Am",
                "C"
              ],
              "target": 8,
              "technique": "Six-note fingerpick pattern, grouped 3+3.",
              "pulse": {
                "bpm": 120,
                "beats": 6,
                "beatUnit": 8,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Fingerpicked 6/8 in two groups",
            "instructions": "Alternate two-bar Am and C sections for eight bars while keeping the picking order and grouped pulse.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate two-bar Am and C sections for eight bars while keeping the picking order and grouped pulse.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 120,
                "beats": 6,
                "beatUnit": 8,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The pattern contained six eighth notes per bar.",
          "Counts 1 and 4 provided the grouped pulse.",
          "Chord changes preserved the six-note cycle."
        ],
        "questions": [
          {
            "prompt": "How many eighth notes make one bar here?",
            "options": [
              "Four",
              "Eight",
              "Six"
            ],
            "answer": 2,
            "explanation": "The 6/8 signature specifies six eighth notes, commonly grouped 3+3."
          }
        ],
        "easier": "Pick only counts 1 and 4 before filling the intervening notes.",
        "harder": "Use the same pattern with a different comfortable chord pair.",
        "mistake": "Reading displayed eighth-note BPM as quarter BPM makes the exercise much faster than intended. Check units.",
        "transfer": "Identify whether a ballad is in a compound feel before choosing a strum."
      },
      {
        "id": "melody",
        "title": "Read and shape an original melody",
        "skill": "reading",
        "objective": "Read a short note-name score while preserving duration and phrase direction.",
        "teaching": [
          "The original melody below uses first-string E, F and G plus second-string C and D. In this compact score, q means one quarter-note beat, h means two, and r means one quarter-note rest. This is a preparatory note-name score, not a replacement for staff notation.",
          "Scan each bar before playing. Keep counting through the rest and let the two-beat note last its full duration. Save the first take separately from later repairs."
        ],
        "example": {
          "caption": "Worked example · Read and shape an original melody",
          "text": "4/4: | E4 q F4 q G4 h | G4 q r F4 q E4 q |\n| D4 q E4 q F4 h | E4 q D4 q C4 h |\nC4 = B-string fret 1; D4 = B-string fret 3.",
          "notes": [
            64,
            65,
            67,
            67,
            65,
            64,
            62,
            64,
            65,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read and shape an original melody",
            "instructions": "Name the notes and clap the rhythm, then play one reading take. Log errors and continuity without replaying first. This displayed example is prepared reading, not an unseen first read. Use an unfamiliar teacher-selected excerpt separately when testing first-read ability.",
            "protocol": {
              "kind": "sight-reading",
              "material": "Original: | E4 q F4 q G4 h | G4 q r F4 q E4 q | D4 q E4 q F4 h | E4 q D4 q C4 h |",
              "key": "C",
              "hands": "not-applicable",
              "firstRead": false,
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read and shape an original melody",
            "instructions": "Repair only the string crossing into D4, then play the complete four bars with a gentle phrase ending.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Repair only the string crossing into D4, then play the complete four bars with a gentle phrase ending.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Quarter notes, half notes and rests had their intended lengths.",
          "The string crossing preserved time.",
          "I distinguished reading from repeat practice."
        ],
        "questions": [
          {
            "prompt": "How long is h in this score?",
            "options": [
              "One eighth note",
              "Four full bars",
              "Two quarter-note beats"
            ],
            "answer": 2,
            "explanation": "The local legend defines h as a half note, equal to two quarter-note beats."
          }
        ],
        "easier": "Play only the first two bars.",
        "harder": "Write a new melody using the same notes and swap it with a partner.",
        "mistake": "Replaying the opening repeatedly does not improve an unseen reading score. Separate repair from assessment.",
        "transfer": "Use reading preparation to learn small instrumental hooks without relying solely on shapes."
      }
    ]
  },
  {
    "id": "guitar-ensemble",
    "revision": 1,
    "instrument": "guitar",
    "stage": "ensemble",
    "title": "Guitar: accompaniment and arrangement",
    "level": "advanced",
    "summary": "Apply chord knowledge to transposition, texture, cues and a complete supportive part.",
    "prerequisites": "A steady open-chord progression plus some compact voicings.",
    "outcomes": [
      "Transpose simple shapes intentionally",
      "Choose a supporting register and rhythm",
      "Follow an original arrangement"
    ],
    "placement": [
      "I can follow an eight-bar chord chart.",
      "I can make contrasting textures at one tempo.",
      "I know that capo fret and sounding key differ."
    ],
    "sourceIds": [
      "justin",
      "berklee-guitar",
      "ensemble"
    ],
    "lessons": [
      {
        "id": "capo",
        "title": "Capo shapes versus sounding chords",
        "skill": "harmony",
        "objective": "Explain and use the difference between chord shape and sounding key.",
        "teaching": [
          "A capo moves the open-string reference upward by one semitone per fret. G-family shapes with a capo at fret 2 sound a whole step higher: G becomes A, D becomes E, Em becomes F-sharp minor and C becomes D.",
          "Write both shape names and sounding chord names on your chart. A bassist or pianist usually needs the sounding harmony, not the guitar shape name. Without a capo, practice the explanation and choose a comfortable uncapped key."
        ],
        "example": {
          "caption": "Worked example · Capo shapes versus sounding chords",
          "text": "Capo 2 shapes: G | D | Em | C\nSounding chords: A | E | F#m | D\nA capo is optional equipment; never claim the sounding key changed without it.",
          "chords": [
            {
              "name": "G",
              "frets": [
                3,
                2,
                0,
                0,
                0,
                3
              ]
            },
            {
              "name": "D",
              "frets": [
                null,
                null,
                0,
                2,
                3,
                2
              ]
            },
            {
              "name": "Em",
              "frets": [
                0,
                2,
                2,
                0,
                0,
                0
              ]
            },
            {
              "name": "C",
              "frets": [
                null,
                3,
                2,
                0,
                1,
                0
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Capo shapes versus sounding chords",
            "instructions": "Name each shape and its sounding chord. Play the progression with a capo at 2 when available; otherwise use the uncapped version and state its key accurately.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "G",
                "D",
                "Em",
                "C"
              ],
              "target": 8,
              "technique": "With capo 2 these sound A, E, F#m, D.",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Capo shapes versus sounding chords",
            "instructions": "Explain the sounding progression to an imagined rhythm section, then perform eight bars with a consistent accompaniment.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Explain the sounding progression to an imagined rhythm section, then perform eight bars with a consistent accompaniment.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I distinguished shape names from sounding chords.",
          "The progression remained steady.",
          "I stated the actual equipment/key used."
        ],
        "questions": [
          {
            "prompt": "With capo 2, a G shape sounds as which chord?",
            "options": [
              "A",
              "G",
              "F"
            ],
            "answer": 0,
            "explanation": "Two frets transpose the shape upward by two semitones."
          }
        ],
        "easier": "Transpose only G and C first.",
        "harder": "Work out the sounding chords with capo 3, then verify them.",
        "mistake": "Calling a shape “G” to the whole band can produce the wrong harmony. State the sounding key.",
        "transfer": "Choose a key that fits the singer, then decide how the guitar will voice it."
      },
      {
        "id": "texture",
        "title": "Leave space in the rhythm section",
        "skill": "repertoire",
        "objective": "Choose distinct sparse and fuller accompaniment textures.",
        "teaching": [
          "When bass, keyboard and guitar all play dense low chords, the arrangement can become crowded. Try compact upper voicings or fewer strums instead of merely turning down.",
          "Keep the same C–F–G–C harmony for both versions. In version A, play one high triad per bar. In B, add a gentle beat-2/4 rhythm. Compare whether the change supports the phrase without competing for every subdivision."
        ],
        "example": {
          "caption": "Worked example · Leave space in the rhythm section",
          "text": "A: C | F | G | C, one high triad on each 1\nB: same chords, short strums on 2 and 4\nLower strings muted for both.",
          "chords": [
            {
              "name": "C triad",
              "frets": [
                null,
                null,
                null,
                5,
                5,
                3
              ]
            },
            {
              "name": "F triad",
              "frets": [
                null,
                null,
                null,
                5,
                6,
                5
              ]
            },
            {
              "name": "G triad",
              "frets": [
                null,
                null,
                null,
                4,
                3,
                3
              ]
            }
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Leave space in the rhythm section",
            "instructions": "Practice the three compact shapes without low-string noise. Play them once per bar for two loops.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "F",
                "G",
                "C"
              ],
              "target": 8,
              "technique": "Top-three-string triads.",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Leave space in the rhythm section",
            "instructions": "Perform four A bars then four B bars, retaining the same tempo and controlled dynamics.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform four A bars then four B bars, retaining the same tempo and controlled dynamics.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The lower strings stayed silent.",
          "The two textures were clearly different.",
          "Both versions preserved the pulse."
        ],
        "questions": [
          {
            "prompt": "How can a guitar make room for bass and keys?",
            "options": [
              "Use fewer notes or a different register",
              "Always strum all six strings",
              "Increase volume to be heard"
            ],
            "answer": 0,
            "explanation": "Arranging the part can reduce competition without changing the chord progression."
          }
        ],
        "easier": "Use familiar open chords with one strum per bar.",
        "harder": "Keep the quieter section expressive using note length, not extra notes.",
        "mistake": "Adding activity whenever another player plays more can crowd the texture. Make a deliberate choice.",
        "transfer": "Discuss register and rhythm roles with the keyboard player."
      },
      {
        "id": "chart-cues",
        "title": "Read a chart through rests and an ending",
        "skill": "reading",
        "objective": "Follow chord duration, a rest and a final stop.",
        "teaching": [
          "A chord chart tells you how long a harmony lasts as well as which chord to play. A rest bar retains its full count. Mark the last sounding chord and its release before starting.",
          "Use the short original chart below. Prepare the change after the rest silently. Solo success demonstrates chart-following, while live cue-following still needs rehearsal with other people."
        ],
        "example": {
          "caption": "Worked example · Read a chart through rests and an ending",
          "text": "4/4: | G | D | Em | C | rest | C | D | G hold |\nLet final G ring for four counts, then stop together."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read a chart through rests and an ending",
            "instructions": "Rehearse C → silent bar → C while counting continuously. Then rehearse D → G and the final release.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Original chart with a counted rest and held ending.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read a chart through rests and an ending",
            "instructions": "Perform the full eight bars. Keep the silent fifth bar intact and stop after the final four-count G.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the full eight bars. Keep the silent fifth bar intact and stop after the final four-count G.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The rest lasted one full bar.",
          "The re-entry arrived on time.",
          "The last chord had a deliberate release."
        ],
        "questions": [
          {
            "prompt": "During the rest bar, what still continues?",
            "options": [
              "The count and arrangement",
              "The strumming sound",
              "An extra unplanned bar"
            ],
            "answer": 0,
            "explanation": "Silence is timed material, not an interruption of the form."
          }
        ],
        "easier": "Use a single chord for the form before adding changes.",
        "harder": "Have a partner cue the release after the planned final chord.",
        "mistake": "Letting the guitar ring through a marked rest is still playing. Practice muting intentionally.",
        "transfer": "Ask the bandleader how long the ending should ring."
      },
      {
        "id": "application-take",
        "title": "Application assessment: complete accompaniment",
        "skill": "repertoire",
        "objective": "Perform and review a supportive guitar arrangement.",
        "teaching": [
          "Choose either open chords or compact voicings. Prepare an A section with one strum per bar and a B section with a repeatable rhythm. The same four-chord loop is enough; the learning target is continuity and arrangement.",
          "Do not judge the result only by mistake count. Also ask whether the part left space, the changes stayed on time and the ending was clear. Steadybar stores these self-reports, not a microphone-based grade."
        ],
        "example": {
          "caption": "Worked example · Application assessment: complete accompaniment",
          "text": "Intro: 2 bars G\nA: G | D | Em | C\nB: G | D | Em | C, fuller rhythm\nFinal: D for one bar, G for one bar, stop."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Application assessment: complete accompaniment",
            "instructions": "Practice the C-to-G section join and D-to-G ending, then rest briefly before a complete take.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "G",
                "D",
                "Em",
                "C"
              ],
              "target": 8,
              "technique": "Rehearse section joins at the same pulse.",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Application assessment: complete accompaniment",
            "instructions": "Perform the entire 12-bar form without restarting. Identify one timing, clarity or texture issue and a specific next repair.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the entire 12-bar form without restarting. Identify one timing, clarity or texture issue and a specific next repair.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I completed the planned form.",
          "The texture change kept a steady pulse.",
          "My notes name a specific next repair."
        ],
        "questions": [
          {
            "prompt": "Which is the useful final assessment?",
            "options": [
              "Whether I opened every lesson",
              "Time, chord clarity, musical role and a concrete next step",
              "Only whether I played fast"
            ],
            "answer": 1,
            "explanation": "Course completion records a demonstrated self-assessment, not browsing activity."
          }
        ],
        "easier": "Use downbeat strums throughout.",
        "harder": "Repeat a later-day take in another comfortable key.",
        "mistake": "Choosing new shapes for the assessment can obscure the arrangement target. Use known material first.",
        "transfer": "Prepare the simplest dependable version of a part before rehearsal."
      }
    ]
  },
  {
    "id": "bass-foundation",
    "revision": 1,
    "instrument": "bass",
    "stage": "foundation",
    "title": "Bass: time, note length and roots",
    "level": "beginner",
    "summary": "Start with a clean sound, deliberate silences and correct roots before adding density.",
    "prerequisites": "A tuned four-string bass in standard E–A–D–G tuning. Higher-string-count instruments need their own tuning configuration.",
    "outcomes": [
      "Control note starts and endings",
      "Locate and play roots",
      "Support a chord progression with a stable pulse"
    ],
    "placement": [
      "I can silence unused strings.",
      "I can find C, F and G roots.",
      "I can keep a simple line steady for eight bars."
    ],
    "sourceIds": [
      "studybass",
      "muting"
    ],
    "lessons": [
      {
        "id": "touch",
        "title": "A light attack with a clear pulse",
        "skill": "technique",
        "objective": "Play even alternating notes without pulling the strings excessively.",
        "teaching": [
          "Use amplification at a moderate level so you do not compensate by plucking very hard. Let the finger pass through the string with a small controlled motion. Alternate index and middle fingers and compare their tone.",
          "Standard bass tuning is E1 A1 D2 G2 from low to high; string 1 is the highest G. These lesson diagrams use that four-string tuning. Adjust the instrument setup before making uncomfortable wrist angles a habit."
        ],
        "example": {
          "caption": "Worked example · A light attack with a clear pulse",
          "text": "On the open A string: i m i m, one note per beat.\ni = index; m = middle.\nStop the string deliberately after each four-note set.",
          "notes": [
            33,
            33,
            33,
            33
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A light attack with a clear pulse",
            "instructions": "Play eight four-note sets on open A at an easy spoken pulse. Rest between sets and compare the two fingers.",
            "protocol": {
              "kind": "repetitions",
              "task": "Even alternating A-string notes",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A light attack with a clear pulse",
            "instructions": "Play four bars of quarters on A, then four at a quieter dynamic. Keep the same note length and spacing.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play four bars of quarters on A, then four at a quieter dynamic. Keep the same note length and spacing.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The fingers produced comparably even notes.",
          "I did not pull the strings hard to hear them.",
          "Each set ended deliberately."
        ],
        "questions": [
          {
            "prompt": "What is the preferred response when you cannot hear a lightly played bass?",
            "options": [
              "Pull the strings harder indefinitely",
              "Ignore the tone",
              "Check the listening/amplification setup"
            ],
            "answer": 2,
            "explanation": "A useful listening setup allows controlled technique without excessive attack."
          }
        ],
        "easier": "Use one finger for a short set, then compare with the other.",
        "harder": "Alternate starting finger on each set without changing tone.",
        "mistake": "A large pull can add buzz and uneven attacks. Reduce motion.",
        "transfer": "Establish a moderate, audible rehearsal tone before practicing speed."
      },
      {
        "id": "muting",
        "title": "A note includes its ending",
        "skill": "muting",
        "objective": "Mute unused strings and create a deliberate one-beat silence.",
        "teaching": [
          "A bass line depends on what stops sounding as much as what begins. Both hands can lightly contact unused strings to prevent ringing. On the A string, keep low E quiet with an appropriate plucking-hand contact while the fretting hand controls the higher strings.",
          "Play a note, hold it for two counts, then stop it for two counts. Listen to the silence: an open string ringing underneath means the task is not yet clean."
        ],
        "example": {
          "caption": "Worked example · A note includes its ending",
          "text": "4/4: A on beat 1, hold through beat 2; silence on 3 and 4.\nRepeat on D. Touch to mute; do not fret a new unintended note."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A note includes its ending",
            "instructions": "Alternate two beats sounding and two beats silent on A for four bars. Check every unused string during each rest.",
            "protocol": {
              "kind": "groove",
              "key": "A",
              "style": "Sustains and rests",
              "focus": "muting",
              "progression": "A for 2 beats, rest 2; then D",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A note includes its ending",
            "instructions": "Play two bars A, two D, two A and two E using the same note/rest pattern and full-string muting.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play two bars A, two D, two A and two E using the same note/rest pattern and full-string muting.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Unused strings stayed quiet.",
          "Each note stopped at the intended count.",
          "The silence did not shorten the bar."
        ],
        "questions": [
          {
            "prompt": "Which observation indicates successful muting?",
            "options": [
              "The fingers moved quickly",
              "Silence between the intended notes",
              "Only the loudest string is audible"
            ],
            "answer": 1,
            "explanation": "Muting is judged by unwanted sound being absent, not by a particular visible gesture alone."
          }
        ],
        "easier": "Practice stopping one open string without a pulse.",
        "harder": "Use one beat sounding and one beat silent, maintaining clean endings.",
        "mistake": "Lifting away without touching an open string may leave it ringing. Choose a deliberate mute.",
        "transfer": "Match note endings with the drummer and keyboard player."
      },
      {
        "id": "roots",
        "title": "Find the root before adding notes",
        "skill": "fretboard",
        "objective": "Locate natural-note roots on low E and A through fret 5.",
        "teaching": [
          "On the low E string, open E, fret 1 F, fret 3 G and fret 5 A form useful landmarks. On the A string, open A, fret 2 B, fret 3 C and fret 5 D do the same. E–F and B–C are adjacent semitones.",
          "Say a note name, locate it, then play it. The recall panel scores the answer you tap; physical fingering and sound remain your responsibility to check."
        ],
        "example": {
          "caption": "Worked example · Find the root before adding notes",
          "text": "Low E: 0 E1, 1 F1, 3 G1, 5 A1\nA: 0 A1, 2 B1, 3 C2, 5 D2",
          "notes": [
            36,
            29,
            31,
            36
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Find the root before adding notes",
            "instructions": "Answer twelve low-string fretboard prompts, locating each note before submitting. Review the mistakes rather than immediately clicking again.",
            "protocol": {
              "kind": "fretboard",
              "tuning": [
                28,
                33,
                38,
                43
              ],
              "strings": [
                3,
                4
              ],
              "minFret": 0,
              "maxFret": 5,
              "target": 12
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Find the root before adding notes",
            "instructions": "Play C2–F1–G1–C2 with four counts per note. Keep string changes quiet.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C2–F1–G1–C2 with four counts per note. Keep string changes quiet.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I located C, F and G without guessing.",
          "At least ten of twelve note-name answers were correct.",
          "String changes did not add unwanted ringing."
        ],
        "questions": [
          {
            "prompt": "Where is C on the standard A string?",
            "options": [
              "Fret 5",
              "Fret 3",
              "Fret 1"
            ],
            "answer": 1,
            "explanation": "A to B is two semitones and B to C one more, placing C at fret 3."
          }
        ],
        "easier": "Use only the low E string first.",
        "harder": "Find each root at a second location and compare its octave.",
        "mistake": "The app tuning list is low-to-high, but string 1 is highest. Keep the conventions separate.",
        "transfer": "A correct simple root is more useful than a busy line over the wrong chord."
      },
      {
        "id": "quarters",
        "title": "Quarter notes and measured rests",
        "skill": "timing",
        "objective": "Maintain four equal beats while alternating sound and silence.",
        "teaching": [
          "Begin with four quarter notes on C, each one beat long. Then change the rhythm to sound on beats 1 and 3, leaving 2 and 4 silent. Keep your internal count identical across both versions.",
          "The rests require deliberate muting. Do not allow a long note to blur a written rest, and do not rush toward the next sounded beat."
        ],
        "example": {
          "caption": "Worked example · Quarter notes and measured rests",
          "text": "A: C C C C, four quarter notes\nB: C rest C rest\nEach version is one four-beat bar.",
          "rhythm": {
            "counts": [
              "1",
              "2",
              "3",
              "4"
            ],
            "rows": [
              {
                "label": "Version A",
                "hits": [
                  "C",
                  "C",
                  "C",
                  "C"
                ]
              },
              {
                "label": "Version B",
                "hits": [
                  "C",
                  "–",
                  "C",
                  "–"
                ]
              }
            ]
          }
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Quarter notes and measured rests",
            "instructions": "Alternate A and B for four pairs. Listen to whether the empty beats stay equally long.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Quarter-note pulse",
              "focus": "articulation",
              "progression": "C C C C | C rest C rest",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Quarter notes and measured rests",
            "instructions": "Use A on C and B on F, one bar per chord, for eight bars. Keep the root changes on beat 1.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Use A on C and B on F, one bar per chord, for eight bars. Keep the root changes on beat 1.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "All four beats remained equally spaced.",
          "Rests were silent.",
          "Root changes landed on time."
        ],
        "questions": [
          {
            "prompt": "What changes between versions A and B?",
            "options": [
              "Which beats sound, not the bar length",
              "The tempo must double",
              "There are only two beats in B"
            ],
            "answer": 0,
            "explanation": "The silent beats remain part of the four-beat bar."
          }
        ],
        "easier": "Clap and speak the two rhythms before playing.",
        "harder": "Keep the same note lengths while changing dynamics.",
        "mistake": "Letting a note ring through a rest changes the rhythm. Practice the release.",
        "transfer": "Use rests to give a groove definition rather than treating them as missing notes."
      },
      {
        "id": "fifths",
        "title": "Root and fifth without string noise",
        "skill": "harmony",
        "objective": "Choose the fifth of C, F and G and alternate it with the root.",
        "teaching": [
          "The perfect fifth is seven semitones above the root. C pairs with G, F with C and G with D. These two chord tones can outline harmony without using a full scale.",
          "Choose comfortable positions rather than stretching to keep one finger on every fret. On standard bass, C at A-string fret 3 pairs with G at D-string fret 5; allow a small shift if needed."
        ],
        "example": {
          "caption": "Worked example · Root and fifth without string noise",
          "text": "C: C2 (A3) → G2 (D5)\nF: F1 (E1) → C2 (A3)\nG: G1 (E3) → D2 (A5)\nString letter followed by fret number.",
          "notes": [
            36,
            43,
            36,
            43,
            29,
            36,
            31,
            38
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Root and fifth without string noise",
            "instructions": "Alternate C and its fifth G for four bars of quarters. Stop the previous string as the next note begins.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Root–fifth",
              "focus": "muting",
              "progression": "C G C G | F C F C | G D G D",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Root and fifth without string noise",
            "instructions": "Play two bars C/G, two F/C, two G/D and two C/G. Keep the root on each beat 1.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play two bars C/G, two F/C, two G/D and two C/G. Keep the root on each beat 1.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I chose the correct fifth for each root.",
          "String crossings were clean.",
          "Each new harmony began on its root."
        ],
        "questions": [
          {
            "prompt": "Which note is the perfect fifth of C?",
            "options": [
              "G",
              "E",
              "F"
            ],
            "answer": 0,
            "explanation": "C to G spans seven semitones; E is the major third."
          }
        ],
        "easier": "Use half notes and just C/G.",
        "harder": "Reverse the order on beats 3/4 while keeping the root on beat 1.",
        "mistake": "Overlapping strings can create an unintended interval. Practice muting during the crossing.",
        "transfer": "Use a fifth only when it fits the intended chord and arrangement."
      },
      {
        "id": "thirds",
        "title": "Hear major and minor chord tones",
        "skill": "harmony",
        "objective": "Distinguish C major from C minor through the third.",
        "teaching": [
          "A major triad is root, major third and fifth; a minor triad lowers the third by a semitone. C major is C–E–G, while C minor is C–E-flat–G. The root and fifth remain the same.",
          "Play the two forms slowly and listen to the changed middle note. A chord symbol determines the target third; do not automatically use the major scale over every chord."
        ],
        "example": {
          "caption": "Worked example · Hear major and minor chord tones",
          "text": "C major: C2 E2 G2\nC minor: C2 Eb2 G2\nPositions: C A3; E D2; Eb D1; G D5. Shift comfortably.",
          "notes": [
            36,
            40,
            43,
            36,
            39,
            43
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hear major and minor chord tones",
            "instructions": "Play each triad ascending and descending three times. Say “major third” or “minor third” at the middle note.",
            "protocol": {
              "kind": "repetitions",
              "task": "Compare C–E–G with C–Eb–G",
              "target": 6
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hear major and minor chord tones",
            "instructions": "Alternate two bars of C major and two of C minor, using root on 1, third on 2, fifth on 3, and root on 4.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Alternate two bars of C major and two of C minor, using root on 1, third on 2, fifth on 3, and root on 4.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I chose E for major and Eb for minor.",
          "I heard and identified the changed note.",
          "The line stayed relaxed and clean."
        ],
        "questions": [
          {
            "prompt": "Which note changes between the two triads?",
            "options": [
              "The fifth",
              "The third",
              "The root"
            ],
            "answer": 1,
            "explanation": "Lowering E to Eb changes the quality from C major to C minor."
          }
        ],
        "easier": "Compare only C–E and C–Eb before adding G.",
        "harder": "Repeat the comparison on A: A–C#–E versus A–C–E.",
        "mistake": "Treating “minor” as simply a lower register misses the harmonic change. Identify the third.",
        "transfer": "Read chord quality before choosing connecting notes."
      },
      {
        "id": "changes",
        "title": "Arrive on the new root",
        "skill": "groove",
        "objective": "Change roots at the start of each bar without a gap or extra note.",
        "teaching": [
          "Look ahead to the next chord while maintaining the current bar. In the C–Am–F–G progression, the roots are C, A, F and G; a quarter-note root line already establishes the harmonic movement.",
          "Practice the last beat of one bar into the first of the next. Do not abandon the current chord too early just because the next root requires a position change."
        ],
        "example": {
          "caption": "Worked example · Arrive on the new root",
          "text": "4/4: | C C C C | A A A A | F F F F | G G G G |\nSuggested roots: C A3, A open A, F E1, G E3."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Arrive on the new root",
            "instructions": "Loop the last two G beats into the first two C beats. Then practice C→A and A→F in the same way.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Root changes",
              "focus": "time",
              "progression": "C | Am | F | G",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Arrive on the new root",
            "instructions": "Play the four-bar loop twice with quarter-note roots. Keep the first note of every chord on beat 1.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the four-bar loop twice with quarter-note roots. Keep the first note of every chord on beat 1.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The correct root began each bar.",
          "No uncounted pause appeared at a position change.",
          "The previous note ended cleanly."
        ],
        "questions": [
          {
            "prompt": "When should the next root begin in this chart?",
            "options": [
              "Half a bar before the chord change",
              "On the next bar’s beat 1",
              "Whenever the hand reaches it"
            ],
            "answer": 1,
            "explanation": "The written harmonic rhythm is one chord per complete bar."
          }
        ],
        "easier": "Use one sustained root per bar.",
        "harder": "Add a fifth on beat 3 while retaining the correct next root.",
        "mistake": "Moving early can change harmony before the band. Practice the precise join.",
        "transfer": "Follow harmonic timing before adding fills or approach notes."
      },
      {
        "id": "first-line",
        "title": "Foundation assessment: a clean eight-bar line",
        "skill": "repertoire",
        "objective": "Play an entire simple bass part with controlled note length and correct harmony.",
        "teaching": [
          "Use the C–Am–F–G loop twice. In the first four bars, play two half notes per bar. In the next four, play roots on beats 1 and 3 with rests on 2 and 4.",
          "The second section changes articulation, not tempo. Finish on C on the following beat 1 and release together after two beats. The complete task combines roots, pulse, muting and form."
        ],
        "example": {
          "caption": "Worked example · Foundation assessment: a clean eight-bar line",
          "text": "Bars 1–4: C | Am | F | G, two half-note roots each\nBars 5–8: same chords, quarter-note roots on 1/3; rests 2/4\nEnd: C for two beats, then silence."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Foundation assessment: a clean eight-bar line",
            "instructions": "Rehearse the transition from sustained G into the short C pattern. Check the final two-beat C release separately.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Foundation assessment",
              "focus": "articulation",
              "progression": "C | Am | F | G (twice)",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Foundation assessment: a clean eight-bar line",
            "instructions": "Play the complete eight bars and ending without restarting. Evaluate roots, time and unwanted noise.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the complete eight bars and ending without restarting. Evaluate roots, time and unwanted noise.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I followed the correct roots and complete form.",
          "Sustained and short notes had distinct intended lengths.",
          "The final silence and unused strings were clean."
        ],
        "questions": [
          {
            "prompt": "Which improvement matters most before adding more notes?",
            "options": [
              "Playing all available scale notes",
              "A faster timer setting",
              "Correct roots, steady time and controlled endings"
            ],
            "answer": 2,
            "explanation": "These define the foundation’s musical function; note density is optional."
          }
        ],
        "easier": "Use one root per bar throughout.",
        "harder": "Repeat after a day, then try an equally simple F–C–G–C loop.",
        "mistake": "A long sustain can hide a missed mute. Listen to the silence after the last note.",
        "transfer": "Prepare a reliable root-only version of an ensemble part before decorating it."
      }
    ]
  },
  {
    "id": "bass-development",
    "revision": 1,
    "instrument": "bass",
    "stage": "development",
    "title": "Bass: connect harmony to a groove",
    "level": "intermediate",
    "summary": "Develop deliberate movement, subdivisions and simple chord-tone lines without losing note length.",
    "prerequisites": "A clean root-based line through eight bars. Know E/A-string notes through fret 5.",
    "outcomes": [
      "Connect roots with chord tones",
      "Control syncopation and rests",
      "Build a simple twelve-bar line"
    ],
    "placement": [
      "I can mute unused strings while crossing strings.",
      "I can name the root, third and fifth of C and Am.",
      "I can count an offbeat entrance without rushing."
    ],
    "sourceIds": [
      "studybass",
      "muting"
    ],
    "lessons": [
      {
        "id": "octaves",
        "title": "Octaves with quiet string crossings",
        "skill": "technique",
        "objective": "Move between a root and its octave without leaving either string ringing.",
        "teaching": [
          "A higher octave has the same note name but a higher pitch. On a standard four-string bass, C at A-string fret 3 pairs with C at G-string fret 5. The unused D string lies between them. Let the fretting hand and plucking hand share the muting work.",
          "Play slowly enough to listen after each release. An octave jump is not complete until the previous note has stopped as intended."
        ],
        "example": {
          "caption": "Worked example · Octaves with quiet string crossings",
          "text": "C2: A string fret 3 → C3: G string fret 5\nCount: 1 2 3 4; play low C on 1, high C on 3; silence on 2/4.",
          "notes": [
            36,
            48,
            36,
            48
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Octaves with quiet string crossings",
            "instructions": "Alternate the two Cs for four bars, then reverse the order. Listen specifically for noise on the middle string.",
            "protocol": {
              "kind": "repetitions",
              "task": "Root–octave with silent gaps",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Octaves with quiet string crossings",
            "instructions": "Over C | Am | F | G, use one root–octave pair per bar. Locate each pair without sounding the intervening string.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Over C | Am | F | G, use one root–octave pair per bar. Locate each pair without sounding the intervening string.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The octave pairs had the same note name.",
          "The skipped string stayed quiet.",
          "Releases matched the planned rests."
        ],
        "questions": [
          {
            "prompt": "What stays the same when moving up an octave?",
            "options": [
              "The physical string",
              "The exact frequency",
              "The note name"
            ],
            "answer": 2,
            "explanation": "An octave changes register while retaining the pitch-class name."
          }
        ],
        "easier": "Use only the low C and deliberately mute it.",
        "harder": "Keep eighth-note subdivisions internally while playing the sparse octave pattern.",
        "mistake": "Lifting the plucking hand away can expose an open string. Keep a light muting contact.",
        "transfer": "Use an octave for a deliberate register change, not as a substitute for following the harmony."
      },
      {
        "id": "anticipation",
        "title": "An eighth-note anticipation",
        "skill": "timing",
        "objective": "Place one planned anticipation on the and of 4 without shifting the rest of the bar.",
        "teaching": [
          "An anticipation introduces the next harmony before its bar line. It is an arrangement choice, not an accidental early change. Count all eight subdivisions, even when most are silent.",
          "First play a repeated C on the and of 4 and sustain it through the next beat 1. Do not strike again on 1 in this exercise. Then try the same timing into a new root only when the chart explicitly requests it."
        ],
        "example": {
          "caption": "Worked example · An eighth-note anticipation",
          "text": "Count: 1 & 2 & 3 & 4 & | 1 & 2 & 3 & 4 &\nPlay: C on 1; next C on final &; sustain across next 1."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: An eighth-note anticipation",
            "instructions": "Count one bar aloud and play only the final and. Add the following sustained beat without a second attack.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Anticipated entry",
              "focus": "time",
              "progression": "C | C",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 2
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: An eighth-note anticipation",
            "instructions": "Play C | F | C | G with the next root anticipated on each bar’s final and. State this arrangement before playing; do not apply it to an unmarked chart.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C | F | C | G with the next root anticipated on each bar’s final and. State this arrangement before playing; do not apply it to an unmarked chart.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 2
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The anticipation fell halfway between 4 and the next 1.",
          "I did not rush the preceding beats.",
          "I sustained through the following beat 1 as planned."
        ],
        "questions": [
          {
            "prompt": "Which event is an intentional anticipation here?",
            "options": [
              "The next root on the and of 4",
              "Every root half a bar early",
              "An extra beat after bar 4"
            ],
            "answer": 0,
            "explanation": "The arrangement moves one attack by an eighth note; the bar still has four beats."
          }
        ],
        "easier": "Repeat a single C across the bar line.",
        "harder": "Alternate one anticipated change with one ordinary downbeat change.",
        "mistake": "Attacking twice can hide uncertainty about the tie. Count the silent downbeat clearly.",
        "transfer": "Agree on anticipated changes with the rhythm section instead of guessing them."
      },
      {
        "id": "chord-tones",
        "title": "Root, third and fifth",
        "skill": "harmony",
        "objective": "Choose chord tones that distinguish a major chord from a minor chord.",
        "teaching": [
          "A C major triad contains C E G; C minor contains C E-flat G. The root and fifth alone do not show that difference. A minor third is three semitones above the root; a major third is four.",
          "Find C at A-string fret 3, E at D-string fret 2, G at D-string fret 5 and E-flat at D-string fret 1. Play each group with deliberate releases before adding a steady pulse."
        ],
        "example": {
          "caption": "Worked example · Root, third and fifth",
          "text": "C major: C E G E | C minor: C E♭ G E♭\nFour quarter notes per bar; finish on C.",
          "notes": [
            36,
            40,
            43,
            40,
            36,
            39,
            43,
            39
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Root, third and fifth",
            "instructions": "Play the C-major group twice and the C-minor group twice. Name the third before sounding it.",
            "protocol": {
              "kind": "repetitions",
              "task": "Major/minor chord-tone contrast",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Root, third and fifth",
            "instructions": "Create a two-bar line over C | Am using only each chord’s root, third and fifth: C E G E | A C E C.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Create a two-bar line over C | Am using only each chord’s root, third and fifth: C E G E | A C E C.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I chose E for C major and E-flat for C minor.",
          "The intended chord tones were named correctly.",
          "The line retained an even pulse and clean endings."
        ],
        "questions": [
          {
            "prompt": "Which note distinguishes C minor from C major?",
            "options": [
              "G instead of C",
              "An extra octave of C",
              "E-flat instead of E"
            ],
            "answer": 2,
            "explanation": "The third determines this major/minor contrast."
          }
        ],
        "easier": "Compare only C–E and C–E-flat.",
        "harder": "Find the same chord tones in a second position.",
        "mistake": "Treating any scale note as a chord tone blurs the harmony. Spell the chord first.",
        "transfer": "Use thirds sparingly where they clarify the chord without crowding the melody."
      },
      {
        "id": "approach",
        "title": "Arrive with a purpose",
        "skill": "harmony",
        "objective": "Resolve a short approach note onto the next root at the correct time.",
        "teaching": [
          "An approach note earns its meaning from the target that follows. Start with C for most of a bar, then B on beat 4 resolving to C on the next beat 1. The B is not a new chord in this exercise.",
          "A chromatic note can sound unsettled by itself. That is why the destination and its timing must be clear. Keep the approach short; never replace a strong arrival with an aimless run."
        ],
        "example": {
          "caption": "Worked example · Arrive with a purpose",
          "text": "C on beats 1–3; B on 4 | C on the next 1\nThen E on 4 → F on the next 1."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Arrive with a purpose",
            "instructions": "Loop B→C and E→F across a bar line while counting 3 4 1 2.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Target-note approach",
              "focus": "time",
              "progression": "C | C | C | F",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Arrive with a purpose",
            "instructions": "Play C | F | C | G with one semitone-below approach on beat 4 before each target. Use E→F, B→C and F-sharp→G; keep the other beats simple.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C | F | C | G with one semitone-below approach on beat 4 before each target. Use E→F, B→C and F-sharp→G; keep the other beats simple.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Each approach resolved to the intended root.",
          "The root landed exactly at the new bar.",
          "Approach notes remained brief and controlled."
        ],
        "questions": [
          {
            "prompt": "What gives an approach note its function?",
            "options": [
              "Its finger number",
              "Its resolution to a planned target",
              "Playing it as loudly as possible"
            ],
            "answer": 1,
            "explanation": "The line is organized around an arrival, not around a random extra note."
          }
        ],
        "easier": "Practice just B→C repeatedly.",
        "harder": "Compare a semitone-below approach with a whole-step-above approach to C.",
        "mistake": "A late target defeats a clever approach. Remove the extra note until the arrival is stable.",
        "transfer": "Use approach notes at selected transitions rather than on every change."
      },
      {
        "id": "blues",
        "title": "A twelve-bar map",
        "skill": "form",
        "objective": "Keep a twelve-bar blues form while using roots and fifths.",
        "teaching": [
          "In this original C blues exercise the harmony is C7 for four bars, F7 for two, C7 for two, G7 for one, F7 for one and C7 for two. Other blues forms differ; read the actual chart.",
          "Begin with one root per bar and count the bar numbers aloud. Then add fifths on beats 3 and 4. A complete, correct form is more useful than a walking line that changes chords in the wrong place."
        ],
        "example": {
          "caption": "Worked example · A twelve-bar map",
          "text": "1 C7 | 2 C7 | 3 C7 | 4 C7\n5 F7 | 6 F7 | 7 C7 | 8 C7\n9 G7 | 10 F7 | 11 C7 | 12 C7"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A twelve-bar map",
            "instructions": "Practice bars 4–5, 8–9 and 10–11 with one root per bar. Say the next chord before the change.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Twelve-bar foundation",
              "focus": "time",
              "progression": "C7 ×4 | F7 ×2 | C7 ×2 | G7 | F7 | C7 ×2",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A twelve-bar map",
            "instructions": "Play the full twelve bars twice using root, root, fifth, fifth in quarters. Keep the final C7 bar before looping.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full twelve bars twice using root, root, fifth, fifth in quarters. Keep the final C7 bar before looping.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I retained all twelve bars.",
          "The IV and V chords began in their specified bars.",
          "The return to bar 1 preserved the pulse."
        ],
        "questions": [
          {
            "prompt": "In this chart, where does G7 begin?",
            "options": [
              "Bar 9",
              "Bar 5",
              "Every fourth beat"
            ],
            "answer": 0,
            "explanation": "The V chord appears at bar 9 in this particular twelve-bar arrangement."
          }
        ],
        "easier": "Use sustained roots and no fifths.",
        "harder": "Build a root–third–fifth–sixth line after checking each chord spelling.",
        "mistake": "Losing a repeated C bar moves every later chord. Count the form, not only the changes.",
        "transfer": "Bring a written form map to a rehearsal instead of relying on a remembered genre label."
      },
      {
        "id": "feel",
        "title": "One line, two feels",
        "skill": "groove",
        "objective": "Differentiate straight and triplet-based subdivision without changing the form.",
        "teaching": [
          "Straight eighths divide a beat in half. A simple shuffle practice model uses the first and third parts of a triplet. Actual swing timing varies; this triplet model is a starting exercise, not a universal ratio.",
          "Keep the root pattern unchanged so that subdivision is the only deliberate variable. Listen to the length of each note and to the silence between attacks."
        ],
        "example": {
          "caption": "Worked example · One line, two feels",
          "text": "Straight: 1 & 2 & 3 & 4 &\nTriplet model: 1 trip let 2 trip let …; play number and let."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: One line, two feels",
            "instructions": "Clap straight eighths, then say triplets and clap only number/let. Play the same rhythms on one C.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Subdivision comparison",
              "focus": "articulation",
              "progression": "C | F | C | G",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 3
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: One line, two feels",
            "instructions": "Play the four-chord root line once with straight eighths and once with the triplet model. Keep four beats in each bar.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the four-chord root line once with straight eighths and once with the triplet model. Keep four beats in each bar.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 3
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The two subdivisions sounded intentionally different.",
          "Chord changes stayed in the same bars.",
          "Muted gaps were deliberate rather than accidental."
        ],
        "questions": [
          {
            "prompt": "Which triplet positions form this simplified shuffle?",
            "options": [
              "First and second only",
              "All three as straight eighths",
              "First and third"
            ],
            "answer": 2,
            "explanation": "This teaching model omits the middle triplet position."
          }
        ],
        "easier": "Use quarter-note roots while speaking each subdivision.",
        "harder": "Follow a recording or teacher’s feel and describe how it differs from the model.",
        "mistake": "A shuffle is not a faster tempo. Keep the numbered beats unchanged.",
        "transfer": "Match the drummer’s subdivision before adding harmonic detail."
      }
    ]
  },
  {
    "id": "bass-ensemble",
    "revision": 1,
    "instrument": "bass",
    "stage": "ensemble",
    "title": "Bass: support the whole arrangement",
    "level": "advanced",
    "summary": "Use charts, listening priorities and rehearsal repairs to create a dependable band part.",
    "prerequisites": "Comfortable root/chord-tone lines and deliberate rests; a simple chart you can count.",
    "outcomes": [
      "Coordinate with kick and harmonic rhythm",
      "Choose register and density for a singer",
      "Follow form, stops and final releases"
    ],
    "placement": [
      "I can follow a complete chart without restarting.",
      "I can simplify my line while keeping the correct harmony.",
      "I can stop and re-enter on a counted cue."
    ],
    "sourceIds": [
      "studybass",
      "muting",
      "ensemble"
    ],
    "lessons": [
      {
        "id": "kick-lock",
        "title": "Coordinate without copying every kick",
        "skill": "ensemble",
        "objective": "Choose shared rhythmic anchors with a drummer while retaining a useful bass line.",
        "teaching": [
          "A bass part and a kick pattern need shared reference points, not necessarily identical attacks. In this example the kick plays 1, the and of 2, and 3. Start with bass on 1 and 3; then decide whether adding the offbeat helps the arrangement.",
          "Listen in this order: bar position, shared attacks, note endings, then optional decoration. When practicing alone, speak the kick pattern or have another person tap it."
        ],
        "example": {
          "caption": "Worked example · Coordinate without copying every kick",
          "text": "Kick: 1 — 2 & 3 — 4 —\nBass version A: root on 1 and 3\nVersion B: add the and of 2 only if agreed."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Coordinate without copying every kick",
            "instructions": "Loop two bars with only the shared 1/3 attacks. Check whether either player anticipates them.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Rhythm-section anchors",
              "focus": "time",
              "progression": "C | F | C | G",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 2
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Coordinate without copying every kick",
            "instructions": "Play the four-chord loop with a partner or spoken kick part. Compare both versions and choose the clearer support.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the four-chord loop with a partner or spoken kick part. Compare both versions and choose the clearer support.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 2
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Shared attacks aligned with the counted beat.",
          "I maintained the harmonic changes independently.",
          "I could return to the sparse version immediately."
        ],
        "questions": [
          {
            "prompt": "Must the bass copy every kick hit?",
            "options": [
              "Yes, in every style",
              "Only when playing loudly",
              "No; choose anchors that serve the arrangement"
            ],
            "answer": 2,
            "explanation": "Coordination means intentional relationships; identical patterns are only one option."
          }
        ],
        "easier": "Use only beat 1 roots while counting every intervening beat aloud.",
        "harder": "Keep a simple offbeat bass figure against an unchanged kick pattern.",
        "mistake": "Adding every kick hit can crowd the phrase. Compare with the sparse version.",
        "transfer": "At rehearsal ask which attacks and releases should be shared."
      },
      {
        "id": "space",
        "title": "Note length beneath a melody",
        "skill": "ensemble",
        "objective": "Change bass density without losing the song’s harmonic support.",
        "teaching": [
          "A sustained root can support a long vocal phrase; a shorter repeated note can clarify a busier rhythmic section. Neither is automatically better. Compare them under the same spoken or sung phrase.",
          "Use fewer notes during the phrase and place any small response in its gap. Do not add a fill simply because your hand knows one."
        ],
        "example": {
          "caption": "Worked example · Note length beneath a melody",
          "text": "C | Am | F | G\nA: one whole-note root per bar\nB: roots on 1/3, silent on 2/4\nResponse: a fifth on bar 4 beat 4, only in a phrase gap."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Note length beneath a melody",
            "instructions": "Play the sustained and short versions of one C bar. Listen to whether each release is clean.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Space under melody",
              "focus": "articulation",
              "progression": "C | Am | F | G",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Note length beneath a melody",
            "instructions": "Have a partner speak a four-bar phrase, or speak it yourself before playing. Choose A or B and reserve a response for the agreed gap.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Have a partner speak a four-bar phrase, or speak it yourself before playing. Choose A or B and reserve a response for the agreed gap.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I preserved the roots through both textures.",
          "My releases were planned.",
          "Any response fitted a phrase gap rather than covering the melody."
        ],
        "questions": [
          {
            "prompt": "What should decide whether to add the response?",
            "options": [
              "The timer reaching zero",
              "The arrangement and available phrase space",
              "The number of notes learned"
            ],
            "answer": 1,
            "explanation": "A fill has a musical location; completing time does not provide one."
          }
        ],
        "easier": "Keep the sustained version throughout.",
        "harder": "Compare two registers and select the one that leaves the melody clear.",
        "mistake": "Ringing notes can crowd silence as much as extra attacks. Plan the endings too.",
        "transfer": "Prepare both a sparse verse part and a stronger chorus part."
      },
      {
        "id": "numbers",
        "title": "Transpose a number chart",
        "skill": "harmony",
        "objective": "Translate a simple major-key number chart into correct roots.",
        "teaching": [
          "In a major key, 1, 4 and 5 identify scale-degree roots. Here the chart is 1 | 6m | 4 | 5, where m labels the minor chord quality. In C this is C | Am | F | G; in G it is G | Em | C | D.",
          "Write the target key’s scale before locating the roots. A number chart describes harmony; it does not determine note lengths or the entire bass part."
        ],
        "example": {
          "caption": "Worked example · Transpose a number chart",
          "text": "C major: C D E F G A B → C | Am | F | G\nG major: G A B C D E F♯ → G | Em | C | D"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Transpose a number chart",
            "instructions": "Say each root in G, then locate it silently. Play one root per bar while counting the chart.",
            "protocol": {
              "kind": "groove",
              "key": "G",
              "style": "Number chart",
              "focus": "time",
              "progression": "G | Em | C | D",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Transpose a number chart",
            "instructions": "Perform the loop in C and then G. Keep the same simple rhythm and explain the new note names before playing.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the loop in C and then G. Keep the same simple rhythm and explain the new note names before playing.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I translated all four roots correctly.",
          "I retained the minor quality label on degree 6.",
          "The rhythm did not change while transposing."
        ],
        "questions": [
          {
            "prompt": "What is 6m in G major?",
            "options": [
              "F-sharp major",
              "Em",
              "Am"
            ],
            "answer": 1,
            "explanation": "The sixth scale degree of G major is E; the chart requests its minor chord."
          }
        ],
        "easier": "Transpose only 1 | 4 | 5.",
        "harder": "Write and play the same chart in D before checking against D E F♯ G A B C♯.",
        "mistake": "Moving a shape without naming the key can hide an incorrect root. Verify names first.",
        "transfer": "Use number charts for key changes with singers; confirm both the key and form."
      },
      {
        "id": "band-take",
        "title": "Ensemble assessment: entrance, stop, return",
        "skill": "repertoire",
        "objective": "Complete a short chart with a counted stop and controlled final release.",
        "teaching": [
          "Before playing, mark the intro, repeated sections, stop and ending. A stop means silence for a specified duration, not abandoning the pulse. Count the silence internally or aloud during practice.",
          "Play a sparse part first. After the take, select one repair and practice a two-bar window around it. Then perform another complete take without resetting for minor errors."
        ],
        "example": {
          "caption": "Worked example · Ensemble assessment: entrance, stop, return",
          "text": "Intro 2 bars C | C\nVerse 4 bars C | Am | F | G\nChorus 4 bars F | C | G | G\nStop 1 complete bar\nReturn C | F | C | G; end C for 2 beats."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Ensemble assessment: entrance, stop, return",
            "instructions": "Rehearse the G bar into the silent bar and the C re-entry. Rehearse the two-beat final release separately.",
            "protocol": {
              "kind": "groove",
              "key": "C",
              "style": "Ensemble take",
              "focus": "time",
              "progression": "Intro2 → verse4 → chorus4 → stop1 → return4 → ending",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Ensemble assessment: entrance, stop, return",
            "instructions": "Play the complete chart. Include the counted stop, final note length and a short written reflection on one repair.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the complete chart. Include the counted stop, final note length and a short written reflection on one repair.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 65,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The complete form and silent bar were correct.",
          "The re-entry aligned with the next beat 1.",
          "The ending stopped at the agreed release."
        ],
        "questions": [
          {
            "prompt": "What should continue during the silent bar?",
            "options": [
              "The internal count",
              "A quiet unplanned fill",
              "An extra bar to find the next note"
            ],
            "answer": 0,
            "explanation": "Silence is part of the counted arrangement."
          }
        ],
        "easier": "Use a single root at the start of every sounding bar.",
        "harder": "Repeat with a partner, comparing shared entrances and endings.",
        "mistake": "Restarting after every error prevents learning recovery. Repair separately, then retake the whole form.",
        "transfer": "Bring this rehearsal method to a worship set or any small-ensemble arrangement."
      }
    ]
  },
  {
    "id": "piano-foundation",
    "revision": 1,
    "instrument": "piano",
    "stage": "foundation",
    "title": "Piano: notes, hands and a first arrangement",
    "level": "beginner",
    "summary": "Learn keyboard geography, simple reading and coordination before connecting chords into a short piece.",
    "prerequisites": "No prior piano study. Use a piano or keyboard; pedal is optional and not required.",
    "outcomes": [
      "Find and read a small set of notes",
      "Coordinate a simple bass and melody",
      "Play a short C-major arrangement with controlled releases"
    ],
    "placement": [
      "I can identify C and F from the black-key groups.",
      "I can play five notes evenly with either hand.",
      "I can maintain a pulse while the hands play different notes."
    ],
    "sourceIds": [
      "berklee-piano",
      "berklee-reading"
    ],
    "lessons": [
      {
        "id": "geography",
        "title": "Find notes without counting from the edge",
        "skill": "orientation",
        "objective": "Locate C, D, E, F, G, A and B using black-key groups.",
        "teaching": [
          "The black keys repeat in groups of two and three. C is immediately to the left of a two-black-key group; F is immediately to the left of a three-black-key group. Move from these landmarks rather than counting every key from the end of the instrument.",
          "Finger numbers run from thumb 1 to little finger 5 on either hand. Sit where your forearms can approach the keys without lifting the shoulders or collapsing the wrists. Adjust distance before repeating a pattern."
        ],
        "example": {
          "caption": "Worked example · Find notes without counting from the edge",
          "text": "Two black keys: C [black] D [black] E\nThree black keys: F [black] G [black] A [black] B\nFind three different Cs; then play C D E F G.",
          "notes": [
            60,
            62,
            64,
            65,
            67
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Find notes without counting from the edge",
            "instructions": "Locate three Cs and three Fs. With the right hand, use fingers 1 2 3 4 5 on C D E F G. Release each key before moving on.",
            "protocol": {
              "kind": "repetitions",
              "task": "Find C/F landmarks and name adjacent white keys",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Find notes without counting from the edge",
            "instructions": "Ask for, or choose, five note names out of order. Find each from a black-key landmark, then play C E G E C slowly.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Ask for, or choose, five note names out of order. Find each from a black-key landmark, then play C E G E C slowly.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I found C and F from their black-key groups.",
          "I named adjacent white keys correctly.",
          "My shoulders and wrists remained comfortable."
        ],
        "questions": [
          {
            "prompt": "Which note is immediately left of a two-black-key group?",
            "options": [
              "C",
              "F",
              "B"
            ],
            "answer": 0,
            "explanation": "The two-black-key group is bounded on its left by C."
          }
        ],
        "easier": "Work only with C and F landmarks.",
        "harder": "Find the same notes in another register without counting from middle C.",
        "mistake": "Starting from the keyboard’s physical end is unreliable on different keyboard sizes. Use repeating groups.",
        "transfer": "Find the starting note of a song from a landmark before beginning."
      },
      {
        "id": "five-notes",
        "title": "Five notes, two independent hands",
        "skill": "technique",
        "objective": "Produce even five-note patterns with each hand separately.",
        "teaching": [
          "Place the right thumb on C and fingers 2–5 on D–G. For the left hand, place little finger 5 on C and fingers 4–1 on D–G. The hands therefore use different finger orders for the same ascending pitches.",
          "Play slowly with connected but not overlapping notes. Let the arm support the hand instead of fixing it rigidly. Equal timing and a consistent sound are the targets, not finger height."
        ],
        "example": {
          "caption": "Worked example · Five notes, two independent hands",
          "text": "Pitches ascending: C D E F G; descending: F E D C\nRH: 1 2 3 4 5 4 3 2 1\nLH: 5 4 3 2 1 2 3 4 5",
          "notes": [
            60,
            62,
            64,
            65,
            67,
            65,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Five notes, two independent hands",
            "instructions": "Play the pattern with the right hand twice, rest, then with the left twice. Listen for one note that is consistently louder.",
            "protocol": {
              "kind": "repetitions",
              "task": "Separate-hand five-note control",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Five notes, two independent hands",
            "instructions": "Play a quiet question C D E D C with one hand and answer it with the other. Keep the same timing and comfortable volume.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play a quiet question C D E D C with one hand and answer it with the other. Keep the same timing and comfortable volume.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "Each hand used its intended finger order.",
          "The notes were evenly spaced.",
          "Unintended accents and overlapping notes were reduced."
        ],
        "questions": [
          {
            "prompt": "Which left-hand finger starts ascending C–G in this five-note position?",
            "options": [
              "The same finger for every key",
              "5, the little finger",
              "1, the thumb"
            ],
            "answer": 1,
            "explanation": "In this position the left little finger is on C and the thumb on G."
          }
        ],
        "easier": "Use only C D E with each hand separately.",
        "harder": "Play the complete five-note pattern with both hands after each is stable alone.",
        "mistake": "A rigid wrist can make one finger strike heavily. Slow down and release unnecessary tension.",
        "transfer": "Use this control to keep accompaniment quieter than a melody."
      },
      {
        "id": "durations",
        "title": "Read a complete four-beat bar",
        "skill": "reading",
        "objective": "Turn a short note-name rhythm into accurately counted sound and silence.",
        "teaching": [
          "This lesson uses a text score, not staff notation: q means a one-beat quarter note, h means a two-beat half note, w means a four-beat whole note, and r means a one-beat rest. A vertical line marks a bar. Every bar below totals four beats.",
          "First clap or speak the rhythm without worrying about keys. Then add the pitches. A rest requires an intentional release; holding a note into a rest changes the rhythm."
        ],
        "example": {
          "caption": "Worked example · Read a complete four-beat bar",
          "text": "4/4 text score, RH:\nC(q) D(q) E(h) | G(h) r r | E(q) D(q) C(h) | C(w)\nCount 1 2 3 4 in every bar."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read a complete four-beat bar",
            "instructions": "Clap the first two bars, then play them with RH fingers 1,2,3,5. Speak the two rests after G. This displayed example is prepared reading, not an unseen first read. Use an unfamiliar teacher-selected excerpt separately when testing first-read ability.",
            "protocol": {
              "kind": "sight-reading",
              "material": "C(q) D(q) E(h) | G(h) r r | E(q) D(q) C(h) | C(w)",
              "key": "C",
              "hands": "right",
              "firstRead": false,
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read a complete four-beat bar",
            "instructions": "Play the four-bar score once without restarting. Log a first reading attempt only for that first encounter; later takes are repeat practice.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the four-bar score once without restarting. Log a first reading attempt only for that first encounter; later takes are repeat practice.",
              "measures": "8 bars",
              "hands": "right",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "Every bar contained four beats.",
          "Half and whole notes lasted their written counts.",
          "The two rests were silent."
        ],
        "questions": [
          {
            "prompt": "How many quarter-note beats does h represent here?",
            "options": [
              "Four",
              "Two",
              "One"
            ],
            "answer": 1,
            "explanation": "The legend defines a half note as two beats in this 4/4 exercise."
          }
        ],
        "easier": "Speak the score and play only the first bar.",
        "harder": "Read a teacher-provided staff version of the same pitches and durations.",
        "mistake": "A text score supports this exercise but does not teach staff positions. Add real notation study separately.",
        "transfer": "Count durations before attempting an unfamiliar melody."
      },
      {
        "id": "hands",
        "title": "Bass on one, melody above",
        "skill": "coordination",
        "objective": "Keep a left-hand bass note beneath a separately moving right-hand pattern.",
        "teaching": [
          "Learn each hand alone before combining them. The left hand holds C for four beats; the right hand plays C D E G as quarter notes. The shared first attack is an anchor, but the left hand should not restrike with every right-hand note.",
          "Practice one bar at a time. Release both hands together at the bar line before trying two connected bars. Pedal is not needed."
        ],
        "example": {
          "caption": "Worked example · Bass on one, melody above",
          "text": "LH: C3(w) | C3(w)\nRH: C4(q) D4(q) E4(q) G4(q) | E4(h) D4(q) C4(q)"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Bass on one, melody above",
            "instructions": "Play RH alone, then LH alone. Combine the first beat, then the first two beats, and finally the full first bar.",
            "protocol": {
              "kind": "repertoire",
              "focus": "LH sustained C under a RH quarter-note melody",
              "measures": "2 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Bass on one, melody above",
            "instructions": "Play both bars three times with a counted bar of rest between takes. Keep the held bass quieter than the melody.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play both bars three times with a counted bar of rest between takes. Keep the held bass quieter than the melody.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The left hand held rather than copied the RH rhythm.",
          "The melody pitches and durations were correct.",
          "Both hands released at the planned ending."
        ],
        "questions": [
          {
            "prompt": "What should the left hand do while RH plays D, E and G in bar 1?",
            "options": [
              "Move to every RH pitch",
              "Continue holding its C",
              "Repeat C on every note"
            ],
            "answer": 1,
            "explanation": "The left-hand whole note lasts through all four beats."
          }
        ],
        "easier": "Hold the bass for two beats while RH plays only C and D.",
        "harder": "Change the second-bar bass to G while preserving the RH rhythm.",
        "mistake": "Trying both hands before either part is known doubles the uncertainty. Isolate each part first.",
        "transfer": "Use sustained bass plus a simple melody as a playable first arrangement."
      },
      {
        "id": "c-scale",
        "title": "One-octave C major",
        "skill": "scales",
        "objective": "Cross the thumb or fingers without disrupting a one-octave C-major scale.",
        "teaching": [
          "C major uses C D E F G A B C. For a standard one-octave RH ascending fingering use 1 2 3 1 2 3 4 5. Let the thumb move toward F as the arm travels; do not twist sharply or hold the rest of the hand rigid.",
          "For LH ascending use 5 4 3 2 1 3 2 1. Reverse each sequence when descending. Learn hands separately; a smooth, comfortable crossing is the goal."
        ],
        "example": {
          "caption": "Worked example · One-octave C major",
          "text": "RH up: C D E F G A B C → 1 2 3 1 2 3 4 5\nLH up: C D E F G A B C → 5 4 3 2 1 3 2 1",
          "notes": [
            60,
            62,
            64,
            65,
            67,
            69,
            71,
            72
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: One-octave C major",
            "instructions": "RH: loop D E F G to practice the 2–3–1–2 crossing, slowly. Then play the complete scale up and down.",
            "protocol": {
              "kind": "scale-cycle",
              "keys": [
                0
              ],
              "quality": "major",
              "octaves": 1,
              "hands": "right",
              "motion": "parallel",
              "fingering": "C major RH: 1 2 3 1 2 3 4 5; reverse to descend.",
              "position": "One octave from middle C"
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: One-octave C major",
            "instructions": "Play the RH scale, pause, then the LH scale with its separate fingering. Finish by making a four-note phrase using C-major notes.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the RH scale, pause, then the LH scale with its separate fingering. Finish by making a four-note phrase using C-major notes.",
              "measures": "8 bars",
              "hands": "right"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The notes and hand-specific fingerings were correct.",
          "The crossing did not create a long gap or accent.",
          "The hand remained comfortable."
        ],
        "questions": [
          {
            "prompt": "Where does the RH thumb land after E in this ascending scale?",
            "options": [
              "Another E",
              "F",
              "G"
            ],
            "answer": 1,
            "explanation": "The standard one-octave fingering crosses 3 on E to 1 on F."
          }
        ],
        "easier": "Practice only C D E F, then stop and reset.",
        "harder": "Play a quiet ascent and a slightly stronger descent without rushing.",
        "mistake": "Forcing the thumb far underneath a rigid hand creates tension. Let the arm move with the phrase.",
        "transfer": "Treat a scale as organized material for melodies, not only a speed test."
      },
      {
        "id": "triads",
        "title": "Build and hear three-note chords",
        "skill": "harmony",
        "objective": "Play C, F, G and Am as root-position triads.",
        "teaching": [
          "A triad stacks a root, a third and a fifth. Here C major is C E G, F major is F A C, G major is G B D, and A minor is A C E. Notice the minor third A–C in Am.",
          "Play each chord’s notes one at a time before playing them together. RH 1–3–5 is a useful starting fingering for these root-position shapes, but do not stretch beyond comfort. Keep the notes beginning and ending together."
        ],
        "example": {
          "caption": "Worked example · Build and hear three-note chords",
          "text": "C: C E G | F: F A C | G: G B D | Am: A C E\nPlay broken first, then together. Use one chord every four beats.",
          "notes": [
            60,
            64,
            67,
            57,
            60,
            64
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Build and hear three-note chords",
            "instructions": "Spell and play each triad broken, then as a block. Check that the middle note is included and not accidentally doubled.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "F",
                "G",
                "Am"
              ],
              "target": 8,
              "technique": "Name chord tones; start and release together.",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Build and hear three-note chords",
            "instructions": "Play C | Am | F | G, one triad per bar. Use only RH first; optionally add a single LH root after the chord sequence is stable.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C | Am | F | G, one triad per bar. Use only RH first; optionally add a single LH root after the chord sequence is stable.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I played the correct three notes of each triad.",
          "Chord notes began together.",
          "The four-bar changes retained their count."
        ],
        "questions": [
          {
            "prompt": "Which notes form Am?",
            "options": [
              "A C-sharp E",
              "A D E",
              "A C E"
            ],
            "answer": 2,
            "explanation": "Am has a minor third C above its root A."
          }
        ],
        "easier": "Alternate only C and Am, naming the three chord tones before each slow change.",
        "harder": "Add a quiet LH root without making the RH chords louder.",
        "mistake": "A chord label is not a fixed hand location. Name the actual notes before moving.",
        "transfer": "Use a simple chordal accompaniment when a melody is already being sung."
      },
      {
        "id": "inversions",
        "title": "Move less between chords",
        "skill": "harmony",
        "objective": "Use inversions to connect a short progression with smaller hand movements.",
        "teaching": [
          "An inversion changes which chord tone is lowest while retaining the same set of chord tones. C E G and E G C are both C-major triads. Do not rename an inversion merely because its lowest note changes.",
          "Try RH E G C for C, E A C for Am, F A C for F and D G B for G. In C→Am, E and C can stay under the same fingers while G moves to A. Use comfortable fingering, not a forced stretch."
        ],
        "example": {
          "caption": "Worked example · Move less between chords",
          "text": "RH voicings: E G C | E A C | F A C | D G B\nHarmony:     C     | Am    | F     | G\nPlay slowly; identify common tones."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Move less between chords",
            "instructions": "Practice C→Am and Am→F separately, first naming the unchanged notes. Release before moving when legato creates strain.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "C",
                "Am",
                "F",
                "G"
              ],
              "target": 8,
              "technique": "Use EGC → EAC → FAC → DGB; preserve common tones.",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Move less between chords",
            "instructions": "Play the full loop with these RH voicings and optional single LH roots. Compare the motion with root-position jumps.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full loop with these RH voicings and optional single LH roots. Compare the motion with root-position jumps.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The voicings contained only the intended chord tones.",
          "I recognized the common tones.",
          "The smaller movements kept the changes on time."
        ],
        "questions": [
          {
            "prompt": "What changes in a chord inversion?",
            "options": [
              "The order and lowest chord tone",
              "The chord’s entire set of pitch classes",
              "The meter"
            ],
            "answer": 0,
            "explanation": "Inversions retain chord identity while changing the arrangement of its tones."
          }
        ],
        "easier": "Use only C E G and E G C to hear one chord in two positions.",
        "harder": "Choose another comfortable set of inversions and explain each common tone.",
        "mistake": "Keeping a finger held at any cost can twist the hand. Release and reset when needed.",
        "transfer": "Reduce accompaniment movement to leave attention for a singer or conductor."
      },
      {
        "id": "first-piece",
        "title": "Foundation assessment: a small arrangement",
        "skill": "repertoire",
        "objective": "Perform eight bars with a simple bass, melody and counted ending.",
        "teaching": [
          "Use the first four bars as a melody over sustained bass; repeat them once. Learn melody and bass separately, then rehearse the two most difficult joins. Do not add pedal while releases are still unclear.",
          "The assessment is a complete take at a comfortable tempo. Accuracy, balanced sound and recovery matter more than speed. Write down the bar needing repair before another take."
        ],
        "example": {
          "caption": "Worked example · Foundation assessment: a small arrangement",
          "text": "4/4, q=1 beat, h=2, w=4\nLH: C3(w) | A2(w) | F2(w) | G2(w)\nRH: E4(q) G4(q) E4(h) | E4(q) C4(q) A3(h) | C4(q) A3(q) C4(h) | B3(q) D4(q) G4(h)\nRepeat. End with C-major chord for four beats."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Foundation assessment: a small arrangement",
            "instructions": "Practice bars 2–3 and 4→1 with hands separately, then together. Choose fingering that avoids a strained reach.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Original eight-bar melody over sustained roots",
              "measures": "8 bars + ending",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Foundation assessment: a small arrangement",
            "instructions": "Play the eight bars and final chord without restarting. Keep the bass quieter and release the ending on the counted boundary.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the eight bars and final chord without restarting. Keep the bass quieter and release the ending on the counted boundary.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The pitches, durations and full form were correct.",
          "The bass did not overpower the melody.",
          "The final chord and silence were counted."
        ],
        "questions": [
          {
            "prompt": "What should happen before adding pedal to an unclear passage?",
            "options": [
              "Hold the pedal continuously",
              "Increase tempo",
              "Clarify finger releases and coordination"
            ],
            "answer": 2,
            "explanation": "Pedal can conceal poor releases; it should be an intentional sound choice."
          }
        ],
        "easier": "Play the melody alone with a steady count.",
        "harder": "Use a second take on a later day to check retention, then add a simple RH chord version.",
        "mistake": "Restarting every time can leave the ending underpracticed. Rehearse the ending first.",
        "transfer": "Create a playable short arrangement rather than adding every possible layer."
      }
    ]
  },
  {
    "id": "piano-development",
    "revision": 1,
    "instrument": "piano",
    "stage": "development",
    "title": "Piano: fluent changes and clearer sound",
    "level": "intermediate",
    "summary": "Extend scales, broken chords, reading and voicing while preserving physical ease.",
    "prerequisites": "A controlled C-major scale, basic triads and a simple two-hand arrangement.",
    "outcomes": [
      "Read and prepare short new material",
      "Voice melody over accompaniment",
      "Use comfortable key changes and optional pedal"
    ],
    "placement": [
      "I can play C major separately with either hand.",
      "I can spell C, F, G and Am.",
      "I can keep a held bass under a moving melody."
    ],
    "sourceIds": [
      "berklee-piano",
      "berklee-reading"
    ],
    "lessons": [
      {
        "id": "new-keys",
        "title": "G major and F major are not identical shapes",
        "skill": "scales",
        "objective": "Play the correct notes and RH fingerings of one-octave G and F major.",
        "teaching": [
          "G major contains F-sharp; F major contains B-flat. Write the note sequence before playing. RH G major can use 1 2 3 1 2 3 4 5. RH F major uses 1 2 3 4 1 2 3 4 for a standard one-octave ascent.",
          "Learn hands separately. For LH, G major and F major commonly use 5 4 3 2 1 3 2 1 ascending. Fingering here is for these specific one-octave exercises, not every scale length or passage."
        ],
        "example": {
          "caption": "Worked example · G major and F major are not identical shapes",
          "text": "G A B C D E F♯ G: RH 1 2 3 1 2 3 4 5\nF G A B♭ C D E F: RH 1 2 3 4 1 2 3 4"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: G major and F major are not identical shapes",
            "instructions": "Play G major slowly, checking F-sharp. Then isolate F G A B-flat C before completing F major.",
            "protocol": {
              "kind": "scale-cycle",
              "keys": [
                7,
                5
              ],
              "quality": "major",
              "octaves": 1,
              "hands": "right",
              "motion": "parallel",
              "fingering": "G RH 1 2 3 1 2 3 4 5; F RH 1 2 3 4 1 2 3 4; reverse down.",
              "position": "One octave, hands separately"
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: G major and F major are not identical shapes",
            "instructions": "Create a four-note phrase in each key that includes its altered note. Play and name it before changing keys.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Create a four-note phrase in each key that includes its altered note. Play and name it before changing keys.",
              "measures": "8 bars",
              "hands": "right"
            },
            "weight": 3
          }
        ],
        "checks": [
          "G major included F-sharp.",
          "F major included B-flat.",
          "The crossing and ending fingering stayed comfortable."
        ],
        "questions": [
          {
            "prompt": "Which altered note belongs to F major?",
            "options": [
              "B-flat",
              "F-sharp",
              "C-sharp"
            ],
            "answer": 0,
            "explanation": "F major uses F G A B-flat C D E F. B-flat gives the required major-scale interval pattern."
          }
        ],
        "easier": "Play only the five-note beginning of each scale.",
        "harder": "Compare the final five notes in each key without looking at a fingering list.",
        "mistake": "Reusing C-major fingering automatically can put the thumb awkwardly on B-flat. Learn the key-specific pattern.",
        "transfer": "Check a song’s key signature before treating its notes as white-key material."
      },
      {
        "id": "broken-chords",
        "title": "Broken chords with a stable pulse",
        "skill": "technique",
        "objective": "Shape a four-note broken-chord pattern without uneven crossings.",
        "teaching": [
          "Play C E G E as four equal notes before changing harmony. A broken chord still expresses the same harmony as a block chord; the timing of its separate notes becomes part of the accompaniment.",
          "Keep one comfortable position initially. Avoid reaching for a large span when a smaller inversion can serve the same purpose. Use separate hands before combining melody and accompaniment."
        ],
        "example": {
          "caption": "Worked example · Broken chords with a stable pulse",
          "text": "C: C E G E | Am: A C E C | F: F A C A | G: G B D B\nOne note per beat, one chord per bar.",
          "notes": [
            60,
            64,
            67,
            64,
            57,
            60,
            64,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Broken chords with a stable pulse",
            "instructions": "Play each pattern twice with RH. Identify the weakest transition and loop only its last two/first two notes.",
            "protocol": {
              "kind": "repetitions",
              "task": "Four-note broken triads with equal spacing",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Broken chords with a stable pulse",
            "instructions": "Play the full four-bar sequence, then keep LH roots sustained underneath if that does not disturb the RH timing.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full four-bar sequence, then keep LH roots sustained underneath if that does not disturb the RH timing.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "Every four-note pattern contained the correct chord tones.",
          "Spacing stayed equal through changes.",
          "The hand moved without a stretched or locked position."
        ],
        "questions": [
          {
            "prompt": "Does breaking a C-major triad into separate notes change its chord identity?",
            "options": [
              "No, the chord tones remain C E G",
              "Yes, it becomes F major",
              "Only if played quietly"
            ],
            "answer": 0,
            "explanation": "Rhythmic presentation changes, while the chosen pitch classes still define the triad."
          }
        ],
        "easier": "Alternate C E G E and E G C G in one register.",
        "harder": "Move the broken-chord role to LH and keep RH on a simple melody.",
        "mistake": "A large leap can cause a delayed first note. Prepare the position in a counted gap.",
        "transfer": "Choose a broken pattern that leaves enough attention for melody and ensemble cues."
      },
      {
        "id": "voicing",
        "title": "Make the melody the clearest voice",
        "skill": "sound",
        "objective": "Keep a simple top melody audible over quieter accompaniment.",
        "teaching": [
          "Voicing means balancing simultaneous musical lines. For this exercise, RH carries E G A G as a slow melody while LH plays quiet single roots. The melody should be clear without striking it harshly.",
          "Practice the accompaniment quietly alone, then the melody at a comfortable moderate level. Combining them should preserve that difference. Listen from a short distance or ask another listener when possible."
        ],
        "example": {
          "caption": "Worked example · Make the melody the clearest voice",
          "text": "Four bars, one melody note held per bar:\nRH: E4 | G4 | A4 | G4\nLH: C3 | C3 | F2 | G2, two quiet half notes each bar."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Make the melody the clearest voice",
            "instructions": "Play LH alone at a quiet but reliable level. Add the first RH note without increasing LH volume.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Melody prominent above quiet bass",
              "measures": "4 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Make the melody the clearest voice",
            "instructions": "Play all four bars with the two sound layers. Repeat after swapping attention: first listen mainly to bass, then mainly to melody.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play all four bars with the two sound layers. Repeat after swapping attention: first listen mainly to bass, then mainly to melody.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The melody remained the clearest line.",
          "The bass notes were still audible and controlled.",
          "Neither hand became tense to create the difference."
        ],
        "questions": [
          {
            "prompt": "What is the goal of voicing in this exercise?",
            "options": [
              "The loudest possible upper note",
              "A clear melody above quieter accompaniment",
              "Identical volume from all notes"
            ],
            "answer": 1,
            "explanation": "Balance serves a musical hierarchy, not maximum volume."
          }
        ],
        "easier": "Use one quiet sustained LH note per bar while keeping the RH melody clear.",
        "harder": "Add a quiet middle chord tone without obscuring the upper melody.",
        "mistake": "Trying to make the top loud can create harshness. First reduce the accompaniment.",
        "transfer": "Support a sung melody by making your accompaniment the quieter layer."
      },
      {
        "id": "pedal",
        "title": "Pedal by listening, not by habit",
        "skill": "sound",
        "objective": "Distinguish clean harmonic changes from a blurred sustain.",
        "teaching": [
          "The sustain pedal can connect or color notes after fingers release them. It can also blur harmony when held through unrelated chord changes. This is optional: a keyboard without a pedal can complete the lesson by comparing finger-connected and detached playing.",
          "With a pedal, try C→F slowly. Play the new F chord, briefly lift to clear the old sound, then depress again while F is still held. Listen to the result rather than aiming for a fixed foot movement regardless of instrument or room."
        ],
        "example": {
          "caption": "Worked example · Pedal by listening, not by habit",
          "text": "Play C, pedal down; hold.\nPlay F; lift pedal to clear C, then re-depress while holding F.\nAt the ending: release deliberately to silence."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Pedal by listening, not by habit",
            "instructions": "Compare one deliberately blurred C→F change with one cleared change at a quiet volume. Without a pedal, compare overlapping and separated finger releases.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Listen for clean harmony and planned final release",
              "measures": "4 slow changes",
              "hands": "together"
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Pedal by listening, not by habit",
            "instructions": "Play C | Am | F | G slowly with clean changes and an intentional final silence. Use no pedal if the sound is clearer that way.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play C | Am | F | G slowly with clean changes and an intentional final silence. Use no pedal if the sound is clearer that way.",
              "measures": "8 bars",
              "hands": "together"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I could hear the difference between clear and blurred harmony.",
          "The chosen releases were deliberate.",
          "The final sound stopped when intended."
        ],
        "questions": [
          {
            "prompt": "What should determine whether the pedal needs clearing?",
            "options": [
              "A rule to hold it for the entire piece",
              "The course timer",
              "The harmony and the sound you hear"
            ],
            "answer": 2,
            "explanation": "Pedaling is a sound decision; the required amount varies with material and instrument."
          }
        ],
        "easier": "Play the whole sequence without pedal.",
        "harder": "Compare shorter and longer pedal durations in the same room.",
        "mistake": "Holding pedal to hide wrong notes compounds them. Fix the notes before adding sustain.",
        "transfer": "Use less pedal when ensemble harmony or room acoustics already creates a dense sound."
      },
      {
        "id": "first-read",
        "title": "Prepare before the first reading",
        "skill": "reading",
        "objective": "Preview a short unfamiliar text score before one uninterrupted reading attempt.",
        "teaching": [
          "A first-read attempt occurs only once for a particular passage. Repeating it is useful practice but should not be counted as fresh reading. Before playing, inspect meter, starting position, altered notes, durations and the largest move.",
          "This original text score teaches preview and continuity. It is not a substitute for staff-reading instruction. Use the same preview process on an appropriate teacher-provided staff score."
        ],
        "example": {
          "caption": "Worked example · Prepare before the first reading",
          "text": "4/4; q=1, h=2, r=1 rest. RH:\nG4(q) A4(q) B4(h) | D5(h) C5(q) B4(q) | A4(q) F♯4(q) G4(h) | G4(h) r r"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Prepare before the first reading",
            "instructions": "Before touching keys, name the F-sharp and clap the final two bars. Choose a starting position and a slow tempo. This displayed example is prepared reading, not an unseen first read. Use an unfamiliar teacher-selected excerpt separately when testing first-read ability.",
            "protocol": {
              "kind": "sight-reading",
              "material": "G4(q) A4(q) B4(h) | D5(h) C5(q) B4(q) | A4(q) F♯4(q) G4(h) | G4(h) r r",
              "key": "G",
              "hands": "right",
              "firstRead": false,
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Prepare before the first reading",
            "instructions": "Play one complete reading. Note the trouble spot, practice it separately, then label the next take as repeat practice.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play one complete reading. Note the trouble spot, practice it separately, then label the next take as repeat practice.",
              "measures": "8 bars",
              "hands": "right",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "I previewed altered notes and durations.",
          "I continued the first take without an uncounted restart.",
          "I distinguished first reading from repeat practice."
        ],
        "questions": [
          {
            "prompt": "What makes a second take of the same passage a first-read attempt?",
            "options": [
              "Resetting the timer",
              "Nothing; it is repeat practice",
              "Playing it faster"
            ],
            "answer": 1,
            "explanation": "First reading refers to unfamiliarity with the material, not an application counter."
          }
        ],
        "easier": "Read two bars only and keep the pulse.",
        "harder": "Use a short new staff score at a similar difficulty with the same preview process.",
        "mistake": "A fast first tempo can turn every beat into a correction. Choose a tempo that allows continuity.",
        "transfer": "Preview a new rehearsal chart before the band starts."
      },
      {
        "id": "independence",
        "title": "A repeated accompaniment beneath a phrase",
        "skill": "coordination",
        "objective": "Keep a simple LH pattern while RH uses a different rhythm.",
        "teaching": [
          "Use LH C3 and G3 on beats 1 and 3. RH plays E4 for one beat, G4 for one, then C5 for two. Clap the combined rhythm and identify the shared attacks before combining hands.",
          "Learn the first bar slowly. Once stable, change the RH second bar to G4 half note, E4 quarter, D4 quarter without changing LH timing. Reduce the span or use lower RH notes if the position is uncomfortable."
        ],
        "example": {
          "caption": "Worked example · A repeated accompaniment beneath a phrase",
          "text": "LH every bar: C3(h) G3(h)\nRH bar 1: E4(q) G4(q) C5(h)\nRH bar 2: G4(h) E4(q) D4(q)"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A repeated accompaniment beneath a phrase",
            "instructions": "Play each hand separately, then combine only the first two beats. Add the second half of the bar without accelerating.",
            "protocol": {
              "kind": "repertoire",
              "focus": "LH half-note ostinato beneath changing RH rhythm",
              "measures": "2-bar loop",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A repeated accompaniment beneath a phrase",
            "instructions": "Play four repetitions of the two-bar phrase. Keep LH quiet and steady, then end both hands together.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play four repetitions of the two-bar phrase. Keep LH quiet and steady, then end both hands together.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 50,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The LH pattern did not follow every RH attack.",
          "The RH durations remained correct.",
          "The balance and ending were intentional."
        ],
        "questions": [
          {
            "prompt": "Which rhythm should the LH keep here?",
            "options": [
              "Every RH note",
              "Only the first note of the whole exercise",
              "Half notes on beats 1 and 3"
            ],
            "answer": 2,
            "explanation": "The accompaniment has its own repeated two-attack pattern."
          }
        ],
        "easier": "Use one sustained LH C per bar.",
        "harder": "Change the harmony to F for two bars while retaining the two rhythms.",
        "mistake": "Memorizing hand motions without counting can break at a small change. Rehearse the rhythm separately.",
        "transfer": "Keep a reliable simple accompaniment while listening for ensemble changes."
      }
    ]
  },
  {
    "id": "piano-ensemble",
    "revision": 1,
    "instrument": "piano",
    "stage": "ensemble",
    "title": "Piano: accompany, transpose and follow cues",
    "level": "advanced",
    "summary": "Build useful chord parts that leave space and survive key or arrangement changes.",
    "prerequisites": "Basic triads/inversions, a steady pulse and simple two-hand independence.",
    "outcomes": [
      "Choose a sparse accompaniment",
      "Translate a small number chart",
      "Perform a cue-led arrangement"
    ],
    "placement": [
      "I can play C, F, G and Am with comfortable inversions.",
      "I can maintain a pulse through a silent bar.",
      "I can follow a simple chord chart without restarting."
    ],
    "sourceIds": [
      "berklee-piano",
      "berklee-reading",
      "ensemble"
    ],
    "lessons": [
      {
        "id": "comping",
        "title": "One chord, several accompaniment choices",
        "skill": "ensemble",
        "objective": "Choose an accompaniment pattern that supports rather than crowds a melody.",
        "teaching": [
          "Comping is rhythmic harmonic support. Begin with a single RH chord per bar and a quiet LH root. Compare this with two shorter chord attacks on beats 2 and 4. Neither pattern is a universal default.",
          "A singer, bassist or another keyboard part changes the available space. When a bassist supplies the low roots, a lighter RH voicing may be enough. Practice choosing fewer notes deliberately."
        ],
        "example": {
          "caption": "Worked example · One chord, several accompaniment choices",
          "text": "C | Am | F | G\nA: RH chord on 1, sustain; LH root quietly\nB: RH short chords on 2/4; omit LH when another bass part supplies roots."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: One chord, several accompaniment choices",
            "instructions": "Play version A once and B once on C only. Keep releases and the pulse clear.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Compare sparse and backbeat chord support",
              "measures": "4 bars",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: One chord, several accompaniment choices",
            "instructions": "Use both versions over the four-chord chart beneath a spoken or sung phrase. Choose one and state why it leaves useful space.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Use both versions over the four-chord chart beneath a spoken or sung phrase. Choose one and state why it leaves useful space.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The correct harmony was clear in both versions.",
          "The chord rhythms and releases were intentional.",
          "I could omit an unnecessary layer without losing time."
        ],
        "questions": [
          {
            "prompt": "When another instrument supplies the bass, what may help?",
            "options": [
              "Reduce or omit duplicated low roots",
              "Always double every low note",
              "Stop following harmony"
            ],
            "answer": 0,
            "explanation": "Leaving register space can reduce unnecessary overlap; the arrangement decides."
          }
        ],
        "easier": "Use only one RH triad per bar.",
        "harder": "Try a comfortable three-note inversion with a common tone across changes.",
        "mistake": "A thick low chord can obscure the bass. Move or remove notes rather than just playing louder.",
        "transfer": "Prepare a sparse verse texture and a stronger chorus texture before rehearsal."
      },
      {
        "id": "transposition",
        "title": "Move a number chart into G",
        "skill": "harmony",
        "objective": "Translate 1–6m–4–5 from C into G and choose playable voicings.",
        "teaching": [
          "Transpose the harmony first, then choose fingerings. In C, 1–6m–4–5 is C–Am–F–G. In G it is G–Em–C–D. The chord quality label travels with the number.",
          "For an easy RH starting set in G use D G B, E G B, E G C and D F-sharp A. Verify each set against its chord spelling instead of moving a remembered hand shape blindly."
        ],
        "example": {
          "caption": "Worked example · Move a number chart into G",
          "text": "G | Em | C | D\nRH: D G B | E G B | E G C | D F♯ A\nOptional LH: G | E | C | D"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Move a number chart into G",
            "instructions": "Spell each chord and play its RH voicing with a rest between changes. Check F-sharp in D major.",
            "protocol": {
              "kind": "chord-changes",
              "chords": [
                "G",
                "Em",
                "C",
                "D"
              ],
              "target": 8,
              "technique": "Verify DGB → EGB → EGC → DF♯A.",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Move a number chart into G",
            "instructions": "Play the chart in C, then in G with one chord per bar. Keep tempo and phrase length the same.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the chart in C, then in G with one chord per bar. Keep tempo and phrase length the same.",
              "measures": "8 bars",
              "hands": "not-applicable",
              "pulse": {
                "bpm": 55,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The new chord roots and qualities were correct.",
          "D major included F-sharp.",
          "My voicings were comfortable and changes on time."
        ],
        "questions": [
          {
            "prompt": "What is chord 5 in G major?",
            "options": [
              "F major",
              "D major",
              "D minor"
            ],
            "answer": 1,
            "explanation": "G major’s fifth-degree triad contains D F-sharp A."
          }
        ],
        "easier": "Play only root notes for the transposed chart.",
        "harder": "Write the chart in D and verify the new scale before playing.",
        "mistake": "Transposition is not a claim that every key uses the same fingering. Re-plan the hand position.",
        "transfer": "Agree on the actual key with a singer before the count-in."
      },
      {
        "id": "introductions",
        "title": "An introduction and an ending",
        "skill": "form",
        "objective": "Make the starting cue, harmonic setup and final release unambiguous.",
        "teaching": [
          "An introduction establishes the tempo, tonal center and entry point. Keep this one short: two bars, C then G, before a four-bar C–Am–F–G section. Count the final intro bar clearly.",
          "An ending needs a final harmony and an agreed release. Practice holding C for four beats and stopping together, rather than fading accidentally because the chart has ended."
        ],
        "example": {
          "caption": "Worked example · An introduction and an ending",
          "text": "Intro: C | G\nSection: C | Am | F | G\nEnding: C for 4 beats, then silence.\nCount the intro’s second bar as “2 2 3 4”."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: An introduction and an ending",
            "instructions": "Loop the G intro bar into the first C section bar. Rehearse the final four-beat chord and release separately.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Two-bar introduction and counted final chord",
              "measures": "7 bars",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: An introduction and an ending",
            "instructions": "Play the complete short arrangement and give an audible count-in or visible agreed cue to a partner.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the complete short arrangement and give an audible count-in or visible agreed cue to a partner.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The entry point after the intro was clear.",
          "The section retained its four-bar harmony.",
          "The last chord and release matched the agreed count."
        ],
        "questions": [
          {
            "prompt": "What makes the ending reliable?",
            "options": [
              "Holding until everyone guesses",
              "Adding another chord after silence",
              "An agreed duration and release"
            ],
            "answer": 2,
            "explanation": "An ending is a coordinated event, not simply a lack of further notes."
          }
        ],
        "easier": "Play one chord per bar without LH.",
        "harder": "Add a short original melodic introduction while preserving the same two-bar form.",
        "mistake": "An unclear last intro bar causes late entries. Rehearse that join with the group.",
        "transfer": "Use simple counted intros and endings for rehearsal or congregational songs."
      },
      {
        "id": "ensemble-take",
        "title": "Ensemble assessment: contrasting textures",
        "skill": "repertoire",
        "objective": "Complete a form with contrasting accompaniment, a stop and a counted return.",
        "teaching": [
          "Use one sparse texture for the verse and a stronger but still controlled texture for the chorus. Changing texture does not mean changing tempo. The one-bar stop must remain counted.",
          "Learn the transitions before the full take. If an error occurs in the full take, simplify to a root or small chord and recover at the next known bar rather than repeatedly starting over."
        ],
        "example": {
          "caption": "Worked example · Ensemble assessment: contrasting textures",
          "text": "Intro2: C | G\nVerse4: C | Am | F | G, sustained chords\nChorus4: F | C | G | G, short chords on 2/4\nStop1; return4: C | Am | F | G; end C for 4 beats."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Ensemble assessment: contrasting textures",
            "instructions": "Practice verse→chorus and stop→return as short windows. Decide whether LH roots help or duplicate another player.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Original ensemble form with verse/chorus contrast",
              "measures": "15 bars + ending",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Ensemble assessment: contrasting textures",
            "instructions": "Play the full chart, count the stop and final release, then identify one precise repair for the next take.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Play the full chart, count the stop and final release, then identify one precise repair for the next take.",
              "measures": "8 bars",
              "hands": "together",
              "pulse": {
                "bpm": 60,
                "beats": 4,
                "beatUnit": 4,
                "subdivision": 1
              }
            },
            "weight": 3
          }
        ],
        "checks": [
          "The full form and stop were retained.",
          "Texture changed without tempo drift.",
          "I recovered from small errors while keeping the arrangement."
        ],
        "questions": [
          {
            "prompt": "What is a useful recovery when you lose a decorative pattern?",
            "options": [
              "Restart the entire song immediately",
              "Play unrelated notes until it feels right",
              "Simplify and find the next known bar"
            ],
            "answer": 2,
            "explanation": "A simpler correct part preserves ensemble continuity while you recover."
          }
        ],
        "easier": "Use a small RH chord on every bar’s first beat.",
        "harder": "Perform with another musician and ask specifically about timing, balance and release.",
        "mistake": "Adding more notes at the chorus can destabilize time. Rehearse the density change alone.",
        "transfer": "Bring a clear, adaptable part to the group rather than a fragile solo arrangement."
      }
    ]
  },
  {
    "id": "voice-foundation",
    "revision": 1,
    "instrument": "voice",
    "stage": "foundation",
    "title": "Voice: comfortable, accurate short phrases",
    "level": "beginner",
    "summary": "Start with listening, comfortable sound and small phrases. Set your own range before any singing task.",
    "prerequisites": "No prior singing study. Use only a comfortable speaking/singing range; do not practice through pain, hoarseness or increasing fatigue.",
    "outcomes": [
      "Match a comfortable reference by ear",
      "Shape a short phrase with clear rhythm",
      "Notice effort and stop when comfort changes"
    ],
    "placement": [
      "I can sing a comfortable single note without strain.",
      "I can hear whether two pitches match.",
      "I can finish a short phrase without forcing extra breath or volume."
    ],
    "sourceIds": [
      "berklee-voice",
      "nidcd"
    ],
    "lessons": [
      {
        "id": "comfort",
        "title": "Begin with comfort, not a range target",
        "skill": "awareness",
        "objective": "Identify a comfortable starting pitch and a clear stopping rule.",
        "teaching": [
          "The app cannot examine your voice or decide a safe range. Choose a pitch that feels as easy as a comfortable spoken “mm,” listen first, and only then try a brief gentle sound. The displayed default is a placeholder until you set your own range.",
          "Do not sing when hoarse, tired or uncomfortable. Stop if sound production becomes painful or increasingly effortful. Persistent or concerning voice problems belong with a qualified clinician, not a higher practice target. Listening and reading are useful alternatives on a non-singing day."
        ],
        "example": {
          "caption": "Worked example · Begin with comfort, not a range target",
          "text": "Listen → choose a comfortable pitch → brief gentle “mm” → release → rest.\nNo high-note test, breath-hold contest or forced volume.",
          "notes": [
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Begin with comfort, not a range target",
            "instructions": "Set a comfortable starting note and narrow range in the lesson setup. Make up to three brief easy sounds, with a generous silent pause after each. Stop sooner if comfort changes.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0
              ],
              "syllable": "mm",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Begin with comfort, not a range target",
            "instructions": "Speak a short phrase at an easy level, then lightly sing it on the chosen pitch. Leave a full quiet breath and pause between attempts.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Speak a short phrase at an easy level, then lightly sing it on the chosen pitch. Leave a full quiet breath and pause between attempts.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I chose the starting pitch rather than accepting an unsuitable default.",
          "I used short attempts with rest.",
          "I could state when I would stop instead of pushing on.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What should happen if singing becomes painful or hoarse?",
            "options": [
              "Increase volume to stabilize it",
              "Extend the practice timer",
              "Stop singing and address the problem rather than push through"
            ],
            "answer": 2,
            "explanation": "The course is not a diagnostic tool; discomfort is not a training goal."
          }
        ],
        "easier": "Listen and read only; use an off-app reflection without claiming a singing pass.",
        "harder": "Repeat the same comfortable task on another day, not at a higher pitch by default.",
        "mistake": "A displayed pitch is not a prescription. Adjust it or do not sing.",
        "transfer": "Establish a comfort check before a rehearsal, not only when trouble appears."
      },
      {
        "id": "listening",
        "title": "Hear same, higher and lower",
        "skill": "ear",
        "objective": "Distinguish matching pitches from small upward or downward changes.",
        "teaching": [
          "Before matching a note, listen for its direction and location relative to your comfortable pitch. Two notes with the same name in different octaves are related but are not identical pitches. The reference is a synthesized guide, not a model of vocal tone.",
          "Try listening without singing first. For a singing attempt, use an easy syllable and a short sound; release rather than slide repeatedly while searching for the note."
        ],
        "example": {
          "caption": "Worked example · Hear same, higher and lower",
          "text": "Original reference: C4 C4 D4 C4 B3 C4.\nDescribe pairs as same, up or down. Transpose the reference to your chosen starting note.",
          "notes": [
            60,
            60,
            62,
            60,
            59,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hear same, higher and lower",
            "instructions": "Listen to the sequence and speak its directions. Sing only the repeated starting note after a separate listen, then rest.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                0,
                2,
                0,
                -1,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hear same, higher and lower",
            "instructions": "Have a partner play a comfortable note, or replay the reference. Attempt a brief match and report by ear whether it seemed high, low or close; the app does not score your audio.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Have a partner play a comfortable note, or replay the reference. Attempt a brief match and report by ear whether it seemed high, low or close; the app does not score your audio.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I distinguished repeated notes from changed pitches by ear.",
          "I made brief attempts rather than forcing a long search.",
          "I described my result honestly as a listening judgment.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "How does this app judge your sung pitch?",
            "options": [
              "It does not; these matching results are self-reported",
              "It analyzes the microphone automatically",
              "It infers accuracy from time spent"
            ],
            "answer": 0,
            "explanation": "No microphone analysis runs; a reference and a checkbox do not measure intonation."
          }
        ],
        "easier": "Listen and identify only same versus different.",
        "harder": "Ask a teacher or trusted musician to check a small set of matching attempts.",
        "mistake": "A synthesized note may feel different from your voice. Compare pitch, not timbre.",
        "transfer": "Listen to an instrumental starting note before a group entrance."
      },
      {
        "id": "hum",
        "title": "A small three-note arc",
        "skill": "intonation",
        "objective": "Sing a comfortable three-note pattern with an easy onset and release.",
        "teaching": [
          "Use a small ascending and descending pattern, 1–2–3–2–1 of a major scale. At a C starting pitch this is C D E D C. The entire pattern, not just its first note, must fit within your chosen comfortable range.",
          "Try a gentle “mm” or another easy syllable; there is no requirement to copy a particular resonance sensation. Keep the jaw and shoulders unforced. One short attempt followed by rest is enough to evaluate the task."
        ],
        "example": {
          "caption": "Worked example · A small three-note arc",
          "text": "1 2 3 2 1 → C D E D C at the example root.\nListen first; sing once comfortably; release and rest.",
          "notes": [
            60,
            62,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: A small three-note arc",
            "instructions": "Listen once, then sing one small arc at your selected root. Rest before a second attempt; do not automatically move upward.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                2,
                4,
                2,
                0
              ],
              "syllable": "mm",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: A small three-note arc",
            "instructions": "Sing a short original phrase using the same five-note contour on “oo” or a comfortable vowel. Keep its final release deliberate.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing a short original phrase using the same five-note contour on “oo” or a comfortable vowel. Keep its final release deliberate.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The full pattern fitted my chosen range.",
          "The contour rose and returned as intended.",
          "The onset and final release stayed easy.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "Which part of the pattern must fit your range?",
            "options": [
              "Only its first note",
              "Only its loudest note",
              "Every note in the pattern"
            ],
            "answer": 2,
            "explanation": "A safe starting pitch can still lead to an unsuitable top or bottom note."
          }
        ],
        "easier": "Use two notes, 1–2–1, or listen only.",
        "harder": "Repeat the same contour with clear rhythm rather than automatically adding range.",
        "mistake": "Chasing a higher root every attempt confuses range with learning. Keep the root stable.",
        "transfer": "Use a brief familiar pattern to check readiness before singing a song."
      },
      {
        "id": "phrase-breath",
        "title": "Plan a short phrase and a natural breath",
        "skill": "phrasing",
        "objective": "Complete a short phrase without an oversized inhalation or a forced ending.",
        "teaching": [
          "Choose a phrase short enough to finish comfortably. Mark a sensible breathing point before singing rather than taking the largest possible breath. Allow an easy replenishing breath; do not turn the lesson into breath holding or forceful abdominal pressing.",
          "Speak “We sing this simple line” naturally, then sing it on one comfortable pitch. End the sound before you feel compelled to squeeze out the final word. Shortening the phrase is an appropriate adjustment."
        ],
        "example": {
          "caption": "Worked example · Plan a short phrase and a natural breath",
          "text": "“We sing this simple line” / breathe and rest\nThen: “We sing” / “a simple line” if the full phrase feels too long."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Plan a short phrase and a natural breath",
            "instructions": "Speak the phrase and mark a comfortable breath point. Sing one shortened version, release, and take a quiet rest.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                0,
                0,
                0,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Plan a short phrase and a natural breath",
            "instructions": "Sing two short phrases separated by a planned breathing gap. Keep the second entrance easy rather than rushed.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing two short phrases separated by a planned breathing gap. Keep the second entrance easy rather than rushed.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I chose a phrase length I could manage comfortably.",
          "The breathing gap was planned.",
          "I did not force the final syllable or an oversized breath.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What is an appropriate response to an uncomfortable phrase length?",
            "options": [
              "Shorten it and choose a breathing point",
              "Force the last words with extra pressure",
              "Hold the breath before starting"
            ],
            "answer": 0,
            "explanation": "The arrangement and phrase length can adapt to the singer instead of demanding strain."
          }
        ],
        "easier": "Speak the phrase only or sing two words.",
        "harder": "Try the same short phrase with a different sensible breathing point.",
        "mistake": "A very large preparatory breath can add tension rather than control. Use an easy replenishment.",
        "transfer": "Mark breathing points in a song before rehearsal."
      },
      {
        "id": "vowels",
        "title": "Keep words clear on a comfortable pitch",
        "skill": "diction",
        "objective": "Change an easy vowel or word without adding jaw or throat tension.",
        "teaching": [
          "Vowels carry sustained sound while consonants clarify words. Speak a short word sequence first, then sing it gently on one comfortable pitch. There is no single exaggerated mouth shape required for every singer, vowel or register.",
          "Notice whether a consonant makes you grip the jaw or whether a vowel change pulls the pitch away. Use fewer words and a slower pace when that happens. Keep attempts brief."
        ],
        "example": {
          "caption": "Worked example · Keep words clear on a comfortable pitch",
          "text": "Speak: “me — may — moo.”\nSing each briefly on one comfortable pitch with a pause between words.\nThen speak and sing “We sing a line.”"
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Keep words clear on a comfortable pitch",
            "instructions": "Choose two comfortable syllables and alternate short sounds at the same pitch. Rest and compare their ease.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                0,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Keep words clear on a comfortable pitch",
            "instructions": "Sing the short phrase “We sing a line” on a single comfortable pitch, keeping words understandable and the release unforced.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing the short phrase “We sing a line” on a single comfortable pitch, keeping words understandable and the release unforced.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The words or syllables remained understandable.",
          "Pitch did not deliberately change with every vowel.",
          "My jaw and throat remained unforced.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What should you do if a word adds tension?",
            "options": [
              "Force a larger mouth shape",
              "Repeat louder without a pause",
              "Slow down, simplify and release unnecessary effort"
            ],
            "answer": 2,
            "explanation": "The task is clear, comfortable coordination rather than a prescribed extreme shape."
          }
        ],
        "easier": "Use one easy vowel only, with brief sounds and a comfortable rest between attempts.",
        "harder": "Keep the same phrase clear at two comfortable, moderate sound levels.",
        "mistake": "An exaggerated consonant can interrupt the line. Speak naturally before singing.",
        "transfer": "Practice difficult song words separately from difficult pitches."
      },
      {
        "id": "rhythm",
        "title": "Words inside a counted bar",
        "skill": "rhythm",
        "objective": "Place short words and rests in a four-beat phrase.",
        "teaching": [
          "First separate rhythm from pitch. Count 1 2 3 4, speak “We sing” on beats 1 and 2, then leave beats 3 and 4 silent. A rest is counted time, not a signal to rush into the next phrase.",
          "After the spoken rhythm is comfortable, sing it on a single easy pitch. Use a quiet metronome only if helpful; it should not cause you to increase vocal volume."
        ],
        "example": {
          "caption": "Worked example · Words inside a counted bar",
          "text": "Bar 1: We(1) sing(2) rest(3) rest(4)\nBar 2: this(1) line(2–3) rest(4)\nSpeak first, then sing on one comfortable pitch."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Words inside a counted bar",
            "instructions": "Speak the two bars while tapping quarters. Repeat with the final word held for two beats.",
            "protocol": {
              "kind": "repetitions",
              "task": "Spoken then sung two-bar rhythm",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Words inside a counted bar",
            "instructions": "Sing the same rhythm on your chosen comfortable pitch. Keep both silent gaps and the two-beat word clear.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing the same rhythm on your chosen comfortable pitch. Keep both silent gaps and the two-beat word clear.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "Words started on the intended counts.",
          "The held word lasted two beats.",
          "Rests stayed silent and counted.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What happens during a written rest?",
            "options": [
              "Skipping ahead to the next bar",
              "Counted silence",
              "An automatic extra breath-hold"
            ],
            "answer": 1,
            "explanation": "A rest has a duration just like a sounded note."
          }
        ],
        "easier": "Speak the rhythm without singing.",
        "harder": "Use the same rhythm over a small 1–2–1 pitch contour.",
        "mistake": "Learning words and pitches at once can hide a rhythm error. Speak the rhythm separately.",
        "transfer": "Place entrances and consonants together in group singing."
      },
      {
        "id": "small-patterns",
        "title": "Repeat accurately without extending range",
        "skill": "intonation",
        "objective": "Repeat a small pattern with consistent contour and a useful rest.",
        "teaching": [
          "Repetition is useful when it checks a particular feature. Use 1–3–2–1: at C the notes are C E D C. Listen, sing once, and decide whether the leap to 3 and stepwise return were clear.",
          "Leave rest between attempts. The lesson budget includes listening, reading and reflection; it is not a target for continuous singing. More repetitions are not automatically better when ease is decreasing."
        ],
        "example": {
          "caption": "Worked example · Repeat accurately without extending range",
          "text": "1 → 3 → 2 → 1\nC → E → D → C at the example root.\nOne listen, one short attempt, then at least a comfortable silent pause.",
          "notes": [
            60,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Repeat accurately without extending range",
            "instructions": "Listen and identify the leap versus steps. Sing one comfortable version, then rest and describe the most uncertain interval.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                4,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Repeat accurately without extending range",
            "instructions": "Use the contour as a short original phrase on “We sing this line.” Keep the root unchanged across attempts.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Use the contour as a short original phrase on “We sing this line.” Keep the root unchanged across attempts.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I distinguished the leap from the stepwise return.",
          "Repeated attempts retained the intended contour.",
          "Rest and reflection remained part of the lesson.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What should the total lesson time include?",
            "options": [
              "Only the highest note attempts",
              "Listening, rests and reflection as well as short singing",
              "Continuous singing only"
            ],
            "answer": 1,
            "explanation": "The timer structures a learning session, not a minimum vocal load."
          }
        ],
        "easier": "Use the smaller 1–2–1 contour instead, or listen without singing if that is more appropriate.",
        "harder": "Ask a musician to compare two rested attempts for the same specific feature.",
        "mistake": "Repeating without naming a problem can rehearse the same error. Choose one listening target.",
        "transfer": "Use focused, rested repeats for one difficult phrase rather than looping an entire song."
      },
      {
        "id": "first-phrase",
        "title": "Foundation assessment: a comfortable complete phrase",
        "skill": "repertoire",
        "objective": "Perform and self-review a short original phrase with clear contour, rhythm and ending.",
        "teaching": [
          "Prepare an original two-bar phrase using a comfortable root and the first three notes above it. Speak its rhythm, listen to its contour, then sing one short take. These are separate preparations, not three demands to solve at once.",
          "The self-check records your experience, not an objective vocal grade. A trusted teacher or musician can provide more reliable feedback on pitch and coordination. Do not mark the comfort criterion when a take felt strained."
        ],
        "example": {
          "caption": "Worked example · Foundation assessment: a comfortable complete phrase",
          "text": "4/4; q=1 beat, h=2; r=1 rest\nDegrees: 1(q) 2(q) 3(h) | 2(q) 1(h) r\nWords: “We — sing — this” | “short — line” — rest.",
          "notes": [
            60,
            62,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Foundation assessment: a comfortable complete phrase",
            "instructions": "Speak the two-bar rhythm. Listen to the pitch contour separately. Try a brief sung version only after the complete range feels comfortable.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                2,
                4,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Foundation assessment: a comfortable complete phrase",
            "instructions": "Sing the complete phrase, release on the counted ending and rest. Note one specific feature to repeat on another day.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing the complete phrase, release on the counted ending and rest. Note one specific feature to repeat on another day.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I followed the intended pitch contour by ear.",
          "Words, held notes and final rest matched the rhythm.",
          "I wrote an honest observation instead of treating time as accuracy.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What does a passed self-check establish?",
            "options": [
              "That I reported meeting this lesson’s checks, not a professional vocal grade",
              "That a microphone certified my pitch",
              "That my range must now increase"
            ],
            "answer": 0,
            "explanation": "The course uses explicit self-report and does not claim clinical or acoustic assessment."
          }
        ],
        "easier": "Speak the phrase or sing it on one comfortable pitch.",
        "harder": "Repeat the same phrase on another day with external feedback, not a forced higher key.",
        "mistake": "A timer finishing cannot verify pitch, ease or phrasing. Evaluate the actual take.",
        "transfer": "Prepare short song phrases with the same rhythm→contour→complete-take sequence."
      }
    ]
  },
  {
    "id": "voice-development",
    "revision": 1,
    "instrument": "voice",
    "stage": "development",
    "title": "Voice: listening, phrasing and harmony",
    "level": "intermediate",
    "summary": "Develop ear-led phrase work, modest dynamic contrast and a first harmony part within a personally chosen range.",
    "prerequisites": "Comfortable short phrases and an honest stopping rule. External teaching is useful; no range expansion is required.",
    "outcomes": [
      "Hear selected intervals and tonal contrasts",
      "Keep diction and dynamics comfortable",
      "Maintain a simple harmony independently"
    ],
    "placement": [
      "I can match a comfortable pitch by ear.",
      "I can sing a short phrase with planned rests.",
      "I can hear a major/minor contrast after listening."
    ],
    "sourceIds": [
      "berklee-voice",
      "nidcd"
    ],
    "lessons": [
      {
        "id": "intervals",
        "title": "Hear a third before singing it",
        "skill": "ear",
        "objective": "Compare a major third and a minor third from the same comfortable root.",
        "teaching": [
          "A major third spans four semitones; a minor third spans three. With C as the example root, C–E is major and C–E-flat is minor. Start with listening and naming, not repeated searching at the top note.",
          "Choose a root where both possible top notes are comfortable. Sing only one short pair at a time and rest. Describing a pair correctly by ear and singing it accurately are related but different checks."
        ],
        "example": {
          "caption": "Worked example · Hear a third before singing it",
          "text": "Major third: C E C\nMinor third: C E♭ C\nTranspose both from the same personally chosen root.",
          "notes": [
            60,
            64,
            60,
            63,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hear a third before singing it",
            "instructions": "Listen and name the two contrasts. Sing one short major-third pair, rest, then a minor-third pair if comfortable.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                4,
                0,
                3,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hear a third before singing it",
            "instructions": "Ask a partner to play one of the pairs in an unknown order. Identify it first, then optionally sing a brief comfortable echo.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Ask a partner to play one of the pairs in an unknown order. Identify it first, then optionally sing a brief comfortable echo.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I understood the three-versus-four-semitone contrast.",
          "I identified the examples by listening rather than timer completion.",
          "Any sung echo stayed brief and comfortable.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "How many semitones make a minor third?",
            "options": [
              "Four",
              "Seven",
              "Three"
            ],
            "answer": 2,
            "explanation": "A minor third is three semitones, one fewer than a major third."
          }
        ],
        "easier": "Listen only and identify same/different.",
        "harder": "Compare the pairs at another comfortable root without extending the range.",
        "mistake": "Starting too high makes the top note a strain test rather than an ear task. Lower the whole example.",
        "transfer": "Check a harmony interval before trying to maintain it in a group."
      },
      {
        "id": "tonality",
        "title": "Hear major and minor chord outlines",
        "skill": "ear",
        "objective": "Distinguish two small chord outlines without equating them with a required emotion.",
        "teaching": [
          "Compare 1–3–5 in major with 1–flat3–5 in minor: C E G versus C E-flat G at the example root. The third changes; the root and fifth remain. These note relationships do not prescribe a single emotional interpretation.",
          "A fifth-wide pattern is optional singing material. Choose listening-only work when that span does not fit comfortably. A correct listening answer can still be useful without singing the whole pattern."
        ],
        "example": {
          "caption": "Worked example · Hear major and minor chord outlines",
          "text": "Major outline: C E G E C\nMinor outline: C E♭ G E♭ C\nListen for the changed third.",
          "notes": [
            60,
            64,
            67,
            64,
            60,
            60,
            63,
            67,
            63,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hear major and minor chord outlines",
            "instructions": "Listen to the major outline. Compare it with the minor note names and have a partner play them if possible. Identify the changed pitch.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                4,
                7,
                4,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hear major and minor chord outlines",
            "instructions": "Sing a short comfortable 1–3–1 or 1–flat3–1 phrase rather than forcing the full fifth. Describe which version you chose.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing a short comfortable 1–3–1 or 1–flat3–1 phrase rather than forcing the full fifth. Describe which version you chose.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I identified the third as the changed chord tone.",
          "I could explain the two note sets.",
          "I chose a comfortable phrase span rather than forcing the full example.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "Which chord tone changes in this major/minor comparison?",
            "options": [
              "The fifth",
              "The third",
              "The root"
            ],
            "answer": 1,
            "explanation": "Both examples retain root and fifth and differ at the third."
          }
        ],
        "easier": "Listen to or read the note sets without singing.",
        "harder": "Identify an externally played major/minor outline in an unknown order.",
        "mistake": "“Major means happy” is not an adequate note-level explanation. Listen for the third.",
        "transfer": "Understand a harmony’s chord tones before choosing your part."
      },
      {
        "id": "dynamics",
        "title": "Small dynamic contrast without pushing",
        "skill": "expression",
        "objective": "Create a modest sound-level difference while keeping a short phrase easy.",
        "teaching": [
          "Dynamics are relative musical choices. Use a short phrase at an easy moderate level, then a little quieter. Do not aim for an extreme whisper, shout or large sustained swell. If a change adds effort, reduce the difference or return to speaking/listening.",
          "Keep the pitch, words and duration unchanged so you can hear what the volume change actually does. A microphone may make a quiet phrase audible in performance, but the app does not measure or adjust your voice."
        ],
        "example": {
          "caption": "Worked example · Small dynamic contrast without pushing",
          "text": "Phrase: 1 2 1 on “We sing now.”\nTake A: comfortable moderate level\nRest\nTake B: slightly quieter, same pitches and duration."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Small dynamic contrast without pushing",
            "instructions": "Sing one short moderate phrase, rest, then a slightly quieter one. Compare comfort before considering another attempt.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Small dynamic contrast without pushing",
            "instructions": "Choose one of the two levels to suit a spoken or sung surrounding phrase. Keep its words understandable and its release easy.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Choose one of the two levels to suit a spoken or sung surrounding phrase. Keep its words understandable and its release easy.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The contrast was modest and intentional.",
          "Words and pitch contour were retained by ear.",
          "I reduced the task rather than pushing when effort increased.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What is the correct response when the quieter version becomes effortful?",
            "options": [
              "Reduce the contrast or stop the singing task",
              "Force an extreme whisper",
              "Compensate with a longer breath hold"
            ],
            "answer": 0,
            "explanation": "The lesson targets an easy musical contrast, not an extreme sound-production exercise."
          }
        ],
        "easier": "Speak the contrast instead of singing.",
        "harder": "Use the same comfortable contrast to distinguish two short phrases.",
        "mistake": "Assuming expression requires extremes can add strain. Small differences can be musically clear.",
        "transfer": "Plan a verse/chorus contrast without treating louder as automatically better."
      },
      {
        "id": "consonants",
        "title": "Coordinate words at an entrance",
        "skill": "diction",
        "objective": "Prepare a consonant and vowel so a short group entrance stays rhythmically clear.",
        "teaching": [
          "Speak a phrase against a slow pulse and listen to where the vowel begins. Consonants have different lengths, so ensemble diction may require an agreed preparation rather than everyone guessing the entrance. Follow the conductor or leader’s intended text placement.",
          "Practice a brief phrase slowly, first speaking then singing on one comfortable pitch. Avoid exaggerated articulation or jaw tension. The target is a clear shared word and pulse."
        ],
        "example": {
          "caption": "Worked example · Coordinate words at an entrance",
          "text": "Count-in: 1 2 3 4\nOn next beat 1: “Sing this line,” with the group’s agreed word placement.\nRelease the last word together after beat 4."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Coordinate words at an entrance",
            "instructions": "Speak the phrase after two count-ins. Listen for a late first vowel or an early final release.",
            "protocol": {
              "kind": "repetitions",
              "task": "Spoken/sung phrase entrance and release",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Coordinate words at an entrance",
            "instructions": "With a partner, agree on the entrance and release, speak together, then try one comfortable sung version.",
            "protocol": {
              "kind": "repertoire",
              "focus": "With a partner, agree on the entrance and release, speak together, then try one comfortable sung version.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The entrance followed the agreed count.",
          "The words were clear without exaggerated tension.",
          "The final release was coordinated or clearly counted alone.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "Who determines text placement in an ensemble arrangement?",
            "options": [
              "Whichever singer begins first",
              "The agreed musical direction or leader",
              "A universal app timer"
            ],
            "answer": 1,
            "explanation": "Diction and entrances are coordinated musical decisions."
          }
        ],
        "easier": "Use one short word and a counted release.",
        "harder": "Apply the same preparation to a second phrase with a different first consonant.",
        "mistake": "A consonant practiced only in isolation may not align in the phrase. Include the count-in.",
        "transfer": "Rehearse difficult shared words and releases before a complete song."
      },
      {
        "id": "harmony",
        "title": "Hold one part while another changes",
        "skill": "harmony",
        "objective": "Keep a comfortable sustained harmony note against a simple external melody.",
        "teaching": [
          "Begin with listening to two different lines. A harmony singer must retain a part rather than automatically follow every movement of the lead. Use a comfortable held note while a partner plays a small melody around it.",
          "The app’s reference plays one line at a time, not a live duet. Partner or instrument work is needed for the simultaneous version. Alone, alternate the two parts and practice re-entering your held note after hearing the melody."
        ],
        "example": {
          "caption": "Worked example · Hold one part while another changes",
          "text": "Example harmony: hold E briefly\nExample melody: C D C, played by a partner\nTranspose the entire example if E is not comfortable; rest between tries."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Hold one part while another changes",
            "instructions": "Choose and briefly sing your comfortable harmony note. Listen to the melody separately, then return to the same note without following the last melody pitch.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Hold one part while another changes",
            "instructions": "With a partner, hold the short harmony while they play the melody. Alone, alternate listening and re-entry and label it as preparation, not simultaneous harmony certification.",
            "protocol": {
              "kind": "repertoire",
              "focus": "With a partner, hold the short harmony while they play the melody. Alone, alternate listening and re-entry and label it as preparation, not simultaneous harmony certification.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I retained the intended harmony pitch by ear.",
          "I did not deliberately follow each melody change.",
          "I distinguished solo preparation from a simultaneous two-part take.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What is the app’s audio limitation for this task?",
            "options": [
              "It provides a single-line reference, not a live second singer",
              "It grades two voices separately",
              "It guarantees harmony from a chord label"
            ],
            "answer": 0,
            "explanation": "The simultaneous task requires an external part; the app does not simulate or assess a live duet."
          }
        ],
        "easier": "Listen to both parts and identify when they differ.",
        "harder": "Ask a musician to vary the melody while keeping your part short and comfortable.",
        "mistake": "Calling solo echo work a passed duet overstates what was practiced. Record the actual conditions.",
        "transfer": "Learn a backing-vocal line independently before combining it with the lead."
      },
      {
        "id": "reading",
        "title": "Read a small scale-degree phrase",
        "skill": "reading",
        "objective": "Preview a short degree-and-duration score before a first complete attempt.",
        "teaching": [
          "This is scale-degree text, not staff notation. Degree 1 is the chosen major-key root; 2 is two semitones above and 3 is four above. q lasts one quarter-note beat and h lasts two. Read rhythm and contour before singing.",
          "Choose a comfortable key that contains the entire phrase. There is only one first encounter with this material; later repetitions are practice. External notation teaching can connect this exercise to staff positions and key signatures."
        ],
        "example": {
          "caption": "Worked example · Read a small scale-degree phrase",
          "text": "4/4: 1(q) 3(q) 2(h) | 2(q) 1(h) rest(q)\nAt C: C E D | D C rest.\nClap the rhythm; listen to starting pitch; then attempt the phrase.",
          "notes": [
            60,
            64,
            62,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Read a small scale-degree phrase",
            "instructions": "Speak the degree names and clap the durations. Check that degree 3 is within your chosen comfortable range.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                4,
                2,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Read a small scale-degree phrase",
            "instructions": "Make one complete short attempt from the text. Note whether rhythm or pitch needs separate repair before a repeat.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Make one complete short attempt from the text. Note whether rhythm or pitch needs separate repair before a repeat.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I decoded the degree numbers and durations.",
          "I retained the final counted rest.",
          "I recorded the actual difficulty rather than awarding a reading grade from repetition.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What does degree 3 mean in this major-key example?",
            "options": [
              "Four semitones above the chosen root",
              "The third note you happen to sing",
              "Always E in every key"
            ],
            "answer": 0,
            "explanation": "Degree numbers are relative to the chosen key; E is degree 3 only in the C example."
          }
        ],
        "easier": "Speak and clap without singing.",
        "harder": "Use an appropriate new staff phrase from a teacher with the same preview method.",
        "mistake": "A memorized reference is not the same as reading unfamiliar material. Keep the distinction explicit.",
        "transfer": "Preview a new vocal line by rhythm, contour and entry pitch before rehearsal."
      }
    ]
  },
  {
    "id": "voice-ensemble",
    "revision": 1,
    "instrument": "voice",
    "stage": "ensemble",
    "title": "Voice: a prepared, responsive ensemble part",
    "level": "advanced",
    "summary": "Apply comfortable phrase work to entrances, part independence, microphone awareness and a complete short arrangement.",
    "prerequisites": "Comfortable short singing and reliable counted entrances. Use external feedback for vocal technique and ensemble blend.",
    "outcomes": [
      "Prepare an independent part",
      "Agree on entrances and releases",
      "Evaluate a complete short take without forced vocal load"
    ],
    "placement": [
      "I can retain a short part after hearing another line.",
      "I can stop when vocal comfort changes.",
      "I can follow an agreed entrance and release."
    ],
    "sourceIds": [
      "berklee-voice",
      "nidcd",
      "ensemble"
    ],
    "lessons": [
      {
        "id": "unison",
        "title": "Listen across a unison line",
        "skill": "ensemble",
        "objective": "Match words, timing and release with another singer without forcing identical tone.",
        "teaching": [
          "Unison singing shares a musical line. Coordination involves pitch, vowel/word placement, duration and release; it does not require every voice to have identical timbre. Start with a short comfortable phrase and agree on its shape.",
          "Listen to the other singer while keeping your own production easy. Do not increase volume just to hear yourself. Alone, prepare entrances and words, but label the work as preparation rather than a measured blend result."
        ],
        "example": {
          "caption": "Worked example · Listen across a unison line",
          "text": "Phrase: 1 2 3 2 1 on “We sing this short line.”\nAgree: starting key, count-in, last-note duration, release."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Listen across a unison line",
            "instructions": "Speak the words together with a partner. Agree on a comfortable key and one counted release before singing.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                2,
                4,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Listen across a unison line",
            "instructions": "Sing one short unison take, rest, and discuss timing or word differences. Alone, rehearse the count and ending without claiming partner feedback.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Sing one short unison take, rest, and discuss timing or word differences. Alone, rehearse the count and ending without claiming partner feedback.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I prepared the key, entrance and release.",
          "I kept the phrase comfortable instead of competing for volume.",
          "I identified whether feedback came from a partner or from my own listening.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "Does coordinated unison require identical vocal timbre?",
            "options": [
              "Yes, force the same sound",
              "Only when the phrase is quiet",
              "No; agree on the musical line while keeping voices comfortable"
            ],
            "answer": 2,
            "explanation": "The shared line and coordinated timing do not erase natural differences between voices."
          }
        ],
        "easier": "Speak the phrase together only.",
        "harder": "Repeat on another day after specific feedback about one shared entrance.",
        "mistake": "Trying to overpower the other voice reduces listening. Simplify and adjust the arrangement.",
        "transfer": "Check starting pitches and final consonants together before singing a full set."
      },
      {
        "id": "part-preparation",
        "title": "Prepare the harmony before the full mix",
        "skill": "harmony",
        "objective": "Learn a simple independent part and identify its important meeting points.",
        "teaching": [
          "Write down your actual part rather than only a chord label. In this C example, a lead line C D E D C can be paired with a short harmony E F G F E, but this is a deliberately simple exercise, not a rule to sing parallel thirds over any song.",
          "Learn each line separately. Agree on the key and phrasing, then combine with a partner or instrument. Transpose both lines together to fit the singers; do not move only one part."
        ],
        "example": {
          "caption": "Worked example · Prepare the harmony before the full mix",
          "text": "Lead: C D E D C\nHarmony: E F G F E\nSame short rhythm; agree on final release.\nCheck the whole two-part range before singing."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Prepare the harmony before the full mix",
            "instructions": "Listen to and learn the harmony as its own small contour. Choose its root in the setup so its full span is comfortable.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                1,
                3,
                1,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Prepare the harmony before the full mix",
            "instructions": "Combine briefly with an external lead part if available. Otherwise alternate hearing the lead and re-entering the harmony, marking this as preparation.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Combine briefly with an external lead part if available. Otherwise alternate hearing the lead and re-entering the harmony, marking this as preparation.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I learned the specified harmony rather than guessing from chords.",
          "The chosen key accommodated the whole phrase.",
          "I honestly distinguished combined-part practice from solo preparation.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What should change when transposing this duet?",
            "options": [
              "Only the lead’s first note",
              "The harmony alone regardless of key",
              "Both parts by the same interval"
            ],
            "answer": 2,
            "explanation": "Transposing the complete arrangement preserves the intended relationships between parts."
          }
        ],
        "easier": "Learn only the first and final harmony note.",
        "harder": "Ask a teacher or musician to identify where the harmony needs adjustment for a real song.",
        "mistake": "Parallel-third exercises are not universal harmonization rules. Check actual chord and melody relationships.",
        "transfer": "Bring a written or memorized backing part to rehearsal instead of improvising every entrance."
      },
      {
        "id": "microphone",
        "title": "Let amplification support an easy voice",
        "skill": "performance",
        "objective": "Prepare microphone use and monitoring without assuming the app measures sound.",
        "teaching": [
          "A microphone can make a comfortable voice audible; it is not a reason to sing harder. Equipment and rooms differ, so work with the sound operator on level, distance and monitoring. Keep the microphone’s position consistent during a short test unless an intentional change is agreed.",
          "The app neither captures your microphone nor measures clipping, projection or blend. Without equipment, rehearse the count, phrase and release. Never mark a sound-check claim solely because the practice timer ran."
        ],
        "example": {
          "caption": "Worked example · Let amplification support an easy voice",
          "text": "Sound-check checklist: comfortable phrase → consistent mic position → ask about level and clarity → adjust with operator.\nNo microphone available: practice entrance and phrase only."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Let amplification support an easy voice",
            "instructions": "Speak or sing a brief comfortable phrase. With equipment, ask whether the signal is clear; without it, describe what you would ask the operator.",
            "protocol": {
              "kind": "repetitions",
              "task": "Comfortable phrase and sound-check communication",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Let amplification support an easy voice",
            "instructions": "Rehearse a short entrance with your intended posture and hand position. Do not turn or move the microphone unintentionally through the phrase.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Rehearse a short entrance with your intended posture and hand position. Do not turn or move the microphone unintentionally through the phrase.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I retained an easy voice instead of forcing volume.",
          "I kept the intended position and entrance clear.",
          "I did not claim microphone measurements the app cannot provide.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "Can this app verify clipping or microphone technique acoustically?",
            "options": [
              "Yes, from profile selection",
              "Yes, from the note reference alone",
              "No; use an actual sound check and human feedback"
            ],
            "answer": 2,
            "explanation": "The application does not record or analyze microphone input."
          }
        ],
        "easier": "Speak the sound-check phrase and prepare the questions.",
        "harder": "Rehearse with the actual operator and monitor setup at a comfortable level.",
        "mistake": "An inadequate monitor can tempt harder singing. Address the monitoring rather than force the voice.",
        "transfer": "Include a brief sound check and clear communication before a live set."
      },
      {
        "id": "complete-take",
        "title": "Ensemble assessment: phrase, rest and return",
        "skill": "repertoire",
        "objective": "Complete a short vocal arrangement with planned silence, a clear return and an honest comfort review.",
        "teaching": [
          "Prepare a short original phrase, sing it once, rest for a counted bar, then return once. Listening and recovery remain part of the lesson. There is no requirement to sing for the entire timer budget.",
          "Agree on the starting key, words and release before a partnered take. Afterward, identify one musical issue and separately record comfort. If discomfort appeared, stop singing and leave the safety criterion unchecked."
        ],
        "example": {
          "caption": "Worked example · Ensemble assessment: phrase, rest and return",
          "text": "Phrase A, 2 bars: 1(q) 2(q) 3(h) | 2(q) 1(h) rest(q)\nCount 1 full silent bar.\nRepeat A once; release and rest.\nUse “We sing this short line” or a comfortable syllable.",
          "notes": [
            60,
            62,
            64,
            62,
            60
          ]
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Ensemble assessment: phrase, rest and return",
            "instructions": "Speak the phrase and count the silent bar. Listen to the entry pitch before one short sung preparation.",
            "protocol": {
              "kind": "vocal-pattern",
              "startMidi": 60,
              "lowMidi": 55,
              "highMidi": 67,
              "offsets": [
                0,
                2,
                4,
                2,
                0
              ],
              "syllable": "oo",
              "transpose": 1,
              "noteSeconds": 0.7,
              "restSeconds": 15
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Ensemble assessment: phrase, rest and return",
            "instructions": "Perform the phrase, full-bar silence and return at a comfortable key. Stop, rest and record one specific observation; seek external feedback when possible.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Perform the phrase, full-bar silence and return at a comfortable key. Stop, rest and record one specific observation; seek external feedback when possible.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "The full phrase and silent bar were counted.",
          "The return and final release were deliberate.",
          "My review separated musical accuracy from vocal comfort.",
          "My voice stayed comfortable; no pain, hoarseness or increasing fatigue."
        ],
        "questions": [
          {
            "prompt": "What should happen after a take that caused increasing discomfort?",
            "options": [
              "Stop singing and do not mark the comfort criterion as met",
              "Repeat until the timer ends",
              "Automatically transpose higher"
            ],
            "answer": 0,
            "explanation": "The course prioritizes honest stopping over completion pressure."
          }
        ],
        "easier": "Speak the entire arrangement or listen only.",
        "harder": "Repeat on a later day with a partner’s specific timing and phrase feedback.",
        "mistake": "A completion badge should never motivate singing through discomfort. Record reflection instead.",
        "transfer": "Use short prepared phrases, clear cues and adequate rest in ensemble rehearsal."
      }
    ]
  },
  {
    "id": "custom-foundation",
    "revision": 1,
    "instrument": "custom",
    "stage": "foundation",
    "title": "Custom instrument: build a deliberate practice course",
    "level": "beginner",
    "summary": "A method course for adapting teacher-approved material to your instrument—not fabricated instrument-specific technique tuition.",
    "prerequisites": "Choose material appropriate to your actual instrument, equipment and experience. Seek a teacher for instrument-specific posture, technique and safety.",
    "outcomes": [
      "Define an observable skill",
      "Break a task into manageable practice and application",
      "Assess retention without automatic mastery claims"
    ],
    "placement": [
      "I have suitable material for my instrument.",
      "I can name a specific skill to improve.",
      "I can describe a comfortable, safe way to practice it."
    ],
    "sourceIds": [
      "ensemble",
      "interleaving",
      "spacing"
    ],
    "lessons": [
      {
        "id": "define",
        "title": "Choose one teachable target",
        "skill": "planning",
        "objective": "Translate a broad aim into a specific, observable practice task.",
        "teaching": [
          "“Get better at my instrument” does not identify what to practice. Choose a short teacher-approved passage or skill and state the behavior you want: a correct entrance, a clean change, a named interval or a controlled release.",
          "This general course does not infer technique from a custom profile name. A ukulele, violin and flute need different physical instruction. Record the actual material and any guidance from a qualified teacher in your lesson note."
        ],
        "example": {
          "caption": "Worked example · Choose one teachable target",
          "text": "Broad: improve a piece.\nSpecific: play bars 3–4 with the written rhythm, comfortable technique and a counted final release.\nMaterial: write its title and bar reference in your note."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Choose one teachable target",
            "instructions": "Choose a short passage suitable for your instrument. Write what a successful attempt looks or sounds like before playing.",
            "protocol": {
              "kind": "repetitions",
              "task": "One teacher-approved skill with a specific observable target",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Choose one teachable target",
            "instructions": "Make one comfortable attempt and describe the specific gap between your target and what happened.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Make one comfortable attempt and describe the specific gap between your target and what happened.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I identified actual suitable material.",
          "My target described an observable behavior.",
          "I recognized the need for instrument-specific guidance rather than trusting the profile name."
        ],
        "questions": [
          {
            "prompt": "Does a custom instrument name create expert technique instruction?",
            "options": [
              "Only after changing the theme",
              "No; this is an adaptable practice-method course",
              "Yes, for every instrument"
            ],
            "answer": 1,
            "explanation": "Generic planning can be useful without pretending to teach every instrument."
          }
        ],
        "easier": "Choose one note or one entrance from approved material.",
        "harder": "Specify a second criterion without increasing the passage length.",
        "mistake": "Choosing a long difficult piece can hide the immediate task. Narrow the target.",
        "transfer": "Ask a teacher for one appropriate next skill rather than a vague practice assignment."
      },
      {
        "id": "isolate",
        "title": "Repair the join, then restore context",
        "skill": "practice",
        "objective": "Practice a small difficulty and reconnect it to the surrounding phrase.",
        "teaching": [
          "Locate the smallest section that contains the difficulty, including the movement or count leading into it and the event after it. Repeating only the isolated hard note can omit the transition that actually fails.",
          "Use an easier tempo, smaller span or simplified rhythm when appropriate to your instrument. Change one variable at a time so you can tell what helped. Return to the surrounding phrase after a few focused attempts."
        ],
        "example": {
          "caption": "Worked example · Repair the join, then restore context",
          "text": "Whole passage → two-event join → one focused adjustment → phrase before and after.\nExample: last two notes of bar 3 + first two of bar 4."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Repair the join, then restore context",
            "instructions": "Play the selected join slowly with a clear count. Identify one change to make, then compare the next attempt.",
            "protocol": {
              "kind": "repetitions",
              "task": "Teacher-approved transition with surrounding context",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Repair the join, then restore context",
            "instructions": "Restore the surrounding phrase without the extra practice pause. Describe whether the repaired join survived in context.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Restore the surrounding phrase without the extra practice pause. Describe whether the repaired join survived in context.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I practiced the transition as well as the isolated event.",
          "I changed one useful variable at a time.",
          "I retested the skill inside a phrase."
        ],
        "questions": [
          {
            "prompt": "Why include the notes before and after a difficulty?",
            "options": [
              "The transition may be the actual problem",
              "To make every exercise longer",
              "To avoid knowing the target"
            ],
            "answer": 0,
            "explanation": "Context can expose preparation and recovery problems that isolated events hide."
          }
        ],
        "easier": "Reduce to two events with a counted pause.",
        "harder": "Restore a larger phrase without raising difficulty elsewhere.",
        "mistake": "A fast successful isolated event may still fail at its real entrance. Reconnect it.",
        "transfer": "Use short repair windows instead of restarting the entire piece after every mistake."
      },
      {
        "id": "feedback",
        "title": "Separate evidence from confidence",
        "skill": "assessment",
        "objective": "Judge an attempt using explicit criteria and honest evidence.",
        "teaching": [
          "Confidence is useful information but is not proof of accuracy. Define a few checks from the actual material, then compare your take with them. Teacher or partner feedback can reveal problems you do not hear yourself.",
          "A completed app timer confirms that a session was run, not that the instrument was played correctly. Off-app practice can be recorded honestly without being added a second time to the app’s practice-minute total."
        ],
        "example": {
          "caption": "Worked example · Separate evidence from confidence",
          "text": "Evidence: one complete take of the selected passage.\nChecks: intended rhythm; correct target events; comfortable control.\nReflection: one specific observation and a next repair."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Separate evidence from confidence",
            "instructions": "Write three relevant checks for your material in the lesson note. Play one take without changing the goal afterward.",
            "protocol": {
              "kind": "repetitions",
              "task": "Complete take against explicit self-checks",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Separate evidence from confidence",
            "instructions": "Compare the take with those checks and, where available, a teacher or partner’s feedback. Record what was actually observed.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Compare the take with those checks and, where available, a teacher or partner’s feedback. Record what was actually observed.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I used explicit checks for the real material.",
          "I distinguished confidence from observed performance.",
          "My evidence described actual practice rather than timer completion alone."
        ],
        "questions": [
          {
            "prompt": "What does the timer establish by itself?",
            "options": [
              "A professional grade",
              "Elapsed app practice time, not musical proficiency",
              "Correct technique"
            ],
            "answer": 1,
            "explanation": "The application does not observe most physical or musical aspects of performance."
          }
        ],
        "easier": "Use one criterion and a very short take.",
        "harder": "Ask an external listener to evaluate the same criterion independently.",
        "mistake": "Changing the criterion after a weak take makes the result meaningless. Set it first.",
        "transfer": "Bring specific questions and evidence to a lesson instead of saying only “it felt bad.”"
      },
      {
        "id": "retention",
        "title": "Return later and apply elsewhere",
        "skill": "review",
        "objective": "Check a learned task on a later day and transfer it to a similar passage.",
        "teaching": [
          "A task that works immediately after repeated practice may not be equally available later. Return on another day, attempt it before extended repetition, and note what remains dependable. The app’s review intervals are flexible organizational suggestions, not a proven universal schedule.",
          "Transfer means applying the same skill to suitable new material. Change one feature—such as phrase location, key or rhythmic context—only when that change fits your instrument and teacher guidance. A harder task is not automatically a better test."
        ],
        "example": {
          "caption": "Worked example · Return later and apply elsewhere",
          "text": "Day A: focused practice and self-check.\nLater day: short fresh attempt → identify retained skill → repair if needed.\nTransfer: a comparable teacher-approved passage."
        },
        "tasks": [
          {
            "id": "isolate",
            "title": "Isolate: Return later and apply elsewhere",
            "instructions": "Attempt a previously practiced short task before extensively repeating it. Record the specific feature that remained or failed.",
            "protocol": {
              "kind": "repetitions",
              "task": "Later-day recall of an appropriate learned task",
              "target": 8
            },
            "weight": 2
          },
          {
            "id": "apply",
            "title": "Apply: Return later and apply elsewhere",
            "instructions": "Apply the same skill to a comparable passage or context. Keep the new material safe and appropriate to your instrument.",
            "protocol": {
              "kind": "repertoire",
              "focus": "Apply the same skill to a comparable passage or context. Keep the new material safe and appropriate to your instrument.",
              "measures": "8 bars",
              "hands": "not-applicable"
            },
            "weight": 3
          }
        ],
        "checks": [
          "I distinguished a later review from immediate repetition.",
          "I described what was retained or needed repair.",
          "My transfer task changed a relevant feature without inventing unsafe technique."
        ],
        "questions": [
          {
            "prompt": "Are the app’s review intervals a universal scientifically validated music schedule?",
            "options": [
              "No; they are adjustable organizational suggestions",
              "Yes, identical for every skill and person",
              "Only when all checkboxes are selected"
            ],
            "answer": 0,
            "explanation": "Music-learning evidence varies by task and study design; the product schedule is a heuristic."
          }
        ],
        "easier": "Review the original task only, without a new context.",
        "harder": "Compare two related tasks in a short alternating practice session.",
        "mistake": "Confusing familiarity with retention can inflate self-ratings. Begin with a fresh attempt.",
        "transfer": "Build a sustainable teacher-informed practice habit rather than accumulating unchecked exercise titles."
      }
    ]
  }
];
