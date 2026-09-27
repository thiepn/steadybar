import { activeProfile } from '../domain/profiles.js';
import { el } from '../ui/dom.js';
import { icon, type IconName } from '../ui/icons.js';
import { empty, link, pageHeader, sectionHeader } from '../ui/components.js';
import type { Page } from '../app/navigation.js';
import { store } from '../app/store.js';

interface DrumTool {
  href:string;name:string;description:string;icon:IconName;meta:string;
}
interface DrumToolGroup {title:string;description:string;tools:DrumTool[]}

const groups:DrumToolGroup[]=[
  {
    title:'Technique & coordination',
    description:'Build repeatable movement and musical phrases before adding more speed.',
    tools:[
      {href:'/rudiments',name:'Rudiment Lab',description:'Sticking, lead direction, accents, orchestration and integrated tempo trainers.',icon:'routine',meta:'Hands · control · speed'},
      {href:'/drum-grid',name:'Grid Lab',description:'Editable four-limb coordination patterns with deterministic variations and click preview.',icon:'routine',meta:'Coordination · independence'},
      {href:'/phrases',name:'Phrase Lab',description:'Practice groove → fill → return as one phrase, including the landing after the fill.',icon:'routine',meta:'Groove · fills · landing'},
    ],
  },
  {
    title:'Time & feel',
    description:'Work on pulse placement and rhythmic relationships without turning them into one universal “correct” feel.',
    tools:[
      {href:'/timing-lab',name:'Timing Lab',description:'Microphone onset diagnostics against the shared audio-time grid.',icon:'pulse',meta:'Precision · spread · drift'},
      {href:'/pocket',name:'Pocket Lab',description:'Practice a chosen centered, ahead or behind placement target and repeat it consistently.',icon:'pulse',meta:'Placement · consistency'},
      {href:'/rhythm',name:'Rhythm Lab',description:'Swing, subdivision switching, polyrhythms and additive odd-meter grouping.',icon:'pulse',meta:'Swing · polyrhythm · odd meter'},
    ],
  },
  {
    title:'Touch & evidence',
    description:'Make dynamics explicit and use electronic-kit evidence when the hardware can measure it honestly.',
    tools:[
      {href:'/dynamics',name:'Dynamics Lab',description:'Author relative soft / medium / strong touch targets across kit surfaces.',icon:'routine',meta:'Ghost notes · accents · balance'},
      {href:'/midi-lab',name:'MIDI Lab',description:'Analyze mapped electronic-kit timing, authored Grid/Phrase accuracy and device-relative velocity.',icon:'pulse',meta:'E-kit · timing · velocity'},
    ],
  },
];

function toolCard(tool:DrumTool):HTMLElement{
  return el('a',{href:'#'+tool.href,class:'drum-hub-card','aria-label':tool.name},
    el('span',{class:'drum-hub-icon'},icon(tool.icon)),
    el('div',{class:'drum-hub-copy'},el('strong',{},tool.name),el('p',{},tool.description),el('span',{class:'muted small'},tool.meta)),
    el('span',{class:'drum-hub-open','aria-hidden':'true'},'Open'));
}

export function drumToolsPage():Page{
  const profile=activeProfile(store.snapshot());
  if(profile.instrumentType!=='drums')return {node:el('div',{class:'page drum-tools-page'},
    pageHeader('Specialist practice','Drum Tools','Focused drum workstations stay grouped here instead of filling the global navigation.'),
    empty('Switch to a drum profile','These tools use drum-specific limb, surface, sticking and MIDI assumptions.',link('Manage practice profiles','/profiles','button primary','settings')))};

  const page=el('div',{class:'page drum-tools-page'},
    pageHeader('Drum practice','Drum Tools','Choose the musical problem first. Every tool feeds the same Today, Focus Player, history and evidence system.',[
      link('Practice','/practice','button secondary','play'),
      link('Metronome','/metronome','button secondary','pulse'),
    ]));

  for(const group of groups){
    page.append(el('section',{class:'panel drum-hub-section'},
      sectionHeader(group.title,group.description),
      el('div',{class:'drum-hub-grid'},...group.tools.map(toolCard))));
  }
  page.append(el('p',{class:'muted small drum-hub-footnote'},'Tools stay separate only where the practice problem is genuinely different. Saved exercises and sessions still use Steadybar’s shared planning, history, progression and evidence model.'));
  return {node:page};
}
