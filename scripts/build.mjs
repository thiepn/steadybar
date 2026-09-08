import { generateAppearance } from './appearance.mjs';
import { execFileSync } from 'node:child_process';
import { readdir, mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'inherit' });
for (const name of await readdir('public')) await copyFile(join('public', name), join('dist', name));
await copyFile('src/styles/main.css', 'dist/styles.css');
const appearance = await generateAppearance();
await writeFile('dist/appearance.css', appearance.stylesheet);
await writeFile('dist/theme.js', appearance.prepaint);
async function walk(dir) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    out.push(...(item.isDirectory() ? await walk(path) : [path]));
  }
  return out;
}
const files = (await walk('dist')).sort();
const hash = createHash('sha256');
for (const file of files) { hash.update(file.slice(5)); hash.update('\0'); hash.update(await readFile(file)); hash.update('\0'); }
const version = hash.digest('hex').slice(0, 14);
const assets = files.map(f => './' + f.slice(5));
await writeFile('dist/sw.js', `/* Steadybar: offline shell, explicit safe updates. */
const PREFIX = 'mp-os-' + self.registration.scope;
const CACHE = PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && !k.slice(PREFIX.length).includes('/') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => { if (event.data === 'APPLY_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`);
console.log(`Built ${files.length + 1} local assets · offline cache ${version}`);
