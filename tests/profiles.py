"""Instrument-specific release flows. --render is UI-only; native checks never silently substitute it."""
from __future__ import annotations
import json
import time
import unittest
from pathlib import Path
import e2e
from playwright.sync_api import expect

TYPES=('drums','guitar','bass','piano','voice')
SIZES=((1280,720),(1366,768),(1440,900),(1920,1080),(768,1024),(820,1180),(1024,768),(1024,1366),(320,568),(360,800),(375,812),(390,844),(412,915),(430,932))
class Profiles(e2e.MusicPracticeTests):
    def onboard_type(self,kind,starter=True):
        self.page.get_by_label('Instrument',exact=True).select_option(kind)
        self.onboard(starter)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().profiles.find(p=>p.id===load('app/store.js').store.snapshot().settings.activeProfileId).instrumentType"),kind)

    def state(self): return self.read("load('app/store.js').store.snapshot()")
    def wait_read(self,expression,predicate,timeout_ms=7000):
        deadline=time.monotonic()+timeout_ms/1000;last=None;last_error=None
        while time.monotonic()<deadline:
            try:
                last=self.read(expression)
                if predicate(last):return last
                last_error=None
            except Exception as error:last_error=error
            self.page.wait_for_timeout(40)
        if last_error is not None:self.fail(f'Timed out waiting for browser state. Last error: {last_error}')
        self.fail(f'Timed out waiting for browser state. Last value: {last!r}')
    def profile(self):
        data=self.state();return next(p for p in data['profiles'] if p['id']==data['settings']['activeProfileId'])
    def exercise(self,kind):
        data=self.state()
        return next(e for e in data['exercises'] if e['profileId']==data['settings']['activeProfileId'] and e['protocol']['kind']==kind)
    def launch(self,kind):
        exercise=self.exercise(kind);self.route('/library/'+exercise['id'])
        expect(self.page.get_by_role('heading',name=exercise['name'],exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Start practice',exact=True).click()
        expect(self.page.locator('.active-title')).to_be_visible()
        self.start()
        self.wait_read("load('practice/controller.js').practice.session.runtime.phase",lambda value:value=='running')
        return exercise
    def add_profile(self,kind,name=None,family=None):
        self.route('/profiles');self.page.get_by_role('button',name='Add profile',exact=True).click()
        self.page.locator('dialog[open]').get_by_label('Instrument',exact=True).select_option(kind)
        if name:self.dialog_fill('Profile name',name)
        if family:self.page.locator('dialog[open]').get_by_label('Instrument family',exact=True).select_option(family)
        self.save_dialog('Create profile')
        return self.profile()
    def use_profile(self,name):
        self.route('/profiles');row=self.page.locator('.profile-row').filter(has=self.page.get_by_text(name,exact=True))
        row.get_by_role('button',name='Use profile',exact=True).click()
        expect(self.page.locator('.profile-row').filter(has=self.page.get_by_text(name,exact=True))).to_contain_text('Selected')

    def complete_example(self,kind):
        protocol={'drums':'tempo','guitar':'chord-changes','bass':'groove','piano':'scale-cycle','voice':'vocal-pattern'}[kind]
        exercise=self.launch(protocol)
        if kind=='drums':self.page.get_by_role('button',name='Clean',exact=True).click()
        elif kind=='guitar':
            expect(self.page.get_by_label('BPM',exact=True)).to_have_count(0)
            self.page.get_by_role('button',name='Log round',exact=True).click()
            self.dialog_fill('Clean repetitions',8);self.dialog_fill('Total attempts',10)
            self.dialog_fill('Observation','Eight changes were clear; release before the next shape.')
            self.save_dialog('Save round')
        elif kind=='bass':
            self.page.get_by_role('button',name='Review groove',exact=True).click()
            self.page.locator('dialog[open]').get_by_label('Time / pulse',exact=True).select_option('4')
            self.page.locator('dialog[open]').get_by_label('Articulation',exact=True).select_option('3')
            self.save_dialog('Save review')
        elif kind=='piano':
            self.page.get_by_role('button',name='Log scale',exact=True).click()
            self.dialog_fill('Note / continuity errors',2);self.save_dialog('Save and next key')
        else:
            expect(self.page.get_by_label('BPM',exact=True)).to_have_count(0)
            self.page.get_by_role('button',name='Review voice',exact=True).click()
            self.page.locator('dialog[open]').get_by_label('Ease',exact=True).select_option('4')
            self.page.locator('dialog[open]').get_by_label('Fatigue',exact=True).select_option('1')
            self.save_dialog('Save review')
        self.finish()
        # Native IndexedDB orders by ID, not insertion. Locate the actual completed exercise.
        session=next(s for s in self.state()['sessions'] if s['status']=='completed' and any(b.get('sourceExerciseId')==exercise['id'] for b in s['blocks']))
        self.assertEqual(session['profileId'],self.profile()['id'])
        block=session['blocks'][0]
        if kind=='drums':self.assertEqual(block['tempoAttempts'][0]['rating'],'clean')
        else:self.assertEqual(len(block['outcomes']),1)
        return exercise,session

    def test_58_onboarding_existing_profile_advances_profile_metadata(self):
        factory=self.state()['profiles'][0];self.page.wait_for_timeout(2);self.onboard_type('drums',starter=False)
        saved=next(p for p in self.state()['profiles'] if p['id']==factory['id']);self.assertGreater(saved['updatedAt'],factory['updatedAt'])

    def test_59_onboarding_skips_historical_custom_profiles(self):
        factory=self.state()['profiles'][0];self.page.wait_for_timeout(2)
        self.read("load('app/store.js').store.workspace(d=>{const at=new Date().toISOString();d.profiles.push({id:'historical-custom-onboarding',name:'Earlier custom practice',instrumentType:'custom',family:'general',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:at,updatedAt:at,attribution:'unresolved-history'});return d})")
        self.page.get_by_label('Instrument',exact=True).select_option('custom');self.onboard(False)
        data=self.state();active=next(p for p in data['profiles'] if p['id']==data['settings']['activeProfileId']);retired=next(p for p in data['profiles'] if p['id']==factory['id'])
        self.assertEqual(active['instrumentType'],'custom');self.assertNotEqual(active.get('attribution'),'unresolved-history');self.assertNotEqual(active['id'],'historical-custom-onboarding')
        self.assertTrue(any(p['id']=='historical-custom-onboarding' and p.get('attribution')=='unresolved-history' for p in data['profiles']))
        self.assertTrue(retired['archived']);self.assertGreater(retired['updatedAt'],factory['updatedAt'])

    def test_60_guitar_round_goals_and_progress(self):
        self.onboard_type('guitar');exercise,session=self.complete_example('guitar')
        self.assertNotIn('initialBpm',session['blocks'][0]);self.assertEqual(session['blocks'][0]['outcomes'][0]['clean'],8)
        self.route('/goals');self.page.get_by_role('button',name='New goal',exact=True).first.click()
        dialog=self.page.locator('dialog[open]');dialog.get_by_label('Goal type',exact=True).select_option('protocol')
        dialog.get_by_label('Result to track',exact=True).select_option('clean-count')
        dialog.get_by_label('Exercise',exact=True).select_option(exercise['id'])
        self.dialog_fill('Goal title','Thirty clean changes');self.dialog_fill('Target',30);self.save_dialog('Save goal')
        expect(self.page.get_by_text('8 / 30 clean repetitions recorded',exact=True)).to_be_visible()
        self.route('/progress');expect(self.page.get_by_text('Clean repetitions',exact=True)).to_be_visible()
        self.route('/library');self.assertNotIn('Paradiddle',self.page.locator('#main').inner_text())

    def test_61_bass_groove_has_three_relevant_results(self):
        self.onboard_type('bass');_,session=self.complete_example('bass')
        result=session['blocks'][0]['outcomes'][0];self.assertEqual((result['kind'],result['timing'],result['articulation']),('groove',4,3))
        self.route('/progress');expect(self.page.get_by_text('Control / muting',exact=True)).to_be_visible()
        self.assertNotIn('Sticking',self.page.locator('#main').inner_text())

    def test_62_piano_keys_hands_and_first_read(self):
        self.onboard_type('piano');_,session=self.complete_example('piano')
        self.assertEqual(session['blocks'][0]['outcomes'][0]['kind'],'scale')
        self.route('/progress');expect(self.page.get_by_text('Keys practiced',exact=True)).to_be_visible()
        exercise=self.launch('sight-reading')
        for _ in range(2):
            self.page.get_by_role('button',name='Log reading attempt',exact=True).click()
            self.dialog_fill('Note / rhythm errors',1);self.save_dialog('Save reading result')
        active=self.read("load('practice/controller.js').practice.session")
        self.assertEqual([r['firstRead'] for r in active['blocks'][0]['outcomes']],[True,False])
        self.page.get_by_role('button',name='Task settings',exact=True).click()
        self.assertTrue(self.page.get_by_label('This material is new to me',exact=True).is_checked())
        self.save_dialog('Apply task settings')
        active=self.read("load('practice/controller.js').practice.session")
        self.assertEqual(len(active['blocks']),2);self.assertEqual([r['firstRead'] for r in active['blocks'][0]['outcomes']],[True,False])
        self.assertFalse(active['blocks'][1]['protocolSnapshot']['firstRead'])
        self.start();self.finish();self.launch('sight-reading')
        self.assertFalse(self.read("load('practice/controller.js').practice.session.blocks[0].protocolSnapshot.firstRead"));self.finish()

    def test_63_vocal_range_reference_and_fatigue_pause(self):
        self.onboard_type('voice');exercise=self.launch('vocal-pattern')
        expect(self.page.get_by_label('BPM',exact=True)).to_have_count(0)
        self.page.get_by_role('button',name='Play pattern',exact=True).click()
        self.page.wait_for_function("()=>document.querySelector('.task-feedback')?.textContent.includes('Listen')")
        self.page.get_by_role('button',name='Stop reference',exact=True).click()
        for _ in range(30):
            control=self.page.get_by_role('button',name='Next pitch',exact=True)
            if control.is_disabled():break
            control.click();self.page.wait_for_timeout(50)
        expect(self.page.get_by_role('button',name='Next pitch',exact=True)).to_be_disabled()
        root=self.read("load('practice/controller.js').practice.session.blocks[0].protocolState.rootMidi")
        p=exercise['protocol'];self.assertLessEqual(root+max(p['offsets']),p['highMidi'])
        self.page.get_by_role('button',name='Review voice',exact=True).click()
        self.page.locator('dialog[open]').get_by_label('Fatigue',exact=True).select_option('4')
        self.save_dialog('Save review')
        expect(self.page.get_by_role('button',name='Resume practice',exact=True)).to_be_visible()
        self.finish();self.route('/progress')
        expect(self.page.get_by_text('Vocal fatigue',exact=True)).to_be_visible()
        self.assertNotIn('Tempo progression',self.page.locator('#main').inner_text())

    def test_64_fretboard_answers_are_scored_against_the_displayed_prompt(self):
        self.onboard_type('guitar');exercise=self.launch('fretboard')
        p=exercise['protocol'];expected=p['tuning'][len(p['tuning'])-p['strings'][0]]%12
        labels=('C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B')
        self.page.get_by_role('group',name='Note answers',exact=True).get_by_role('button',name=labels[expected],exact=True).click()
        current=self.wait_read("load('practice/controller.js').practice.session.blocks[0]",lambda block:len(block.get('outcomes',[]))==1)
        self.assertTrue(current['outcomes'][0]['correct']);self.assertEqual(current['protocolState']['clean'],1)
        self.finish();expect(self.page.locator('.outcome-history').first).to_contain_text('— correct')
        session=next(s for s in self.state()['sessions'] if any(b.get('sourceExerciseId')==exercise['id'] for b in s['blocks']))
        saved=session['blocks'][0]['outcomes'][0]
        self.assertEqual(saved['answer'],saved['expected']);self.assertTrue(saved['correct'])

    def test_65_multiple_profiles_isolate_plans_and_pin_history(self):
        self.onboard_type('drums');original=self.profile();guitar=self.add_profile('guitar','Electric guitar')
        self.assertEqual(self.read("load('app/store.js').store.view().dailyPlans.length"),0)
        self.route('/');self.page.get_by_role('button',name='Build a plan',exact=True).click()
        self.wait_read("load('app/store.js').store.view().dailyPlans.length",lambda value:value==1)
        original_plan=self.state()['dailyPlans'][0];self.page.wait_for_timeout(2)
        self.page.get_by_role('button',name='Build a plan',exact=True).click();self.confirm('Build plan')
        rebuilt=self.state()['dailyPlans'][0];self.assertEqual(rebuilt['id'],original_plan['id']);self.assertEqual(rebuilt['createdAt'],original_plan['createdAt']);self.assertGreater(rebuilt['updatedAt'],original_plan['updatedAt'])
        _,session=self.complete_example('guitar')
        self.route('/profiles');row=self.page.locator('.profile-row').filter(has=self.page.get_by_text('Electric guitar',exact=True))
        row.get_by_role('button',name='Edit',exact=True).click();self.dialog_fill('Profile name','Stage guitar');self.save_dialog('Save profile')
        self.assertEqual(self.state()['sessions'][0]['profileNameSnapshot'],'Electric guitar')
        self.use_profile('Drums');self.assertEqual(self.read("load('app/store.js').store.view().sessions.length"),0)
        self.assertEqual(self.read("load('app/store.js').store.view().dailyPlans[0].profileId"),original['id'])
        self.launch('tempo');self.page.get_by_role('button',name='Save & leave',exact=True).click()
        expect(self.page.get_by_role('heading',name='Today',exact=True)).to_be_visible()
        created_while_active=self.add_profile('bass','Session-time bass');self.assertEqual(created_while_active['instrumentType'],'bass')
        active=next(s for s in self.state()['sessions'] if s['status']=='active');self.assertEqual(active['profileId'],original['id']);self.assertEqual(active['profileNameSnapshot'],'Drums')
        self.use_profile('Stage guitar');self.assertEqual(self.profile()['id'],guitar['id'])
        self.route('/');expect(self.page.get_by_text('Unfinished Drums session',exact=True)).to_be_visible()
        guitar_exercise=self.exercise('chord-changes');self.route('/library/'+guitar_exercise['id']);self.page.get_by_role('button',name='Start practice',exact=True).click()
        expect(self.page.locator('.active-title')).to_be_visible();self.assertEqual(len([s for s in self.state()['sessions'] if s['status']=='active']),1)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.profileId"),original['id']);self.finish()
        self.route('/history/'+session['id'])
        expect(self.page.get_by_text('Electric guitar',exact=True).first).to_be_visible()

    def test_66_song_parts_survive_profile_switches_and_drive_setlists(self):
        self.onboard_type('guitar');song_id=self.create_song('Shared original')
        self.page.get_by_role('button',name='Add instrument part',exact=True).click()
        self.dialog_fill('Part name','Acoustic part');self.dialog_fill('Tuning','E A D G B E');self.dialog_fill('Capo (optional)',2)
        self.save_dialog('Save part')
        self.page.get_by_role('button',name='Add section',exact=True).click();self.dialog_fill('Section name','Guitar bridge');self.save_dialog('Save section')
        self.add_profile('voice','Vocal harmony');self.route('/songs/'+song_id)
        self.page.get_by_role('button',name='Add instrument part',exact=True).click()
        self.dialog_fill('Part name','Upper harmony');self.dialog_fill('Part key','G');self.dialog_fill('Melody / harmony responsibility','Third above; enter after the lead')
        self.save_dialog('Save part')
        self.page.get_by_role('button',name='Add section',exact=True).click();self.dialog_fill('Section name','Vocal chorus');self.dialog_fill('Section notes','Breathe before the entrance');self.save_dialog('Save section')
        song=self.state()['songs'][0];self.assertEqual(len(song['parts']),2)
        self.assertEqual([s['name'] for s in song['parts'][0]['sections']],['Guitar bridge'])
        self.page.get_by_role('button',name='Practice Vocal chorus',exact=True).click();self.start();self.finish()
        session=self.state()['sessions'][0];self.assertEqual(session['blocks'][0]['sourceSongPartId'],song['parts'][1]['id'])
        self.route('/setlists');self.page.get_by_role('button',name='New setlist',exact=True).first.click();self.dialog_fill('Name','Shared set');self.save_dialog('Save setlist')
        self.page.get_by_role('button',name='Add song',exact=True).click();self.save_dialog('Add song')
        expect(self.page.get_by_text('Upper harmony',exact=False).first).to_be_visible()
        self.page.get_by_role('button',name='Generate practice routine',exact=True).click();self.save_dialog('Generate routine')
        routine=next(r for r in self.state()['routines'] if r['name']=='Shared set · Preparation')
        self.assertEqual(routine['profileId'],self.profile()['id']);self.assertEqual(routine['blocks'][0]['songPartId'],song['parts'][1]['id'])

    def test_67_custom_profile_is_capability_driven(self):
        self.onboard_type('drums');custom=self.add_profile('custom','Ukulele','fretted')
        self.route('/library');self.page.get_by_role('button',name='New exercise',exact=True).click()
        options=self.page.get_by_label('Practice method',exact=True).locator('option').all_text_contents()
        self.assertIn('Fretboard recall',options);self.assertNotIn('Vocal pattern',options)
        self.dialog_fill('Name','Ukulele notes');self.page.get_by_label('Practice method',exact=True).select_option('fretboard')
        self.dialog_fill('Tuning, low to high','G4, C4, E4, A4')
        self.dialog_fill('Strings to test','1, 2, 3, 4');self.save_dialog('Save exercise')
        saved=next(e for e in self.state()['exercises'] if e['name']=='Ukulele notes')
        self.assertEqual(saved['profileId'],custom['id']);self.assertEqual(saved['protocol']['kind'],'fretboard')

    def test_68_task_edit_retains_previous_work_as_an_immutable_segment(self):
        self.onboard_type('guitar');self.launch('chord-changes')
        self.page.get_by_role('button',name='+ Clean change',exact=True).click()
        # Result logging is intentionally asynchronous and durable. Wait for the
        # committed session to contain the result before taking the immutable
        # pre-edit snapshot; otherwise a fast engine can capture an empty list.
        self.wait_read("load('app/store.js').store.snapshot().sessions.find(s=>s.status==='active').blocks[0].outcomes.length",lambda value:value==1)
        before=self.read("JSON.stringify(load('practice/controller.js').practice.session.blocks[0].outcomes)")
        self.page.get_by_role('button',name='Task settings',exact=True).click()
        self.dialog_fill('Chord sequence','Am, F, C, G');self.save_dialog('Apply task settings')
        blocks=self.read("load('practice/controller.js').practice.session.blocks")
        self.assertEqual(len(blocks),2);self.assertEqual(json.loads(before),blocks[0]['outcomes']);self.assertEqual(blocks[1]['outcomes'],[])
        self.assertEqual(blocks[1]['protocolSnapshot']['chords'],['Am','F','C','G'])
        self.start();self.finish()

    def test_69_native_profiles_restore_and_offline(self):
        if e2e.OPTIONS.render:self.skipTest('Native persistence and offline reopening require an HTTP origin; not a memory-harness claim.')
        self.onboard_type('guitar');self.complete_example('guitar');self.add_profile('voice','Voice practice')
        self.route('/settings')
        with self.page.expect_download() as download:self.page.get_by_role('button',name='Export backup',exact=True).click()
        target=e2e.ARTIFACTS/'profiles-v2-backup.json';download.value.save_as(target)
        data=json.loads(target.read_text());self.assertEqual(data['version'],3);self.assertGreaterEqual(len(data['data']['profiles']),2)
        self.page.reload(wait_until='networkidle');expect(self.page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
        self.assertEqual(self.profile()['name'],'Voice practice')
        # Actual import/reload, not just parsing a JSON fixture.
        self.page.get_by_label('Choose backup file',exact=True).set_input_files(str(target))
        with self.page.expect_download() as safety:
            with self.page.expect_event('domcontentloaded'):self.confirm('Back up & replace')
        safety.value.save_as(e2e.ARTIFACTS/'profiles-safety-backup.json')
        expect(self.page.locator('#main')).to_be_visible()
        self.page.wait_for_timeout(200)
        self.assertEqual(self.profile()['name'],'Voice practice');self.assertEqual(len(self.state()['sessions']),1)
        self.page.evaluate('navigator.serviceWorker.ready.then(()=>true)');self.page.reload(wait_until='networkidle')
        self.page.wait_for_function('()=>!!navigator.serviceWorker.controller')
        # Service-worker network behavior is independently tested against a stopped
        # origin in ci_native.py. Here verify a new profile's local task while offline.
        self.context.set_offline(True)
        self.launch('vocal-pattern');self.page.get_by_role('button',name='Play pattern',exact=True).click();self.page.get_by_role('button',name='Stop reference',exact=True).click();self.finish()
        self.assertEqual(len(self.state()['sessions']),2)
        self.context.set_offline(False);self.page.reload(wait_until='networkidle');expect(self.page.locator('#main')).to_be_visible();self.assertEqual(len(self.state()['sessions']),2)

    def test_70_native_upgrade_preserves_original_database_and_exports_safety_copy(self):
        if e2e.OPTIONS.render:self.skipTest('A real version-2 IndexedDB database is required to test physical upgrade.')
        legacy=self.read("load('db/seed.js').seedData('2026-09-01T10:00:00.000Z')")
        legacy['settings']['instrument']='Guitar';legacy['settings']['onboardingDone']=True
        self.context.close();self.context=self.browser.new_context(viewport={'width':1440,'height':900},timezone_id='Europe/Berlin',accept_downloads=True)
        self.page=self.context.new_page();self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.route(e2e.URL,lambda route:route.fulfill(status=200,content_type='text/html',body='<title>Legacy fixture setup</title>'))
        self.page.goto(e2e.URL);self.page.unroute(e2e.URL)
        self.page.evaluate("""data=>new Promise((resolve,reject)=>{
          const req=indexedDB.open('music-practice-os',2);
          req.onupgradeneeded=()=>{for(const name of Object.keys(data)){
            const s=req.result.createObjectStore(name,{keyPath:'id'});
            if(name==='sessions'){s.createIndex('status','status');s.createIndex('startedAt','startedAt');}
            if(name==='dailyPlans')s.createIndex('date','date',{unique:true});
          }};
          req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction(Object.keys(data),'readwrite');
            for(const [name,rows] of Object.entries(data))for(const row of (name==='settings'?[rows]:rows))tx.objectStore(name).put(row);
            tx.oncomplete=()=>{db.close();resolve(true)};tx.onabort=()=>reject(tx.error);
          };
        })""",legacy)
        self.page.reload(wait_until='networkidle');expect(self.page.get_by_role('heading',name='Today',exact=True)).to_be_visible()
        self.assertEqual(self.state()['schemaVersion'],2);self.assertEqual(self.profile()['instrumentType'],'guitar')
        self.assertEqual(len(self.read("load('app/store.js').store.view().exercises")),30)
        self.assertEqual(self.page.evaluate("indexedDB.databases().then(d=>d.find(d=>d.name==='music-practice-os').version)"),4)
        self.route('/settings')
        with self.page.expect_download() as download:self.page.get_by_role('button',name='Export pre-upgrade backup',exact=True).click()
        path=e2e.ARTIFACTS/'actual-pre-upgrade.json';download.value.save_as(path)
        backup=json.loads(path.read_text());self.assertEqual(backup['version'],1)
        def canonical(data):
            value=json.loads(json.dumps(data))
            for name in ('exercises','songs','routines','dailyPlans','sessions','goals','setlists','metronomePresets'):
                value[name]=sorted(value[name],key=lambda row:row['id'])
            return value
        self.assertEqual(canonical(backup['data']),canonical(legacy))
        for name in ('exercises','songs','routines','dailyPlans','sessions','goals','setlists','metronomePresets'):
            self.assertEqual({row['id'] for row in backup['data'][name]},{row['id'] for row in legacy[name]})

    def test_71_large_library_preserves_bounded_dom(self):
        self.onboard_type('guitar')
        self.read("load('app/store.js').store.workspace(d=>{const e=d.exercises.find(e=>e.profileId===d.settings.activeProfileId);for(let i=0;i<1000;i++)d.exercises.push({...structuredClone(e),id:'large-'+i,name:'Large library task '+i,builtin:false});return d;})")
        timings=[]
        for route in ['/library','/','/library','/progress','/library']:
            start=time.perf_counter();self.route(route);timings.append(round((time.perf_counter()-start)*1000,1))
        self.assertLessEqual(self.page.locator('.exercise-row').count(),60)
        search=self.page.get_by_label('Search exercises',exact=True);search.fill('Large library task 999')
        expect(self.page.get_by_role('link',name='Large library task 999',exact=True)).to_be_visible()
        self.assertLess(self.page.locator('#main *').count(),1000)
        (e2e.ARTIFACTS/'profiles-performance-results.json').write_text(json.dumps({'environment':'automated browser; not field INP','routeMilliseconds':timings,'additionalExercises':1000}))

    def test_72_cross_profile_active_session_stays_recoverable(self):
        self.onboard_type('drums');drums=self.profile();guitar=self.add_profile('guitar','Recovery guitar')
        self.use_profile(drums['name']);self.launch('tempo')
        self.page.get_by_role('button',name='Save & leave',exact=True).click();expect(self.page.get_by_role('heading',name='Today',exact=True)).to_be_visible()
        self.read("load('app/store.js').store.workspace(d=>{d.settings.activeProfileId="+json.dumps(guitar['id'])+";return d})")
        self.route('/');expect(self.page.get_by_text('Unfinished Drums session',exact=True)).to_be_visible();expect(self.page.get_by_role('link',name='Resume session',exact=True)).to_be_visible()
        self.route('/practice');expect(self.page.get_by_text('Unfinished Drums session',exact=True)).to_be_visible()
        self.route('/practice/active');self.finish()

    def test_73_session_reflection_preserves_newer_block_data(self):
        self.onboard_type('guitar');exercise,session=self.complete_example('guitar');self.route('/history/'+session['id'])
        self.page.get_by_role('button',name='Add reflection',exact=True).click()
        self.read("load('app/store.js').store.workspace(d=>{const s=d.sessions.find(s=>s.id==="+json.dumps(session['id'])+");s.blocks[0].notes='Concurrent persisted block note';return d})")
        self.dialog_fill('Session notes','Reflection added after concurrent update');self.save_dialog('Save review')
        saved=next(s for s in self.state()['sessions'] if s['id']==session['id'])
        self.assertEqual(saved['blocks'][0]['notes'],'Concurrent persisted block note');self.assertEqual(saved['sessionNotes'],'Reflection added after concurrent update')
        self.assertTrue(any(b.get('sourceExerciseId')==exercise['id'] for b in saved['blocks']))

    def test_74_editing_song_details_preserves_newer_parts_and_sections(self):
        self.onboard_type('guitar');song_id=self.create_song('Concurrent song');profile=self.profile()
        self.page.get_by_role('button',name='Edit song',exact=True).click()
        expression="load('app/store.js').store.workspace(d=>{const s=d.songs.find(s=>s.id==="+json.dumps(song_id)+");s.sections.push({id:'concurrent-section',name:'Concurrent section',bars:4,notes:'Keep this',order:s.sections.length});s.parts=[...(s.parts??[]),{id:'concurrent-part',profileId:"+json.dumps(profile['id'])+",name:'Concurrent guitar part',instrumentType:'guitar',notes:'Keep part',key:'D',status:'learning',tuning:'E A D G B E',role:'Rhythm',range:'',sections:[]}];return d})"
        self.read(expression);self.dialog_fill('Title','Concurrent song renamed');self.dialog_fill('Arrangement / practice notes','Base edit');self.save_dialog('Save song')
        saved=next(s for s in self.state()['songs'] if s['id']==song_id)
        self.assertEqual(saved['title'],'Concurrent song renamed');self.assertEqual(saved['notes'],'Base edit')
        self.assertEqual([s['name'] for s in saved['sections']],['Concurrent section']);self.assertEqual([p['name'] for p in saved['parts']],['Concurrent guitar part'])

    def test_75_source_edits_refresh_future_labels_and_parent_metadata(self):
        self.onboard_type('guitar');data=self.state();plan=data['dailyPlans'][0]
        candidate=next((b for b in plan['blocks'] if b.get('exerciseId')),None);self.assertIsNotNone(candidate)
        exercise=next(e for e in data['exercises'] if e['id']==candidate['exerciseId']);old_name=exercise['name'];old_exercise_stamp=exercise['updatedAt'];old_plan_stamp=plan['updatedAt']
        self.route('/library/'+exercise['id']);self.page.get_by_role('button',name='Edit',exact=True).click();self.dialog_fill('Name',old_name+' renamed')
        self.read("load('app/store.js').store.workspace(d=>{const e=d.exercises.find(e=>e.id==="+json.dumps(exercise['id'])+");e.name='Concurrent source name';e.updatedAt=new Date(Date.parse(e.updatedAt)+5).toISOString();for(const p of [...d.routines,...d.dailyPlans]){let changed=false;for(const b of p.blocks)if(b.exerciseId===e.id&&b.title==="+json.dumps(old_name)+"){b.title='Concurrent source name';changed=true;}if(changed)p.updatedAt=new Date(Date.parse(p.updatedAt)+5).toISOString();}return d})")
        self.save_dialog('Save exercise')
        data=self.state();saved=next(e for e in data['exercises'] if e['id']==exercise['id']);plan=next(p for p in data['dailyPlans'] if p['id']==plan['id'])
        self.assertGreater(saved['updatedAt'],old_exercise_stamp);self.assertGreater(plan['updatedAt'],old_plan_stamp);self.assertTrue(any(b.get('exerciseId')==exercise['id'] and b['title']==old_name+' renamed' for b in plan['blocks']))

        song_id=self.create_song('Reference source');self.page.get_by_role('button',name='Add section',exact=True).click();self.dialog_fill('Section name','Verse');self.save_dialog('Save section')
        self.route('/');self.page.get_by_role('button',name='Add block',exact=True).click();dialog=self.page.locator('dialog[open]');dialog.get_by_label('Block type',exact=True).select_option('song-section');dialog.get_by_label('Song',exact=True).select_option(song_id);dialog.get_by_label('Section',exact=True).select_option(label='Verse');self.save_dialog('Add block')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['profileId']==data['settings']['activeProfileId']);stamp=plan['updatedAt']
        self.route('/songs/'+song_id);self.page.get_by_role('button',name='Edit Verse',exact=True).click();self.dialog_fill('Section name','Middle 8');self.save_dialog('Save section')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['title'],'Reference source · Middle 8');self.assertGreater(plan['updatedAt'],stamp);stamp=plan['updatedAt']
        self.page.get_by_role('button',name='Edit song',exact=True).click();self.dialog_fill('Title','Reference source renamed');self.save_dialog('Save song')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['title'],'Reference source renamed · Middle 8');self.assertGreater(plan['updatedAt'],stamp);stamp=plan['updatedAt']
        self.page.get_by_role('button',name='Remove Middle 8',exact=True).click();self.confirm('Remove section')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['type'],'song');self.assertNotIn('songSectionId',block);self.assertEqual(block['title'],'Reference source renamed');self.assertGreater(plan['updatedAt'],stamp)

    def test_76_profile_management_preserves_focuses_names_and_history_buckets(self):
        self.onboard_type('guitar');first=self.profile();self.route('/profiles')
        row=self.page.locator('.profile-row').filter(has=self.page.get_by_text(first['name'],exact=True));row.get_by_role('button',name='Edit',exact=True).click()
        dialog=self.page.locator('dialog[open]');dialog.get_by_label('Fretboard',exact=True).check();self.save_dialog('Save profile')
        saved=next(p for p in self.state()['profiles'] if p['id']==first['id']);self.assertEqual(saved['focusAreas'],['Chords & rhythm','Fretboard'])
        self.route('/profiles');row=self.page.locator('.profile-row').filter(has=self.page.get_by_text(first['name'],exact=True));row.get_by_role('button',name='Edit',exact=True).click()
        dialog=self.page.locator('dialog[open]');self.assertTrue(dialog.get_by_label('Chords & rhythm',exact=True).is_checked());self.assertTrue(dialog.get_by_label('Fretboard',exact=True).is_checked());dialog.get_by_role('button',name='Cancel',exact=True).click()
        self.page.get_by_role('button',name='Add profile',exact=True).click();self.page.locator('dialog[open]').get_by_label('Instrument',exact=True).select_option('guitar');self.save_dialog('Create profile')
        second=self.profile();self.assertEqual(second['name'],'Guitar 2');self.assertNotEqual(second['id'],first['id'])
        self.route('/profiles');self.page.get_by_role('button',name='Add profile',exact=True).click();self.page.locator('dialog[open]').get_by_label('Instrument',exact=True).select_option('guitar');self.dialog_fill('Profile name','Guitar');self.page.locator('dialog[open]').get_by_role('button',name='Create profile',exact=True).click()
        expect(self.page.locator('dialog[open]').get_by_role('alert')).to_contain_text('distinct profile name');self.page.locator('dialog[open]').get_by_role('button',name='Cancel',exact=True).click();self.confirm('Discard changes')
        self.assertEqual(self.page.get_by_role('button',name='Set primary',exact=True).count(),0)
        self.page.get_by_role('button',name='Add profile',exact=True).click();custom=self.page.locator('dialog[open]');custom.get_by_label('Instrument',exact=True).select_option('custom');self.dialog_fill('Profile name','General custom');self.save_dialog('Create profile');self.assertEqual(self.profile()['family'],'general')
        self.read("load('app/store.js').store.workspace(d=>{d.profiles.push({id:'profile-earlier-ui',name:'Earlier practice',instrumentType:'custom',family:'general',level:'beginner',focusAreas:[],defaultSessionMinutes:30,archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),attribution:'unresolved-history'});return d})")
        self.route('/profiles');historical=self.page.locator('.profile-row').filter(has=self.page.get_by_text('Earlier practice',exact=True));expect(historical).to_contain_text('History only');expect(historical.get_by_role('button',name='Use profile',exact=True)).to_have_count(0);expect(historical.get_by_role('button',name='Edit',exact=True)).to_have_count(0)

    def test_77_history_can_review_other_profiles_without_switching_workspace(self):
        self.onboard_type('guitar');guitar=self.profile();_,guitar_session=self.complete_example('guitar')
        voice=self.add_profile('voice','History voice');_,voice_session=self.complete_example('voice');self.assertEqual(self.profile()['id'],voice['id'])
        self.route('/history');self.assertEqual(self.page.locator('.history-card').count(),1);expect(self.page.locator('.history-card').first).to_contain_text('History voice')
        self.page.get_by_label('History profile',exact=True).select_option('all');self.assertEqual(self.page.locator('.history-card').count(),2)
        self.page.get_by_label('History profile',exact=True).select_option('profile:'+guitar['id']);self.assertEqual(self.page.locator('.history-card').count(),1);expect(self.page.locator('.history-card').first).to_contain_text('Guitar')
        self.assertEqual(self.profile()['id'],voice['id']);self.assertIn(guitar_session['id'],[s['id'] for s in self.state()['sessions']]);self.assertIn(voice_session['id'],[s['id'] for s in self.state()['sessions']])

    def matrix(self,kind):
        self.onboard_type(kind);exercise,_=self.complete_example(kind)
        results=[]
        for width,height in SIZES:
            self.page.set_viewport_size({'width':width,'height':height})
            for route,label in [('/','today'),('/library','library'),('/library/'+exercise['id'],'exercise'),('/routines','routines'),('/songs','songs'),('/goals','goals'),('/progress','progress'),('/profiles','profiles'),('/settings','settings')]:
                self.route(route)
                overflow=self.page.evaluate('document.documentElement.scrollWidth > innerWidth')
                self.assertFalse(overflow,f'{kind} {label} {width}x{height}')
                self.assertNotIn('undefined',self.page.locator('#main').inner_text(),f'{kind} {label}')
                if width in (390,820,1440) and label in ('today','library','progress'):
                    self.page.screenshot(path=str(e2e.ARTIFACTS/f'profiles-{kind}-{label}-{width}.png'),full_page=True)
                results.append({'profile':kind,'route':label,'width':width,'height':height,'overflow':False})
        self.route('/library/'+exercise['id']);self.page.get_by_role('button',name='Start practice',exact=True).click()
        # launchPractice is asynchronous. Wait for the active route to finish rendering
        # before measuring its fixed transport; Firefox can otherwise inspect the old
        # library DOM between the click handler's await and hash navigation.
        expect(self.page.locator('.active-title')).to_be_visible()
        for width,height in SIZES:
            self.page.set_viewport_size({'width':width,'height':height})
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width,f'{kind} active {width}')
            if width<500:
                for name in ('Start practice','Finish block'):
                    control=self.page.get_by_role('button',name=name,exact=True);box=control.bounding_box();self.assertIsNotNone(box,f'{kind} {name} {width}x{height}');self.assertGreaterEqual(box['height'],44);self.assertLessEqual(box['y']+box['height'],height+1)
            if width in (320,390,820,1440):self.page.screenshot(path=str(e2e.ARTIFACTS/f'profiles-{kind}-active-{width}.png'),full_page=True)
            results.append({'profile':kind,'route':'active','width':width,'height':height,'overflow':False})
        (e2e.ARTIFACTS/f'profiles-{kind}-layout-results.json').write_text(json.dumps(results,indent=2))

for kind in TYPES:
    def case(self,kind=kind):self.matrix(kind)
    setattr(Profiles,'test_75_matrix_'+kind,case)

if __name__=='__main__':
    names=[name for name in Profiles.__dict__ if name.startswith('test_') and (not e2e.OPTIONS.test or name.startswith(e2e.OPTIONS.test))]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Profiles(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
