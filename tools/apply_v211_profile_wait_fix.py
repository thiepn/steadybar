from pathlib import Path
p=Path('tests/profiles.py');s=p.read_text()
old="""        self.route('/');self.page.get_by_role('button',name='Build a plan',exact=True).click()
        self.wait_read("load('app/store.js').store.view().dailyPlans.length",lambda value:value==1)
        original_plan=self.state()['dailyPlans'][0];self.page.wait_for_timeout(2)
        self.page.get_by_role('button',name='Build a plan',exact=True).click();self.confirm('Build plan')
        rebuilt=self.state()['dailyPlans'][0];self.assertEqual(rebuilt['id'],original_plan['id']);self.assertEqual(rebuilt['createdAt'],original_plan['createdAt']);self.assertGreater(rebuilt['updatedAt'],original_plan['updatedAt'])
"""
new="""        self.route('/');self.page.get_by_role('button',name='Build a plan',exact=True).click()
        self.wait_read("load('app/store.js').store.view().dailyPlans.length",lambda value:value==1)
        original_plan=next(p for p in self.state()['dailyPlans'] if p['profileId']==guitar['id']);self.page.wait_for_timeout(2)
        self.page.get_by_role('button',name='Build a plan',exact=True).click();self.confirm('Build plan')
        rebuilt=self.wait_read(\"load('app/store.js').store.snapshot().dailyPlans.find(p=>p.id===\"+json.dumps(original_plan['id'])+\")\",lambda plan:bool(plan) and plan['updatedAt']>original_plan['updatedAt'])
        self.assertEqual(rebuilt['id'],original_plan['id']);self.assertEqual(rebuilt['createdAt'],original_plan['createdAt']);self.assertGreater(rebuilt['updatedAt'],original_plan['updatedAt'])
"""
if s.count(old)!=1:raise SystemExit(f'profile-plan rebuild target count {s.count(old)}')
s=s.replace(old,new,1)
old="""        self.page.get_by_role('button',name='Remove Middle 8',exact=True).click();self.confirm('Remove section')
        data=self.state();plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['type'],'song');self.assertNotIn('songSectionId',block);self.assertEqual(block['title'],'Reference source renamed');self.assertGreater(plan['updatedAt'],stamp)
"""
new="""        self.page.get_by_role('button',name='Remove Middle 8',exact=True).click();self.confirm('Remove section')
        data=self.wait_read(\"load('app/store.js').store.snapshot()\",lambda d:any(b.get('songId')==song_id and b.get('type')=='song' and not b.get('songSectionId') for p in d['dailyPlans'] for b in p['blocks']))
        plan=next(p for p in data['dailyPlans'] if p['id']==plan['id']);block=next(b for b in plan['blocks'] if b.get('songId')==song_id);self.assertEqual(block['type'],'song');self.assertNotIn('songSectionId',block);self.assertEqual(block['title'],'Reference source renamed');self.assertGreater(plan['updatedAt'],stamp)
"""
if s.count(old)!=1:raise SystemExit(f'section wait target count {s.count(old)}')
p.write_text(s.replace(old,new,1))
print('Made confirmation-backed browser assertions select the correct profile plan and wait for committed state.')
