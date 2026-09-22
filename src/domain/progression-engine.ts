import type { Data, Exercise, ExerciseProgression, PracticeBlock, ProgressionDimension, RoutineBlock, Subdivision, TimingClickConfig } from './models.js';
import { DEFAULT_TIMING_CLICK } from './models.js';
import { exerciseBpm, exerciseProtocol, protocolPulse } from './protocols.js';
import { practiceTargetKey, type LimitationTag, type MasteryState, type PracticeState } from './practice-state.js';

export const PROGRESSION_ENGINE_VERSION = 1 as const;

export interface ProgressionOptions {
  seconds?: number;
  strictDuration?: boolean;
  allowAdvance?: boolean;
}

const DIMENSIONS:ProgressionDimension[]=['tempo','duration','subdivision','click-density','gap-click','dynamics','orchestration','memory','musical-context'];

function finishedExerciseBlocks(data:Data,exerciseId:string):PracticeBlock[] {
  return data.sessions
    .filter(session=>session.status!=='active')
    .flatMap(session=>session.blocks.filter(block=>block.sourceExerciseId===exerciseId&&(block.evaluation||block.completed)))
    .sort((a,b)=>(a.endedAt??a.startedAt??'').localeCompare(b.endedAt??b.startedAt??'')||a.id.localeCompare(b.id));
}

function stateFor(data:Data,exercise:Exercise):PracticeState|undefined {
  const key=practiceTargetKey({kind:'exercise',exerciseId:exercise.id});
  return data.practiceStates?.find(state=>state.targetKey===key);
}

function latestByDimension(blocks:PracticeBlock[],dimension:ProgressionDimension):ExerciseProgression|undefined {
  return [...blocks].reverse().find(block=>block.progressionSnapshot?.dimension===dimension)?.progressionSnapshot;
}

function latestProgression(blocks:PracticeBlock[]):ExerciseProgression|undefined {
  return [...blocks].reverse().find(block=>block.progressionSnapshot)?.progressionSnapshot;
}

function latestBlock(blocks:PracticeBlock[]):PracticeBlock|undefined{return blocks.at(-1);}

function levelFor(blocks:PracticeBlock[],dimension:ProgressionDimension):0|1|2|3 {
  const explicit=latestByDimension(blocks,dimension)?.level;
  if(explicit!==undefined)return explicit;
  if(dimension==='click-density'){
    const timing=[...blocks].reverse().find(block=>block.timingClickSnapshot?.mode!=='gap')?.timingClickSnapshot;
    if(!timing||timing.mode==='standard')return 0;
    if(timing.mode==='one-per-bar')return 3;
    if(timing.mode==='sparse'&&timing.sparseEvery>=3)return 2;
    return 1;
  }
  if(dimension==='gap-click'){
    const timing=[...blocks].reverse().find(block=>block.timingClickSnapshot?.mode==='gap')?.timingClickSnapshot;
    if(!timing||timing.mode!=='gap')return 0;
    if(timing.gapClickBars<=1&&timing.gapSilentBars>=3)return 3;
    if(timing.gapClickBars<=2&&timing.gapSilentBars>=2)return 2;
    return 1;
  }
  return 0;
}

function usedCount(blocks:PracticeBlock[],dimension:ProgressionDimension):number {
  return blocks.filter(block=>block.progressionSnapshot?.dimension===dimension).length;
}

function round15(value:number):number{return Math.max(15,Math.round(value/15)*15);}
function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}

function profileFamily(data:Data,exercise:Exercise):string {
  return data.profiles?.find(profile=>profile.id===exercise.profileId)?.family??(exercise.instrument.toLowerCase().includes('drum')?'percussion':'general');
}

function eligibleDimensions(data:Data,exercise:Exercise,state:PracticeState|undefined,options:ProgressionOptions):ProgressionDimension[] {
  const protocol=exerciseProtocol(exercise),pulse=protocolPulse(protocol),out:ProgressionDimension[]=[];
  if(pulse)out.push('tempo','click-density','gap-click');
  if(pulse?.subdivision&&pulse.subdivision>1)out.push('subdivision');
  if(!options.strictDuration)out.push('duration');
  const nonListening=!['fretboard','pitch-match','vocal-pattern','sight-reading'].includes(protocol.kind);
  if(nonListening&&profileFamily(data,exercise)!=='voice')out.push('dynamics');
  if(profileFamily(data,exercise)==='percussion'&&(protocol.kind==='tempo'||!!exercise.sticking))out.push('orchestration');
  if(!['sight-reading','fretboard','pitch-match','vocal-pattern'].includes(protocol.kind))out.push('memory');
  if(['apply','maintain'].includes(state?.mastery??'')||exercise.category==='groove'||exercise.skillArea==='repertoire')out.push('musical-context');
  return [...new Set(out)];
}

