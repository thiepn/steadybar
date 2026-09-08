"""Apply the focused color update to the existing source tree."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
def write(path, text):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')
def replace(path, old, new):
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'Expected exactly one matching source fragment in {path}')
    write(path, text.replace(old, new))
def prepend(path, text):
    write(path, text + (ROOT / path).read_text(encoding='utf-8'))

palettes = [
 ('neutral','Neutral','Charcoal & gray',['#f5f5f5','#ffffff','#eeeeee','#e6e6e6','#dddddd','#737373'],['#101010','#191919','#232323','#2c2c2c','#3a3a3a','#888888']),
 ('black','Black','Pure black',['#ffffff','#fafafa','#f0f0f0','#e5e5e5','#d9d9d9','#737373'],['#000000','#101010','#1c1c1c','#262626','#383838','#888888']),
 ('slate','Slate','Cool gray',['#f3f5f8','#ffffff','#eaf0f5','#e0e8f0','#d3dce6','#6a7787'],['#11151b','#1a2029','#232d3a','#2c3848','#3c4858','#96a4b5']),
 ('midnight','Midnight','Deep navy',['#f1f5fc','#ffffff','#e7eefb','#dce6f7','#d0dcf0','#67768e'],['#0c1220','#141e30','#1d2a40','#26364f','#354660','#95a8c4']),
 ('dusk','Dusk','Soft indigo',['#f5f3fa','#ffffff','#ece9f7','#e5e0f1','#dcd5e8','#756c86'],['#141222','#1e1b30','#2a263e','#36314d','#4b425e','#aa9fc1']),
 ('aubergine','Aubergine','Muted purple',['#f9f3f7','#ffffff','#f2e8ef','#eadde7','#dfd1dd','#806a7e'],['#1b1119','#281b24','#362731','#43323d','#59434f','#bda4b3']),
 ('coffee','Coffee','Warm brown',['#f7f4f0','#fffdf9','#efebe4','#e6dfd6','#dbd3c9','#786d5e'],['#181411','#241e19','#302821','#3b322a','#50463b','#b2a491']),
 ('sand','Sand','Warm stone',['#faf7ef','#fffdf6','#f1eddf','#e9e2d2','#dfd5c0','#796e56'],['#191710','#25221a','#312d23','#3d372b','#524b3d','#b8ab95']),
]
accents = [
 ('graphite','Graphite',['#303030','#161616','#e8e8e8'],['#dedede','#f5f5f5','#303030']),
 ('blue','Blue',['#285bb5','#204990','#e7effc'],['#94baff','#bdd3ff','#223759']),
 ('sky','Sky',['#1c6296','#134d78','#e4f1fc'],['#7fcaff','#b7dfff','#1e374a']),
 ('cyan','Cyan',['#086674','#064f5a','#e1f3f5'],['#79d5e6','#b1e9f2','#1c3b40']),
 ('teal','Teal',['#17675f','#105148','#e0f1ee'],['#7fd4c6','#b3e8df','#203c38']),
 ('forest','Forest',['#236442','#194e33','#e6f1e9'],['#8bcea4','#b9e5ca','#253d2e']),
 ('mint','Mint',['#17684e','#10513c','#e2f3eb'],['#8dddb6','#bdf1d4','#233e32']),
 ('lime','Lime',['#526819','#3d4f10','#eef3dc'],['#bfd67f','#dbe9ac','#343d24']),
 ('yellow','Yellow',['#78600b','#5e4905','#fbf3d7'],['#ecd378','#f5e5a9','#403a24']),
 ('amber','Amber',['#87550f','#684109','#f9ecd6'],['#edbd78','#f7d8aa','#413423']),
 ('orange','Orange',['#a04b18','#803911','#fbe9df'],['#f6ae7e','#fad0b2','#453125']),
 ('red','Red',['#b1323b','#8f232d','#fbe7e9'],['#f49c9f','#fac5c7','#452a30']),
 ('rose','Rose',['#a33759','#812645','#f8e6ed'],['#efa1bb','#f6c6d6','#432b36']),
 ('pink','Pink',['#a23482','#802368','#f8e5f3'],['#e9a4d9','#f3c8e9','#412c3d']),
 ('plum','Plum',['#794399','#60337b','#f2e9f8'],['#d2a8ec','#e6ccf4','#382c48']),
 ('violet','Violet',['#614fb4','#4b3c91','#eeebfc'],['#bcaeff','#d9d0ff','#302e4c']),
]
keys = ['bg','surface','surface-soft','surface-hover','border','border-strong']
pdata = [dict(id=i,label=l,description=d,light=dict(zip(keys,lt)),dark=dict(zip(keys,dk))) for i,l,d,lt,dk in palettes]
adata = []
for i,l,lt,dk in accents:
    def tokens(a,on):
        return dict(zip(['accent','accent-hover','accent-soft'],a)) | {'accent-text':a[0],'focus':a[0],'on-accent':on}
    adata.append(dict(id=i,label=l,light=tokens(lt,'#ffffff'),dark=tokens(dk,'#111111')))
write('src/domain/appearance.ts', '''/** Persisted IDs are stable; this catalog is also used to generate CSS and first-paint hints. */
export const PALETTES = ''' + json.dumps(pdata,indent=2) + ''' as const;
export const ACCENT_PALETTES = ''' + json.dumps(adata,indent=2) + ''' as const;
export type SurfaceTheme = typeof PALETTES[number]['id'];
export type AccentColor = typeof ACCENT_PALETTES[number]['id'];
export const SURFACE_THEMES = PALETTES.map(p => p.id);
export const ACCENTS = ACCENT_PALETTES.map(p => p.id);
export function surfaceTheme(value: unknown): SurfaceTheme {
  return PALETTES.find(p => p.id === value)?.id ?? 'neutral';
}
export function accentColor(value: unknown): AccentColor {
  return ACCENT_PALETTES.find(p => p.id === value)?.id ?? 'graphite';
}
''')
prepend('src/domain/models.ts', "import type { AccentColor, SurfaceTheme } from './appearance.js';\n")
replace('src/domain/models.ts', "accent?: 'graphite' | 'blue' | 'forest' | 'plum' | 'amber' | 'rose';", 'accent?: AccentColor; surfaceTheme?: SurfaceTheme;')
replace('src/domain/models.ts', "theme: 'system', accent: 'graphite',", "theme: 'system', accent: 'graphite', surfaceTheme: 'neutral',")
prepend('src/domain/validation.ts', "import { ACCENTS, SURFACE_THEMES } from './appearance.js';\n")
replace('src/domain/validation.ts', "accent:optional(one('graphite','blue','forest','plum','amber','rose')),", 'accent:optional(one(...ACCENTS)), surfaceTheme:optional(one(...SURFACE_THEMES)),')
prepend('scripts/build.mjs', "import { generateAppearance } from './appearance.mjs';\n")
replace('scripts/build.mjs', "await copyFile('src/styles/main.css', 'dist/styles.css');", "await copyFile('src/styles/main.css', 'dist/styles.css');\nconst appearance = await generateAppearance();\nawait writeFile('dist/appearance.css', appearance.stylesheet);\nawait writeFile('dist/theme.js', appearance.prepaint);")
replace('public/index.html', '<link rel="stylesheet" href="./styles.css" />', '<link rel="stylesheet" href="./styles.css" />\n  <link rel="stylesheet" href="./appearance.css" />')
replace('tests/e2e.py', "self.page.add_style_tag(content=(ROOT/'src/styles/main.css').read_text(encoding='utf-8'))", "self.page.add_style_tag(content=(ROOT/'src/styles/main.css').read_text(encoding='utf-8'))\n            self.page.add_style_tag(content=(ROOT/'dist/appearance.css').read_text(encoding='utf-8'))")
replace('tests/appearance.test.mjs', "const accents=['graphite','blue','forest','plum','amber','rose'];", "import { ACCENTS as accents } from '../dist/app/domain/appearance.js';")
replace('tests/appearance.test.mjs', "['red','auto','',42]", "['unknown','auto','',42]")
replace('tests/appearance.test.mjs', '../public/theme.js', '../dist/theme.js')
import re
path = 'tests/ui_polish.py'
text = (ROOT/path).read_text()
text,count = re.subn(r"(assertEqual\(self\.page\.locator\('meta\[name=\"theme-color\"\]'\)\.get_attribute\('content'\), )'#[0-9a-fA-F]+'",r"\1'#f5f5f5'",text)
if count != 1: raise RuntimeError('Expected one theme metadata assertion')
write(path,text)
path='public/index.html'
write(path,re.sub(r'(<meta name="theme-color" content=")[^"]+',r'\1#f5f5f5',(ROOT/path).read_text()))
path='public/manifest.webmanifest'
manifest=json.loads((ROOT/path).read_text());manifest['background_color']='#f5f5f5';manifest['theme_color']='#f5f5f5';write(path,json.dumps(manifest,indent=2)+'\n')
for path in ['package.json','package-lock.json']:
    data=json.loads((ROOT/path).read_text());data['version']='1.4.1'
    if 'packages' in data:data['packages']['']['version']='1.4.1'
    write(path,json.dumps(data,indent=2)+'\n')
(ROOT/'public/theme.js').unlink()
path='.github/workflows/pages.yml'
text=(ROOT/path).read_text().replace('        run: python tests/run_suite.py tests/workbench.py', '        run: python tests/run_suite.py tests/workbench.py\n      - name: Verify independent themes, contrasts and native color persistence\n        run: python tests/run_suite.py tests/colors.py')
write(path,text)
