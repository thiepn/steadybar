from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def repl(path,old,new,count=1):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=count: raise SystemExit(f'{path}: expected {count} match(es), found {n}')
    p.write_text(s.replace(old,new,count))

def before(path,marker,text): repl(path,marker,text+marker)

# Shared monotonic entity timestamp helper. Workspace-level mutations bypass
# AppStore.save(), so they must explicitly advance nested entity metadata.
repl('src/domain/utils.ts',
"export const nowISO = (): string => new Date().toISOString();\n",
"export const nowISO = (): string => new Date().toISOString();\nexport const advanceISO = (previous:string,now=Date.now()):string => new Date(Math.max(now,Date.parse(previous)+1)).toISOString();\n")

# Starter-plan rebuild already advances metadata; use the shared contract.
repl('src/app/profiles.ts',
"import { freshBlocks, localDate, metadata, nowISO } from '../domain/utils.js';",
"import { advanceISO, freshBlocks, localDate, metadata, nowISO } from '../domain/utils.js';")
repl('src/app/profiles.ts',
"const updatedAt=new Date(Math.max(Date.now(),Date.parse(base.updatedAt)+1)).toISOString();",
"const updatedAt=advanceISO(base.updatedAt);")

# Onboarding may run over an existing/migrated workspace. Never select the
# protected historical attribution bucket as the new active custom profile, and
# keep profile metadata truthful when onboarding changes or retires profiles.
repl('src/app/onboarding.ts',
"import { localDate, metadata } from '../domain/utils.js';",
"import { advanceISO, localDate, metadata } from '../domain/utils.js';")
repl('src/app/onboarding.ts',
"import { definition, PROFILE_DEFINITIONS, FAMILIES, skillLabel, profiles } from '../domain/profiles.js';",
"import { definition, PROFILE_DEFINITIONS, FAMILIES, isPracticeProfile, skillLabel, profiles } from '../domain/profiles.js';")
repl('src/app/onboarding.ts',
"let next=data,p=profiles(data).find(p=>p.instrumentType===type&&!p.archived);",
"let next=data,p=profiles(data).find(p=>p.instrumentType===type&&isPracticeProfile(p));")
repl('src/app/onboarding.ts',
"p={...p,level:level.querySelector('select')!.value as Experience,focusAreas:[aim],defaultSessionMinutes:minutes};",
"p={...p,level:level.querySelector('select')!.value as Experience,focusAreas:[aim],defaultSessionMinutes:minutes,updatedAt:advanceISO(p.updatedAt)};")
repl('src/app/onboarding.ts',
"next.profiles=profiles(next).map(item=>item.id===p!.id?p!:pristine?{...item,archived:true}:item);",
"next.profiles=profiles(next).map(item=>item.id===p!.id?p!:pristine&&!item.archived?{...item,archived:true,updatedAt:advanceISO(item.updatedAt)}:item);")

