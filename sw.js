// Minimal service worker — only exists so the app can be added to a
// phone home screen. It intentionally does NOT cache or intercept
// any Supabase API calls, so data always comes live from the cloud
// and there is no offline-sync conflict risk. It only caches the
// static app shell files for a faster reload.

const CACHE = 'ignou-shell-v1';
const SHELL = ['./', './index.html', './css/style.css'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // never touch API calls (Supabase, fonts, cdn) — network only
  if (url.origin !== self.location.origin) return;
  if (!SHELL.some((s) => url.pathname.endsWith(s.replace('./', '')))) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
