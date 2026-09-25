const CACHE_NAME = 'railwaze-cache-v1';

// Assets to pre-cache at install time (The 4 Anchor Stations & Core Viewport Assets)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/data/geojson/route.geojson',
    '/data/geojson/waypoints.geojson',
    '/data/memory-vault.json',
    // Pre-cache core anchor station audio clips and Memory Vault images
    '/assets/audio/pretoria-nzasm.mp3',
    '/assets/audio/kimberley-big-hole.mp3',
    '/assets/audio/matjiesfontein-spa.mp3',
    '/assets/audio/hex-river-tunnel.mp3',
    '/assets/images/vault-pretoria-1892.jpg',
    '/assets/images/vault-kimberley-1871.jpg',
    '/assets/images/vault-matjiesfontein-1899.jpg',
    '/assets/images/vault-hex-river-1880.jpg'
];

// Install Event: Pre-cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-caching anchor station assets');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Cache-First for static assets, Network-First for API/Trivia
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // If request is for live API endpoints (trivia, passport validation), use Network-First
    if (url.pathname.startsWith('/api/') || url.pathname.includes('/trivia')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache or offline JSON if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Otherwise, use Cache-First strategy for static assets, map tiles, audio, and images
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // Dynamically cache new static assets as they are encountered
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
        })
    );
});