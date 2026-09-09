from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def repl(path,old,new):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=1: raise SystemExit(f'{path}: expected one match, found {n}')
    p.write_text(s.replace(old,new,1))

def before(path,marker,text): repl(path,marker,text+marker)

# A passage that has already been started, or is already known repeat material,
# cannot reclaim first-read status merely because the settings dialog still
# contains its original checkbox value. New material can explicitly start a
# fresh first-read attempt.
before('src/practice/logic.ts',
"export function restartBlock(session:PracticeSession,now=Date.now()):PracticeSession {",
"""export function preserveReadingIdentity(previous:PracticeProtocol|undefined,next:PracticeProtocol,started:boolean):PracticeProtocol {
  const configured=structuredClone(next);
  if(previous?.kind==='sight-reading'&&configured.kind==='sight-reading'&&previous.material===configured.material&&(started||!previous.firstRead))configured.firstRead=false;
  return configured;
}
""")

repl('src/practice/controller.ts',
"import { blockElapsed, checkpointSession, createSession, finishBlock, pauseSession, recoverSession, restartBlock } from './logic.js';",
"import { blockElapsed, checkpointSession, createSession, finishBlock, pauseSession, preserveReadingIdentity, recoverSession, restartBlock } from './logic.js';")
repl('src/practice/controller.ts',
"""  async configureProtocol(input:PracticeProtocol):Promise<void>{
    const config=validateProtocol(input);await this.pause();
    await this.mutate(s=>{
      let b=s.blocks[s.activeBlockIndex]!;const profile=store.snapshot().profiles?.find(p=>p.id===b.profileId);
      if(!profile)throw new Error('The session profile is unavailable.');assertProtocolCompatible(config,profile);
      if(b.actualActiveSeconds>0||(b.outcomes?.length??0)>0||b.tempoAttempts.length){s=restartBlock(s);b=s.blocks[s.activeBlockIndex]!;}
      delete b.lessonSource;
      b.protocolSnapshot=config;b.protocolState={step:0,clean:0,total:0,...(config.kind==='vocal-pattern'?{rootMidi:config.startMidi}:{})};
      b.outcomes=[];b.tempoAttempts=[];b.initialBpm=protocolPulse(config)?.bpm;b.finalBpm=b.initialBpm;
      const timing=protocolPulse(config);b.meterSnapshot=timing?{beats:timing.beats,beatUnit:timing.beatUnit}:s.blocks[s.activeBlockIndex]!.meterSnapshot;b.subdivisionSnapshot=timing?.subdivision??1;
      b.stickingSnapshot=config.kind==='tempo'?config.sticking??'':'';delete b.tempoTrainer;
""",
"""  async configureProtocol(input:PracticeProtocol):Promise<void>{
    const requested=validateProtocol(input);await this.pause();
    await this.mutate(s=>{
      let b=s.blocks[s.activeBlockIndex]!;const profile=store.snapshot().profiles?.find(p=>p.id===b.profileId);
      if(!profile)throw new Error('The session profile is unavailable.');
      const practiced=Boolean(b.startedAt)||b.actualActiveSeconds>0||(b.outcomes?.length??0)>0||b.tempoAttempts.length>0;
      const config=preserveReadingIdentity(b.protocolSnapshot,requested,practiced);assertProtocolCompatible(config,profile);
      if(b.actualActiveSeconds>0||(b.outcomes?.length??0)>0||b.tempoAttempts.length){s=restartBlock(s);b=s.blocks[s.activeBlockIndex]!;}
      delete b.lessonSource;
      b.protocolSnapshot=config;b.protocolState={step:0,clean:0,total:0,...(config.kind==='vocal-pattern'?{rootMidi:config.startMidi}:{})};
      b.outcomes=[];b.tempoAttempts=[];b.initialBpm=protocolPulse(config)?.bpm;b.finalBpm=b.initialBpm;
      const timing=protocolPulse(config);b.meterSnapshot=timing?{beats:timing.beats,beatUnit:timing.beatUnit}:s.blocks[s.activeBlockIndex]!.meterSnapshot;b.subdivisionSnapshot=timing?.subdivision??1;
      b.stickingSnapshot=config.kind==='tempo'?config.sticking??'':'';delete b.tempoTrainer;
""")