# Source section edits can rewrite future plans/routines. Update canonical labels
# and parent metadata without touching custom titles or historical session snapshots.
repl('src/app/song-parts.ts',
"import type { Song, SongSection } from '../domain/models.js';",
"import type { Data, Song, SongSection } from '../domain/models.js';")
repl('src/app/song-parts.ts',
"import { store } from './store.js';",
"import { store } from './store.js';\nimport { advanceISO } from '../domain/utils.js';")
before('src/app/song-parts.ts',
"export async function saveSongPart(songId: string, part: SongPart): Promise<void> {",
"""export function syncSongTitleReferences(data:Data,songId:string,previousTitle:string):void {
  const song=data.songs.find(s=>s.id===songId);if(!song)return;
  for(const collection of [data.routines,data.dailyPlans])for(const plan of collection){
    let changed=false;
    for(const block of plan.blocks){
      if(block.songId!==songId)continue;
      const part=block.songPartId?song.parts?.find(p=>p.id===block.songPartId):undefined;
      const section=block.songSectionId?(part?.sections??song.sections).find(s=>s.id===block.songSectionId):undefined;
      const before=section?`${previousTitle} · ${section.name}`:previousTitle,next=section?`${song.title} · ${section.name}`:song.title;
      if(block.title===before&&block.title!==next){block.title=next;changed=true;}
    }
    if(changed)plan.updatedAt=advanceISO(plan.updatedAt);
  }
}
""")
repl('src/app/song-parts.ts',
"song.updatedAt = new Date().toISOString();",
"song.updatedAt = advanceISO(song.updatedAt);",count=2)
repl('src/app/song-parts.ts',
"""    const owner = part ?? song;
    const before = owner.sections;
    owner.sections = change(before).map((section, order) => ({ ...section, order }));
    const removed = before.filter(section => !owner.sections.some(s => s.id === section.id));
    // Future plan references must not become orphaned. Historic snapshots are independent.
    for (const section of removed) for (const collection of [data.routines, data.dailyPlans]) {
      for (const plan of collection) for (const block of plan.blocks) {
        if (block.songId === songId && block.songSectionId === section.id && block.songPartId === partId) {
          block.type = 'song'; block.songSectionId = undefined;
          block.notes = [block.notes, `Earlier section: ${section.name}. ${section.notes}`].filter(Boolean).join('\n');
        }
      }
    }
""",
"""    const owner = part ?? song;
    const before = structuredClone(owner.sections);
    owner.sections = change(structuredClone(before)).map((section, order) => ({ ...section, order }));
    const oldSections=new Map(before.map(section=>[section.id,section])),newSections=new Map(owner.sections.map(section=>[section.id,section]));
    // Future plan references must not become orphaned. Historic snapshots are independent.
    for (const collection of [data.routines, data.dailyPlans]) for (const plan of collection) {
      let changed=false;
      for (const block of plan.blocks) {
        if (block.songId !== songId || block.songPartId !== partId || !block.songSectionId) continue;
        const old=oldSections.get(block.songSectionId),current=newSections.get(block.songSectionId);if(!old)continue;
        const canonical=`${song.title} · ${old.name}`;
        if(!current){
          if(block.title===canonical)block.title=song.title;
          block.type='song';block.songSectionId=undefined;
          block.notes=[block.notes,`Earlier section: ${old.name}. ${old.notes}`].filter(Boolean).join('\n');changed=true;
        }else if(old.name!==current.name&&block.title===canonical){block.title=`${song.title} · ${current.name}`;changed=true;}
      }
      if(changed)plan.updatedAt=advanceISO(plan.updatedAt);
    }
""")

