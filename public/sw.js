const CACHE_NAME = 'ocv-v3';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/rest/v1/') || 
      event.request.url.includes('/auth/v1/') ||
      event.request.url.includes('/functions/v1/') ||
      event.request.url.includes('api.stripe.com') ||
      event.request.url.includes('api.resend.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.ok && (event.request.url.endsWith('.html') || 
            event.request.url.endsWith('.js') ||
            event.request.url.endsWith('.css') ||
            event.request.url.endsWith('.png') || 
            event.request.url.endsWith('.svg') ||
            event.request.url.endsWith('.json') ||
            event.request.url === self.registration.scope)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
