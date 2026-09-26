import { ml_dsa44 } from '@noble/post-quantum/ml-dsa.js';
import { PQC_PUBLIC_KEY_HEX } from './pqcPublicKey';

export type PqcVerificationStatus = 'verified' | 'unavailable' | 'failed';

/**
 * The subset of a /passport/{sessionId} response this module needs. Note
 * these are the actual camelCase keys FastAPI serializes (sessionId,
 * currentRank, totalScore, collectedStamps[].stampId) - not the
 * snake_case field names in PassportModal.tsx's own `PassportState`
 * interface, which predates this file and is a separate, pre-existing
 * naming mismatch this change doesn't attempt to fix.
 */
export interface SignablePassportPayload {
    sessionId: string;
    currentRank: string;
    totalScore: number;
    collectedStamps: Array<{ stampId: string }>;
    signature?: string | null;
}

function hexToBytes(hex: string): Uint8Array {
    const clean = hex.trim();
    if (clean.length === 0 || clean.length % 2 !== 0) {
        throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        const byte = Number.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
        if (Number.isNaN(byte)) throw new Error('Invalid hex string');
        bytes[i] = byte;
    }
    return bytes;
}

/**
 * Rebuilds the exact canonical JSON string the backend signed, from the
 * fields it actually included in the passport response.
 *
 * Field set and formatting must stay in lockstep with
 * apps/api/app/security/pqc.py::_canonical_signable_payload - both sides
 * sort keys and use no incidental whitespace, which for this specific
 * (flat, string/number/string-array) payload shape is enough to make
 * Python's json.dumps(..., sort_keys=True, separators=(",", ":")) and
 * this function byte-identical. If the payload ever grows nested objects
 * or non-ASCII-safe values, this hand-written canonicalizer must be
 * revisited alongside it.
 */
export function canonicalPayloadString(payload: SignablePassportPayload): string {
    const stampIds = payload.collectedStamps.map((s) => s.stampId).slice().sort();
    const obj: Record<string, unknown> = {
        rank: payload.currentRank,
        score: payload.totalScore,
        sessionId: payload.sessionId,
        stampIds,
    };
    const keys = Object.keys(obj).sort();
    const parts = keys.map((key) => `${JSON.stringify(key)}:${JSON.stringify(obj[key])}`);
    return `{${parts.join(',')}}`;
}

/**
 * Verifies the ML-DSA signature the backend attached to a passport
 * response, against the bundled public key.
 *
 * Never throws. Any failure - no signature present, no public key
 * bundled yet, malformed hex, or a genuinely invalid/tampered signature -
 * resolves to a status the caller renders a graceful fallback for. The
 * passport itself must always still display regardless of this result.
 */
export async function verifyPassportSignature(
    payload: SignablePassportPayload,
): Promise<PqcVerificationStatus> {
    if (!payload.signature) return 'unavailable';
    if (!PQC_PUBLIC_KEY_HEX) return 'unavailable';

    try {
        const signatureBytes = hexToBytes(payload.signature);
        const publicKeyBytes = hexToBytes(PQC_PUBLIC_KEY_HEX);
        const message = new TextEncoder().encode(canonicalPayloadString(payload));

        const isValid = ml_dsa44.verify(signatureBytes, message, publicKeyBytes);
        return isValid ? 'verified' : 'failed';
    } catch {
        // Malformed hex, wrong-length key/signature, or any library-level
        // error is treated the same as a failed verification - never thrown
        // up to the UI.
        return 'failed';
    }
}