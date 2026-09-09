from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def repl(path,old,new,count=1):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=count: raise SystemExit(f'{path}: expected {count} match(es), found {n}')
    p.write_text(s.replace(old,new,count))

def before(path,marker,text): repl(path,marker,text+marker)

repl('src/db/database.ts',
"""    else if(name==='sessions'){
      const current=await request(tx.objectStore('sessions').getAll()) as PracticeSession[],session=validateSession(validated as PracticeSession);
      data.sessions=[...current.filter(row=>row.id!==session.id),session];
    }else {
""",
"""    else if(name==='sessions'){
      const current=await request(tx.objectStore('sessions').getAll()) as PracticeSession[],session=validateSession(validated as PracticeSession);
      if(current.some(row=>row.id===session.id))throw new Error('Use the guarded session commands to update an existing practice session.');
      data.sessions=[...current,session];
    }else {
""")

before('tests/database.test.mjs',
"test('generic entity saves still validate after a session-backed lesson review exists',async()=>{",
"""test('generic session put cannot rewrite an existing ended history row',async()=>{
 await db.initializeDatabase();let s=finishBlock(active());await db.put('sessions',s);const before=structuredClone(await db.get('sessions',s.id));
 await assert.rejects(db.put('sessions',{...s,sessionNotes:'rewritten through generic put'}),/guarded session commands/);assert.deepEqual(await db.get('sessions',s.id),before);
});
""")

repl('CHANGELOG.md',
"- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller.\n",
"- Make the generic session repository APIs uphold the one-active-session and learning-reference invariants instead of relying solely on the dedicated practice controller; generic inserts can no longer overwrite an existing session/history row.\n")
print('Applied existing-session generic put guard.')
