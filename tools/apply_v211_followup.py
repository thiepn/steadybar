from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def repl(path,old,new):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=1:raise SystemExit(f'{path}: expected one match, found {n}')
    p.write_text(s.replace(old,new,1))

def before(path,marker,text):repl(path,marker,text+marker)

# Whole-workspace validation now includes session-backed learning, so generic
# entity writes must snapshot sessions as well as the other reference tables.
repl('src/db/database.ts',
"""const REFERENCE_STORES=STORES.filter(name=>name!=='sessions');
async function referenceSnapshot(tx:IDBTransaction):Promise<Data>{
  const rows=await Promise.all(REFERENCE_STORES.map(name=>request(tx.objectStore(name).getAll())));
  const data=Object.fromEntries(REFERENCE_STORES.map((name,i)=>[name,name==='settings'?rows[i]?.[0]:rows[i]])) as unknown as Data;
  data.sessions=[];if(data.profiles?.length)data.schemaVersion=2;return data;
}
""",
"""const REFERENCE_STORES=STORES;
async function referenceSnapshot(tx:IDBTransaction):Promise<Data>{
  const rows=await Promise.all(REFERENCE_STORES.map(name=>request(tx.objectStore(name).getAll())));
  const data=Object.fromEntries(REFERENCE_STORES.map((name,i)=>[name,name==='settings'?rows[i]?.[0]:rows[i]])) as unknown as Data;
  if(data.profiles?.length)data.schemaVersion=2;return data;
}
""")

# updateSession is the live-practice API. Ended history is edited through the
# guarded workspace reflection path and must not be rewritten as if still live.
repl('src/db/database.ts',
"""    const current=await request(tx.objectStore('sessions').get(id)) as PracticeSession|undefined;
    if(!current)throw new Error('This practice session no longer exists.');
    const next=validateSession(fn(structuredClone(current)));
""",
"""    const current=await request(tx.objectStore('sessions').get(id)) as PracticeSession|undefined;
    if(!current)throw new Error('This practice session no longer exists.');
    if(current.status!=='active')throw new Error('Ended practice history is immutable. Edit only its reflection through the history workspace.');
    const next=validateSession(fn(structuredClone(current)));
""")

before('tests/database.test.mjs',
"test('session updates serialize against the newest committed record',async()=>{",
"""test('generic entity saves still validate after a session-backed lesson review exists',async()=>{
 await db.initializeDatabase();const d=await db.readData(),pid=d.settings.activeProfileId,c=catalog.COURSES.find(c=>c.id==='drums-foundation'),l=c.lessons[0],p=d.profiles.find(p=>p.id===pid);
 let s=createSession(learning.lessonBlocks(c,l,p,{minutes:5}),d);for(let i=0;i<l.tasks.length;i++){s.blocks[i].startedAt='2026-09-09T12:00:00.000Z';s.blocks[i].actualActiveSeconds=20;s=finishBlock(s,false,Date.parse('2026-09-09T12:01:00.000Z')+i*20000);}d.sessions=[s];
 learning.reviewLesson(d,pid,c.id,l.id,{id:'save-after-review',checks:l.checks.map(()=>true),answers:l.questions.map(q=>q.answer),confidence:3,notes:'Keep evidence linked',evidence:{kind:'session',sessionId:s.id}},'2026-09-09T12:05:00.000Z');await db.replaceData(d);
 const setlist={...metadata(),name:'After guided review',songIds:[],notes:''};await db.put('setlists',setlist);assert.equal((await db.get('setlists',setlist.id)).name,setlist.name);
});
test('live-session update API cannot rewrite ended practice history',async()=>{
 await db.initializeDatabase();let s=active();s=finishBlock(s);await db.put('sessions',s);
 await assert.rejects(db.updateSession(s.id,row=>({...row,sessionNotes:'rewrite'})),/Ended practice history is immutable/);assert.equal((await db.get('sessions',s.id)).sessionNotes,'');
});
""")

print('Applied follow-up 2.1.1 repository integrity fixes.')
