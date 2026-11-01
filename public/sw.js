const CACHE_NAME = 'skala-prioritas-static-v3';
const PUBLIC_ASSET_PATTERN = /\.(?:avif|css|eot|gif|ico|jpe?g|js|mjs|png|svg|ttf|webp|woff2?)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName === 'tailwind-admin-cache-v1' ||
                cacheName.startsWith('skala-prioritas-static-'),
            )
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNextStaticAsset = url.pathname.startsWith('/_next/static/');
  const isPublicAsset =
    !url.pathname.startsWith('/api/') &&
    PUBLIC_ASSET_PATTERN.test(url.pathname);
  if (!isNextStaticAsset && !isPublicAsset) return;

  event.respondWith(
    (async () => {
      if (isNextStaticAsset) {
        try {
          const response = await fetch(request);
          if (response.ok && response.type === 'basic') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      }

      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
