// Offline-Fähigkeit für die installierte App. Immer zuerst das Netz fragen, damit neue Fassungen sofort ankommen;
// nur ohne Verbindung die zuletzt geladene Fassung aus dem Zwischenspeicher nehmen. Es werden nur eigene Dateien gespeichert.
const CACHE = 'wochenplan-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'engine.js', 'data.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/favicon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
