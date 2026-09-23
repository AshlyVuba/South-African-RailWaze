// apps/web/public/sw.js
//
// Iteration 3 Issue #6: offline-first pre-caching layer.
//
// Plain JS, not TypeScript: this file is served as-is from apps/web/public/
// by Vite (nothing in public/ is transpiled), so it can't import the
// TypeScript helpers in src/lib/. The tile-math logic below is a deliberate,
// commented duplicate of apps/web/src/lib/tileMath.ts, which is the tested,
// canonical version - if the tile algorithm ever needs to change, change it
// in both places. Adopting vite-plugin-pwa (or any workbox-based build step)
// would remove this duplication entirely; noted as a follow-up rather than
// solved here to keep this ticket's scope to "make offline caching work."

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `railwaze-static-${CACHE_VERSION}`;
const TILE_CACHE = `railwaze-tiles-${CACHE_VERSION}`;

// --- App shell & data: everything here is a real, existing file today. ---
const APP_SHELL_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon.svg',
    '/data/route.geojson',
    '/data/waypoints.geojson',
    '/data/memory-vault.json',
];

// --- Station media (Memory Vault images, Audio Capsule clips): -----------
// These don't exist as real files yet - MemoryVaultSlider currently renders
// emoji/CSS placeholders, not <img>/<audio> tags, and there is no
// audio-capsules data file at all (see docs/DECISIONS.md). Listing
// nonexistent URLs here would make cache.addAll() reject the ENTIRE
// install step the moment a single 404 shows up, which would silently
// break offline mode for everything, not just the missing media - so this
// stays an empty, ready slot rather than a list of placeholder paths.
// Once real files land under /media/memory-vault/<station>.jpg and
// /media/audio/<station>.mp3 (or wherever the content pipeline puts them),
// add their URLs here.
const STATION_MEDIA_ASSETS = [];

// --- Map tiles: a real, install-time-safe slice of the actual corridor. --
// Mirrors apps/web/src/lib/tileMath.ts (see comment above).
function lonLatToTile(lon, lat, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

function tileUrlsForBbox(urlTemplate, bbox, zoom) {
    const topLeft = lonLatToTile(bbox.minLon, bbox.maxLat, zoom);
    const bottomRight = lonLatToTile(bbox.maxLon, bbox.minLat, zoom);
    const urls = [];
    for (let x = topLeft.x; x <= bottomRight.x; x += 1) {
        for (let y = topLeft.y; y <= bottomRight.y; y += 1) {
            urls.push(
                urlTemplate.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y))
            );
        }
    }
    return urls;
}

// Real Pretoria -> Cape Town corridor bbox, from data/geojson/route.geojson.
const CORRIDOR_BBOX = { minLon: 18.4241, minLat: -33.9249, maxLon: 28.1895, maxLat: -25.7565 };
// Zoom 5 only: 4 tiles per layer for the whole corridor. Deliberately small -
// tile.openstreetmap.org's usage policy prohibits bulk tile downloading, so
// this stays a small, demo-safe slice rather than precaching a wide zoom
// range. A production deployment should move to a proper tile provider
// (MapTiler, Mapbox, or a self-hosted tile server) before caching more.
const TILE_ZOOM = 5;
const TILE_URL_TEMPLATES = [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
];

// Same-origin API routes that must always prefer the network - trivia,
// passport, and health state are live and must never be served stale from
// cache as if they were current.
const NETWORK_FIRST_PATH_PATTERNS = [/\/waypoints/, /\/passport/, /\/health/];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const staticCache = await caches.open(STATIC_CACHE);
            await staticCache.addAll([...APP_SHELL_ASSETS, ...STATION_MEDIA_ASSETS]);

            const tileCache = await caches.open(TILE_CACHE);
            const tileUrls = TILE_URL_TEMPLATES.flatMap((template) =>
                tileUrlsForBbox(template, CORRIDOR_BBOX, TILE_ZOOM)
            );
            // Cross-origin tile requests need mode: 'no-cors' (an opaque response),
            // which cache.addAll() can't express per-request - so these are fetched
            // and cached individually. Promise.allSettled means one blocked/slow
            // tile (e.g. installing while already offline) never fails the whole
            // install step, unlike the app-shell cache.addAll() above.
            await Promise.allSettled(
                tileUrls.map(async (url) => {
                    const request = new Request(url, { mode: 'no-cors' });
                    const response = await fetch(request);
                    await tileCache.put(request, response);
                })
            );

            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== TILE_CACHE)
                    .map((name) => caches.delete(name))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Live API calls: network-first, falling back to cache only as a last
    // resort so a passenger still sees their last-known passport/waypoint
    // state rather than a hard error if the backend briefly drops.
    if (NETWORK_FIRST_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(request);
                    return response;
                } catch {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    throw new Error('Network unreachable and no cached response available');
                }
            })()
        );
        return;
    }

    // Map tiles: cache-first, populating the cache at runtime for any tile
    // outside the install-time zoom-5 precache (e.g. as the passenger zooms
    // in), so panning/zooming while online gradually improves offline
    // coverage rather than being limited to exactly the precached set.
    const isTileRequest = TILE_URL_TEMPLATES.some((template) => {
        const host = new URL(template.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0')).host;
        return url.host === host;
    });
    if (isTileRequest) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(TILE_CACHE);
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const response = await fetch(request, { mode: 'no-cors' });
                    cache.put(request, response.clone());
                    return response;
                } catch {
                    return new Response('', { status: 504, statusText: 'Offline and tile not cached' });
                }
            })()
        );
        return;
    }

    // Everything else (app shell, manifest, geojson, station media once it
    // exists): cache-first, since these only change on a new deploy, not
    // request-to-request.
    event.respondWith(
        (async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            try {
                const response = await fetch(request);
                if (response.ok && request.method === 'GET') {
                    const cache = await caches.open(STATIC_CACHE);
                    cache.put(request, response.clone());
                }
                return response;
            } catch {
                return new Response('Offline and this resource was never cached', {
                    status: 504,
                    statusText: 'Offline',
                });
            }
        })()
    );
});