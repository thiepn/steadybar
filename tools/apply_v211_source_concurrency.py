from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def repl(path,old,new,count=1):
    p=ROOT/path;s=p.read_text();n=s.count(old)
    if n!=count: raise SystemExit(f'{path}: expected {count} match(es), found {n}')
    p.write_text(s.replace(old,new,count))

# The preceding generated patch intentionally writes TypeScript source. Preserve
# the two-character backslash-n escape rather than an actual newline in a quote.
p=ROOT/'src/app/song-parts.ts';s=p.read_text()
bad="join('\n');changed=true;"  # Python interprets \n here as the emitted newline character.
good="join('\\\\n');changed=true;"
if s.count(bad)!=1: raise SystemExit(f'src/app/song-parts.ts: expected one emitted newline escape bug, found {s.count(bad)}')
p.write_text(s.replace(bad,good,1))

# Resolve exercise edits against the fresh transactional source. This keeps
# timestamps monotonic and lets a deliberate last writer synchronize future
# canonical labels even if another tab edited the source while the dialog was open.
repl('src/ui/editors.ts',
"const saved=validateExercise({...e,updatedAt:advanceISO(e.updatedAt),name:formText(form,'name')",
"let saved=validateExercise({...e,updatedAt:advanceISO(e.updatedAt),name:formText(form,'name')")
repl('src/ui/editors.ts',
"""    await store.workspace(data=>{
      data.exercises=data.exercises.some(e=>e.id===saved.id)?data.exercises.map(e=>e.id===saved.id?saved:e):[...data.exercises,saved];
      for(const plans of [data.routines,data.dailyPlans])for(const plan of plans){
""",
"""    await store.workspace(data=>{
      const current=data.exercises.find(item=>item.id===saved.id);if(exercise&&!current)throw new Error('This exercise no longer exists.');
      const previousName=current?.name??e.name;saved=validateExercise({...saved,createdAt:current?.createdAt??saved.createdAt,updatedAt:advanceISO(current?.updatedAt??saved.updatedAt)});
      data.exercises=current?data.exercises.map(item=>item.id===saved.id?saved:item):[...data.exercises,saved];
      for(const plans of [data.routines,data.dailyPlans])for(const plan of plans){
""")
repl('src/ui/editors.ts',
"if(block.title===e.name&&block.title!==saved.name){block.title=saved.name;changed=true;}",
"if(block.title===previousName&&block.title!==saved.name){block.title=saved.name;changed=true;}")

# Strengthen the browser regression so it reproduces the stale-dialog race:
# a concurrent source/title update lands before the dialog's final save.
repl('tests/profiles.py',
"""        self.route('/library/'+exercise['id']);self.page.get_by_role('button',name='Edit',exact=True).click();self.dialog_fill('Name',old_name+' renamed');self.save_dialog('Save exercise')
        data=self.state();saved=next(e for e in data['exercises'] if e['id']==exercise['id']);plan=next(p for p in data['dailyPlans'] if p['id']==plan['id'])
""",
"""        self.route('/library/'+exercise['id']);self.page.get_by_role('button',name='Edit',exact=True).click();self.dialog_fill('Name',old_name+' renamed')
        self.read("load('app/store.js').store.workspace(d=>{const e=d.exercises.find(e=>e.id==="+json.dumps(exercise['id'])+");e.name='Concurrent source name';e.updatedAt=new Date(Date.parse(e.updatedAt)+5).toISOString();for(const p of [...d.routines,...d.dailyPlans]){let changed=false;for(const b of p.blocks)if(b.exerciseId===e.id&&b.title==="+json.dumps(old_name)+"){b.title='Concurrent source name';changed=true;}if(changed)p.updatedAt=new Date(Date.parse(p.updatedAt)+5).toISOString();}return d})")
        self.save_dialog('Save exercise')
        data=self.state();saved=next(e for e in data['exercises'] if e['id']==exercise['id']);plan=next(p for p in data['dailyPlans'] if p['id']==plan['id'])
""")
print('Applied source-edit concurrency and emitted-escape hardening.')
