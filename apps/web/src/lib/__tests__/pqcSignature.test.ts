import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockVerify = vi.fn();

vi.mock('@noble/post-quantum/ml-dsa.js', () => ({
    ml_dsa44: {
        verify: (...args: unknown[]) => mockVerify(...args),
    },
}));

// A real ML-DSA-44 public key is 1312 bytes (2624 hex chars) - length
// doesn't matter for these mocked-verify tests, but keeping it hex-valid
// matters, since hexToBytes() runs before the mock is ever reached.
vi.mock('../pqcPublicKey', () => ({
    PQC_PUBLIC_KEY_HEX: 'ab'.repeat(1312),
}));

const { verifyPassportSignature, canonicalPayloadString } = await import('../pqcSignature');

const BASE_PAYLOAD = {
    sessionId: 'session-1',
    currentRank: 'Track Master',
    totalScore: 100,
    collectedStamps: [{ stampId: 'stamp-station-pretoria' }],
};

describe('verifyPassportSignature', () => {
    beforeEach(() => {
        mockVerify.mockReset();
    });

    test('resolves "unavailable" and never calls verify() when the response has no signature', async () => {
        const status = await verifyPassportSignature({ ...BASE_PAYLOAD, signature: undefined });
        expect(status).toBe('unavailable');
        expect(mockVerify).not.toHaveBeenCalled();
    });

    test('resolves "verified" when ml_dsa44.verify() returns true', async () => {
        mockVerify.mockReturnValue(true);
        const status = await verifyPassportSignature({ ...BASE_PAYLOAD, signature: 'aabbcc' });
        expect(status).toBe('verified');
    });

    // --- DoD: verification failure paths, incl. a simulated tamper case --

    test('resolves "failed" when ml_dsa44.verify() returns false (bad/tampered signature)', async () => {
        mockVerify.mockReturnValue(false);
        const status = await verifyPassportSignature({ ...BASE_PAYLOAD, signature: 'aabbcc' });
        expect(status).toBe('failed');
    });

    test('resolves "failed", never throws, on malformed signature hex', async () => {
        const status = await verifyPassportSignature({ ...BASE_PAYLOAD, signature: 'not-hex!!' });
        expect(status).toBe('failed');
        expect(mockVerify).not.toHaveBeenCalled();
    });

    test('a tampered field changes the exact bytes passed to verify()', async () => {
        mockVerify.mockReturnValue(true);

        await verifyPassportSignature({ ...BASE_PAYLOAD, signature: 'aabbcc' });
        const originalMessage = mockVerify.mock.calls[0][1] as Uint8Array;

        mockVerify.mockClear();
        await verifyPassportSignature({
            ...BASE_PAYLOAD,
            totalScore: 999999,
            signature: 'aabbcc',
        });
        const tamperedMessage = mockVerify.mock.calls[0][1] as Uint8Array;

        expect(tamperedMessage).not.toEqual(originalMessage);
    });

    test('stamp order does not change the signed message (stampIds are sorted)', () => {
        const a = canonicalPayloadString({
            ...BASE_PAYLOAD,
            collectedStamps: [{ stampId: 'b' }, { stampId: 'a' }],
        });
        const b = canonicalPayloadString({
            ...BASE_PAYLOAD,
            collectedStamps: [{ stampId: 'a' }, { stampId: 'b' }],
        });
        expect(a).toBe(b);
    });
});

describe('verifyPassportSignature with no bundled public key', () => {
    test('resolves "unavailable" (not "failed") when PQC_PUBLIC_KEY_HEX is empty', async () => {
        vi.resetModules();
        vi.doMock('../pqcPublicKey', () => ({ PQC_PUBLIC_KEY_HEX: '' }));
        const { verifyPassportSignature: verifyWithNoKey } = await import('../pqcSignature');

        const status = await verifyWithNoKey({ ...BASE_PAYLOAD, signature: 'aabbcc' });
        expect(status).toBe('unavailable');
    });
});