# Exercise editing is transactional because it may repair future references. That
# path must stamp the exercise and any changed parent rows, and canonical future
# labels should follow a source rename.
repl('src/ui/editors.ts',
"import { changeSongSections } from '../app/song-parts.js';",
"import { changeSongSections, syncSongTitleReferences } from '../app/song-parts.js';")
repl('src/ui/editors.ts',
"import { freshBlocks, metadata, nowISO, uuid } from '../domain/utils.js';",
"import { advanceISO, freshBlocks, metadata, nowISO, uuid } from '../domain/utils.js';")
repl('src/ui/editors.ts',
"""    const saved=validateExercise({...e,name:formText(form,'name'),instrument:definition(profile.instrumentType).label,profileId:profile.id,skillArea:formText(form,'skillArea'),level:formText(form,'level') as Experience,defaultSeconds:Math.round(formNumber(form,'defaultMinutes')*60),protocol,
      description:formText(form,'description'),instructions:formText(form,'instructions'),tags:formText(form,'tags').split(',').map(t=>t.trim()).filter(Boolean),notes:formText(form,'notes'),
""",
"""    const saved=validateExercise({...e,updatedAt:advanceISO(e.updatedAt),name:formText(form,'name'),instrument:definition(profile.instrumentType).label,profileId:profile.id,skillArea:formText(form,'skillArea'),level:formText(form,'level') as Experience,defaultSeconds:Math.round(formNumber(form,'defaultMinutes')*60),protocol,
      description:formText(form,'description'),instructions:formText(form,'instructions'),tags:formText(form,'tags').split(',').map(t=>t.trim()).filter(Boolean),notes:formText(form,'notes'),
""")
repl('src/ui/editors.ts',
"""      data.exercises=data.exercises.some(e=>e.id===saved.id)?data.exercises.map(e=>e.id===saved.id?saved:e):[...data.exercises,saved];
      for(const plans of [data.routines,data.dailyPlans])for(const plan of plans)for(const block of plan.blocks)if(block.exerciseId===saved.id&&!block.protocol){
        if(!timing)block.bpm=undefined;
        if(protocol.kind!=='tempo')block.tempoTrainer=undefined;
      }
""",
"""      data.exercises=data.exercises.some(e=>e.id===saved.id)?data.exercises.map(e=>e.id===saved.id?saved:e):[...data.exercises,saved];
      for(const plans of [data.routines,data.dailyPlans])for(const plan of plans){
        let changed=false;
        for(const block of plan.blocks)if(block.exerciseId===saved.id){
          if(block.title===e.name&&block.title!==saved.name){block.title=saved.name;changed=true;}
          if(!block.protocol){
            if(!timing&&block.bpm!==undefined){block.bpm=undefined;changed=true;}
            if(protocol.kind!=='tempo'&&block.tempoTrainer!==undefined){block.tempoTrainer=undefined;changed=true;}
          }
        }
        if(changed)plan.updatedAt=advanceISO(plan.updatedAt);
      }
""")
repl('src/ui/editors.ts',
"""        const current=workspace.songs.find(item=>item.id===song.id);if(!current)throw new Error('This song no longer exists.');
        const merged=validateSong({...current,...changes,updatedAt:nowISO()});saved=merged;
        workspace.songs=workspace.songs.map(item=>item.id===song.id?merged:item);return workspace;
""",
"""        const current=workspace.songs.find(item=>item.id===song.id);if(!current)throw new Error('This song no longer exists.');
        const previousTitle=current.title,merged=validateSong({...current,...changes,updatedAt:advanceISO(current.updatedAt)});saved=merged;
        workspace.songs=workspace.songs.map(item=>item.id===song.id?merged:item);if(previousTitle!==merged.title)syncSongTitleReferences(workspace,song.id,previousTitle);return workspace;
""")

# Pure timestamp contract.
before('tests/core.test.mjs',
"test('UUIDs use secure v4 format and are unique across generated records',()=>{",
"""test('entity metadata advances monotonically even when the wall clock does not',()=>{
 const previous='2026-09-09T12:00:00.100Z';assert.equal(u.advanceISO(previous,Date.parse(previous)),'2026-09-09T12:00:00.101Z');assert.equal(u.advanceISO(previous,Date.parse(previous)-1000),'2026-09-09T12:00:00.101Z');
});
""")

# Native/rendered onboarding regression: a historical custom attribution bucket
# must never become the selected practice workspace.
before('tests/profiles.py',
"    def test_60_guitar_round_goals_and_progress(self):",
"""    def test_59_onboarding_skips_historical_custom_profiles_and_stamps_metadata(self):
        before=self.state()['profiles'][0]['updatedAt'];self.page.wait_for_timeout(2)
        self.read("load('app/store.js').store.workspace(d=>{const at=new Date().toISOString();d.profiles.push({id:'historical-custom-onboarding',name:'Earlier custom practice',instrumentType:'custom',family:'general',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:at,updatedAt:at,attribution:'unresolved-history'});return d})")
        self.page.get_by_label('Instrument',exact=True).select_option('custom');self.onboard(False)
        data=self.state();active=next(p for p in data['profiles'] if p['id']==data['settings']['activeProfileId'])
        self.assertEqual(active['instrumentType'],'custom');self.assertNotEqual(active.get('attribution'),'unresolved-history');self.assertNotEqual(active['id'],'historical-custom-onboarding')
        self.assertTrue(any(p['id']=='historical-custom-onboarding' and p.get('attribution')=='unresolved-history' for p in data['profiles']))
        self.assertTrue(any(p['updatedAt']>before for p in data['profiles'] if p['id']!=active['id']))

""")

