"""Appearance and layout regression tests. Default uses real browser storage.

--render is an explicit UI-only fallback. Reload persistence is skipped there;
GitHub Actions runs this file without --render against the production build.
"""
from __future__ import annotations
import json
import re
import unittest
import e2e
from playwright.sync_api import expect

ACCENTS = ('graphite', 'blue', 'forest', 'plum', 'amber', 'rose')
WIDTHS = (320, 360, 390, 600, 768, 820, 1024, 1180, 1280, 1440, 1920)
ROUTES = ('/', '/practice', '/metronome', '/library', '/routines', '/songs', '/setlists', '/goals', '/progress', '/history', '/settings')

class UIPolish(e2e.MusicPracticeTests):
    def mode(self, name):
        self.page.get_by_role('button', name=name.title(), exact=True).click()
        expect(self.page.locator('html')).to_have_attribute('data-mode', name)

    def accent(self, name):
        self.page.get_by_role('button', name=f'{name.title()} accent', exact=True).click()
        expect(self.page.locator('html')).to_have_attribute('data-accent', name)
        expect(self.page.get_by_role('button', name=f'{name.title()} accent', exact=True)).to_have_attribute('aria-pressed', 'true')

    def test_30_palette_contrast_and_system_changes(self):
        self.onboard(); self.route('/settings')
        evidence = []
        for mode in ('light', 'dark'):
            self.mode(mode)
            for accent in ACCENTS:
                with self.subTest(mode=mode, accent=accent):
                    self.accent(accent)
                    contrasts = self.page.evaluate('''()=>{
                        const root=document.documentElement;
                        const probe=document.createElement('span');document.body.append(probe);
                        function luminance(color){return color.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
                        const pairs=[['--text','--bg'],['--text','--surface'],['--muted','--bg'],['--muted','--surface'],['--accent-text','--accent-soft'],['--on-accent','--accent']];
                        const result=pairs.map(([fg,bg])=>{probe.style.color=`var(${fg})`;probe.style.backgroundColor=`var(${bg})`;const c=getComputedStyle(probe),a=luminance(c.color),b=luminance(c.backgroundColor);return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
                        probe.remove();return result;
                    }''')
                    for pair in contrasts:
                        self.assertGreaterEqual(pair['ratio'], 4.5, f'{mode}/{accent}: {pair}')
                    evidence.append({'mode':mode,'accent':accent,'contrasts':contrasts})
        self.mode('system')
        for scheme in ('light', 'dark', 'light'):
            self.page.emulate_media(color_scheme=scheme)
            expect(self.page.locator('html')).to_have_attribute('data-theme', scheme)
        self.mode('light'); self.page.emulate_media(color_scheme='dark')
        expect(self.page.locator('html')).to_have_attribute('data-theme', 'light')
        self.assertEqual(self.page.locator('meta[name="theme-color"]').get_attribute('content'), '#f6f6f7')
        (e2e.ARTIFACTS/'palette-results.json').write_text(json.dumps(evidence,indent=2))

    def test_31_appearance_preserves_unsaved_preferences(self):
        self.onboard(); self.route('/settings')
        bpm=self.page.get_by_label('Default BPM',exact=True);bpm.fill('117')
        self.mode('dark');self.accent('forest')
        self.assertEqual(bpm.input_value(),'117')
        expect(self.page.get_by_role('dialog')).to_have_count(0)
        self.page.get_by_role('button',name='Save preferences',exact=True).click()
        expect(self.page.get_by_text('Practice preferences saved.',exact=True)).to_be_visible()
        settings=self.read("load('app/store.js').store.snapshot().settings")
        self.assertEqual((settings['metronome']['bpm'],settings['theme'],settings['accent']),(117,'dark','forest'))

    def test_32_quick_appearance_does_not_stop_metronome(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_label('Count-in',exact=True).select_option('0')
        self.page.get_by_role('button',name='Start metronome',exact=True).click()
        expect(self.page.get_by_role('button',name='Pause metronome',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Appearance',exact=True).click()
        self.mode('dark');self.accent('blue')
        self.page.get_by_role('button',name='Close dialog',exact=True).click()
        self.assertTrue(self.read("load('audio/engine.js').audio.running"))
        expect(self.page.get_by_role('button',name='Pause metronome',exact=True)).to_be_visible()
        self.page.get_by_role('button',name='Pause metronome',exact=True).click()
        self.assertFalse(self.read("load('audio/engine.js').audio.running"))

    def test_33_layout_matrix(self):
        self.onboard(True)
        self.create_song('A long rehearsal song title that should wrap without pushing controls out of the layout')
        checks=[]
        for width in WIDTHS:
            self.page.set_viewport_size({'width':width,'height':900})
            for route in ROUTES:
                with self.subTest(width=width,route=route):
                    self.route(route)
                    expect(self.page.locator('h1')).to_have_count(1)
                    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
                    clipped=self.page.evaluate('''()=>[...document.querySelectorAll('button,input,select,a')].filter(e=>{
                        if(e.classList.contains('skip-link'))return false;
                        const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<-.5||r.right>innerWidth+.5);
                    }).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),x:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width}))''')
                    self.assertEqual(clipped,[],f'{width} {route}')
                    checks.append({'width':width,'route':route,'overflow':False})
                    if width in (390,820,1440) and route in ('/','/metronome'):
                        self.page.locator('#notifications').evaluate('(e)=>e.replaceChildren()')
                        self.page.mouse.move(0,0)
                        self.page.screenshot(path=str(e2e.ARTIFACTS/f'polish-{route.strip("/") or "today"}-{width}.png'),full_page=True)
        (e2e.ARTIFACTS/'layout-results.json').write_text(json.dumps(checks,indent=2))

    def test_34_block_options_keyboard_and_touch(self):
        self.onboard(True);self.page.set_viewport_size({'width':390,'height':844})
        menu=self.page.get_by_role('button',name='Block options for Double Stroke Roll',exact=True)
        menu.focus();self.page.keyboard.press('Enter')
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.page.keyboard.press('Escape');expect(menu).to_be_focused()
        menu.click();self.page.get_by_role('button',name='Edit Double Stroke Roll',exact=True).click()
        expect(self.page.get_by_role('dialog')).to_have_count(1)
        self.page.get_by_role('button',name='Cancel',exact=True).click()
        menu.click();self.page.get_by_role('button',name='Move Double Stroke Roll up',exact=True).click()
        expect(self.page.locator('.block-title strong').nth(1)).to_have_text('Double Stroke Roll')
        self.assertEqual(self.page.locator('.block-actions').first.locator('button').count(),2)

    @unittest.skipIf(e2e.OPTIONS.render, 'Reload persistence requires native IndexedDB, verified in CI.')
    def test_35_appearance_survives_native_reload(self):
        self.onboard();self.route('/settings');self.mode('dark');self.accent('plum')
        self.page.reload(wait_until='networkidle')
        expect(self.page.get_by_role('heading',name='Settings',exact=True)).to_be_visible()
        expect(self.page.locator('html')).to_have_attribute('data-theme','dark')
        expect(self.page.locator('html')).to_have_attribute('data-accent','plum')
        expect(self.page.get_by_role('button',name='Plum accent',exact=True)).to_have_attribute('aria-pressed','true')
        self.assertEqual(json.loads(self.page.evaluate("localStorage.getItem('steadybar-appearance')")),{'mode':'dark','accent':'plum'})

    def test_36_mobile_navigation_reaches_every_destination(self):
        self.onboard();self.page.set_viewport_size({'width':390,'height':844})
        nav=self.page.locator('.mobile-nav')
        for name,path in [('Metronome','/metronome'),('Library','/library'),('Practice','/practice'),('Today','/')]:
            nav.get_by_role('link',name=name,exact=True).click()
            expect(nav.get_by_role('link',name=name,exact=True)).to_have_class(re.compile('active'))
            self.assertEqual(self.page.evaluate('location.hash'),'#'+path)
        for name in ('Songs','Setlists','Goals','Progress','History','Settings','Routines'):
            nav.get_by_role('button',name='More',exact=True).click()
            self.page.get_by_role('dialog').get_by_role('button',name=name,exact=True).click()
            expect(self.page.get_by_role('dialog')).to_have_count(0)
            title={'Songs':'Song library','Goals':'Practice goals','Progress':'Your progress','History':'Session history','Routines':'Practice routines'}.get(name,name)
            expect(self.page.get_by_role('heading',name=title,exact=True)).to_be_visible()

if __name__=='__main__':
    names=[name for name in UIPolish.__dict__ if name.startswith('test_')]
    suite=unittest.TestSuite(UIPolish(name) for name in names)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
