import { describe, test, expect } from 'vitest';
import { sha256Hex, verifyAgainstManifest } from '../integrity';

const encoder = new TextEncoder();

// Ground-truth hashes computed independently with Python's hashlib, not
// derived from the code under test, so this actually checks correctness
// rather than just self-consistency.
const HELLO_RAILWAZE_SHA256 = '8f487ea8ff8db14f0f5320ce9e69c089574afe0b64a097f216a79e05ec03a063';

describe('sha256Hex', () => {
    test('matches an independently computed reference hash', async () => {
        const hash = await sha256Hex(encoder.encode('hello railwaze').buffer);
        expect(hash).toBe(HELLO_RAILWAZE_SHA256);
    });

    test('produces a 64-character lowercase hex string', async () => {
        const hash = await sha256Hex(encoder.encode('anything').buffer);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
});

describe('verifyAgainstManifest', () => {
    test('reports ok when the asset bytes match the manifest hash', async () => {
        const manifest = { '/data/waypoints.geojson': HELLO_RAILWAZE_SHA256 };
        const result = await verifyAgainstManifest(
            '/data/waypoints.geojson',
            encoder.encode('hello railwaze').buffer,
            manifest
        );
        expect(result.ok).toBe(true);
        expect(result.tracked).toBe(true);
    });

    test('catches a corrupted cache entry instead of silently passing it', async () => {
        // Simulates Issue #7's required scenario: a cache entry whose bytes have
        // been tampered with (or corrupted) no longer match the hash recorded
        // at build time.
        const manifest = { '/data/waypoints.geojson': HELLO_RAILWAZE_SHA256 };
        const corruptedBytes = encoder.encode('corrupted bytes').buffer;

        const result = await verifyAgainstManifest('/data/waypoints.geojson', corruptedBytes, manifest);

        expect(result.ok).toBe(false);
        expect(result.tracked).toBe(true);
        expect(result.expectedHash).toBe(HELLO_RAILWAZE_SHA256);
        expect(result.actualHash).not.toBe(HELLO_RAILWAZE_SHA256);
    });

    test('treats an asset not present in the manifest as untracked, not a failure', async () => {
        const manifest = { '/data/waypoints.geojson': HELLO_RAILWAZE_SHA256 };
        const result = await verifyAgainstManifest(
            '/some/other/path.json',
            encoder.encode('whatever').buffer,
            manifest
        );
        expect(result.ok).toBe(true);
        expect(result.tracked).toBe(false);
    });
});