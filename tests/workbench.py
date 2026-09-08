"""Research-led UI regression suite. Fixtures only exist in isolated test contexts.

--render explicitly substitutes test storage. It is not an offline/persistence test.
Default runs the production build on a real origin; CI also tests native capabilities
in Chromium, Firefox and WebKit. Lab latency samples are not field INP claims.
"""
from __future__ import annotations
import json
import re
import unittest
import e2e
from playwright.sync_api import expect

SIZES=((1280,720),(1366,768),(1440,900),(1920,1080),(768,1024),(820,1180),(1024,768),(1024,1366),(320,568),(360,800),(375,812),(390,844),(412,915),(430,932))
ROUTES=('/', '/practice','/metronome','/library','/routines','/songs','/setlists','/goals','/progress','/history','/profiles','/settings')

class Workbench(e2e.MusicPracticeTests):
    def populate(self):
        self.onboard(True)
        self.read("""(async()=>{
            const d=structuredClone(load('app/store.js').store.snapshot());
            let sequence=0;const id=()=>`qa-fixture-${++sequence}`;
            const meta=()=>({id:id(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
            d.songs=['Evening rehearsal','Quiet Waters','Open Hands','The Long Way Home'].map((title,i)=>({...meta(),title,artist:i===0?'Sunday set':'Practice arrangement',bpm:72+i*12,meter:{beats:4,beatUnit:4},key:['D','G','C','A'][i],difficulty:2,status:i===1?'performance-ready':'practicing',notes:'Keep transitions steady. Follow the arrangement.',sections:[{id:id(),name:'Verse',bars:8,notes:'Light touch; leave space.',order:0},{id:id(),name:'Chorus',bars:8,bpmOverride:80,notes:'Keep the pulse through the transition.',order:1}]}));
            d.setlists=[{...meta(),name:'Sunday rehearsal',date:new Date().toISOString().slice(0,10),songIds:d.songs.map(s=>s.id),notes:'Opening set · transitions and dynamics.'}];
            d.goals=[{...meta(),type:'bpm',title:'Double strokes at 110 BPM',description:'Even hands, no tension.',exerciseId:'rudiment-2',targetValue:110,unit:'BPM',completed:false},{...meta(),type:'weekly-sessions',title:'Three sessions this week',description:'Short, focused practice.',targetValue:3,unit:'sessions',completed:false},{...meta(),type:'song-mastery',title:'Prepare Quiet Waters',description:'Ready for rehearsal.',songId:d.songs[1].id,targetValue:1,unit:'song',completed:false}];
            d.sessions=Array.from({length:12},(_,i)=>{
                const s=load('practice/logic.js').createSession(d.routines.find(r=>r.id==='routine-1').blocks,d),day=new Date();day.setDate(day.getDate()-i);
                const at=day.toISOString();s.status='completed';s.createdAt=at;s.updatedAt=at;s.startedAt=at;s.endedAt=at;s.runtime.phase='paused';
                s.blocks.forEach((b,j)=>{b.actualActiveSeconds=240+j*30;b.completed=true;if(b.protocolSnapshot.kind==='tempo'){b.finalBpm=90-i;b.tempoAttempts=[{id:id(),bpm:90-i,rating:j===0?'messy':'clean',timestamp:at,note:''}];}b.notes=j===1?'Keep the left hand relaxed.':'';});return s;
            });
            await load('db/database.js').replaceData(d);await load('app/store.js').store.refresh();
        })()""")
        return self.read("({song:load('app/store.js').store.snapshot().songs[0].id,setlist:load('app/store.js').store.snapshot().setlists[0].id,routine:load('app/store.js').store.snapshot().routines.find(r=>r.id==='routine-1').id,session:load('app/store.js').store.snapshot().sessions[0].id})")

    def assert_bounds(self,width):
        self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width+1)
        clipped=self.page.evaluate("""()=>[...document.querySelectorAll('button,input,select,a')].filter(e=>{
            if(e.classList.contains('skip-link'))return false;const r=e.getBoundingClientRect();
            return r.width>0&&r.height>0&&(r.left<-.5||r.right>innerWidth+.5);
        }).map(e=>e.getAttribute('aria-label')||e.textContent.trim())""")
        self.assertEqual(clipped,[])

    def test_40_exact_requested_viewports_and_populated_routes(self):
        ids=self.populate()
        paths=(*ROUTES,'/library/rudiment-2',f'/routines/{ids["routine"]}',f'/songs/{ids["song"]}',f'/setlists/{ids["setlist"]}',f'/history/{ids["session"]}')
        results=[]
        for width,height in SIZES:
            self.page.set_viewport_size({'width':width,'height':height})
            for path in paths:
                with self.subTest(viewport=(width,height),path=path):
                    self.route(path);expect(self.page.locator('h1')).to_have_count(1);self.assert_bounds(width)
                    results.append({'width':width,'height':height,'route':path,'overflow':False})
                    if width in (390,820,1440):
                        name=(path.strip('/').split('/')[0] or 'today')+('-detail' if path.count('/')>1 else '')
                        self.page.locator('#notifications').evaluate('(e)=>e.replaceChildren()');self.page.mouse.move(0,0)
                        self.page.screenshot(path=str(e2e.ARTIFACTS/f'workbench-{name}-{width}.png'),full_page=False)
        (e2e.ARTIFACTS/'workbench-layout-results.json').write_text(json.dumps(results,indent=2))

    def test_41_active_core_actions_visible_and_readable(self):
        self.onboard(True);self.page.get_by_role('button',name='Start full session',exact=True).click();self.start()
        expect(self.page.locator('#notifications .toast:not(.error)')).to_have_count(0)
        checks=[]
        for width,height in SIZES:
            with self.subTest(viewport=(width,height)):
                self.page.set_viewport_size({'width':width,'height':height});self.page.evaluate('window.scrollTo(0,0)')
                self.assert_bounds(width)
                for label in ('Pause practice','Metronome on','Clean','Finish block','Skip block'):
                    button=self.page.get_by_role('button',name=label,exact=True);box=button.bounding_box();self.assertIsNotNone(box)
                    self.assertLessEqual(box['y']+box['height'],height+1,f'{width} {label} {box}')
                    self.assertGreaterEqual(box['height'],44)
                font=self.page.get_by_label('BPM',exact=True).evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)');self.assertGreaterEqual(font,37)
                checks.append({'width':width,'height':height,'coreActionsInViewport':True})
                if width in (320,390,820,1440):
                    self.page.mouse.move(0,0);self.page.screenshot(path=str(e2e.ARTIFACTS/f'workbench-active-{width}.png'))
        (e2e.ARTIFACTS/'active-layout-results.json').write_text(json.dumps(checks,indent=2))

    def test_42_library_large_collection_retains_context(self):
        self.onboard()
        self.read("""(async()=>{const d=structuredClone(load('app/store.js').store.snapshot()),e=d.exercises[0];d.exercises.push(...Array.from({length:2000},(_,i)=>({...e,id:'qa-exercise-'+i,name:'Study '+String(i).padStart(4,'0'),builtin:false,category:'technique'})));await load('db/database.js').replaceData(d);await load('app/store.js').store.refresh();})()""")
        self.route('/library');self.assertEqual(self.page.locator('.exercise-card').count(),60)
        self.page.get_by_role('button',name='Show more exercises',exact=True).click();self.assertEqual(self.page.locator('.exercise-card').count(),120)
        search=self.page.get_by_label('Search exercises',exact=True);search.fill('Study 1999')
        expect(self.page.locator('.exercise-card')).to_have_count(1);expect(search).to_be_focused()
        self.page.get_by_role('link',name='Study 1999',exact=True).click();expect(self.page.locator('h1')).to_have_text('Study 1999')
        self.route('/library');expect(search).to_have_value('Study 1999')
        self.page.get_by_role('button',name='Grid',exact=True).click();self.route('/routines');self.route('/library')
        expect(self.page.get_by_role('button',name='Grid',exact=True)).to_have_attribute('aria-pressed','true')
        search.fill('');self.assertEqual(self.page.locator('.exercise-card').count(),60)
        samples=self.page.evaluate("""async()=>{const input=document.querySelector('[aria-label="Search exercises"]'),times=[];for(const q of ['Study','Study 1','Study 19','Study 199','Study 1999','Study 09','Study 0','Study 05','Study 059','']){const start=performance.now();input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));const handler=performance.now()-start;await new Promise(requestAnimationFrame);times.push({query:q,handlerMs:handler,toNextFrameMs:performance.now()-start});}return times;}""")
        self.assertTrue(all(s['handlerMs']<500 for s in samples),samples)
        (e2e.ARTIFACTS/'search-performance-results.json').write_text(json.dumps({'fixtureExercises':2030,'initialRendered':60,'samples':samples,'metric':'synthetic handler and next-frame latency, not field INP'},indent=2))

    def test_43_control_and_secondary_text_contrast(self):
        self.onboard();self.route('/settings');results=[]
        for mode in ('light','dark'):
            self.page.get_by_role('button',name=mode.title(),exact=True).click()
            for accent in ('graphite','blue','forest','plum','amber','rose'):
                self.page.get_by_role('button',name=accent.title()+' accent',exact=True).click()
                expect(self.page.locator('html')).to_have_attribute('data-accent',accent)
                pairs=self.page.evaluate("""()=>{const p=document.createElement('span');document.body.append(p);const lum=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const pairs=[['--faint','--bg',4.5],['--muted','--surface-soft',4.5],['--on-accent','--accent-hover',4.5],['--border-strong','--surface',3],['--border-strong','--bg',3],['--focus','--bg',3],['--chart-ink','--bg',3]];const result=pairs.map(([fg,bg,min])=>{p.style.color=`var(${fg})`;p.style.backgroundColor=`var(${bg})`;const c=getComputedStyle(p),a=lum(c.color),b=lum(c.backgroundColor);return {fg,bg,min,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});p.remove();return result;}""")
                for pair in pairs:self.assertGreaterEqual(pair['ratio'],pair['min'],f'{mode}/{accent} {pair}')
                results.append({'mode':mode,'accent':accent,'pairs':pairs})
                self.page.screenshot(path=str(e2e.ARTIFACTS/f'appearance-{mode}-{accent}.png'))
        (e2e.ARTIFACTS/'control-contrast-results.json').write_text(json.dumps(results,indent=2))

    def test_44_beats_do_not_rebuild_identity_and_queue(self):
        self.onboard(True);self.page.get_by_role('button',name='Start full session',exact=True).click();self.start()
        # Count-in and native AudioContext startup finish asynchronously. Begin
        # the observation window only after both audio and practice are running.
        self.page.bring_to_front()
        ready=False
        for _ in range(70):
            state=self.read("({audio:load('audio/engine.js').audio.running,phase:load('practice/controller.js').practice.session.runtime.phase,error:load('practice/controller.js').practice.error,hidden:document.hidden})")
            if state['audio'] and state['phase']=='running':
                ready=True;break
            self.page.wait_for_timeout(100)
        self.assertTrue(ready,repr(state))
        self.page.evaluate("""()=>{window.__churn=0;window.__observer=new MutationObserver(r=>window.__churn+=r.length);for(const q of ['.active-title','.next-block','.practice-queue'])window.__observer.observe(document.querySelector(q),{subtree:true,childList:true,characterData:true});}""")
        self.page.wait_for_timeout(1300)
        self.assertEqual(self.page.evaluate('window.__churn'),0)
        self.assertTrue(self.read("load('audio/engine.js').audio.running"));self.assertGreater(self.read("load('practice/controller.js').practice.elapsed()"),1)
        self.page.evaluate('window.__observer.disconnect()')
        self.page.get_by_role('button',name='Clean',exact=True).click()
        expect(self.page.get_by_text(re.compile('Recorded .* BPM · clean.'))).to_be_visible()

    def test_45_chart_labels_follow_container_and_filter_changes(self):
        self.populate();self.route('/progress')
        for width in (1440,390,820,320):
            self.page.set_viewport_size({'width':width,'height':900})
            self.page.wait_for_function("()=>[...document.querySelectorAll('figure.chart')].every(f=>Math.abs(f.clientWidth-f.querySelector('svg').viewBox.baseVal.width)<2)")
            self.page.get_by_label('Progress date range',exact=True).select_option('7')
            self.page.wait_for_function("()=>[...document.querySelectorAll('figure.chart')].every(f=>Math.abs(f.clientWidth-f.querySelector('svg').viewBox.baseVal.width)<2)")
            for size in self.page.locator('figure.chart svg text').evaluate_all('(els)=>els.map(e=>parseFloat(getComputedStyle(e).fontSize))'):self.assertGreaterEqual(size,12)
            self.assert_bounds(width)

    def test_46_search_selection_and_dialog_focus(self):
        self.onboard();self.page.set_viewport_size({'width':390,'height':844});self.page.keyboard.press('Control+k')
        search=self.page.get_by_label('Search everything',exact=True);search.fill('Double Stroke')
        selected=self.page.locator('.command-item.highlighted');expect(selected).to_have_count(1);expect(selected).to_have_attribute('aria-current','true')
        expect(self.page.locator('dialog [role="status"]')).to_contain_text('Double Stroke Roll')
        self.assert_bounds(390);self.page.screenshot(path=str(e2e.ARTIFACTS/'workbench-search-390.png'))
        self.page.keyboard.press('Enter');expect(self.page.locator('h1')).to_have_text('Double Stroke Roll')
        self.page.get_by_role('button',name='Edit',exact=True).click();expect(self.page.get_by_role('dialog')).to_be_visible()
        self.assert_bounds(390);self.page.screenshot(path=str(e2e.ARTIFACTS/'workbench-dialog-390.png'))
        self.page.keyboard.press('Escape');expect(self.page.get_by_role('dialog')).to_have_count(0)

    def test_47_long_names_and_narrow_reflow(self):
        self.onboard(True)
        name='A very long exercise title with expressive accents — coordination and relaxed movement'
        self.read("""(async()=>{const d=structuredClone(load('app/store.js').store.snapshot());d.dailyPlans[0].blocks[0].title="""+json.dumps(name)+""";d.exercises.find(e=>e.id===d.dailyPlans[0].blocks[0].exerciseId).name=d.dailyPlans[0].blocks[0].title;await load('db/database.js').replaceData(d);await load('app/store.js').store.refresh();})()""")
        for width in (320,640,768):
            self.page.set_viewport_size({'width':width,'height':720});self.assert_bounds(width)
            self.page.get_by_role('button',name='Block options for '+name,exact=True).click();self.assert_bounds(width)
            self.page.keyboard.press('Escape')
        self.page.emulate_media(reduced_motion='reduce',forced_colors='active');self.assert_bounds(768)
        self.page.get_by_role('button',name='Start full session',exact=True).click();expect(self.page.locator('.active-title')).to_have_text(name)
        self.assert_bounds(768)

    def test_48_touch_targets_and_routine_preview(self):
        self.context.close();self.touch=True;super().setUp();self.onboard(True)
        self.assertTrue(self.page.evaluate("matchMedia('(pointer:coarse)').matches"))
        for width in (320,390,820):
            self.page.set_viewport_size({'width':width,'height':1024});self.route('/')
            self.assert_bounds(width)
            for selector in ('.inline-number','.block-actions button'):
                for box in self.page.locator(selector).evaluate_all('(els)=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))'):
                    self.assertGreaterEqual(box['w'],44);self.assertGreaterEqual(box['h'],44)
            self.route('/routines');preview=self.page.locator('.routine-disclosure summary').first;preview.click()
            expect(self.page.locator('.routine-preview').first).to_be_visible();self.assert_bounds(width)
        self.page.screenshot(path=str(e2e.ARTIFACTS/'workbench-touch-820.png'))

if __name__=='__main__':
    names=[name for name in Workbench.__dict__ if name.startswith('test_') and (not e2e.OPTIONS.test or name.startswith(e2e.OPTIONS.test))]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Workbench(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
