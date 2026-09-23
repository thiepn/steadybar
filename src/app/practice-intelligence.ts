import type { Data, RoutineBlock } from '../domain/models.js';
import { PRACTICE_INTELLIGENCE_ENGINE_VERSION, type IntelligenceAction, type PracticeRecommendation } from '../domain/practice-intelligence.js';
import type { PracticeIntent, PracticePrescription } from '../domain/practice-state.js';
import { applyExerciseProgression } from '../domain/progression-engine.js';
import { exerciseBpm } from '../domain/protocols.js';
import { uuid } from '../domain/utils.js';

const recommendationIntent:Record<IntelligenceAction,PracticeIntent>={
  repair:'build',retest:'retest',stabilize:'stabilize',apply:'apply',maintain:'maintain',explore:'learn',
};
function recommendationPrescription(row:PracticeRecommendation):PracticePrescription{
  return {
    target:structuredClone(row.target),
    intent:recommendationIntent[row.action],
    reasons:['user-request'],
    generatedBy:'manual',
    engineVersion:PRACTICE_INTELLIGENCE_ENGINE_VERSION,
  };
}

export function recommendationHref(row:PracticeRecommendation):string|undefined{
  const target=row.target;
  switch(target.kind){
    case 'exercise':return '/library/'+target.exerciseId;
    case 'song':
    case 'song-section':
    case 'song-transition':return target.partId?'/songs/'+target.songId+'/parts/'+target.partId:'/songs/'+target.songId;
    case 'lesson':return '/courses/'+target.courseId+'/'+target.lessonId+'/'+target.profileId;
    case 'skill':return undefined;
  }
}

export function recommendationBlock(data:Data,row:PracticeRecommendation):RoutineBlock|undefined{
  const target=row.target;
  if(target.kind==='exercise'){
    const exercise=data.exercises.find(item=>item.id===target.exerciseId);if(!exercise)return undefined;
    const base:RoutineBlock={
      id:uuid(),type:'exercise',exerciseId:exercise.id,profileId:exercise.profileId,title:exercise.name,
      targetSeconds:exercise.defaultSeconds??600,bpm:exerciseBpm(exercise),notes:'',prescription:recommendationPrescription(row),order:0,
    };
    return row.progression?applyExerciseProgression(base,row.progression):base;
  }
  if(target.kind==='song'||target.kind==='song-section'||target.kind==='song-transition'){
    const song=data.songs.find(item=>item.id===target.songId);if(!song)return undefined;
    const part=target.partId?song.parts?.find(item=>item.id===target.partId):undefined,sections=part?.sections??song.sections;
    const make=(sectionId:string|undefined,seconds:number,title:string,notes=''):RoutineBlock=>{
      const section=sections.find(item=>item.id===sectionId);
      return {id:uuid(),type:section?'song-section':'song',profileId:part?.profileId??row.profileId,songPartId:part?.id,songId:song.id,songSectionId:section?.id,title,targetSeconds:seconds,bpm:section?.bpmOverride||song.bpm,notes,prescription:recommendationPrescription(row),order:0};
    };
    if(target.kind==='song')return make(undefined,600,song.title);
    if(target.kind==='song-section'){
      const section=sections.find(item=>item.id===target.sectionId);if(!section)return undefined;
      return make(section.id,600,song.title+' · '+section.name);
    }
    const transitions=part?.transitions??song.transitions??[],transition=transitions.find(item=>item.id===target.transitionId);
    if(!transition)return undefined;
    const from=sections.find(item=>item.id===transition.fromSectionId),to=sections.find(item=>item.id===transition.toSectionId);
    if(!from)return undefined;
    const title=song.title+' · '+(transition.name||(from.name+' → '+(to?.name??'next section')));
    const notes=[transition.notes,'Practice the transition from '+from.name+' into '+(to?.name??'the next section')+'.'].filter(Boolean).join('\n');
    return make(from.id,300,title,notes);
  }
  return undefined;
}
