/** Public branding changes must not orphan data or change deployment scope. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DB_NAME } from '../dist/app/db/database.js';
import { AUDIO_LOCK, SESSION_LOCK } from '../dist/app/platform/locks.js';
import { createBackup, parseBackup } from '../dist/app/db/backup.js';
import { seedData } from '../dist/app/db/seed.js';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
test('Steadybar is the package and installable application name', () => {
 const pkg=JSON.parse(read('package.json')), manifest=JSON.parse(read('dist/manifest.webmanifest'));
 assert.equal(pkg.name,'steadybar');assert.equal(pkg.repository.url,'https://github.com/thiepn/steadybar.git');
 assert.equal(manifest.name,'Steadybar');assert.equal(manifest.short_name,'Steadybar');
});
test('browser and Apple install metadata use Steadybar', () => {
 const html=read('dist/index.html');assert.match(html,/<title>Steadybar<\/title>/);
 assert.match(html,/<meta name="apple-mobile-web-app-title" content="Steadybar">/);
 assert.doesNotMatch(html,/Music Practice OS|Practice OS/);
});
test('the UI and onboarding use Steadybar instead of the working title', () => {
 assert.match(read('dist/app/main.js'),/Steadybar/);assert.match(read('dist/app/app/onboarding.js'),/Steadybar/i);
 assert.doesNotMatch(read('dist/app/main.js'),/Music Practice OS|OS \/ LOCAL WORKSPACE/);
});
test('PWA assets, launch URL and scope remain relative for repository subpaths', () => {
 const m=JSON.parse(read('dist/manifest.webmanifest'));
 for(const property of ['id','start_url','scope'])assert.equal(m[property],'./');
 for(const icon of m.icons)assert.ok(!icon.src.startsWith('/'));
 const html=read('dist/index.html');assert.match(html,/src="\.\/app\/main.js"/);assert.match(html,/href="\.\/manifest.webmanifest"/);
});
test('rebranding preserves the existing database and cross-tab lock names', () => {
 assert.equal(DB_NAME,'music-practice-os');assert.equal(AUDIO_LOCK,'music-practice-os-audio');assert.equal(SESSION_LOCK,'music-practice-os-session');
 assert.match(read('dist/app/app/store.js'),/music-practice-os-data/);
});
test('version-1 Music Practice OS backups still round-trip without data changes', () => {
 const backup=createBackup(seedData(),'2026-09-08T00:00:00.000Z');
 assert.equal(backup.format,'music-practice-os');assert.equal(backup.version,1);
 assert.deepEqual(parseBackup(JSON.stringify(backup)),backup);
 assert.match(read('dist/app/db/backup.js'),/steadybar-backup-/);
});
