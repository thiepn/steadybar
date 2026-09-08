"""Stable real-origin deployment smoke tests.

The complete UI workflow suite runs separately through e2e.py --render. This file
keeps the deployment gate focused on browser capabilities that actually require
an HTTP origin, while waiting for asynchronous IndexedDB commits instead of
assuming they complete in the same event loop turn as a click.
"""
from __future__ import annotations

import time
import unittest

import e2e


class NativeOriginSmoke(e2e.MusicPracticeTests):
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
        self.read("load('db/database.js').replaceData({...load('app/store.js').store.snapshot(),songs:[]})")
        self.page.reload(wait_until='networkidle')
        self.page.get_by_label('Choose backup file', exact=True).set_input_files(str(target))
        self.confirm('Back up & replace')
        self.wait_read(
            "load('app/store.js').store.snapshot().songs.length",
            lambda value: value == 1,
        )

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
    ]
    suite = unittest.TestSuite(NativeOriginSmoke(name) for name in names)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