# User-visible source-reference regression: canonical future labels and parent
# timestamps follow source edits/removals, while IDs/history remain untouched.
before('tests/profiles.py',
"    def test_76_profile_management_preserves_focuses_names_and_history_buckets(self):",
"""    def test_75_source_edits_refresh_future_labels_and_parent_metadata(self):
        self.onboard_type('guitar');data=self.state();plan=data['dailyPlans'][0]
        candidate=next((b for b in plan['blocks'] if b.get('exerciseId')),None);self.assertIsNotNone(candidate)
        exercise=next(e for e in data['exercises'] if e['id']==candidate['exerciseId']);old_name=exercise['name'];old_exercise_stamp=exercise['updatedAt'];old_plan_stamp=plan['updatedAt']
        self.route('/library/'+exercise['id']);self.page.get_by_role('button',name='Edit',exact=True).click();self.dialog_fill('Name',old_name+' renamed');self.save_dialog('Save exercise')
        data=self.state();saved=next(e for e in data['exercises'] if e['id']==exercise['id']);plan=next(p for p in data['dailyPlans'] if p['id']==plan['id'])
        self.assertGreater(saved['updatedAt'],old_exercise_stamp);self.assertGreater(plan['updatedAt'],old_plan_stamp);self.assertTrue(any(b.get('exerciseId')==exercise['id'] and b['title']==old_name+' renamed' for b in plan['blocks']))

        song_id=self.create_song('Reference source');self.page.get_by_role('button',name='Add section',exact=True).click();self.dialog_fill('Section name','Verse');self.save_dialog('Save section')
        self.route('/');self.page.get_by_role('button',name='Add block',exact=True).click();dialog=self.page.locator('dialog[open]');dialog.get_by_label('Block type',exact=True).select_option('song-section');dialog.get_by_label('Song',exact=True).select_option(song_id);dialog.get_by_label('Section',exact=True).select_option(label='Verse');self.save_dialog('Add block')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['profileId']==data['settings']['activeProfileId']);song=next(s for s in data['songs'] if s['id']==song_id);section=song['sections'][0];stamp=plan['updatedAt']
        self.route('/songs/'+song_id);self.page.get_by_role('button',name='Edit Verse',exact=True).click();self.dialog_fill('Section name','Middle 8');self.save_dialog('Save section')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['title'],'Reference source · Middle 8');self.assertGreater(plan['updatedAt'],stamp);stamp=plan['updatedAt']
        self.page.get_by_role('button',name='Edit song',exact=True).click();self.dialog_fill('Title','Reference source renamed');self.save_dialog('Save song')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['title'],'Reference source renamed · Middle 8');self.assertGreater(plan['updatedAt'],stamp);stamp=plan['updatedAt']
        self.page.get_by_role('button',name='Remove Middle 8',exact=True).click();self.confirm('Remove section')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['type'],'song');self.assertNotIn('songSectionId',block);self.assertEqual(block['title'],'Reference source renamed');self.assertGreater(plan['updatedAt'],stamp)

""")

repl('CHANGELOG.md',
"- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.\n",
"- Keep entity metadata and future source references coherent during workspace-level edits: exercise edits now stamp themselves and affected parent plans/routines; canonical exercise/song-section labels follow source renames/removals without rewriting custom titles or history.\n- Harden onboarding over migrated workspaces so protected historical custom attribution buckets cannot become the selected practice profile, and onboarding profile changes advance metadata.\n- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.\n")

print('Applied Steadybar 2.1.1 source-reference metadata hardening.')