# Rebuilding an existing starter plan is an entity mutation. Preserve its stable
# identity/createdAt, but always advance updatedAt monotonically even within the
# same millisecond or after a small local clock rollback.
repl('src/app/profiles.ts',
"""    const date=localDate(),existing=data.dailyPlans.find(plan=>plan.profileId===p.id&&plan.date===date);
    const plan={...(existing??metadata()),date,profileId:p.id,sourceRoutineId:routine.id,blocks:fitRoutine(routine,minutes)};
""",
"""    const date=localDate(),existing=data.dailyPlans.find(plan=>plan.profileId===p.id&&plan.date===date),base=existing??metadata();
    const updatedAt=new Date(Math.max(Date.now(),Date.parse(base.updatedAt)+1)).toISOString();
    const plan={...base,updatedAt,date,profileId:p.id,sourceRoutineId:routine.id,blocks:fitRoutine(routine,minutes)};
""")

repl('tests/profiles.test.mjs',
"import {createSession,finishBlock,restartBlock,recoverSession} from '../dist/app/practice/logic.js';",
"import {createSession,finishBlock,preserveReadingIdentity,restartBlock,recoverSession} from '../dist/app/practice/logic.js';")
before('tests/profiles.test.mjs',
"test('first-read provenance turns repeats into repeat reading automatically',()=>{",
"""test('sight-reading settings cannot reclaim first-read status for the same material',()=>{
 const original={kind:'sight-reading',material:'Eight-bar page',key:'C',hands:'together',firstRead:true};
 assert.equal(preserveReadingIdentity(original,{...original,firstRead:true},true).firstRead,false);
 assert.equal(preserveReadingIdentity({...original,firstRead:false},{...original,firstRead:true},false).firstRead,false);
 assert.equal(preserveReadingIdentity(original,{...original,material:'Different page',firstRead:true},true).firstRead,true);
});
""")

# Extend the real browser path: after a first-read result has been logged, the
# editor still shows the original checked box. Applying unchanged settings must
# create a repeat-practice segment, never a second first read.
repl('tests/profiles.py',
"""        active=self.read("load('practice/controller.js').practice.session")
        self.assertEqual([r['firstRead'] for r in active['blocks'][0]['outcomes']],[True,False])
        self.finish();self.launch('sight-reading')
        self.assertFalse(self.read("load('practice/controller.js').practice.session.blocks[0].protocolSnapshot.firstRead"));self.finish()
""",
"""        active=self.read("load('practice/controller.js').practice.session")
        self.assertEqual([r['firstRead'] for r in active['blocks'][0]['outcomes']],[True,False])
        self.page.get_by_role('button',name='Task settings',exact=True).click()
        self.assertTrue(self.page.get_by_label('This material is new to me',exact=True).is_checked())
        self.save_dialog('Apply task settings')
        active=self.read("load('practice/controller.js').practice.session")
        self.assertEqual(len(active['blocks']),2);self.assertEqual([r['firstRead'] for r in active['blocks'][0]['outcomes']],[True,False])
        self.assertFalse(active['blocks'][1]['protocolSnapshot']['firstRead'])
        self.start();self.finish();self.launch('sight-reading')
        self.assertFalse(self.read("load('practice/controller.js').practice.session.blocks[0].protocolSnapshot.firstRead"));self.finish()
""")

# Rebuilding a plan through the real Today UI must retain identity/creation time
# and advance updatedAt rather than presenting stale metadata.
repl('tests/profiles.py',
"""        self.route('/');self.page.get_by_role('button',name='Build a plan',exact=True).click()
        self.wait_read("load('app/store.js').store.view().dailyPlans.length",lambda value:value==1)
        _,session=self.complete_example('guitar')
""",
"""        self.route('/');self.page.get_by_role('button',name='Build a plan',exact=True).click()
        self.wait_read("load('app/store.js').store.view().dailyPlans.length",lambda value:value==1)
        original_plan=self.state()['dailyPlans'][0];self.page.wait_for_timeout(2)
        self.page.get_by_role('button',name='Build a plan',exact=True).click();self.confirm('Build plan')
        rebuilt=self.state()['dailyPlans'][0];self.assertEqual(rebuilt['id'],original_plan['id']);self.assertEqual(rebuilt['createdAt'],original_plan['createdAt']);self.assertGreater(rebuilt['updatedAt'],original_plan['updatedAt'])
        _,session=self.complete_example('guitar')
""")

repl('CHANGELOG.md',
"- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.\n",
"- Prevent sight-reading task edits from restoring first-read status for an already-started or already-known passage; genuinely changed material may still be explicitly marked new.\n- Rebuilding an existing Today starter plan now preserves its ID/creation time while monotonically advancing `updatedAt`.\n- Add Node and browser regressions for all of the above; the complete existing Chromium, Firefox and WebKit release suite remains mandatory.\n")
print('Applied final 2.1.1 sight-reading and plan metadata fixes.')
