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
                for label in ('Pause practice','Metronome on','Not yet','Usable','Solid'):
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
        self.open_focus_drawer('Detailed attempt');self.page.get_by_role('button',name='Clean',exact=True).click()
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

    def test_49_block_summary_commits_history_and_mastery(self):
        self.onboard();self.route('/library/rudiment-2')
        self.page.get_by_role('button',name='Start practice',exact=True).click();self.start()
        self.page.get_by_text('What limited it? · optional',exact=True).click()
        self.page.get_by_label('Timing',exact=True).check()
        self.page.get_by_role('button',name='Solid',exact=True).click()
        expect(self.page.get_by_role('heading',name='Session complete.',exact=True)).to_be_visible()
        result=self.read("""(()=>{
          const d=load('app/store.js').store.snapshot(),session=d.sessions.at(-1),state=d.practiceStates.find(s=>s.target.kind==='exercise'&&s.target.exerciseId==='rudiment-2');
          return {evaluation:session.blocks[0].evaluation,state};
        })()""")
        self.assertEqual(result['evaluation']['result'],'solid');self.assertEqual(result['evaluation']['context'],'normal')
        self.assertEqual(result['evaluation']['limitations'],['timing'])
        self.assertEqual(result['state']['mastery'],'stabilize');self.assertEqual(result['state']['latestResult'],'solid')
        self.assertEqual(result['state']['limitations'],['timing']);self.assertEqual(result['state']['engine']['version'],2)
        self.assertIsNotNone(result['state']['nextReviewAt'])

    def test_50_start_autopilot_creates_exact_prescribed_session(self):
        self.onboard();self.page.get_by_label('Session time',exact=True).select_option('5')
        self.page.get_by_label('Practice emphasis',exact=True).select_option('balanced')
        self.page.get_by_role('button',name='Start Autopilot',exact=True).click()
        expect(self.page.get_by_role('button',name='Start practice',exact=True)).to_be_visible()
        result=self.read("""(()=>{
          const d=load('app/store.js').store.snapshot(),plan=d.dailyPlans.find(p=>p.generation?.kind==='autopilot'),session=d.sessions.find(s=>s.status==='active');
          const targets=session.blocks.map(b=>b.prescriptionSnapshot?.target);
          return {
            planGeneration:plan?.generation,
            planSeconds:plan?.blocks.reduce((n,b)=>n+b.targetSeconds,0),
            planBlocks:plan?.blocks.length,
            sessionSeconds:session?.blocks.reduce((n,b)=>n+b.targetSeconds,0),
            sessionBlocks:session?.blocks.length,
            sourcePlan:session?.sourceDailyPlanId,
            generatedBy:session?.blocks.map(b=>b.prescriptionSnapshot?.generatedBy),
            progressions:session?.blocks.filter(b=>b.sourceExerciseId).map(b=>b.progressionSnapshot?.engineVersion),
            scheduled:targets.map(target=>d.practiceStates.find(s=>JSON.stringify(s.target)===JSON.stringify(target))?.scheduling.lastScheduledAt),
          };
        })()""")
        self.assertEqual(result['planGeneration']['kind'],'autopilot');self.assertEqual(result['planGeneration']['requestedMinutes'],5)
        self.assertEqual(result['planGeneration']['sessionIntent'],'balanced');self.assertEqual(result['planGeneration']['engineVersion'],1)
        self.assertEqual(result['planSeconds'],300);self.assertEqual(result['sessionSeconds'],300)
        self.assertEqual(result['planBlocks'],2);self.assertEqual(result['sessionBlocks'],2)
        self.assertEqual(result['sourcePlan'],self.read("load('app/store.js').store.snapshot().dailyPlans.find(p=>p.generation?.kind==='autopilot').id"))
        self.assertEqual(result['generatedBy'],['autopilot','autopilot'])
        self.assertTrue(result['progressions']);self.assertTrue(all(v==1 for v in result['progressions']))
        self.assertTrue(all(result['scheduled']))


    def test_51_focus_player_primary_surface_and_auto_advance(self):
        self.onboard(True);self.page.get_by_role('button',name='Start full session',exact=True).click();self.start()
        for width,height in ((320,568),(390,844),(820,1180),(1440,900)):
            with self.subTest(viewport=(width,height)):
                self.page.set_viewport_size({'width':width,'height':height});self.page.evaluate('window.scrollTo(0,0)')
                expect(self.page.locator('.focus-workspace')).to_be_visible();self.assert_bounds(width)
                for label in ('Pause practice','Metronome on','Not yet','Usable','Solid'):
                    control=self.page.get_by_role('button',name=label,exact=True);box=control.bounding_box();self.assertIsNotNone(box)
                    self.assertGreaterEqual(box['height'],44);self.assertLessEqual(box['y']+box['height'],height+1,f'{width} {label} {box}')
                self.assertFalse(self.page.locator('details.focus-attempts').evaluate('(e)=>e.open'))
                self.assertFalse(self.page.locator('details.focus-tools').evaluate('(e)=>e.open'))
        self.open_focus_drawer('Detailed attempt');expect(self.page.get_by_role('button',name='Clean',exact=True)).to_be_visible()
        self.open_focus_drawer('Tools & block options');expect(self.page.get_by_role('button',name='Skip block',exact=True)).to_be_visible()
        self.page.locator('details.focus-attempts > summary').click();self.page.locator('details.focus-tools > summary').click()
        before=self.read("load('practice/controller.js').practice.session.activeBlockIndex")
        self.page.get_by_role('button',name='Solid',exact=True).click()
        self.page.wait_for_function("(expected)=>window.__qa ? __qa.load('practice/controller.js').practice.session.activeBlockIndex===expected : true",arg=before+1) if e2e.OPTIONS.render else self.page.wait_for_function("(expected)=>document.querySelector('.focus-block-index')?.textContent?.includes(String(expected+1))",arg=before+1)
        after=self.read("load('practice/controller.js').practice.session.activeBlockIndex")
        self.assertEqual(after,before+1);expect(self.page.get_by_role('button',name='Start practice',exact=True)).to_be_visible()


    def test_52_timing_training_controls_persist_and_reach_focus_player(self):
        self.onboard();self.route('/metronome')
        mode=self.page.get_by_label('Timing click mode',exact=True)
        mode.select_option('gap')
        expect(self.page.get_by_label('Audible bars',exact=True)).to_be_visible()
        expect(self.page.get_by_label('Silent bars',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='2 click → 2 silent',exact=True).click()
        self.page.wait_for_timeout(350)
        timing=self.read("load('app/store.js').store.snapshot().settings.metronome.timing")
        self.assertEqual(timing['mode'],'gap');self.assertEqual(timing['gapClickBars'],2);self.assertEqual(timing['gapSilentBars'],2)
        self.page.set_viewport_size({'width':320,'height':720});self.assert_bounds(320)
        ramp=self.page.get_by_role('button',name='Tempo ramp off',exact=True);ramp.click()
        expect(self.page.get_by_role('button',name='Tempo ramp on',exact=True)).to_be_visible()
        expect(self.page.get_by_label('BPM',exact=True)).to_be_disabled()
        self.assert_bounds(320);self.page.get_by_role('button',name='Tempo ramp on',exact=True).click()
        expect(self.page.get_by_label('BPM',exact=True)).to_be_enabled()

        self.route('/library/rudiment-2');self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.open_focus_drawer('Tools & block options')
        expect(self.page.get_by_role('button',name=re.compile('Timing click · 2 on · 2 silent'))).to_be_visible()
        self.page.get_by_role('button',name=re.compile('Timing click · 2 on · 2 silent')).click()
        dialog=self.page.get_by_role('dialog');expect(dialog).to_be_visible()
        dialog.get_by_label('Click mode',exact=True).select_option('one-per-bar')
        dialog.get_by_role('button',name='Use click pattern',exact=True).click()
        expect(dialog).to_have_count(0)
        evidence=self.read("({global:load('app/store.js').store.snapshot().settings.metronome.timing.mode,snapshot:load('practice/controller.js').practice.session.blocks[load('practice/controller.js').practice.session.activeBlockIndex].timingClickSnapshot.mode})")
        self.assertEqual(evidence,{'global':'one-per-bar','snapshot':'one-per-bar'})
        tools=self.page.locator('details.focus-tools')
        timing_control=tools.locator('button').filter(has_text='Timing click').first
        expect(timing_control).to_contain_text('Timing click · 1 click / bar')


    def test_53_exercise_next_challenge_is_visible_and_launches_with_evidence(self):
        self.onboard();self.route('/library/rudiment-2')
        expect(self.page.get_by_role('heading',name='Next challenge',exact=True)).to_be_visible()
        expect(self.page.get_by_role('button',name='Start next challenge',exact=True)).to_be_visible()
        for width,height in ((320,720),(390,844),(820,1000)):
            self.page.set_viewport_size({'width':width,'height':height});self.assert_bounds(width)
        self.page.get_by_role('button',name='Start next challenge',exact=True).click()
        expect(self.page.locator('.focus-workspace')).to_be_visible()
        result=self.read("(()=>{const s=load('practice/controller.js').practice.session,b=s.blocks[s.activeBlockIndex];return {progression:b.progressionSnapshot,bpm:b.initialBpm,timing:b.timingClickSnapshot};})()")
        self.assertEqual(result['progression']['engineVersion'],1)
        self.assertIn(result['progression']['direction'],('reduce','hold','advance'))
        expect(self.page.locator('.focus-progression')).to_be_visible()
        expect(self.page.locator('.focus-progression-cue')).to_be_visible()
        self.assert_bounds(820)


    def test_54_set_prep_readiness_and_ordered_runthrough(self):
        self.onboard()
        self.read("""(async()=>{
          const d=structuredClone(load('app/store.js').store.snapshot()),now=new Date().toISOString(),date=load('domain/utils.js').localDate(new Date(Date.now()+5*86400000));
          const mk=(id,title,bpm)=>({id,createdAt:now,updatedAt:now,title,artist:'',bpm,meter:{beats:4,beatUnit:4},key:'',difficulty:2,status:'performance-ready',notes:'',sections:[{id:id+'-v',name:'Verse',notes:'',order:0},{id:id+'-c',name:'Chorus',notes:'',order:1}],transitions:[{id:id+'-t',fromSectionId:id+'-v',toSectionId:id+'-c',name:'Verse → Chorus',notes:'Land it cleanly.'}]});
          d.songs=[mk('qa-set-song-a','QA Set Song A',72),mk('qa-set-song-b','QA Set Song B',80)];
          d.setlists=[{id:'qa-set',createdAt:now,updatedAt:now,name:'QA Sunday Set',date,songIds:['qa-set-song-a','qa-set-song-b'],notes:'QA set prep'}];
          d.dailyPlans=[];d.sessions=d.sessions.filter(s=>s.status!=='active');
          await load('db/database.js').replaceData(d);await load('app/store.js').store.refresh();
        })()""")
        self.route('/setlists/qa-set')
        expect(self.page.get_by_role('heading',name='Set preparation',exact=True)).to_be_visible()
        expect(self.page.get_by_text('Unassessed',exact=True).first).to_be_visible()
        expect(self.page.get_by_role('button',name='Start Set Prep',exact=True)).to_be_visible()
        for width,height in ((320,720),(390,844),(820,1000)):
            self.page.set_viewport_size({'width':width,'height':height});self.assert_bounds(width)
        self.page.get_by_role('button',name='Start Set Prep',exact=True).click()
        dialog=self.page.get_by_role('dialog');expect(dialog).to_be_visible()
        dialog.get_by_label('Preparation mode',exact=True).select_option('run-through')
        dialog.get_by_label('Session time',exact=True).select_option('10')
        self.assert_bounds(820)
        dialog.get_by_role('button',name='Build & start',exact=True).click()
        expect(dialog).to_have_count(0);expect(self.page.locator('.focus-workspace')).to_be_visible()
        result=self.read("""(()=>{
          const d=load('app/store.js').store.snapshot(),plan=d.dailyPlans.find(p=>p.generation?.kind==='set-prep'),s=load('practice/controller.js').practice.session;
          return {
            generation:plan?.generation,
            titles:s.blocks.map(b=>b.titleSnapshot),
            generated:s.blocks.map(b=>b.prescriptionSnapshot?.generatedBy),
            intents:s.blocks.map(b=>b.prescriptionSnapshot?.intent),
            positions:s.blocks.map(b=>b.setPrepSnapshot?.setPosition),
            modes:s.blocks.map(b=>b.setPrepSnapshot?.mode),
          };
        })()""")
        self.assertEqual(result['titles'],['QA Set Song A','QA Set Song B'])
        self.assertEqual(result['generated'],['set-prep','set-prep'])
        self.assertEqual(result['intents'],['perform','perform'])
        self.assertEqual(result['positions'],[0,1]);self.assertEqual(result['modes'],['run-through','run-through'])
        self.assertEqual(result['generation']['kind'],'set-prep');self.assertEqual(result['generation']['setPrepMode'],'run-through')
        expect(self.page.locator('.focus-set-prep')).to_be_visible();self.assert_bounds(820)


    def test_55_progress_diagnostics_are_explainable_and_responsive(self):
        self.onboard()
        self.read("""(async()=>{
          const d=structuredClone(load('app/store.js').store.snapshot()),e=d.exercises.find(x=>x.id==='rudiment-2')||d.exercises[0],now=new Date();
          const day=(offset)=>{const x=new Date(now);x.setDate(x.getDate()+offset);x.setHours(12,0,0,0);return x.toISOString();};
          const make=(id,offset,result,limitations=[],generatedBy='autopilot',progression=false)=>{
            const at=day(offset),s=load('practice/logic.js').createSession([{id:'plan-'+id,type:'exercise',exerciseId:e.id,profileId:e.profileId,title:e.name,targetSeconds:300,bpm:80,notes:'',order:0}],d);
            s.id=id;s.status='completed';s.createdAt=at;s.updatedAt=at;s.startedAt=at;s.endedAt=at;s.runtime.phase='paused';
            const b=s.blocks[0];b.actualActiveSeconds=300;b.completed=true;b.startedAt=at;b.endedAt=at;
            b.evaluation={id:'eval-'+id,timestamp:at,result,context:'normal',limitations,note:''};
            b.prescriptionSnapshot={target:{kind:'exercise',exerciseId:e.id},intent:'build',reasons:['active-priority'],generatedBy,engineVersion:1};
            if(progression)b.progressionSnapshot={engineVersion:1,direction:'advance',dimension:'click-density',level:1,summary:'Click on 2 & 4',cue:'Keep time.',bpm:80,targetSeconds:300,subdivision:1,timingClick:{mode:'two-four',sparseEvery:2,gapClickBars:3,gapSilentBars:1}};
            return s;
          };
          d.sessions=[
            make('qa-prev-1',-10,'not-yet',['timing']),
            make('qa-prev-2',-9,'usable',[]),
            make('qa-cur-1',-5,'not-yet',['timing'],'autopilot',true),
            make('qa-cur-2',-4,'not-yet',['timing'],'autopilot',true),
            make('qa-cur-3',-3,'usable',['timing'],'set-prep',true),
            make('qa-cur-4',-2,'solid',[],'set-prep',false),
          ];
          const target={kind:'exercise',exerciseId:e.id},key=load('domain/practice-state.js').practiceTargetKey(target);
          d.practiceStates=[{id:'qa-state',createdAt:day(-20),updatedAt:day(-1),profileId:e.profileId,targetKey:key,target,mastery:'maintain',lastPracticedAt:day(-2),lastEvaluatedAt:day(-2),lastAppliedAt:day(-8),nextReviewAt:day(-1),latestResult:'solid',limitations:['timing'],challenge:'hold',evidenceCount:8,tempo:{peak:130,peakAt:day(-15),working:110,workingAt:day(-8),cold:95,coldAt:day(-7)},recent:{solid:3,usable:2,notYet:2},scheduling:{consecutiveSkips:0,manualPriority:0},engine:{version:2,derivedAt:day(-1)}}];
          await load('db/database.js').replaceData(d);await load('app/store.js').store.refresh();
        })()""")
        self.route('/progress')
        expect(self.page.get_by_role('heading',name='Trend comparison',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Diagnostics',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Current mastery state',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Retention & tempo reliability',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Recurring limitations',exact=True)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Progression outcomes',exact=True)).to_be_visible()
        expect(self.page.get_by_text(re.compile('timing keeps recurring'),exact=False)).to_be_visible()
        expect(self.page.get_by_text(re.compile('Peak tempo is ahead'),exact=False)).to_be_visible()
        expect(self.page.get_by_text(re.compile('click density progression is meeting resistance'),exact=False)).to_be_visible()
        expect(self.page.get_by_role('heading',name='Generated practice follow-through',exact=True)).to_be_visible()
        details=self.page.get_by_text(re.compile('Inspect current evidence state'),exact=False);expect(details).to_be_visible()
        for width,height in ((320,720),(390,844),(820,1000),(1440,900)):
            self.page.set_viewport_size({'width':width,'height':height});self.assert_bounds(width)
        self.page.get_by_label('Progress date range',exact=True).select_option('7')
        expect(self.page.get_by_text('Previous',exact=False).first).to_be_visible()
        self.assert_bounds(1440)



if __name__=='__main__':
    names=[name for name in Workbench.__dict__ if name.startswith('test_') and (not e2e.OPTIONS.test or name.startswith(e2e.OPTIONS.test))]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Workbench(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
