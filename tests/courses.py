"""Guided course workflows. --render is UI-only; native migration/offline cases never substitute memory storage."""
from __future__ import annotations
import json
import re
import subprocess
from urllib.request import urlopen
import time
import unittest
import e2e
from playwright.sync_api import expect

class Courses(e2e.MusicPracticeTests):
    def state(self): return self.read("load('app/store.js').store.snapshot()")
    def wait_state(self,expression,predicate):
        end=time.monotonic()+7
        while time.monotonic()<end:
            value=self.read(expression)
            if predicate(value):return value
            self.page.wait_for_timeout(40)
        self.fail(f'State did not settle: {expression}: {value!r}')
    def begin(self,kind='drums',lesson=None):
        self.page.get_by_label('Instrument',exact=True).select_option(kind);self.onboard()
        self.course=self.read(f"load('learning/catalog.js').COURSES.find(c=>c.id==={json.dumps(kind+'-foundation')})")
        self.lesson=next((l for l in self.course['lessons'] if l['id']==lesson),self.course['lessons'][0])
        self.profile_id=self.state()['settings']['activeProfileId'];self.open_lesson()
    def open_lesson(self):
        self.route(f"/courses/{self.course['id']}/{self.lesson['id']}")
        expect(self.page.get_by_role('heading',name=self.lesson['title'],exact=True)).to_be_visible()
    def fill_review(self,passing=True,evidence='off-app'):
        self.page.get_by_role('button',name='Review this lesson',exact=True).click()
        dialog=self.page.locator('dialog[open]')
        if passing:
            for checkbox in dialog.locator('.lesson-checks input').all():checkbox.check()
        for i,q in enumerate(self.lesson['questions']):dialog.locator(f'select[name=answer{i}]').select_option(str(q['answer']))
        dialog.get_by_label('Practice evidence',exact=True).select_option(evidence)
        if evidence=='off-app':
            dialog.get_by_label('Actual off-app minutes',exact=True).fill('5')
            dialog.get_by_label('I actually practiced both lesson tasks; these are not invented or duplicated app minutes.',exact=True).check()
        dialog.get_by_label('What worked, and what needs repair?',exact=True).fill('Clear entrance; repeat the release tomorrow.')
    def test_80_reviews_need_evidence_and_honest_checks(self):
        self.begin('drums');self.fill_review(evidence='reflection');self.save_dialog('Save lesson review')
        expect(self.page.locator('.lesson-state')).to_have_text('Practice again')
        self.fill_review(passing=False);self.save_dialog('Save lesson review')
        expect(self.page.locator('.lesson-state')).to_have_text('Practice again')
        self.fill_review();self.save_dialog('Save lesson review')
        expect(self.page.locator('.lesson-state')).to_have_text('Self-checked')
        data=self.state();self.assertEqual(len(data['courseProgress'][0]['lessons'][0]['attempts']),3);self.assertEqual(data['sessions'],[])
        self.route('/progress');expect(self.page.get_by_role('region',name='Guided learning')).to_contain_text('1 of 8 lessons self-checked')
    def test_81_wrong_knowledge_answer_does_not_pass(self):
        self.begin('guitar');self.fill_review()
        q=self.lesson['questions'][0];self.page.locator('dialog[open] select[name=answer0]').select_option(str((q['answer']+1)%len(q['options'])))
        self.save_dialog('Save lesson review');expect(self.page.locator('.lesson-state')).to_have_text('Practice again')
        expect(self.page.locator('.latest-lesson-review')).to_contain_text(q['explanation'])
    def test_82_placement_and_profile_progress_are_separate(self):
        self.begin('guitar');self.fill_review();self.save_dialog('Save lesson review')
        self.route('/courses/guitar-foundation');self.page.get_by_role('button',name='Check my entry point',exact=True).click()
        for control in self.page.locator('dialog[open] input[type=checkbox]').all():control.check()
        self.save_dialog('Save entry checklist');expect(self.page.locator('.learning-placement')).to_contain_text('no lessons have been marked complete')
        data=self.state();old_profile=self.profile_id
        self.assertEqual(len(data['courseProgress'][0]['lessons']),1)
        self.read("load('app/profiles.js').createProfile({name:'Second guitar',instrumentType:'guitar',level:'beginner',focusAreas:[],defaultSessionMinutes:15})")
        self.route('/courses/guitar-foundation');expect(self.page.locator('.course-overview').nth(1)).to_contain_text('0 / 8')
        self.route(f"/courses/guitar-foundation/{self.lesson['id']}/{old_profile}")
        expect(self.page.get_by_role('button',name=re.compile('^Switch to '))).to_be_visible()
        self.assertNotEqual(self.state()['settings']['activeProfileId'],old_profile)
    def test_83_plan_appends_and_edit_preserves_task_identity(self):
        self.begin('drums')
        self.read("load('app/store.js').store.workspace(d=>{d.dailyPlans.push({id:'existing-plan',profileId:d.settings.activeProfileId,date:load('domain/utils.js').localDate(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),blocks:[{id:'existing-block',profileId:d.settings.activeProfileId,type:'free',title:'Keep my warmup',targetSeconds:60,notes:'Original cue',order:0,protocol:{kind:'free',focus:'Warmup'}}]});return d;})")
        self.open_lesson();self.page.get_by_role('button',name='Add lesson to Today',exact=True).click();self.save_dialog('Add both tasks to Today')
        plan=self.state()['dailyPlans'][0];self.assertEqual(len(plan['blocks']),3);self.assertEqual(plan['blocks'][0]['title'],'Keep my warmup')
        source=plan['blocks'][1]['lessonSource'];protocol=plan['blocks'][1]['protocol']
        self.read("load('ui/editors.js').editBlock(load('app/store.js').store.snapshot().dailyPlans[0].blocks[1],b=>load('app/store.js').store.workspace(d=>{d.dailyPlans[0].blocks[1]=b;return d;}))")
        self.page.get_by_label('Duration (minutes)',exact=True).fill('3');self.save_dialog('Save block')
        edited=self.state()['dailyPlans'][0]['blocks'][1];self.assertEqual(edited['lessonSource'],source);self.assertEqual(edited['protocol'],protocol);self.assertEqual(edited['targetSeconds'],180)
        self.open_lesson();self.page.get_by_role('button',name='Add lesson to Today',exact=True).click()
        self.page.get_by_role('button',name='Add both tasks to Today',exact=True).click();expect(self.page.locator('dialog[open] .form-error')).to_contain_text('already in today')
        self.assertEqual(len(self.state()['dailyPlans'][0]['blocks']),3)
    def test_84_voice_requires_chosen_full_range_and_remembers_it(self):
        self.begin('voice','hum');self.page.get_by_role('button',name='Add lesson to Today',exact=True).click()
        dialog=self.page.locator('dialog[open]');dialog.get_by_role('button',name='Add both tasks to Today',exact=True).click()
        expect(dialog.locator('.form-error')).to_contain_text('confirm a comfortable range')
        dialog.get_by_label('I chose a comfortable range for today and will stop for pain, hoarseness or increasing fatigue.',exact=True).check()
        dialog.get_by_label('Your comfortable starting note',exact=True).select_option('65')
        dialog.get_by_role('button',name='Add both tasks to Today',exact=True).click();expect(dialog.locator('.form-error')).to_contain_text('whole pattern')
        dialog.get_by_label('Your comfortable starting note',exact=True).select_option('55');dialog.get_by_label('Your comfortable lowest note',exact=True).select_option('53');dialog.get_by_label('Your comfortable highest note',exact=True).select_option('60');self.save_dialog('Add both tasks to Today')
        data=self.state();p=data['dailyPlans'][0]['blocks'][0]['protocol'];self.assertEqual((p['startMidi'],p['lowMidi'],p['highMidi']),(55,53,60));self.assertNotIn('bpm',data['dailyPlans'][0]['blocks'][0])
        self.page.get_by_role('button',name='Practice this lesson',exact=True).click();expect(self.page.get_by_label('Your comfortable starting note',exact=True)).to_have_value('55')
        expect(self.page.get_by_label('I chose a comfortable range for today and will stop for pain, hoarseness or increasing fatigue.',exact=True)).not_to_be_checked()
    def test_85_unfinished_session_never_becomes_new_lesson_evidence(self):
        self.begin('drums');self.page.get_by_role('button',name='Practice this lesson',exact=True).click();self.save_dialog('Start guided practice')
        expect(self.page.locator('.active-title')).to_be_visible();first=self.read("load('practice/controller.js').practice.session.id")
        self.lesson=self.course['lessons'][1];self.open_lesson();expect(self.page.get_by_role('link',name='Resume unfinished session',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Practice this lesson',exact=True).click();self.page.get_by_role('button',name='Start guided practice',exact=True).click()
        expect(self.page.locator('dialog[open] .form-error')).to_contain_text('unfinished session already exists')
        self.assertEqual(self.read("load('practice/controller.js').practice.session.id"),first);self.assertEqual(len(self.state()['sessions']),1)
    def test_86_real_guided_session_returns_to_its_lesson(self):
        self.begin('guitar');self.page.get_by_role('button',name='Practice this lesson',exact=True).click();self.save_dialog('Start guided practice')
        expect(self.page.locator('.active-title')).to_be_visible()
        for i in range(2):
            self.start();self.page.wait_for_timeout(16000)
            self.page.get_by_role('button',name='Finish block',exact=True).click()
            if i==0:expect(self.page.get_by_role('button',name='Start practice',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Session complete.',exact=True)).to_be_visible()
        self.page.get_by_role('link',name='Return to lesson: '+self.lesson['title'],exact=True).click()
        expect(self.page.locator('.lesson-state')).to_have_text('Not checked')
        self.page.get_by_role('button',name='Review this lesson',exact=True).click();dialog=self.page.locator('dialog[open]')
        self.assertTrue(dialog.get_by_label('Practice evidence',exact=True).input_value().startswith('session:'))
        for control in dialog.locator('.lesson-checks input').all():control.check()
        dialog.locator('select[name=answer0]').select_option(str(self.lesson['questions'][0]['answer']));self.save_dialog('Save lesson review')
        expect(self.page.locator('.lesson-state')).to_have_text('Self-checked')
        result=self.state()['courseProgress'][0]['lessons'][0]['attempts'][0];self.assertEqual(result['evidence']['kind'],'session');self.assertGreaterEqual(result['evidence']['seconds'],30)
    def test_87_note_search_and_reading_have_no_automatic_completion(self):
        self.begin('bass');self.page.get_by_role('button',name='Edit lesson note',exact=True).click();self.page.get_by_label('Material, feedback and next repair',exact=True).fill('<script>never execute</script> Teacher: quieter releases.');self.save_dialog('Save lesson note')
        expect(self.page.locator('.lesson-notes')).to_contain_text('<script>never execute</script>')
        self.assertEqual(self.state()['courseProgress'][0]['lessons'][0]['attempts'],[])
        self.page.get_by_role('button',name='Search',exact=True).first.click();self.page.get_by_label('Search everything',exact=True).fill(self.lesson['title'])
        self.page.get_by_role('button',name=re.compile(re.escape(self.lesson['title']))).click();expect(self.page.locator('.lesson-state')).to_have_text('Not checked')
    def test_88_reference_stops_when_leaving_lesson(self):
        self.begin('piano');self.page.get_by_role('button',name='Hear pitch sequence',exact=True).click()
        self.wait_state("load('audio/reference.js').reference.running",lambda value:value)
        self.route('/courses');self.assertFalse(self.read("load('audio/reference.js').reference.running"))
    def test_89_cross_lesson_tempo_defaults_do_not_leak(self):
        self.begin('drums')
        timed=self.read("""(()=>{const c=load('learning/catalog.js').COURSES.find(c=>c.id==='drums-foundation'),pulse=load('domain/protocols.js').protocolPulse;return c.lessons.map(l=>({id:l.id,bpm:l.tasks.map(t=>pulse(t.protocol)).find(Boolean)?.bpm})).filter(x=>Number.isInteger(x.bpm)).slice(0,2);})()""")
        self.assertEqual(len(timed),2)
        first=next(l for l in self.course['lessons'] if l['id']==timed[0]['id']);second=next(l for l in self.course['lessons'] if l['id']==timed[1]['id'])
        self.lesson=first;self.open_lesson();self.page.get_by_role('button',name='Add lesson to Today',exact=True).click();tempo=self.page.locator('dialog[open] input[name=tempo]');expect(tempo).to_have_value(str(timed[0]['bpm']));tempo.fill('299');self.save_dialog('Add both tasks to Today')
        self.open_lesson();self.page.get_by_role('button',name='Practice this lesson',exact=True).click();expect(self.page.locator('dialog[open] input[name=tempo]')).to_have_value('299');self.page.get_by_role('button',name='Close dialog',exact=True).click()
        self.lesson=second;self.open_lesson();self.page.get_by_role('button',name='Practice this lesson',exact=True).click();expect(self.page.locator('dialog[open] input[name=tempo]')).to_have_value(str(timed[1]['bpm']));self.page.get_by_role('button',name='Close dialog',exact=True).click()

    def test_89_native_v3_backup_restore_and_offline_learning(self):
        if e2e.OPTIONS.render:self.skipTest('Actual IndexedDB restore, reload and service worker require a real origin.')
        self.begin('guitar');self.fill_review();self.save_dialog('Save lesson review');self.route('/settings')
        with self.page.expect_download() as dl:self.page.get_by_role('button',name='Export backup',exact=True).click()
        target=e2e.ARTIFACTS/'courses-backup-v3.json';dl.value.save_as(target);backup=json.loads(target.read_text())
        self.assertEqual(backup['version'],3);self.assertEqual(len(backup['data']['courseProgress']),1)
        self.read("load('db/database.js').replaceData({...load('app/store.js').store.snapshot(),courseProgress:[]})")
        self.page.reload(wait_until='networkidle')
        expect(self.page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
        self.assertEqual(self.state()['courseProgress'],[])
        self.page.get_by_label('Choose backup file',exact=True).set_input_files(str(target))
        # Confirmation closes before the asynchronous restore/reload finishes.
        # Observe that document transition, then the rendered workspace, rather
        # than importing the new store before its IndexedDB initialization.
        with self.page.expect_download() as safety:
            with self.page.expect_event('domcontentloaded'):self.confirm('Back up & replace')
        safety_path=e2e.ARTIFACTS/'courses-pre-restore-safety.json';safety.value.save_as(safety_path)
        self.assertEqual(json.loads(safety_path.read_text())['data']['courseProgress'],[])
        expect(self.page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
        self.assertEqual(self.state()['courseProgress'],backup['data']['courseProgress'])
        self.open_lesson();self.page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
        self.page.reload(wait_until='networkidle');expect(self.page.locator('.lesson-state')).to_have_text('Self-checked')
        self.page.wait_for_function('()=>!!navigator.serviceWorker.controller')
        # Match ci_native.py: stop the actual HTTP server instead of using
        # WebKit's emulated-offline reload, which can return an internal error.
        # The refused HTTP request and successful reload prove real cache use.
        cls=type(self);self.assertIsNotNone(cls.server,'Offline certification needs a test-owned HTTP origin.')
        cls.server.terminate();cls.server.wait(timeout=10)
        try:
            with self.assertRaises(OSError):urlopen(e2e.URL,timeout=1)
            self.page.reload(wait_until='domcontentloaded')
            expect(self.page.locator('.lesson-state')).to_have_text('Self-checked')
            expect(self.page.get_by_role('heading',name='Worked example',exact=True)).to_be_visible()
            self.page.get_by_role('button',name='Edit lesson note',exact=True).click()
            self.page.get_by_label('Material, feedback and next repair',exact=True).fill('Saved with the HTTP origin stopped.')
            self.save_dialog('Save lesson note')
            self.page.reload(wait_until='domcontentloaded')
            expect(self.page.locator('.lesson-state')).to_have_text('Self-checked')
            expect(self.page.locator('.lesson-notes')).to_contain_text('Saved with the HTTP origin stopped.')
            self.assertEqual(self.state()['courseProgress'][0]['lessons'][0]['attempts'],backup['data']['courseProgress'][0]['lessons'][0]['attempts'])
        finally:
            cls.server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=e2e.ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
            for _ in range(50):
                try:urlopen(e2e.URL,timeout=1).close();break
                except OSError:time.sleep(.1)
            else:self.fail('Test HTTP origin could not be restarted.')
    def test_90_native_database_three_to_four_preserves_old_practice(self):
        if e2e.OPTIONS.render:self.skipTest('Physical IndexedDB migration requires a real origin.')
        self.begin('drums')
        result=self.read("""(async()=>{
          const db=load('db/database.js'),d=structuredClone(load('app/store.js').store.snapshot());delete d.courseProgress;
          let s=load('practice/logic.js').createSession([{id:'legacy-block',profileId:d.settings.activeProfileId,type:'free',title:'Legacy untouched',targetSeconds:60,bpm:80,notes:'Retain this note',order:0}],d);
          s.blocks[0].startedAt=s.startedAt;s.blocks[0].actualActiveSeconds=23.5;s=load('practice/logic.js').finishBlock(s);d.sessions=[s];
          const old=await db.openDatabase();old.close();
          await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(db.DB_NAME);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Fixture deletion blocked'));});
          await new Promise((resolve,reject)=>{
            const r=indexedDB.open(db.DB_NAME,3);r.onerror=()=>reject(r.error);
            r.onupgradeneeded=()=>{for(const name of [...db.STORES.filter(n=>n!=='courseProgress'),'migrationBackups']){const t=r.result.createObjectStore(name,{keyPath:'id'});if(name==='sessions'){t.createIndex('status','status');t.createIndex('startedAt','startedAt');}if(name==='dailyPlans')t.createIndex('profileDate',['profileId','date'],{unique:true});}};
            r.onsuccess=()=>{const names=db.STORES.filter(n=>n!=='courseProgress'),tx=r.result.transaction(names,'readwrite');for(const name of names)for(const row of name==='settings'?[d.settings]:d[name]??[])tx.objectStore(name).put(row);tx.oncomplete=()=>{r.result.close();resolve();};tx.onabort=()=>reject(tx.error);};
          });return {profile:d.settings.activeProfileId,exerciseIds:d.exercises.map(e=>e.id),session:s};
        })()""")
        self.page.reload(wait_until='networkidle')
        expect(self.page.get_by_role('heading',name=self.lesson['title'],exact=True)).to_be_visible()
        data=self.state();self.assertEqual(data['settings']['activeProfileId'],result['profile']);self.assertEqual([e['id'] for e in data['exercises']],sorted(result['exerciseIds']))
        self.assertEqual(data['courseProgress'],[]);self.assertEqual(data['sessions'][0],result['session']);self.assertEqual(self.read("load('db/database.js').openDatabase().then(d=>d.version)"),4)
    def matrix(self,kind):
        self.begin(kind);self.route('/courses');expect(self.page.locator('.course-card')).to_have_count(1 if kind=='custom' else 3)
        lessons=self.read(f"load('learning/catalog.js').COURSES.filter(c=>c.instrument==={json.dumps(kind)}).flatMap(c=>c.lessons)")
        self.assertEqual(len(lessons),4 if kind=='custom' else 18)
        if kind=='guitar':self.lesson=self.course['lessons'][1]
        if kind=='drums':self.lesson=self.course['lessons'][2]
        self.open_lesson();results=[]
        for close in self.page.get_by_role('button',name='Dismiss notification',exact=True).all():close.click()
        for width,height in ((320,568),(390,844),(768,1024),(1024,768),(1440,900)):
            self.page.set_viewport_size({'width':width,'height':height})
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width,f'{kind} {width}')
            for name in ('Practice this lesson','Add lesson to Today','Review this lesson'):
                box=self.page.get_by_role('button',name=name,exact=True).bounding_box();self.assertIsNotNone(box)
                # Firefox can subtract large document offsets as 43.999878 for
                # a computed 44px box. Normalize only sub-millipixel precision.
                self.assertGreaterEqual(round(box['height'],3),44,f'{kind} {name} {width}: {box}')
                self.assertGreaterEqual(round(box['width'],3),44,f'{kind} {name} {width}: {box}')
            for control in self.page.locator('.learning-page input,.learning-page select').all():self.assertTrue(control.get_attribute('aria-label') or control.get_attribute('id'))
            if width in (390,1440):self.page.screenshot(path=str(e2e.ARTIFACTS/f'courses-{kind}-{width}.png'),full_page=True)
            results.append({'instrument':kind,'width':width,'height':height,'overflow':False})
        self.page.set_viewport_size({'width':390,'height':844});self.route('/courses');self.open_lesson()
        self.assertFalse(self.page.locator('.lesson-outline').evaluate('(d)=>d.open'))
        if kind=='guitar':expect(self.page.get_by_role('table',name='Em guitar frets, low to high')).to_be_visible()
        if kind=='drums':expect(self.page.locator('.lesson-rhythm')).to_be_visible()
        (e2e.ARTIFACTS/f'courses-{kind}-layout-results.json').write_text(json.dumps(results,indent=2))

for kind in ('drums','guitar','bass','piano','voice','custom'):
    def case(self,kind=kind):self.matrix(kind)
    setattr(Courses,'test_91_matrix_'+kind,case)
if __name__=='__main__':
    names=[name for name in Courses.__dict__ if name.startswith('test_') and (not e2e.OPTIONS.test or name.startswith(e2e.OPTIONS.test))]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Courses(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
