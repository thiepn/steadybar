"""Color-system UI, contrast, state, audio and responsive regression tests.

--render is an explicit UI-only mode. Native persistence is separately required
by CI, not claimed from the in-document memory adapter.
"""
from __future__ import annotations
import json
import unittest
import e2e
from playwright.sync_api import expect

PALETTES=('neutral','black','slate','midnight','dusk','aubergine','coffee','sand')
ACCENTS=('graphite','blue','sky','cyan','teal','forest','mint','lime','yellow','amber','orange','red','rose','pink','plum','violet')
SIZES=((1280,720),(1366,768),(1440,900),(1920,1080),(768,1024),(820,1180),(1024,768),(1024,1366),(320,568),(360,800),(375,812),(390,844),(412,915),(430,932),(667,375))

class Colors(e2e.MusicPracticeTests):
    def choose(self, name, value, attribute):
        control=self.page.get_by_role('button',name=name,exact=True)
        control.click()
        expect(self.page.locator('html')).to_have_attribute(attribute,value)
        expect(control).to_have_attribute('aria-pressed','true')
        expect(control).to_be_enabled()

    def palette(self, value): self.choose(value.title()+' background',value,'data-palette')
    def accent(self, value): self.choose(value.title()+' accent',value,'data-accent')
    def mode(self, value): self.choose(value.title(),value,'data-mode')

    def test_50_default_dark_is_achromatic(self):
        self.page.emulate_media(color_scheme='dark');self.onboard(True)
        expect(self.page.locator('html')).to_have_attribute('data-palette','neutral')
        expect(self.page.locator('html')).to_have_attribute('data-accent','graphite')
        colors=self.page.evaluate("""()=>{
          const s=getComputedStyle(document.documentElement);
          return ['--bg','--surface','--surface-soft','--surface-hover','--text','--muted','--border','--accent','--accent-soft','--focus'].map(k=>[k,s.getPropertyValue(k).trim()]);
        }""")
        for name,color in colors:
            self.assertEqual(color[1:3],color[3:5],name);self.assertEqual(color[3:5],color[5:7],name)
        self.assertEqual(self.page.locator('meta[name="theme-color"]').get_attribute('content'),'#101010')
        self.page.screenshot(path=str(e2e.ARTIFACTS/'colors-neutral-today-1440.png'))

    def test_51_all_256_combinations_computed_contrast(self):
        self.onboard();self.route('/settings')
        results=self.page.evaluate("""({palettes,accents})=>{
            const root=document.documentElement,probe=document.createElement('span');document.body.append(probe);
            const before={...root.dataset},rows=[];
            const luminance=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
            const pairs=[];
            for(const bg of ['bg','surface','surface-soft','surface-hover']){
              for(const fg of ['text','muted','faint','accent-text'])pairs.push([fg,bg,4.5]);
              for(const fg of ['focus','accent','border-strong'])pairs.push([fg,bg,3]);
            }
            pairs.push(['accent-text','accent-soft',4.5],['text','accent-soft',4.5],['muted','accent-soft',4.5],['on-accent','accent',4.5],['on-accent','accent-hover',4.5],['danger','danger-bg',4.5]);
            for(const mode of ['light','dark'])for(const palette of palettes)for(const accent of accents){
              Object.assign(root.dataset,{theme:mode,palette,accent});
              const contrasts=pairs.map(([fg,bg,minimum])=>{
                probe.style.color=`var(--${fg})`;probe.style.backgroundColor=`var(--${bg})`;
                const s=getComputedStyle(probe),a=luminance(s.color),b=luminance(s.backgroundColor);
                return {fg,bg,minimum,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
              });
              rows.push({mode,palette,accent,contrasts});
            }
            Object.assign(root.dataset,before);probe.remove();return rows;
        }""",{'palettes':PALETTES,'accents':ACCENTS})
        (e2e.ARTIFACTS/'colors-contrast-results.json').write_text(json.dumps(results,indent=2))
        failed=[(row['mode'],row['palette'],row['accent'],c) for row in results for c in row['contrasts'] if c['ratio']<c['minimum']]
        self.assertEqual(failed,[],repr(failed[:20]))
        self.assertEqual(len(results),256)

    def test_52_real_controls_are_independent(self):
        self.onboard(True);self.route('/settings');self.mode('dark')
        before=self.read("JSON.stringify({...load('app/store.js').store.snapshot(),settings:null})")
        for palette in PALETTES:
            self.palette(palette)
            expect(self.page.locator('html')).to_have_attribute('data-accent','graphite')
        for accent in ACCENTS:
            self.accent(accent)
            expect(self.page.locator('html')).to_have_attribute('data-palette','sand')
        self.mode('light');self.mode('system');self.page.emulate_media(color_scheme='dark')
        expect(self.page.locator('html')).to_have_attribute('data-theme','dark')
        expect(self.page.locator('html')).to_have_attribute('data-palette','sand')
        expect(self.page.locator('html')).to_have_attribute('data-accent','violet')
        self.assertEqual(self.read("JSON.stringify({...load('app/store.js').store.snapshot(),settings:null})"),before)

    def test_53_reset_colors_preserves_mode_and_data(self):
        self.onboard(True);self.route('/settings');self.mode('dark');self.palette('midnight');self.accent('orange')
        before=self.read("JSON.stringify({...load('app/store.js').store.snapshot(),settings:null})")
        self.page.get_by_role('button',name='Reset colors',exact=True).click()
        expect(self.page.locator('html')).to_have_attribute('data-palette','neutral')
        expect(self.page.locator('html')).to_have_attribute('data-accent','graphite')
        expect(self.page.locator('html')).to_have_attribute('data-mode','dark')
        self.assertEqual(self.read("JSON.stringify({...load('app/store.js').store.snapshot(),settings:null})"),before)

    def test_54_settings_and_dialog_responsive_matrix(self):
        self.onboard();self.route('/settings');self.mode('dark');results=[]
        for width,height in SIZES:
            self.page.set_viewport_size({'width':width,'height':height})
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
            for selector in ('.palette-choice','.accent-choice','.theme-choice'):
                boxes=self.page.locator(selector).evaluate_all('(els)=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
                for box in boxes:self.assertGreaterEqual(box['w'],44);self.assertGreaterEqual(box['h'],44)
            self.page.get_by_role('button',name='Appearance',exact=True).click()
            dialog=self.page.get_by_role('dialog');expect(dialog).to_be_visible()
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'),width)
            bounds=dialog.bounding_box();self.assertGreaterEqual(bounds['x'],0);self.assertLessEqual(bounds['x']+bounds['width'],width)
            dialog.get_by_role('button',name='Violet accent',exact=True).scroll_into_view_if_needed()
            close=dialog.get_by_role('button',name='Close dialog',exact=True);box=close.bounding_box()
            self.assertGreaterEqual(box['y'],0);self.assertLessEqual(box['y']+box['height'],height)
            dialog.evaluate('(d)=>d.scrollTop=0')
            if width in (320,390,820,1440):self.page.screenshot(path=str(e2e.ARTIFACTS/f'colors-appearance-{width}.png'))
            self.page.keyboard.press('Escape');expect(dialog).to_have_count(0)
            results.append({'width':width,'height':height,'settings':True,'dialog':True,'touchTargets':True})
        (e2e.ARTIFACTS/'colors-layout-results.json').write_text(json.dumps(results,indent=2))

    def test_55_unsaved_preferences_survive_color_changes(self):
        self.onboard();self.route('/settings')
        bpm=self.page.get_by_label('Default BPM',exact=True);bpm.fill('117')
        self.palette('slate');self.accent('mint');self.mode('dark')
        self.assertEqual(bpm.input_value(),'117')
        self.page.get_by_role('button',name='Save preferences',exact=True).click()
        expect(self.page.get_by_text('Practice preferences saved.',exact=True)).to_be_visible()
        settings=self.read("load('app/store.js').store.snapshot().settings")
        self.assertEqual((settings['metronome']['bpm'],settings['surfaceTheme'],settings['accent']),(117,'slate','mint'))

    def test_56_audio_keeps_running_without_page_rebuild(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_role('button',name='Start metronome',exact=True).click()
        expect(self.page.get_by_role('button',name='Pause metronome',exact=True)).to_be_visible()
        self.page.locator('#main').evaluate('(el)=>window.__originalMain=el')
        self.page.get_by_role('button',name='Appearance',exact=True).click()
        self.mode('dark');self.palette('midnight');self.accent('cyan');self.palette('black');self.accent('rose')
        self.assertTrue(self.read("load('audio/engine.js').audio.running"))
        self.assertTrue(self.page.evaluate("window.__originalMain === document.querySelector('#main')"))
        self.page.keyboard.press('Escape')
        self.page.get_by_role('button',name='Pause metronome',exact=True).click()
        self.page.screenshot(path=str(e2e.ARTIFACTS/'colors-black-rose-metronome.png'))

    def test_57_reload_persists_palette_and_accent(self):
        if e2e.OPTIONS.render:self.skipTest('Real IndexedDB/first-paint persistence is not verified by the memory harness.')
        self.onboard();self.route('/settings');self.mode('dark');self.palette('midnight');self.accent('orange')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('html')).to_have_attribute('data-mode','dark')
        expect(self.page.locator('html')).to_have_attribute('data-palette','midnight')
        expect(self.page.locator('html')).to_have_attribute('data-accent','orange')
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('steadybar-appearance'))"),{'mode':'dark','palette':'midnight','accent':'orange'})

    def test_58_keyboard_reduced_motion_and_forced_colors(self):
        self.onboard();self.page.get_by_role('button',name='Appearance',exact=True).click()
        control=self.page.get_by_role('button',name='Black background',exact=True);control.focus();self.page.keyboard.press('Space')
        expect(control).to_have_attribute('aria-pressed','true')
        self.page.emulate_media(reduced_motion='reduce',forced_colors='active')
        expect(control).to_have_css('outline-style','solid')
        self.page.keyboard.press('Escape')
        expect(self.page.get_by_role('button',name='Appearance',exact=True)).to_be_focused()

if __name__=='__main__':
    names=[name for name in Colors.__dict__ if name.startswith('test_') and (not e2e.OPTIONS.test or name.startswith(e2e.OPTIONS.test))]
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Colors(name) for name in names))
    raise SystemExit(0 if result.wasSuccessful() else 1)
