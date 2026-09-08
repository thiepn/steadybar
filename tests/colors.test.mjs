import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { PALETTES, ACCENT_PALETTES, SURFACE_THEMES, ACCENTS, surfaceTheme, accentColor } from '../dist/app/domain/appearance.js';
import { DEFAULT_SETTINGS } from '../dist/app/domain/models.js';
import { validateSettings } from '../dist/app/domain/validation.js';
import { seedData } from '../dist/app/db/seed.js';
import { createBackup, parseBackup } from '../dist/app/db/backup.js';
import { generateAppearance } from '../scripts/appearance.mjs';

const prepaint = readFileSync('dist/theme.js', 'utf8');
function paint(saved, dark = true) {
  const root = { dataset: {}, style: {} };
  vm.runInNewContext(prepaint, { document: { documentElement: root }, matchMedia: () => ({ matches: dark }), localStorage: { getItem: () => JSON.stringify(saved) } });
  return root;
}
test('default appearance is neutral graphite, including first paint without saved hints', () => {
  assert.equal(DEFAULT_SETTINGS.surfaceTheme, 'neutral');
  assert.equal(DEFAULT_SETTINGS.accent, 'graphite');
  for (const hint of [null, {}, [], 42, {palette:'invalid',accent:'invalid'}]) {
    const root = paint(hint);
    assert.equal(root.dataset.palette, 'neutral');
    assert.equal(root.dataset.accent, 'graphite');
    assert.equal(root.dataset.theme, 'dark');
  }
});
test('all Neutral and Black surface tokens and Graphite action colors are achromatic', () => {
  for (const id of ['neutral', 'black']) for (const mode of ['light', 'dark']) {
    for (const color of Object.values(PALETTES.find(p => p.id === id)[mode]))
      assert.ok(color.slice(1,3) === color.slice(3,5) && color.slice(3,5) === color.slice(5,7), `${id}/${mode}: ${color}`);
  }
  assert.equal(PALETTES.find(p => p.id === 'black').dark.bg, '#000000');
  for (const mode of ['light', 'dark']) for (const color of Object.values(ACCENT_PALETTES[0][mode]))
    assert.ok(color.slice(1,3) === color.slice(3,5) && color.slice(3,5) === color.slice(5,7));
});
test('catalog offers eight backgrounds and sixteen accents with stable, unique identifiers', () => {
  assert.equal(PALETTES.length, 8); assert.equal(ACCENT_PALETTES.length, 16);
  assert.equal(new Set(SURFACE_THEMES).size, 8); assert.equal(new Set(ACCENTS).size, 16);
  for (const id of ['graphite','blue','forest','plum','amber','rose']) assert.ok(ACCENTS.includes(id));
});
test('all 768 mode/background/accent settings round-trip without losing any practice entities', () => {
  const base = seedData();
  for (const theme of ['system', 'light', 'dark']) for (const palette of PALETTES) for (const accent of ACCENT_PALETTES) {
    const data = { ...base, settings: { ...base.settings, theme, surfaceTheme: palette.id, accent: accent.id } };
    const backup = parseBackup(JSON.stringify(createBackup(data)));
    assert.deepEqual(backup.data, data);
    assert.equal(backup.version, 1); assert.equal(backup.format, 'music-practice-os');
  }
});
test('pre-palette and pre-accent backups remain valid, and earlier accent choices are respected', () => {
  const data = seedData(); delete data.settings.surfaceTheme;
  for (const accent of ['graphite','blue','forest','plum','amber','rose']) {
    data.settings.accent = accent;
    const result = parseBackup(JSON.stringify(createBackup(data)));
    assert.equal(result.data.settings.surfaceTheme, undefined);
    assert.equal(result.data.settings.accent, accent);
    assert.equal(surfaceTheme(result.data.settings.surfaceTheme), 'neutral');
  }
  delete data.settings.accent;
  assert.equal(accentColor(parseBackup(JSON.stringify(createBackup(data))).data.settings.accent), 'graphite');
});
test('invalid surface themes fail before storage; untrusted hints cannot select arbitrary CSS', () => {
  for (const surfaceTheme of ['', 'green-default', '<script>', 'system', {}, 7, null])
    assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, surfaceTheme }));
  assert.equal(surfaceTheme('__proto__'), 'neutral'); assert.equal(accentColor({}), 'graphite');
});
test('first paint honors every supported combination in both modes from the generated catalog', () => {
  for (const mode of ['light', 'dark']) for (const palette of PALETTES) for (const accent of ACCENT_PALETTES) {
    const root = paint({ mode, palette: palette.id, accent: accent.id });
    assert.equal(root.dataset.palette, palette.id); assert.equal(root.dataset.accent, accent.id);
    assert.equal(root.style.colorScheme, mode);
  }
});
test('build-generated stylesheet and prepaint script cannot drift from the typed catalog', async () => {
  const generated = await generateAppearance();
  assert.equal(generated.stylesheet, readFileSync('dist/appearance.css', 'utf8'));
  assert.equal(generated.prepaint, prepaint);
  for (const palette of PALETTES) assert.ok(generated.stylesheet.includes(`[data-palette=${palette.id}]`));
  for (const accent of ACCENT_PALETTES) assert.ok(generated.stylesheet.includes(`[data-accent=${accent.id}]`));
});
test('new themes use repository-relative assets and are included in the offline shell', () => {
  const html = readFileSync('dist/index.html', 'utf8'), sw = readFileSync('dist/sw.js', 'utf8');
  assert.ok(html.indexOf('./theme.js') < html.indexOf('./styles.css'));
  assert.ok(html.indexOf('./styles.css') < html.indexOf('./appearance.css'));
  for (const path of ['./appearance.css', './theme.js', './app/domain/appearance.js']) assert.ok(sw.includes(path));
  assert.doesNotMatch(readFileSync('dist/appearance.css','utf8'), /@import|https?:\/\//);
});