function dimensionOrder(mastery:MasteryState|undefined):ProgressionDimension[] {
  if(mastery==='apply'||mastery==='maintain')return ['musical-context','memory','dynamics','orchestration','gap-click','click-density','tempo','duration','subdivision'];
  if(mastery==='retest')return ['click-density','gap-click','memory','tempo','dynamics','duration','subdivision','orchestration','musical-context'];
  return ['tempo','duration','dynamics','click-density','subdivision','memory','gap-click','orchestration','musical-context'];
}

function limitationDimension(limitations:LimitationTag[],eligible:Set<ProgressionDimension>):ProgressionDimension|undefined {
  const map:Partial<Record<LimitationTag,ProgressionDimension[]>>={
    'too-fast':['tempo'],
    endurance:['duration','tempo'],
    timing:['click-density','gap-click','tempo'],
    dynamics:['dynamics'],
    sound:['dynamics'],
    coordination:['orchestration','tempo'],
    memory:['memory'],
    tension:['tempo','duration'],
    form:['musical-context','memory'],
    accuracy:['tempo'],
  };
  for(const limitation of limitations)for(const dimension of map[limitation]??[])if(eligible.has(dimension))return dimension;
  return undefined;
}

function timingForClickDensity(level:number,beats:number):TimingClickConfig {
  if(level<=0)return structuredClone(DEFAULT_TIMING_CLICK);
  if(level===1&&beats===4)return {mode:'two-four',sparseEvery:2,gapClickBars:3,gapSilentBars:1};
  if(level===1)return {mode:'sparse',sparseEvery:2,gapClickBars:3,gapSilentBars:1};
  if(level===2)return {mode:'sparse',sparseEvery:3,gapClickBars:3,gapSilentBars:1};
  return {mode:'one-per-bar',sparseEvery:3,gapClickBars:3,gapSilentBars:1};
}

function timingForGap(level:number):TimingClickConfig {
  if(level<=0)return structuredClone(DEFAULT_TIMING_CLICK);
  if(level===1)return {mode:'gap',sparseEvery:2,gapClickBars:3,gapSilentBars:1};
  if(level===2)return {mode:'gap',sparseEvery:2,gapClickBars:2,gapSilentBars:2};
  return {mode:'gap',sparseEvery:2,gapClickBars:1,gapSilentBars:3};
}

function subdivisionAt(authored:Subdivision,level:number):Subdivision {
  const ladder:Subdivision[]=authored===4?[4,2,1]:authored===3?[3,1]:authored===2?[2,1]:[1];
  return ladder[Math.min(level,ladder.length-1)]!;
}

function softCue(dimension:ProgressionDimension,level:number):{summary:string;cue:string} {
  const l=Math.max(0,Math.min(3,level));
  if(dimension==='dynamics'){
    const rows=[
      ['Normal dynamics','Use the exercise’s normal dynamic level and keep tone even.'],
      ['Quiet control','Play deliberately quieter without losing timing, clarity, or relaxed movement.'],
      ['Dynamic contrast','Alternate clearly quiet and medium/strong rounds while keeping the pulse unchanged.'],
      ['Dynamic shape','Shape a controlled rise and fall in volume without changing tempo or technique.'],
    ] as const;const row=rows[l]!;return {summary:row[0],cue:row[1]};
  }
  if(dimension==='orchestration'){
    const rows=[
      ['Original orchestration','Use the exercise’s original surfaces and limb assignment.'],
      ['One orchestration change','Move one accent, voice, or limb role to another comfortable surface while preserving the original pattern.'],
      ['Two-surface orchestration','Distribute the pattern across two contrasting surfaces while preserving sticking and spacing.'],
      ['Full-kit application','Orchestrate the pattern musically around the kit without changing its underlying sticking or pulse.'],
    ] as const;const row=rows[l]!;return {summary:row[0],cue:row[1]};
  }
  if(dimension==='memory'){
    const rows=[
      ['Full cues','Use the written pattern and practice cues normally.'],
      ['Partial memory','Read the cue once, then play one complete round without looking before checking it.'],
      ['From memory','Play complete rounds from memory and check the source only between rounds.'],
      ['Memory under variation','Start from a different point or after a short pause, then complete the pattern from memory before checking.'],
    ] as const;const row=rows[l]!;return {summary:row[0],cue:row[1]};
  }
  const rows=[
    ['Isolated exercise','Practice the exercise by itself with its normal cue.'],
    ['Short phrase application','Place the exercise inside a simple four-bar musical phrase without changing its core technique.'],
    ['Exercise ↔ phrase','Alternate one controlled exercise round with one short musical application.'],
    ['Repertoire transfer','Use the skill inside a familiar groove, phrase, or song context and preserve the same technical standard.'],
  ] as const;const row=rows[l]!;return {summary:row[0],cue:row[1]};
}

