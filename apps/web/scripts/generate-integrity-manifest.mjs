// apps/web/scripts/generate-integrity-manifest.mjs
//
// Iteration 3: computes a SHA-256 hash for each locally-cached
// static asset and writes them to public/integrity-manifest.json. Runs
// automatically before both `npm run dev` and `npm run build` (see
// package.json's predev/prebuild scripts), so the manifest is always fresh
// rather than a generated file someone has to remember to regenerate and
// commit (that exact class of bug has bitten this project before with
// package-lock.json - see docs/DECISIONS.md).
//
// Scope: only plain static files under public/ that are served
// byte-for-byte identical in both dev and production. index.html and '/'
// are deliberately excluded - Vite transforms index.html differently
// between dev (injects the HMR client) and a production build, so its
// bytes aren't stable/hashable the way these files are. This matches the
// STRIDE slide's actual intent: protecting cached *offline archive*
// content from tampering, not the app shell's own HTML/JS (which has its
// own separate story via HTTPS + Vite's content-hashed bundle filenames).
//
// Keep ASSET_PATHS in sync with STATIC_INTEGRITY_ASSETS in public/sw.js.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const ASSET_PATHS = [
    '/manifest.json',
    '/icons/icon.svg',
    '/data/route.geojson',
    '/data/waypoints.geojson',
    '/data/memory-vault.json',
    // Add real station Memory Vault image / Audio Capsule audio paths here
    // once the content pipeline produces them (see docs/DECISIONS.md) -
    // they need to be added here AND to STATION_MEDIA_ASSETS in sw.js.
];

const manifest = {};
let skipped = 0;

for (const assetPath of ASSET_PATHS) {
    const filePath = join(publicDir, assetPath);
    if (!existsSync(filePath)) {
        console.warn(`[integrity-manifest] Skipping ${assetPath} - not found at ${filePath}`);
        skipped += 1;
        continue;
    }
    const contents = readFileSync(filePath);
    manifest[assetPath] = createHash('sha256').update(contents).digest('hex');
}

const outputPath = join(publicDir, 'integrity-manifest.json');
writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(
    `[integrity-manifest] Wrote ${Object.keys(manifest).length} entries to ${outputPath}` +
    (skipped > 0 ? ` (${skipped} configured path(s) skipped - file not found)` : '')
);
