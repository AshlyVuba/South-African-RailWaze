const ANU_QRNG_URL = 'https://qrng.anu.edu.au/API/jsonI.php';

interface AnuQrngResponse {
    type: string;
    length: number;
    data: number[];
    success: boolean;
}

export type RandomSource = 'quantum' | 'classical';

export interface ShuffledItem<T> {
    value: T;
    /** Index this item held in the original, unshuffled array. */
    originalIndex: number;
}

export interface ShuffleResult<T> {
    items: ShuffledItem<T>[];
    /** Which entropy source actually produced this ordering. */
    source: RandomSource;
}

/**
 * Requests `count` true-random uint8 values (0-255) from the ANU QRNG API
 * in a single round trip. Returns null - never throws - on any failure:
 * offline, a Karoo dead zone, the API being rate-limited, a non-2xx
 * response, or a malformed/short payload.
 */
async function fetchQuantumBytes(count: number): Promise<number[] | null> {
    if (count <= 0) return [];

    try {
        const res = await fetch(`${ANU_QRNG_URL}?length=${count}&type=uint8`);
        if (!res.ok) return null;

        const json = (await res.json()) as AnuQrngResponse;
        if (!json.success || !Array.isArray(json.data) || json.data.length < count) {
            return null;
        }
        return json.data;
    } catch {
        // Network unreachable, timed out, CORS-blocked, or the response
        // wasn't valid JSON - all treated the same way: fall back silently.
        return null;
    }
}

/**
 * Fisher-Yates shuffle of `items`, seeded by true quantum randomness when
 * available. Each `ShuffledItem` carries its `originalIndex` alongside its
 * `value`, so callers can shuffle *display* order while still recovering
 * which original slot a given item came from (e.g. to submit the correct
 * `answer_index` regardless of how the option was displayed).
 *
 * On any QRNG failure this transparently falls back to `Math.random()` -
 * it never throws and never blocks the caller waiting on the network.
 */
export async function quantumShuffle<T>(items: readonly T[]): Promise<ShuffleResult<T>> {
    const indexed: ShuffledItem<T>[] = items.map((value, originalIndex) => ({
        value,
        originalIndex,
    }));

    const n = indexed.length;
    if (n <= 1) {
        return { items: indexed, source: 'classical' };
    }

    // Fisher-Yates needs exactly n - 1 random draws.
    const quantumBytes = await fetchQuantumBytes(n - 1);
    const source: RandomSource = quantumBytes ? 'quantum' : 'classical';

    for (let i = n - 1; i > 0; i--) {
        const byte = quantumBytes ? quantumBytes[n - 1 - i] : Math.floor(Math.random() * 256);
        const j = Math.floor((byte / 256) * (i + 1));
        [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }

    return { items: indexed, source };
}
 