function baseline(exercise:Exercise,state:PracticeState|undefined,blocks:PracticeBlock[],direction:'hold'|'reduce'='hold'):ExerciseProgression {
  const authored=exerciseBpm(exercise),last=latestBlock(blocks),known=state?.tempo?.working??last?.finalBpm??last?.initialBpm??authored;
  if(direction==='reduce'&&known!==undefined){
    const min=exercise.minBpm??20,step=Math.max(2,Math.round(known*.05)),bpm=clamp(known-step,min,300);
    return {engineVersion:1,direction:'reduce',dimension:'tempo',level:0,summary:'Recovery · '+bpm+' BPM',cue:'Reduce the tempo and recover clean, relaxed control before adding difficulty again.',bpm};
  }
  return {
    engineVersion:1,direction:'hold',dimension:'baseline',level:0,
    summary:known!==undefined?'Hold · '+known+' BPM':'Establish a baseline',
    cue:state?.evidenceCount?'Repeat known conditions and confirm the result before changing another difficulty dimension.':'Establish a comfortable, repeatable baseline before increasing difficulty.',
    ...(known!==undefined?{bpm:known}:{}),
  };
}

function buildDimension(exercise:Exercise,state:PracticeState|undefined,blocks:PracticeBlock[],dimension:ProgressionDimension,level:0|1|2|3,direction:'reduce'|'advance',options:ProgressionOptions):ExerciseProgression {
  const protocol=exerciseProtocol(exercise),pulse=protocolPulse(protocol),last=latestBlock(blocks);
  if(dimension==='tempo'){
    const current=state?.tempo?.working??last?.finalBpm??last?.initialBpm??exerciseBpm(exercise)??80;
    const min=exercise.minBpm??20,max=exercise.maxBpm??exercise.targetBpm??300,step=Math.max(2,Math.round(current*.04));
    const bpm=direction==='advance'?clamp(current+step,min,max):clamp(current-step,min,max);
    return {engineVersion:1,direction,dimension,level,summary:(direction==='advance'?'Tempo step':'Tempo reset')+' · '+bpm+' BPM',cue:direction==='advance'?'Raise only the tempo. Keep the same pattern, click difficulty, dynamics, and orchestration.':'Lower only the tempo until control is repeatable again.',bpm};
  }
  if(dimension==='duration'){
    const current=options.seconds??last?.targetSeconds??exercise.defaultSeconds??300;
    const targetSeconds=direction==='advance'?Math.min(1800,round15(current*1.2)):Math.max(60,round15(current*.75));
    const minutes=Math.round(targetSeconds/60*10)/10;
    return {engineVersion:1,direction,dimension,level,summary:(direction==='advance'?'Longer set':'Shorter set')+' · '+minutes+' min',cue:direction==='advance'?'Keep all other conditions unchanged and extend only the continuous controlled duration.':'Shorten the set and rebuild endurance without changing the other conditions.',targetSeconds};
  }
  if(dimension==='subdivision'){
    const authored=pulse?.subdivision??1,target=subdivisionAt(authored,level);
    return {engineVersion:1,direction,dimension,level,summary:target===1?'Beat-only click support':'Click subdivision · '+target+'×',cue:'Keep the played pattern unchanged; only reduce the metronome subdivision support and maintain the internal subdivision.',subdivision:target};
  }
  if(dimension==='click-density'){
    const timing=timingForClickDensity(level,pulse?.beats??4);
    const summary=timing.mode==='two-four'?'Click on 2 & 4':timing.mode==='sparse'?'Sparse click · every '+timing.sparseEvery+' beats':timing.mode==='one-per-bar'?'One click per bar':'Standard click';
    return {engineVersion:1,direction,dimension,level,summary,cue:'Keep tempo and exercise material unchanged. Let the reduced click information test your internal pulse.',timingClick:timing};
  }
  if(dimension==='gap-click'){
    const timing=timingForGap(level),summary=timing.mode==='gap'?'Gap click · '+timing.gapClickBars+' on / '+timing.gapSilentBars+' silent':'Standard click';
    return {engineVersion:1,direction,dimension,level,summary,cue:'Keep playing through the silent bars and meet the returning click without correcting by watching the screen.',timingClick:timing};
  }
  const soft=softCue(dimension,level);
  return {engineVersion:1,direction,dimension,level,summary:soft.summary,cue:soft.cue};
}

