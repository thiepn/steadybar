/* Steadybar: offline shell, explicit safe updates. */
const PREFIX = 'mp-os-' + self.registration.scope;
const CACHE = PREFIX + "a67a43b823f86e";
const ASSETS = ["./app/app/navigation.js","./app/app/onboarding.js","./app/app/pwa.js","./app/app/search.js","./app/app/store.js","./app/audio/engine.js","./app/audio/scheduler.js","./app/db/backup.js","./app/db/database.js","./app/db/seed.js","./app/domain/analytics.js","./app/domain/chart-data.js","./app/domain/models.js","./app/domain/trainer.js","./app/domain/utils.js","./app/domain/validation.js","./app/main.js","./app/pages/goals.js","./app/pages/history.js","./app/pages/library.js","./app/pages/metronome.js","./app/pages/practice.js","./app/pages/progress.js","./app/pages/routines.js","./app/pages/setlists.js","./app/pages/settings.js","./app/pages/songs.js","./app/pages/today.js","./app/platform/locks.js","./app/practice/controller.js","./app/practice/guards.js","./app/practice/launch.js","./app/practice/logic.js","./app/ui/block-list.js","./app/ui/charts.js","./app/ui/components.js","./app/ui/dom.js","./app/ui/editors.js","./app/ui/icons.js","./icon-192.png","./icon-512.png","./icon-maskable.png","./icon.svg","./index.html","./manifest.webmanifest","./styles.css"];
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
