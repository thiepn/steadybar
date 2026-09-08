"""Browser workflows. Default: real localhost + IndexedDB + service worker.
--render: explicitly uses validated memory storage on about:blank to test UI
when local navigation is prohibited. Persistence/offline tests are skipped,
never silently counted as verified. Production code never includes this harness.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import unittest
from urllib.request import urlopen
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--render',action='store_true')
parser.add_argument('--visual',action='store_true')
parser.add_argument('--test',default='')
OPTIONS=parser.parse_args()
URL=os.environ.get('TEST_URL','http://127.0.0.1:4173/')
ARTIFACTS=ROOT/'.qa'
ARTIFACTS.mkdir(exist_ok=True)

class MusicPracticeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=None
        if OPTIONS.render:
            subprocess.run(['node','tests/render-bundle.mjs'],cwd=ROOT,check=True)
        else:
            try:
                urlopen(URL,timeout=2).close()
            except OSError:
                cls.server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
                for _ in range(40):
                    try:
                        urlopen(URL,timeout=1).close();break
                    except OSError: time.sleep(.15)
        cls.pw=sync_playwright().start()
        executable=os.environ.get('CHROMIUM_PATH')
        if not executable and not os.environ.get('PLAYWRIGHT_BUNDLED_BROWSER'):
            executable=shutil.which('chromium') or shutil.which('google-chrome')
        kwargs={'headless':True,'args':['--no-sandbox']}
        if executable:kwargs['executable_path']=executable
        engine=os.environ.get('PLAYWRIGHT_ENGINE','chromium')
        if engine not in ('chromium','firefox','webkit'):raise ValueError('Unsupported PLAYWRIGHT_ENGINE')
        cls.browser=getattr(cls.pw,engine).launch(**(kwargs if engine=='chromium' else {'headless':True}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop()
        if cls.server:cls.server.terminate();cls.server.wait(timeout=10)

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1440,'height':900},timezone_id='Europe/Berlin',color_scheme='light',accept_downloads=True,has_touch=getattr(self,'touch',False))
        self.page=self.context.new_page();self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.set_default_timeout(7000)
        if OPTIONS.render:
            html=(ROOT/'public/index.html').read_text(encoding='utf-8')
            html=re.sub(r'<link\b[^>]*>','',html)
            html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
            self.page.set_content(html)
            self.page.add_style_tag(content=(ROOT/'src/styles/main.css').read_text(encoding='utf-8'))
            self.page.add_style_tag(content=(ROOT/'dist/appearance.css').read_text(encoding='utf-8'))
            self.page.add_script_tag(content=(ROOT/'.qa/render-bundle.js').read_text(encoding='utf-8'))
        else:
            self.page.goto(URL,wait_until='networkidle')
        expect(self.page.get_by_role('dialog')).to_be_visible()

    def tearDown(self):
        if self.errors:
            print('Browser errors:',self.errors)
        self.context.close()
        self.assertEqual(self.errors,[])

    def onboard(self,starter=False):
        self.page.get_by_role('button',name='Use starter routine' if starter else 'Explore first',exact=True).click()
        expect(self.page.get_by_role('dialog')).to_have_count(0)

    def route(self,path):
        self.page.evaluate('(p)=>location.hash=p',path)
        self.page.wait_for_timeout(80)
        self.assertNotIn('This view could not open.',self.page.locator('body').inner_text())

    def read(self,expression):
        if OPTIONS.render:
            return self.page.evaluate("async (expr)=>{const load=__qa.load;return await (new Function('load','return ('+expr+')'))(load)}",expression)
        # Expressions have synchronous load references; load only the known module set first.
        return self.page.evaluate("async (expr)=>{const names=['app/store.js','practice/controller.js','db/database.js','db/backup.js','domain/analytics.js','audio/engine.js','domain/models.js','practice/logic.js','db/seed.js','app/profiles.js','audio/reference.js','domain/protocols.js'];const entries=await Promise.all(names.map(async id=>[id,await import('./app/'+id)]));const modules=Object.fromEntries(entries);return await (new Function('load','return ('+expr+')'))(id=>modules[id]);}",expression)

    def dialog_fill(self,name,value):
        self.page.locator('dialog[open]').last.get_by_label(name,exact=True).fill(str(value))

    def save_dialog(self,label='Save'):
        d=self.page.locator('dialog[open]').last
        d.get_by_role('button',name=label,exact=True).click()
        expect(self.page.locator('dialog[open]')).to_have_count(0)

    def confirm(self,label):
        self.page.locator('dialog[open]').last.get_by_role('button',name=label,exact=True).click()
        expect(self.page.locator('dialog[open]')).to_have_count(0)

    def create_song(self,title='Original rehearsal song',bpm=72):
        self.route('/songs')
        self.page.get_by_role('button',name='Add song',exact=True).first.click()
        self.dialog_fill('Title',title)
        self.dialog_fill('BPM',bpm)
        self.save_dialog('Save song')
        expect(self.page.get_by_role('heading',name=title,exact=True)).to_be_visible()
        return self.read("load('app/store.js').store.snapshot().songs.find(s=>s.title==="+json.dumps(title)+").id")

    def capture_populated(self,name):
        for close in self.page.get_by_role('button',name='Dismiss notification',exact=True).all():close.click()
        for width,height in [(390,844),(1440,900)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width,name)
            self.page.screenshot(path=str(ARTIFACTS/f'{name}-{width}.png'),full_page=True)
        self.page.set_viewport_size({'width':1440,'height':900})

    def finish(self):
        self.page.get_by_role('button',name='Finish session',exact=True).click()
        self.confirm('Finish session')
        expect(self.page.get_by_role('heading',name='Session complete.',exact=True)).to_be_visible()

    def start(self):
        self.page.get_by_role('button',name=re.compile(r'^(Start practice|Resume practice)$')).click()
        expect(self.page.get_by_role('button',name='Pause practice',exact=True)).to_be_visible()
        self.page.wait_for_timeout(150)

    def test_01_rudiment_result_notes_progress(self):
        self.onboard()
        self.page.get_by_role('navigation',name='Main navigation',exact=True).get_by_role('link',name='Library',exact=True).click()
        self.page.get_by_role('link',name='Double Stroke Roll',exact=True).click()
        self.page.get_by_label('Target clean BPM',exact=True).fill('120')
        self.page.get_by_label('Target clean BPM',exact=True).press('Tab')
        self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.page.get_by_label('BPM',exact=True).fill('105')
        self.page.get_by_label('BPM',exact=True).press('Tab')
        self.start()
        self.page.get_by_role('button',name='Clean',exact=True).click()
        self.page.get_by_role('button',name='Quick note',exact=True).click()
        self.dialog_fill('What did you notice?','Left hand stayed relaxed at 105.')
        self.save_dialog('Save note')
        self.finish()
        expect(self.page.get_by_text('New best clean tempo: 105 BPM',exact=True)).to_be_visible()
        self.route('/progress')
        self.page.get_by_label('Progress exercise',exact=True).select_option('rudiment-2')
        expect(self.page.get_by_text('105 BPM',exact=True).first).to_be_visible()
        self.assertEqual(self.read("load('domain/analytics.js').calculateBestCleanBpm(load('domain/analytics.js').exerciseAttempts(load('app/store.js').store.snapshot().sessions,'rudiment-2'))"),105)
        self.capture_populated('progress-populated')
        self.route('/library/rudiment-2')
        self.assertIn('Left hand stayed relaxed at 105.',self.page.locator('body').inner_text())
        self.assertEqual(self.read("load('app/store.js').store.snapshot().exercises.find(e=>e.id==='rudiment-2').targetBpm"),120)

    def test_02_today_inline_edit_and_reorder(self):
        self.onboard(True)
        before=self.read("load('app/store.js').store.snapshot().dailyPlans[0].blocks.map(b=>b.title)")
        self.page.get_by_label('Double Stroke Roll duration in minutes',exact=True).fill('12')
        self.page.get_by_label('Double Stroke Roll duration in minutes',exact=True).press('Tab')
        self.page.get_by_role('button',name='Block options for Double Stroke Roll',exact=True).click()
        self.page.get_by_role('button',name='Move Double Stroke Roll up',exact=True).click()
        after=self.read("load('app/store.js').store.snapshot().dailyPlans[0].blocks")
        self.assertEqual(after[1]['title'],before[2]);self.assertEqual(after[1]['targetSeconds'],720)
        self.page.get_by_role('button',name='Start full session',exact=True).click()
        self.start()
        self.page.get_by_role('button',name='Finish block',exact=True).click()
        self.page.get_by_role('button',name='Skip block',exact=True).click()
        self.start();self.page.get_by_role('button',name='Finish block',exact=True).click()
        self.start();self.page.get_by_role('button',name='Finish block',exact=True).click()
        expect(self.page.get_by_role('heading',name='Session complete.',exact=True)).to_be_visible()
        states=self.read("load('app/store.js').store.snapshot().sessions[0].blocks.map(b=>[b.completed,b.skipped])")
        self.assertEqual(states,[[True,False],[False,True],[True,False],[True,False]])

    def test_03_custom_exercise_edit_archive(self):
        self.onboard();self.route('/library')
        self.page.get_by_role('button',name='New exercise',exact=True).click()
        self.dialog_fill('Name','Quiet hand control')
        self.dialog_fill('Practice instructions','Keep both hands relaxed.')
        self.save_dialog('Save exercise')
        self.page.get_by_role('button',name='Edit',exact=True).click()
        self.dialog_fill('Target clean BPM',140);self.save_dialog('Save exercise')
        self.page.get_by_role('button',name='Archive exercise',exact=True).click()
        self.assertTrue(self.read("load('app/store.js').store.snapshot().exercises.find(e=>e.name==='Quiet hand control').archived"))
        self.page.get_by_role('button',name='Restore exercise',exact=True).click()
        self.assertFalse(self.read("load('app/store.js').store.snapshot().exercises.find(e=>e.name==='Quiet hand control').archived"))

    def test_04_song_sections_and_transition(self):
        self.onboard();song_id=self.create_song()
        for title in ['Intro','Verse','Chorus']:
            self.page.get_by_role('button',name='Add section',exact=True).click()
            self.dialog_fill('Section name',title)
            self.dialog_fill('Section notes','Open the hi-hat slightly.' if title=='Chorus' else 'Stay relaxed.')
            self.save_dialog('Save section')
        self.capture_populated('song-populated')
        self.page.get_by_role('button',name='Practice Chorus',exact=True).click()
        self.start();self.finish();self.route('/songs/'+song_id)
        self.assertIn('Original rehearsal song · Chorus',self.page.locator('body').inner_text())
        self.page.get_by_role('button',name='Practice transition',exact=True).click()
        self.save_dialog('Start transition')
        self.start();self.finish()
        self.assertIn('Intro → Verse',self.page.locator('body').inner_text())

    def test_05_routine_creation_four_blocks_and_duplication(self):
        self.onboard();self.route('/routines')
        self.page.get_by_role('button',name='New routine',exact=True).click()
        self.dialog_fill('Name','Four-block rehearsal')
        self.save_dialog('Save routine')
        for _ in range(4):
            self.page.get_by_role('button',name='Add block',exact=True).click()
            self.save_dialog('Add block')
        self.assertEqual(len(self.read("load('app/store.js').store.snapshot().routines.find(r=>r.name==='Four-block rehearsal').blocks")),4)
        self.page.get_by_role('button',name='Duplicate routine',exact=True).click()
        self.assertEqual(len(self.read("load('app/store.js').store.snapshot().routines.filter(r=>r.name.startsWith('Four-block rehearsal'))")),2)

    def test_06_setlist_generates_editable_routine(self):
        self.onboard()
        for title in ['Original A','Original B','Original C']:self.create_song(title)
        self.route('/setlists');self.page.get_by_role('button',name='New setlist',exact=True).first.click()
        self.dialog_fill('Name','Sunday rehearsal');self.save_dialog('Save setlist')
        for title in ['Original A','Original B','Original C']:
            self.page.get_by_role('button',name='Add song',exact=True).click()
            self.page.locator('dialog[open]').get_by_label('Song',exact=True).select_option(label=title)
            self.save_dialog('Add song')
            expect(self.page.locator('dialog[open]')).to_have_count(0)
        self.page.get_by_role('button',name='Move Original C up',exact=True).click()
        self.capture_populated('setlist-populated')
        self.page.get_by_role('button',name='Generate practice routine',exact=True).click()
        self.save_dialog('Generate routine')
        generated=self.read("load('app/store.js').store.snapshot().routines.find(r=>r.name.includes('Sunday rehearsal'))")
        self.assertEqual([b['title'] for b in generated['blocks']],['Original A','Original C','Original B'])
        self.page.get_by_role('button',name='Edit details',exact=True).click()
        self.dialog_fill('Name','Ready for Sunday');self.save_dialog('Save routine')

    def test_07_goals_live_progress_and_manual_completion(self):
        self.onboard();self.route('/goals')
        self.page.get_by_role('button',name='New goal',exact=True).first.click()
        self.dialog_fill('Goal title','Relaxed double strokes')
        self.page.locator('dialog[open]').get_by_label('Exercise',exact=True).select_option('rudiment-2')
        self.dialog_fill('Target',120);self.save_dialog('Save goal')
        self.assertIn('120 clean BPM',self.page.locator('body').inner_text())
        self.page.get_by_role('button',name='New goal',exact=True).first.click()
        self.page.locator('dialog[open]').get_by_label('Goal type',exact=True).select_option('custom')
        self.dialog_fill('Goal title','Memorize the form');self.save_dialog('Save goal')
        self.page.get_by_role('button',name='Mark complete',exact=True).click()
        self.capture_populated('goals-populated')
        self.assertTrue(self.read("load('app/store.js').store.snapshot().goals.find(g=>g.title==='Memorize the form').completed"))

    def test_08_metronome_presets_countin_and_controls(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_label('BPM',exact=True).fill('120');self.page.get_by_label('BPM',exact=True).press('Tab')
        self.page.get_by_label('Time signature',exact=True).select_option('6/8')
        self.page.get_by_label('Subdivision',exact=True).select_option('2')
        self.page.get_by_label('Count-in',exact=True).select_option('1')
        self.page.get_by_role('button',name=re.compile('Beat 2')).click()
        self.page.get_by_role('button',name='Save current',exact=True).click()
        self.dialog_fill('Preset name','Rehearsal 6/8');self.save_dialog('Save preset')
        self.page.get_by_role('button',name='Start metronome',exact=True).click()
        expect(self.page.get_by_role('button',name='Pause metronome',exact=True)).to_be_visible()
        self.page.wait_for_timeout(350)
        self.page.get_by_role('button',name='Pause metronome',exact=True).click()
        self.page.get_by_label('BPM',exact=True).fill('100');self.page.get_by_label('BPM',exact=True).press('Tab')
        self.page.get_by_role('button',name='Rehearsal 6/8',exact=True).click()
        expect(self.page.get_by_label('BPM',exact=True)).to_have_value('120')
        self.assertEqual(self.read("load('app/store.js').store.snapshot().metronomePresets[0].config.countIn"),1)

    def test_09_pause_and_trainer_modes(self):
        self.onboard();self.route('/library/rudiment-2');self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.page.get_by_role('button',name='Tempo trainer',exact=True).click()
        self.page.locator('dialog[open]').get_by_label('Training mode',exact=True).select_option('progressive')
        self.dialog_fill('Every (active seconds)',1)
        self.save_dialog('Use trainer')
        self.start();self.page.wait_for_timeout(1250)
        self.assertGreaterEqual(self.read("load('practice/controller.js').practice.session.runtime.bpm"),85)
        self.page.get_by_role('button',name='Pause practice',exact=True).click()
        before=self.read("load('practice/controller.js').practice.elapsed()")
        self.page.wait_for_timeout(700)
        self.assertEqual(self.read("load('practice/controller.js').practice.elapsed()"),before)
        self.page.get_by_role('button',name='Tempo trainer',exact=True).click()
        self.page.locator('dialog[open]').get_by_label('Training mode',exact=True).select_option('repetition')
        self.save_dialog('Use trainer')
        self.page.get_by_role('button',name='Resume practice',exact=True).click()
        for _ in range(3):self.page.get_by_role('button',name='Clean',exact=True).click()
        self.finish()

    def test_10_search_keyboard_and_unsaved_forms(self):
        self.onboard();self.page.keyboard.press('Control+k')
        self.page.get_by_label('Search everything',exact=True).fill('Double Stroke Roll')
        self.page.keyboard.press('Enter')
        expect(self.page.get_by_role('heading',name='Double Stroke Roll',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Edit',exact=True).click()
        self.dialog_fill('Name','Unsaved replacement')
        self.page.keyboard.press('Escape')
        expect(self.page.get_by_role('dialog',name='Discard unsaved changes?',exact=True)).to_be_visible()
        self.page.locator('dialog[open]').last.get_by_role('button',name='Cancel',exact=True).click()
        self.assertEqual(self.page.locator('dialog[open]').count(),1)
        self.page.keyboard.press('Escape');self.page.locator('dialog[open]').last.get_by_role('button',name='Discard changes',exact=True).click()
        expect(self.page.locator('dialog[open]')).to_have_count(0)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().exercises.find(e=>e.id==='rudiment-2').name"),'Double Stroke Roll')
        self.route('/settings');self.page.get_by_label('Default BPM',exact=True).fill('150');self.route('/library')
        expect(self.page.get_by_role('dialog',name='Discard unsaved preferences?',exact=True)).to_be_visible()
        self.confirm('Discard edits')
        expect(self.page.get_by_role('heading',name='Exercise library',exact=True)).to_be_visible()

    def test_11_backup_validation_ui(self):
        self.onboard();self.route('/settings')
        file=self.page.get_by_label('Choose backup file',exact=True)
        file.set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{"format":"music-practice-os","version":999}'})
        expect(self.page.get_by_role('alert')).to_contain_text('unsupported')
        self.assertEqual(self.read("load('app/store.js').store.snapshot().exercises.length"),30)
        backup=self.read("load('db/backup.js').createBackup(load('app/store.js').store.snapshot())")
        file.set_input_files({'name':'valid.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.page.locator('dialog[open]').get_by_role('button',name='Cancel',exact=True).click()
        self.assertEqual(self.read("load('app/store.js').store.snapshot().exercises.length"),30)

    def test_12_mobile_practice_critical_controls_visible(self):
        self.onboard();self.route('/library/rudiment-2');self.page.get_by_role('button',name='Start practice',exact=True).click()
        for close in self.page.get_by_role('button',name='Dismiss notification',exact=True).all():close.click()
        for width,height in [(360,800),(390,844),(430,932),(768,1024),(1440,900),(1920,1080)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.wait_for_timeout(50)
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
            if width<500:
                for label in ['BPM']:
                    box=self.page.get_by_label(label,exact=True).bounding_box();self.assertLess(box['y']+box['height'],height)
                box=self.page.get_by_role('button',name='Start practice',exact=True).bounding_box();self.assertLess(box['y']+box['height'],height)
            self.page.screenshot(path=str(ARTIFACTS/f'active-practice-{width}.png'),full_page=True)

    def test_13_responsive_routes_and_accessible_controls(self):
        self.onboard(True)
        for close in self.page.get_by_role('button',name='Dismiss notification',exact=True).all():close.click()
        routes=['/','/practice','/metronome','/library','/library/rudiment-2','/routines','/routines/routine-1','/songs','/setlists','/goals','/progress','/history','/settings']
        sizes=[(360,800),(390,844),(430,932),(768,1024),(1440,900),(1920,1080)] if OPTIONS.visual else [(390,844),(1440,900)]
        for width,height in sizes:
            self.page.set_viewport_size({'width':width,'height':height})
            for route in routes:
                self.route(route)
                self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width,f'{route} overflows at {width}')
                self.assertEqual(self.page.locator('h1').count(),1,route)
                unnamed=self.page.evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')).length")
                self.assertEqual(unnamed,0,route)
                if OPTIONS.visual or route in ['/','/library','/metronome']:
                    self.page.screenshot(path=str(ARTIFACTS/f'{route.strip("/").replace("/","-") or "today"}-{width}.png'),full_page=True)
        self.route('/settings');self.page.get_by_role('button',name='Dark',exact=True).click()
        self.page.set_viewport_size({'width':1440,'height':900})
        for close in self.page.get_by_role('button',name='Dismiss notification',exact=True).all():close.click()
        self.route('/metronome');self.page.screenshot(path=str(ARTIFACTS/'metronome-dark.png'),full_page=True)
        self.route('/');self.page.screenshot(path=str(ARTIFACTS/'today-dark.png'),full_page=True)

    def test_14_reload_recovery_real_indexeddb(self):
        if OPTIONS.render:self.skipTest('Requires real origin/IndexedDB; in-document harness is not persistence verification.')
        self.onboard();self.route('/practice');self.page.get_by_role('button',name='Start free practice',exact=True).click();self.start();self.page.wait_for_timeout(5300)
        self.page.reload(wait_until='networkidle')
        expect(self.page.get_by_text('Saved session recovered.',exact=True)).to_be_visible()
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'paused')
        self.page.get_by_role('button',name='End and keep history',exact=True).click();self.confirm('End session')
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].status"),'abandoned')

    def test_15_offline_service_worker_real_origin(self):
        if OPTIONS.render:self.skipTest('Requires network navigation and a real service worker; not verified by memory harness.')
        self.onboard();self.page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
        self.page.reload(wait_until='networkidle');self.context.set_offline(True)
        self.page.reload(wait_until='domcontentloaded')
        expect(self.page.get_by_role('heading',name='Today',exact=True)).to_be_visible()
        self.route('/library');expect(self.page.get_by_role('link',name='Double Stroke Roll',exact=True)).to_be_visible()
        self.route('/metronome');self.page.get_by_role('button',name='Start metronome',exact=True).click();expect(self.page.get_by_role('button',name='Pause metronome',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Pause metronome',exact=True).click()
        self.route('/practice');self.page.get_by_role('button',name='Start free practice',exact=True).click();self.start();self.finish()
        self.page.reload(wait_until='domcontentloaded')
        self.assertEqual(len(self.read("load('app/store.js').store.snapshot().sessions")),1)

    def test_16_backup_download_restore_real_storage(self):
        if OPTIONS.render:self.skipTest('Real downloads/transactional restore require an allowed localhost origin.')
        self.onboard();self.create_song('Restore this song');self.route('/settings')
        with self.page.expect_download() as dl:self.page.get_by_role('button',name='Export backup',exact=True).click()
        target=ARTIFACTS/'browser-backup.json';dl.value.save_as(target)
        data=json.loads(target.read_text(encoding='utf-8'));self.assertEqual(data['format'],'music-practice-os')
        self.read("load('db/database.js').replaceData({...load('app/store.js').store.snapshot(),songs:[]})")
        self.page.reload(wait_until='networkidle');self.page.get_by_label('Choose backup file',exact=True).set_input_files(str(target))
        self.confirm('Back up & replace')
        self.page.wait_for_timeout(500)
        self.assertEqual(len(self.read("load('app/store.js').store.snapshot().songs")),1)


    def test_17_real_webaudio_schedule_and_stop(self):
        self.onboard();self.route('/metronome')
        self.page.evaluate("""()=>{window.__scheduled=[];const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const node=original.call(this),start=node.start.bind(node);node.start=function(time){window.__scheduled.push(time);return start(time);};return node;};}""")
        self.page.get_by_label('BPM',exact=True).fill('120');self.page.get_by_label('BPM',exact=True).press('Tab')
        self.page.get_by_label('Subdivision',exact=True).select_option('4')
        self.page.get_by_role('button',name='Start metronome',exact=True).click()
        self.page.wait_for_timeout(1000)
        self.page.get_by_role('button',name='Pause metronome',exact=True).click()
        events=self.page.evaluate('__scheduled')
        self.assertGreaterEqual(len(events),8)
        for a,b in zip(events,events[1:]):self.assertAlmostEqual(b-a,.125,places=8)
        self.page.wait_for_timeout(250)
        self.assertEqual(len(self.page.evaluate('__scheduled')),len(events))

    def test_18_countin_excluded_and_cancelled_safely(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_label('Count-in',exact=True).select_option('1')
        self.route('/practice');self.page.get_by_label('Free practice BPM',exact=True).fill('300')
        self.page.get_by_role('button',name='Start free practice',exact=True).click()
        self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.page.wait_for_timeout(180)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'countin')
        self.assertEqual(self.read("load('practice/controller.js').practice.elapsed()"),0)
        self.page.get_by_role('button',name='Pause practice',exact=True).click()
        self.page.wait_for_timeout(1100)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'paused')
        self.assertEqual(self.read("load('practice/controller.js').practice.elapsed()"),0)
        self.page.get_by_role('button',name='Resume practice',exact=True).click()
        self.page.wait_for_timeout(1100)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'running')
        elapsed=self.read("load('practice/controller.js').practice.elapsed()")
        self.assertGreater(elapsed,0);self.assertLess(elapsed,.6)
        self.finish()

    def test_19_drag_reorder_and_keyboard_skip_link(self):
        self.onboard(True)
        original=self.read("load('app/store.js').store.snapshot().dailyPlans[0].blocks.map(b=>b.id)")
        self.assertTrue(self.page.locator('.drag-handle').first.evaluate('(el)=>el.draggable'))
        self.page.locator('.block-row').nth(0).locator('.drag-handle').drag_to(self.page.locator('.block-row').nth(2))
        self.assertEqual(self.read("load('app/store.js').store.snapshot().dailyPlans[0].blocks.map(b=>b.id)"),[original[1],original[2],original[0],original[3]])
        self.page.locator('.skip-link').focus();self.page.keyboard.press('Enter')
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'main')
        self.assertNotIn('Page not found.',self.page.locator('body').inner_text())

    def test_20_recovery_choices_retain_or_discard_only_current_session(self):
        # A tempo attempt now belongs to a tempo task, not untimed free practice.
        self.onboard();self.route('/library/rudiment-2')
        self.page.get_by_role('button',name='Start practice',exact=True).click();self.start()
        self.page.get_by_role('button',name='Clean',exact=True).click()
        self.page.get_by_role('button',name='Save & leave',exact=True).click()
        self.read("load('practice/controller.js').practice.recover()")
        self.route('/practice/active')
        expect(self.page.get_by_text('Saved session recovered.',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='End and keep history',exact=True).click();self.confirm('End session')
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].status"),'abandoned')
        self.route('/practice');self.page.get_by_role('button',name='Start free practice',exact=True).click()
        self.read("load('practice/controller.js').practice.recover()")
        self.route('/practice');self.route('/practice/active')
        self.page.get_by_role('button',name='Discard saved session',exact=True).click();self.confirm('Discard session')
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions.length"),1)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].blocks[0].tempoAttempts.length"),1)

    def test_21_completed_history_ignores_practice_shortcuts(self):
        # A tempo attempt now belongs to a tempo task, not untimed free practice.
        self.onboard();self.route('/library/rudiment-2')
        self.page.get_by_role('button',name='Start practice',exact=True).click();self.start()
        self.page.get_by_role('button',name='Clean',exact=True).click();self.finish()
        before=self.read("JSON.stringify(load('app/store.js').store.snapshot().sessions[0])")
        self.page.locator('h1').click()
        for key in ['ArrowUp','Shift+ArrowUp','ArrowDown','Space','n']:
            self.page.keyboard.press(key)
        self.page.wait_for_timeout(180)
        self.assertEqual(before,self.read("JSON.stringify(load('app/store.js').store.snapshot().sessions[0])"))
        self.assertFalse(self.read("load('audio/engine.js').audio.running"))
        expect(self.page.get_by_role('dialog')).to_have_count(0)

    def test_22_countin_completes_after_main_thread_stall(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_label('Count-in',exact=True).select_option('1')
        self.route('/practice');self.page.get_by_label('Free practice BPM',exact=True).fill('300')
        self.page.get_by_role('button',name='Start free practice',exact=True).click()
        self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'countin')
        # Deliberately miss the first non-count-in scheduling callback. Audio time still advances.
        self.page.evaluate('()=>{const until=performance.now()+1250;while(performance.now()<until){}}')
        self.page.wait_for_timeout(130)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'running')
        elapsed=self.read("load('practice/controller.js').practice.elapsed()")
        self.assertGreater(elapsed,.2);self.assertLess(elapsed,1.5)
        self.finish()

    def test_23_cancelled_audio_resume_cannot_disrupt_new_start(self):
        self.onboard()
        self.read("""(()=>{
            const engine=load('audio/engine.js').audio,config=load('domain/models.js').DEFAULT_METRONOME;
            const original=AudioContext.prototype.resume;window.__resumes=[];
            AudioContext.prototype.resume=function(){const context=this;return new Promise((resolve,reject)=>{
                window.__resumes.push(()=>original.call(context).then(resolve,reject));
            });};
            window.__firstStart=engine.start(config);engine.stop();window.__secondStart=engine.start(config);
            return window.__resumes.length;
        })()""")
        self.assertEqual(self.page.evaluate('__resumes.length'),2)
        self.page.evaluate('async()=>{await __resumes[1]();await __secondStart;}')
        self.assertTrue(self.read("load('audio/engine.js').audio.running"))
        self.page.evaluate('async()=>{await __resumes[0]();await __firstStart;}')
        self.assertTrue(self.read("load('audio/engine.js').audio.running"))
        self.read("load('audio/engine.js').audio.stop()")

    def test_24_saving_defaults_preserves_custom_accents(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_role('button',name='Beat 1: accent. Click to change.',exact=True).click()
        self.page.get_by_role('button',name='Beat 2: normal. Click to change.',exact=True).click()
        self.page.wait_for_timeout(300)
        expected=self.read("load('app/store.js').store.snapshot().settings.metronome.accents")
        self.route('/settings')
        self.page.get_by_label('Default BPM',exact=True).fill('104')
        self.page.get_by_role('button',name='Save preferences',exact=True).click()
        self.assertEqual(self.read("load('app/store.js').store.snapshot().settings.metronome.accents"),expected)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().settings.metronome.bpm"),104)

    def test_25_stale_session_command_rechecks_committed_history(self):
        self.onboard();self.route('/practice')
        self.page.get_by_role('button',name='Start free practice',exact=True).click();self.start()
        message=self.read("""(async()=>{
            const controller=load('practice/controller.js').practice,db=load('db/database.js');
            await db.updateSession(controller.session.id,s=>{
                s=load('practice/logic.js').pauseSession(s);s.status='completed';s.endedAt=new Date().toISOString();
                s.blocks[0].completed=true;return s;
            });
            try{await controller.setBpm(200);return 'incorrectly accepted';}catch(error){return error.message;}
        })()""")
        self.assertIn('already ended',message)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].blocks[0].finalBpm"),80)
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].status"),'completed')
        self.assertFalse(self.read("load('audio/engine.js').audio.running"))

    def test_26_two_queued_finishes_cannot_skip_the_next_block(self):
        self.onboard(True);self.route('/practice')
        self.page.get_by_role('button',name="Start today’s plan",exact=True).click()
        results=self.read("""(async()=>{
            const controller=load('practice/controller.js').practice;
            return (await Promise.allSettled([controller.finishBlock(),controller.finishBlock()])).map(r=>r.status);
        })()""")
        self.assertEqual(results,['fulfilled','rejected'])
        self.assertEqual(self.read("load('app/store.js').store.snapshot().sessions[0].activeBlockIndex"),1)
        self.assertFalse(self.read("load('app/store.js').store.snapshot().sessions[0].blocks[1].completed"))

    def test_27_browser_modified_shortcuts_do_not_change_tempo(self):
        self.onboard();self.route('/metronome');self.page.locator('h1').click()
        for key in ['Control+ArrowUp','Alt+ArrowUp','Meta+ArrowUp']:
            self.page.keyboard.press(key)
        self.assertEqual(self.page.get_by_label('BPM',exact=True).input_value(),'80')

    def test_28_chart_peak_uses_recorded_seconds_not_scale_minimum(self):
        self.onboard();self.route('/practice')
        self.page.get_by_role('button',name='Start free practice',exact=True).click();self.start();self.finish()
        self.read("""(async()=>{
            const store=load('app/store.js').store,s=store.snapshot().sessions[0];
            await load('db/database.js').updateSession(s.id,row=>{row.blocks[0].actualActiveSeconds=12;return row;});
            await store.refresh();
        })()""")
        self.route('/progress')
        expect(self.page.get_by_text('Daily peak: 12 sec',exact=True)).to_be_visible()
        self.assertNotIn('Peak: 1.0 min',self.page.locator('body').inner_text())

    def test_29_dialog_focus_does_not_steal_a_chosen_field(self):
        self.onboard();self.create_song()
        expect(self.page.get_by_role('button',name='Add section',exact=True)).to_be_visible()
        # Choose the notes field during the same event task that opens the dialog.
        # A deferred autofocus callback must not move focus back to the name field.
        self.page.evaluate("""()=>{
            [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Add section').click();
            document.querySelector('dialog[open] textarea').focus();
        }""")
        self.page.wait_for_timeout(120)
        expect(self.page.get_by_label('Section notes',exact=True)).to_be_focused()
        self.page.keyboard.insert_text('Keep the hands relaxed.')
        self.assertEqual(self.page.get_by_label('Section notes',exact=True).input_value(),'Keep the hands relaxed.')
        self.assertEqual(self.page.get_by_label('Section name',exact=True).input_value(),'')

if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(MusicPracticeTests)
    if OPTIONS.test:
        suite=unittest.TestSuite(t for t in suite if OPTIONS.test in t.id())
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    summary={'mode':'in-document rendered UI with validated memory storage' if OPTIONS.render else 'real origin / production build','run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'skip_reasons':[reason for _,reason in result.skipped],'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    (ARTIFACTS/('ui-results.json' if OPTIONS.render else 'e2e-results.json')).write_text(json.dumps(summary,indent=2))
    raise SystemExit(0 if result.wasSuccessful() else 1)
