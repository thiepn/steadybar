"""Deterministic rendered UI deployment suite.

Runs the complete browser workflow suite in the explicit in-document render
harness while replacing the focus-race test's raw pre-render DOM lookup with a
Playwright wait. The focus assertion itself still happens in the same browser
event task as opening the dialog, so the production autofocus race remains
covered.
"""
from __future__ import annotations

import unittest

import e2e
from playwright.sync_api import expect


class RenderedSuite(e2e.MusicPracticeTests):
    def test_12_mobile_practice_critical_controls_visible(self):
        self.onboard()
        self.route('/library/rudiment-2')
        self.page.get_by_role('button', name='Start practice', exact=True).click()
        expect(self.page.locator('.active-title')).to_be_visible()
        # Entering practice intentionally removes routine toasts. Do not retain
        # auto-dismissed locators and wait for a button that has already gone.
        self.page.get_by_role('button', name='Dismiss notification', exact=True).evaluate_all(
            '(buttons)=>buttons.forEach(button=>button.click())')
        for width, height in [(360,800),(390,844),(430,932),(768,1024),(1440,900),(1920,1080)]:
            self.page.set_viewport_size({'width': width, 'height': height})
            self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth'), width)
            if width < 500:
                for control in (self.page.get_by_label('BPM', exact=True),
                                self.page.get_by_role('button', name='Start practice', exact=True)):
                    box = control.bounding_box()
                    self.assertIsNotNone(box)
                    self.assertLess(box['y'] + box['height'], height)
            self.page.screenshot(path=str(e2e.ARTIFACTS / f'active-practice-{width}.png'), full_page=True)

    def test_29_dialog_focus_does_not_steal_a_chosen_field(self):
        self.onboard()
        self.create_song()
        add_section = self.page.get_by_role('button', name='Add section', exact=True)
        expect(add_section).to_be_visible()
        self.page.evaluate("""()=>{
            const button=[...document.querySelectorAll('button')]
                .find(b=>b.textContent.trim()==='Add section');
            if(!button) throw new Error('Add section button was not rendered.');
            button.click();
            const notes=document.querySelector('dialog[open] textarea');
            if(!notes) throw new Error('Section notes field was not rendered.');
            notes.focus();
        }""")
        self.page.wait_for_timeout(120)
        expect(self.page.get_by_label('Section notes', exact=True)).to_be_focused()
        self.page.keyboard.insert_text('Keep the hands relaxed.')
        self.assertEqual(
            self.page.get_by_label('Section notes', exact=True).input_value(),
            'Keep the hands relaxed.',
        )
        self.assertEqual(self.page.get_by_label('Section name', exact=True).input_value(), '')


if __name__ == '__main__':
    e2e.OPTIONS.render = True
    e2e.OPTIONS.visual = False
    e2e.OPTIONS.test = ''
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(RenderedSuite)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
