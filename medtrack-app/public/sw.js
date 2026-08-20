// Service Worker for MedTrack AI
const CACHE_NAME = 'medtrack-ai-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip non-http(s) schemes like chrome-extension
  if (!event.request.url.startsWith('http')) return;

  // For API calls to Gemini or Supabase, use Network First / Network Only
  if (
    event.request.url.includes('generativelanguage.googleapis.com') ||
    event.request.url.includes('supabase.co')
  ) {
    return;
  }

  // Network First with Cache Fallback for navigation and assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback for HTML navigations
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        return new Response('Offline content unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
