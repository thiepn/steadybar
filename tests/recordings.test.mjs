import test from 'node:test';
import assert from 'node:assert/strict';
import {seedData} from '../dist/app/db/seed.js';
import {migratePracticeData} from '../dist/app/db/profile-migration.js';
import {migratePracticeModel} from '../dist/app/db/practice-model-migration.js';
import {activeProfile} from '../dist/app/domain/profiles.js';
import {createBackup} from '../dist/app/db/backup.js';
import {validateData,validatePracticeRecording} from '../dist/app/domain/validation.js';

const at='2026-09-23T08:00:00.000Z';
function modern(){
  const data=migratePracticeModel(migratePracticeData(seedData(at)));
  data.trainingPlans=[];data.weeklySchedules=[];data.recordings=[];return data;
}
function recording(data,overrides={}){
  const profile=activeProfile(data),exercise=data.exercises.find(row=>row.profileId===profile.id);
  assert.ok(exercise);
  return {
    id:'recording-1',createdAt:at,updatedAt:at,recordingVersion:1,profileId:profile.id,assetId:'asset-1',
    title:exercise.name,durationSeconds:12.5,mimeType:'audio/webm;codecs=opus',sizeBytes:4096,
    sourceType:'exercise',sourceExerciseId:exercise.id,bpm:100,attemptNumber:1,
    note:'',tags:[],markedBest:false,milestone:false,favorite:false,...overrides,
  };
}

test('practice recording metadata validates and belongs to a profile without embedding audio',()=>{
  const data=modern(),row=recording(data);
  assert.deepEqual(validatePracticeRecording(row),row);
  data.recordings=[row];
  assert.doesNotThrow(()=>validateData(data));
  assert.equal('blob' in row,false);
});

test('exercise recording metadata requires its source exercise snapshot reference',()=>{
  const data=modern(),row=recording(data,{sourceExerciseId:undefined});
  assert.throws(()=>validatePracticeRecording(row),/exercise recordings need an exercise reference/i);
});

test('recording asset IDs are unique across the workspace',()=>{
  const data=modern(),first=recording(data),second=recording(data,{id:'recording-2',attemptNumber:2});
  data.recordings=[first,second];
  assert.throws(()=>validateData(data),/audio asset IDs must be unique/i);
});

test('modern backups include recording metadata without changing backup envelope version',()=>{
  const data=modern(),row=recording(data);
  data.recordings=[row];
  const backup=createBackup(data,at);
  assert.equal(backup.version,4);
  assert.equal(backup.data.recordings.length,1);
  assert.equal(backup.data.recordings[0].assetId,'asset-1');
  assert.equal('blob' in backup.data.recordings[0],false);
});