function canAdvanceDimension(exercise:Exercise,state:PracticeState|undefined,blocks:PracticeBlock[],dimension:ProgressionDimension):boolean {
  const level=levelFor(blocks,dimension);
  if(['click-density','gap-click','dynamics','orchestration','memory','musical-context'].includes(dimension)&&level>=3)return false;
  if(dimension==='subdivision'){
    const authored=protocolPulse(exerciseProtocol(exercise))?.subdivision??1;
    return subdivisionAt(authored,level)!==1;
  }
  if(dimension==='tempo'){
    const current=state?.tempo?.working??latestBlock(blocks)?.finalBpm??exerciseBpm(exercise);
    const max=exercise.maxBpm??exercise.targetBpm??300;
    return current===undefined||current<max;
  }
  if(dimension==='duration'){
    const current=latestBlock(blocks)?.targetSeconds??exercise.defaultSeconds??300;
    return current<1800;
  }
  return true;
}

function chooseAdvanceDimension(exercise:Exercise,state:PracticeState|undefined,blocks:PracticeBlock[],eligible:ProgressionDimension[]):ProgressionDimension|undefined {
  const allowed=new Set(eligible),order=dimensionOrder(state?.mastery).filter(d=>allowed.has(d)&&canAdvanceDimension(exercise,state,blocks,d));
  if(!order.length)return undefined;
  const index=new Map(order.map((dimension,i)=>[dimension,i]));
  return [...order].sort((a,b)=>levelFor(blocks,a)-levelFor(blocks,b)||usedCount(blocks,a)-usedCount(blocks,b)||(index.get(a)??0)-(index.get(b)??0))[0];
}

export function buildExerciseProgression(data:Data,exercise:Exercise,options:ProgressionOptions={}):ExerciseProgression {
  const state=stateFor(data,exercise),blocks=finishedExerciseBlocks(data,exercise.id),latest=latestProgression(blocks);
  const eligible=eligibleDimensions(data,exercise,state,options),allowed=new Set(eligible);
  let direction=state?.challenge??'hold';
  if(direction==='advance'&&options.allowAdvance===false)direction='hold';

  if(direction==='hold'){
    if(latest&&allowed.has(latest.dimension)&&!(options.strictDuration&&latest.dimension==='duration'))return {...structuredClone(latest),direction:'hold'};
    return baseline(exercise,state,blocks);
  }

  if(direction==='reduce'){
    if(latest&&allowed.has(latest.dimension)&&latest.level>0){
      const level=Math.max(0,latest.level-1) as 0|1|2|3;
      return buildDimension(exercise,state,blocks,latest.dimension,level,'reduce',options);
    }
    const dimension=limitationDimension(state?.limitations??[],allowed);
    if(dimension)return buildDimension(exercise,state,blocks,dimension,0,'reduce',options);
    return baseline(exercise,state,blocks,'reduce');
  }

  if(!state||['discover','learn','unassessed'].includes(state.mastery))return baseline(exercise,state,blocks);
  const dimension=chooseAdvanceDimension(exercise,state,blocks,eligible);
  if(!dimension)return baseline(exercise,state,blocks);
  const nextLevel=Math.min(3,levelFor(blocks,dimension)+1) as 0|1|2|3;
  return buildDimension(exercise,state,blocks,dimension,nextLevel,'advance',options);
}

export function applyExerciseProgression(block:RoutineBlock,progression:ExerciseProgression):RoutineBlock {
  return {
    ...structuredClone(block),
    progression:structuredClone(progression),
    ...(progression.bpm!==undefined?{bpm:progression.bpm}:{}),
    ...(progression.targetSeconds!==undefined?{targetSeconds:progression.targetSeconds}:{}),
  };
}

export function progressionDimensions():ProgressionDimension[]{return [...DIMENSIONS];}
