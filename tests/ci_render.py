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
