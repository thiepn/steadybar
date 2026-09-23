"""Stable real-origin deployment smoke tests.

The complete UI workflow suite runs separately through e2e.py --render. This file
keeps the deployment gate focused on browser capabilities that actually require
an HTTP origin, while waiting for asynchronous IndexedDB commits instead of
assuming they complete in the same event loop turn as a click.
"""
from __future__ import annotations

import time
import unittest
import subprocess
from urllib.request import urlopen

import e2e


class NativeOriginSmoke(e2e.MusicPracticeTests):
    def setUp(self):
        super().setUp()
        self.page.on('pageerror', lambda error: print('Browser error stack:', error.stack))

    def wait_read(self, expression, predicate, timeout_ms=7000):
        deadline = time.monotonic() + timeout_ms / 1000
        last = None
        last_error = None
        while time.monotonic() < deadline:
            try:
                last = self.read(expression)
                if predicate(last):
                    return last
                last_error = None
            except Exception as error:
                # Restore/reset deliberately reinitializes the app. During that brief
                # window AppStore.snapshot() reports that the workspace is not ready;
                # retry until initialization finishes instead of treating it as a
                # persistence failure.
                last_error = error
            self.page.wait_for_timeout(40)
        if last_error is not None:
            self.fail(f'Timed out waiting for browser state. Last error: {last_error}')
        self.fail(f'Timed out waiting for browser state. Last value: {last!r}')

    def test_14_reload_recovery_real_indexeddb(self):
        self.onboard()
        self.route('/practice')
        self.page.get_by_role('button', name='Start free practice', exact=True).click()
        self.start()
        self.page.wait_for_timeout(5300)
        self.page.reload(wait_until='networkidle')
        e2e.expect(self.page.get_by_text('Saved session recovered.', exact=True)).to_be_visible()
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"), 'paused')
        self.page.get_by_role('button', name='End and keep history', exact=True).click()
        self.confirm('End session')
        self.wait_read(
            "load('app/store.js').store.snapshot().sessions[0].status",
            lambda value: value == 'abandoned',
        )

    def test_15_offline_service_worker_real_origin(self):
        if not self.server:
            # External test origins are not owned by this suite.
            return super().test_15_offline_service_worker_real_origin()
        self.onboard()
        self.page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
        self.page.reload(wait_until='networkidle')
        self.page.wait_for_function('()=>navigator.serviceWorker.controller !== null')
        # Stop the actual HTTP origin. This proves offline behavior without
        # relying on WebKit's emulated-offline reload implementation.
        cls = type(self)
        cls.server.terminate()
        cls.server.wait(timeout=10)
        try:
            with self.assertRaises(OSError):
                urlopen(e2e.URL, timeout=1)
            self.page.reload(wait_until='domcontentloaded')
            e2e.expect(self.page.get_by_role('heading', name='Today', exact=True)).to_be_visible()
            self.route('/library')
            e2e.expect(self.page.get_by_role('link', name='Double Stroke Roll', exact=True)).to_be_visible()
            self.route('/metronome')
            self.page.get_by_role('button', name='Start metronome', exact=True).click()
            e2e.expect(self.page.get_by_role('button', name='Pause metronome', exact=True)).to_be_visible()
            self.page.get_by_role('button', name='Pause metronome', exact=True).click()
            self.route('/practice')
            self.page.get_by_role('button', name='Start free practice', exact=True).click()
            self.start()
            self.finish()
            self.page.reload(wait_until='domcontentloaded')
            e2e.expect(self.page.locator('#main')).to_be_visible()
            self.wait_read("load('app/store.js').store.snapshot().sessions.length", lambda value: value == 1)
        finally:
            cls.server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=e2e.ROOT,
                                          stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
            for _ in range(50):
                try:
                    urlopen(e2e.URL, timeout=1).close()
                    break
                except OSError:
                    time.sleep(.1)
            else:
                self.fail('Test HTTP origin could not be restarted.')

    def test_17_real_webaudio_schedule_and_stop(self):
        self.onboard()
        self.route('/metronome')
        self.page.evaluate("""()=>{
            window.__scheduled=[];
            const make=AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator=function(){
                const node=make.call(this),start=node.start;
                node.start=function(time){window.__scheduled.push(time);return start.call(this,time);};
                return node;
            };
        }""")
        self.page.get_by_label('BPM', exact=True).fill('120')
        self.page.get_by_label('BPM', exact=True).press('Tab')
        self.page.get_by_label('Subdivision', exact=True).select_option('4')
        self.page.get_by_role('button', name='Start metronome', exact=True).click()
        # Require a full second of exact native scheduling, not an arbitrary
        # sleep after AudioContext startup. Shared runners can stall during
        # startup; the scheduler deliberately skips stale clicks without a burst.
        self.page.wait_for_function("""()=>{
            const events=window.__scheduled, tail=events.slice(-9);
            if(tail.length<9 || !tail.slice(1).every((time,i)=>Math.abs(time-tail[i]-.125)<1e-8))return false;
            window.__steadySchedule=tail;return true;
        }""", timeout=7000)
        self.page.get_by_role('button', name='Pause metronome', exact=True).click()
        events = self.page.evaluate('window.__scheduled')
        steady = self.page.evaluate('window.__steadySchedule')
        self.assertEqual(len(steady), 9)
        for earlier, later in zip(steady, steady[1:]):
            self.assertAlmostEqual(later - earlier, .125, places=8, msg=repr(steady))
        # Every event, including startup recovery, must stay on the same precise
        # sixteenth-note grid. Off-grid timing and stale-click bursts still fail.
        skipped = 0
        for earlier, later in zip(events, events[1:]):
            steps = (later - earlier) / .125
            self.assertGreaterEqual(steps, 1 - 1e-8)
            self.assertAlmostEqual(steps, round(steps), places=8, msg=repr(events))
            skipped += max(0, round(steps) - 1)
        print('Audio scheduling evidence:', e2e.json.dumps({'times':events,'steadyWindow':steady,'skippedGridSlots':skipped}))
        self.page.wait_for_timeout(250)
        self.assertEqual(self.page.evaluate('window.__scheduled.length'), len(events))

    def test_16_backup_download_restore_real_storage(self):
        self.onboard()
        self.create_song('Restore this song')
        self.route('/settings')
        with self.page.expect_download() as download:
            self.page.get_by_role('button', name='Export backup', exact=True).click()
        target = e2e.ARTIFACTS / 'browser-backup.json'
        download.value.save_as(target)
        data = e2e.json.loads(target.read_text(encoding='utf-8'))
        self.assertEqual(data['format'], 'music-practice-os')
        self.assertEqual([song['title'] for song in data['data']['songs']], ['Restore this song'])
        self.read("load('db/database.js').replaceData({...load('app/store.js').store.snapshot(),songs:[]})")
        self.page.reload(wait_until='networkidle')
        self.wait_read("load('app/store.js').store.snapshot().songs.length", lambda value: value == 0)
        self.page.get_by_label('Choose backup file', exact=True).set_input_files(str(target))
        # The safety-backup download is a separate event, not the restore reload.
        # Firefox/WebKit report that download as an aborted navigation.
        with self.page.expect_download() as safety_download:
            with self.page.expect_event('domcontentloaded'):
                self.confirm('Back up & replace')
        safety_target = e2e.ARTIFACTS / 'pre-restore-safety-backup.json'
        safety_download.value.save_as(safety_target)
        safety = e2e.json.loads(safety_target.read_text(encoding='utf-8'))
        self.assertEqual(safety['data']['songs'], [])
        e2e.expect(self.page.locator('#main')).to_be_visible()
        self.wait_read(
            "load('app/store.js').store.snapshot().songs.length",
            lambda value: value == 1,
        )
        self.page.reload(wait_until='networkidle')
        self.wait_read("load('app/store.js').store.snapshot().songs.map(song=>song.title)",
                       lambda value: value == ['Restore this song'])

    def test_20_recording_media_blob_round_trip(self):
        self.onboard()
        result=self.read("""(async()=>{
          const media=load('db/media.js'),id='qa-recording-asset';
          const source=new Blob(['steadybar-recording-evidence'],{type:'audio/webm'});
          await media.saveRecordingAsset(id,source,new Date().toISOString());
          const stored=await media.getRecordingAsset(id);
          const before={exists:await media.recordingAssetExists(id),type:stored?.type,size:stored?.size,text:stored?await stored.text():''};
          await media.deleteRecordingAsset(id);
          return {...before,existsAfter:await media.recordingAssetExists(id)};
        })()""")
        self.assertTrue(result['exists'])
        self.assertEqual(result['type'],'audio/webm')
        self.assertEqual(result['text'],'steadybar-recording-evidence')
        self.assertGreater(result['size'],0)
        self.assertFalse(result['existsAfter'])

    def test_22_repertoire_track_media_round_trip(self):
        self.onboard()
        result=self.read("""(async()=>{
          const media=load('db/media.js'),id='qa-repertoire-track';
          const source=new Blob(['steadybar-local-track'],{type:'audio/wav'});
          await media.saveRepertoireTrackAsset(id,source,new Date().toISOString());
          const stored=await media.getRepertoireTrackAsset(id);
          const before={exists:await media.repertoireTrackAssetExists(id),type:stored?.type,size:stored?.size,text:stored?await stored.text():''};
          await media.deleteRepertoireTrackAsset(id);
          return {...before,existsAfter:await media.repertoireTrackAssetExists(id)};
        })()""")
        self.assertTrue(result['exists'])
        self.assertEqual(result['type'],'audio/wav')
        self.assertEqual(result['text'],'steadybar-local-track')
        self.assertGreater(result['size'],0)
        self.assertFalse(result['existsAfter'])

    def test_23_local_audio_probe_rate_and_loop_controls(self):
        self.onboard()
        result=self.read("""(async()=>{
          const makeWav=()=>{
            const sampleRate=8000,seconds=.4,samples=Math.floor(sampleRate*seconds),buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer);
            const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
            text(0,'RIFF');view.setUint32(4,36+samples*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples*2,true);
            return new Blob([buffer],{type:'audio/wav'});
          };
          const mod=load('audio/track-player.js'),blob=makeWav(),probe=await mod.probeAudioBlob(blob),player=new mod.RepertoireTrackPlayer();
          await player.load(blob);player.setRate(.75);player.setLoop(.05,.2,true);player.seek(.1);
          const state={probeDuration:probe.durationSeconds,duration:player.duration,rate:player.playbackRate,loop:player.loopState,current:player.currentTime,pitch:player.pitchPreservationSupported};
          player.destroy();return state;
        })()""")
        self.assertGreater(result['probeDuration'],.3)
        self.assertLess(result['probeDuration'],.5)
        self.assertGreater(result['duration'],.3)
        self.assertEqual(result['rate'],.75)
        self.assertAlmostEqual(result['loop']['startSeconds'],.05,places=2)
        self.assertAlmostEqual(result['loop']['endSeconds'],.2,places=2)
        self.assertAlmostEqual(result['current'],.1,places=1)

    def test_21_timing_onset_worklet_loads_on_shared_audio_clock(self):
        self.onboard()
        result=self.read("""(async()=>{
          const engine=load('audio/engine.js').audio,context=await engine.prepareContext();
          if(!context.audioWorklet||typeof AudioWorkletNode==='undefined')return {supported:false,state:context.state};
          await context.audioWorklet.addModule(new URL('./timing-onset-worklet.js',location.href).href);
          const node=new AudioWorkletNode(context,'steadybar-timing-onset',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],processorOptions:{threshold:.08,cooldownMs:45}});
          const gain=context.createGain();gain.gain.value=0;node.connect(gain);gain.connect(context.destination);
          node.disconnect();gain.disconnect();engine.stop();
          return {supported:true,state:context.state};
        })()""")
        self.assertTrue(result['supported'],result)
        self.assertIn(result['state'],('running','suspended'))

    def test_18_countin_excluded_and_cancelled_safely(self):
        self.onboard();self.route('/metronome')
        self.page.get_by_label('Count-in',exact=True).select_option('1')
        self.route('/practice');self.page.get_by_label('Free practice BPM',exact=True).fill('300')
        self.page.get_by_role('button',name='Start free practice',exact=True).click()
        self.page.get_by_role('button',name='Start practice',exact=True).click()
        self.wait_read("load('practice/controller.js').practice.session.runtime.phase",lambda phase:phase=='countin')
        self.assertEqual(self.read("load('practice/controller.js').practice.elapsed()"),0)
        self.page.get_by_role('button',name='Pause practice',exact=True).click()
        self.page.wait_for_timeout(1100)
        self.assertEqual(self.read("load('practice/controller.js').practice.session.runtime.phase"),'paused')
        self.assertEqual(self.read("load('practice/controller.js').practice.elapsed()"),0)
        self.page.evaluate('window.__resumeRequestedAt=Date.now()')
        self.page.get_by_role('button',name='Resume practice',exact=True).click()
        state=self.wait_read("({phase:load('practice/controller.js').practice.session.runtime.phase,elapsed:load('practice/controller.js').practice.elapsed(),wall:(Date.now()-window.__resumeRequestedAt)/1000})",lambda state:state['phase']=='running' and state['elapsed']>0)
        # Four beats at 300 BPM take 0.8 seconds. Audio startup may add delay;
        # none of that delay or count-in is credited as active practice time.
        self.assertGreaterEqual(state['wall']-state['elapsed'],.75)
        self.finish()

    def test_19_drag_reorder_and_keyboard_skip_link(self):
        self.onboard(True)
        original = self.read("load('app/store.js').store.snapshot().dailyPlans[0].blocks.map(b=>b.id)")
        self.assertTrue(self.page.locator('.drag-handle').first.evaluate('(el)=>el.draggable'))
        self.page.locator('.block-row').nth(0).locator('.drag-handle').drag_to(self.page.locator('.block-row').nth(2))
        expected = [original[1], original[2], original[0], original[3]]
        reordered = self.wait_read(
            "load('app/store.js').store.snapshot().dailyPlans[0].blocks.map(b=>b.id)",
            lambda value: value == expected,
        )
        self.assertEqual(reordered, expected)
        self.page.locator('.skip-link').focus()
        self.page.keyboard.press('Enter')
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'main')
        self.assertNotIn('Page not found.', self.page.locator('body').inner_text())


if __name__ == '__main__':
    names = [
        'test_14_reload_recovery_real_indexeddb',
        'test_15_offline_service_worker_real_origin',
        'test_16_backup_download_restore_real_storage',
        'test_17_real_webaudio_schedule_and_stop',
        'test_18_countin_excluded_and_cancelled_safely',
        'test_19_drag_reorder_and_keyboard_skip_link',
        'test_20_recording_media_blob_round_trip',
        'test_21_timing_onset_worklet_loads_on_shared_audio_clock',
        'test_22_repertoire_track_media_round_trip',
        'test_23_local_audio_probe_rate_and_loop_controls',
    ]
    suite = unittest.TestSuite(NativeOriginSmoke(name) for name in names)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
