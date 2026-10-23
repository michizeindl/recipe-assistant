// Service Worker von „Recipe Assistant“: macht die App auf Android installierbar und hält die zuletzt geladenen
// Dateien für den Fall ohne Netz bereit. Aufbau wie bei „Akten & Action“.
// Strategie „zuerst Netz“: jede Anfrage geht ans Netz (neue Fassungen kommen sofort an); nur ohne Netz antwortet die Kopie.
// Nur eigene Dateien, keine fremden Server, kein Tracking. Bei Änderungen VERSION erhöhen.
const PREFIX = 'recipe-assistant-';
const VERSION = PREFIX + 'v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => (n.startsWith(PREFIX) || n.startsWith('wochenplan-')) && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  e.respondWith(fetch(anfrage).then(antwort => {
    if (antwort.status === 200 && antwort.type === 'basic' && !anfrage.headers.has('range')) {
      const kopie = antwort.clone();
      e.waitUntil(caches.open(VERSION).then(c => c.put(anfrage, kopie)).catch(() => {}));
    }
    return antwort;
  }).catch(() => caches.open(VERSION).then(c => c.match(anfrage)).then(treffer => treffer || Response.error())));
});
