import { describe, test, expect, vi, afterEach } from 'vitest';
import { quantumShuffle } from '../quantumRandom';

const OPTIONS = ['A', 'B', 'C', 'D'];

describe('quantumShuffle', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('requests exactly n-1 quantum bytes in a single call from the ANU QRNG API', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ type: 'uint8', length: 3, data: [10, 200, 50], success: true }),
        } as Response);
        globalThis.fetch = fetchMock;

        await quantumShuffle(OPTIONS);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://qrng.anu.edu.au/API/jsonI.php?length=3&type=uint8'
        );
    });

    test('reports "quantum" as the source on a successful API response', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ type: 'uint8', length: 3, data: [10, 200, 50], success: true }),
        } as Response);

        const result = await quantumShuffle(OPTIONS);

        expect(result.source).toBe('quantum');
    });

    test('every value from the input is preserved in the output, paired with its original index', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ type: 'uint8', length: 3, data: [0, 255, 128], success: true }),
        } as Response);

        const result = await quantumShuffle(OPTIONS);

        expect(result.items).toHaveLength(OPTIONS.length);
        // Every original index 0..3 appears exactly once, and each one's
        // value still matches what it was at that index originally -
        // i.e. answer identity travels with the item, not with position.
        const seenIndices = result.items.map((item) => item.originalIndex).sort();
        expect(seenIndices).toEqual([0, 1, 2, 3]);
        for (const item of result.items) {
            expect(item.value).toBe(OPTIONS[item.originalIndex]);
        }
    });

    // --- Failure modes (DoD item 2: must not throw or block) --------------

    test('falls back to Math.random() without throwing when the network is unreachable', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        const result = await quantumShuffle(OPTIONS);

        expect(result.source).toBe('classical');
        expect(result.items).toHaveLength(OPTIONS.length);
        expect(result.items.map((i) => i.originalIndex).sort()).toEqual([0, 1, 2, 3]);
    });

    test('falls back to Math.random() without throwing when the API returns a non-ok status (e.g. rate-limited)', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: () => Promise.resolve({}),
        } as Response);

        const result = await quantumShuffle(OPTIONS);

        expect(result.source).toBe('classical');
        expect(result.items).toHaveLength(OPTIONS.length);
    });

    test('falls back to Math.random() without throwing when the response body is malformed', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [1] }), // too short for 3 requested bytes
        } as Response);

        const result = await quantumShuffle(OPTIONS);

        expect(result.source).toBe('classical');
        expect(result.items).toHaveLength(OPTIONS.length);
    });

    test('falls back to Math.random() without throwing when success is false', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: false, data: [] }),
        } as Response);

        const result = await quantumShuffle(OPTIONS);

        expect(result.source).toBe('classical');
    });

    test('never rejects, even when fetch throws synchronously', async () => {
        globalThis.fetch = vi.fn().mockImplementation(() => {
            throw new Error('boom');
        });

        await expect(quantumShuffle(OPTIONS)).resolves.toBeDefined();
    });

    test('single-item and empty arrays are returned as-is without calling fetch', async () => {
        const fetchMock = vi.fn();
        globalThis.fetch = fetchMock;

        const single = await quantumShuffle(['only']);
        expect(single.items).toEqual([{ value: 'only', originalIndex: 0 }]);

        const empty = await quantumShuffle([]);
        expect(empty.items).toEqual([]);

        expect(fetchMock).not.toHaveBeenCalled();
    });
});