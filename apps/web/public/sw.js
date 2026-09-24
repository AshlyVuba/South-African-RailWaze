// apps/web/public/sw.js
//
// Iteration 3: offline-first pre-caching layer.
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
    '/integrity-manifest.json',
];

// --- SHA-256 integrity (Iteration 3)) -----------------------------
// Mirrors apps/web/src/lib/integrity.ts (the tested, canonical version -
// see the file-level comment above about why this file can't import it
// directly) and apps/web/scripts/generate-integrity-manifest.mjs, which
// generates /integrity-manifest.json at dev/build time. Keep this list in
// sync with that script's ASSET_PATHS.
const STATIC_INTEGRITY_ASSETS = [
    '/manifest.json',
    '/icons/icon.svg',
    '/data/route.geojson',
    '/data/waypoints.geojson',
    '/data/memory-vault.json',
];

async function sha256Hex(arrayBuffer) {
    const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function getIntegrityManifest() {
    const cached = await caches.match('/integrity-manifest.json');
    if (!cached) return {};
    try {
        return await cached.clone().json();
    } catch {
        return {};
    }
}

/**
 * Verifies a cached response's actual bytes against the build-time SHA-256
 * manifest before it's ever returned to the page. A tampered or corrupted
 * cache entry must never be silently served as if it were the real asset.
 */
async function verifyCachedResponse(pathname, cachedResponse) {
    if (!STATIC_INTEGRITY_ASSETS.includes(pathname)) {
        // Not a tracked asset (e.g. index.html, which Vite transforms
        // differently in dev vs build, or a runtime-cached map tile) -
        // nothing to verify against.
        return { ok: true, tracked: false };
    }

    const manifest = await getIntegrityManifest();
    const expectedHash = manifest[pathname];
    if (!expectedHash) {
        // Manifest not cached yet, or this path was added to
        // STATIC_INTEGRITY_ASSETS without regenerating the manifest.
        return { ok: true, tracked: false };
    }

    const buffer = await cachedResponse.clone().arrayBuffer();
    const actualHash = await sha256Hex(buffer);
    return { ok: actualHash === expectedHash, tracked: true, expectedHash, actualHash };
}

function contentUnavailableResponse(pathname) {
    return new Response(
        JSON.stringify({
            error: 'CONTENT_INTEGRITY_MISMATCH',
            message: `Cached content for ${pathname} failed integrity verification and could not be safely served.`,
        }),
        {
            status: 409,
            statusText: 'Content Integrity Mismatch',
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

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
    // request-to-request. Tracked assets are SHA-256 verified before being
    // served - a corrupted or tampered cache entry never goes straight to
    // the page.
    event.respondWith(
        (async () => {
            const cached = await caches.match(request);

            if (cached) {
                const verification = await verifyCachedResponse(url.pathname, cached);
                if (verification.ok) {
                    return cached;
                }

                // Cached copy failed verification - never serve it as-is.
                // Try a fresh network fetch instead of assuming the worst.
                try {
                    const fresh = await fetch(request);
                    if (fresh.ok && request.method === 'GET') {
                        const cache = await caches.open(STATIC_CACHE);
                        cache.put(request, fresh.clone());
                    }
                    return fresh;
                } catch {
                    // No network either - we genuinely cannot safely serve
                    // this asset. Say so clearly rather than returning the
                    // corrupted bytes.
                    return contentUnavailableResponse(url.pathname);
                }
            }

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