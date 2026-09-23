import type { Data, RoutineBlock } from '../domain/models.js';
import type { PracticeRecommendation } from '../domain/practice-intelligence.js';
import { applyExerciseProgression } from '../domain/progression-engine.js';
import { exerciseBlock, songBlock } from '../practice/launch.js';

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
    const base=exerciseBlock(exercise);
    return row.progression?applyExerciseProgression(base,row.progression):base;
  }
  if(target.kind==='song'||target.kind==='song-section'||target.kind==='song-transition'){
    const song=data.songs.find(item=>item.id===target.songId);if(!song)return undefined;
    if(target.kind==='song')return songBlock(song,undefined,600,target.partId??'shared');
    if(target.kind==='song-section')return songBlock(song,target.sectionId,600,target.partId??'shared');
    const part=target.partId?song.parts?.find(item=>item.id===target.partId):undefined;
    const transitions=part?.transitions??song.transitions??[],transition=transitions.find(item=>item.id===target.transitionId);
    if(!transition)return undefined;
    const sections=part?.sections??song.sections,from=sections.find(item=>item.id===transition.fromSectionId),to=sections.find(item=>item.id===transition.toSectionId);
    if(!from)return undefined;
    const block=songBlock(song,from.id,300,target.partId??'shared');
    block.title=song.title+' · '+(transition.name||(from.name+' → '+(to?.name??'next section')));
    block.notes=[transition.notes,'Practice the transition from '+from.name+' into '+(to?.name??'the next section')+'.'].filter(Boolean).join('\n');
    return block;
  }
  return undefined;
}
