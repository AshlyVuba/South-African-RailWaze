/**
 * Client-side verification of the backend's ML-DSA-44 (NIST FIPS 204)
 * signature over each /passport/{sessionId} response.
 *
 * This is a narrow, additive tamper-evidence layer, not a replacement
 * for TLS: it lets the UI show a "verified" badge confirming the
 * passport payload wasn't altered in transit or by a compromised
 * intermediary, using a public key bundled with the frontend build.
 *
 * The backend signs with `dilithium-py` (apps/api/app/security/pqc.py);
 * this file verifies with `@noble/post-quantum` - two independent,
 * standards-based implementations of the same NIST algorithm, so a
 * signature only verifies if both sides agree on the exact same bytes.
 *
 * Verification failure is always a soft failure: the passport still
 * renders normally either way (see PassportModal.tsx), this only
 * controls a small badge. It must never throw.
 */
import { ml_dsa44 } from '@noble/post-quantum/ml-dsa.js';
import { PQC_PUBLIC_KEY_HEX } from './pqcPublicKey';

export type PqcVerificationStatus = 'verified' | 'failed' | 'unavailable';

/**
 * Shape of the fields the backend actually signs (see
 * `_canonical_signable_payload` in apps/api/app/security/pqc.py). This
 * intentionally uses the raw camelCase field names from the API's JSON
 * response (sessionId, currentRank, totalScore, collectedStamps[].stampId)
 * rather than PassportModal's own snake_case `PassportState`/`PassportStamp`
 * interfaces - those are a display-layer shape with extra fields (like
 * `rank` vs `current_rank` compatibility aliases) that were never part of
 * what got signed, so reusing them here would sign the wrong bytes.
 */
export interface SignablePassportPayload {
    sessionId: string;
    currentRank: string;
    totalScore: number;
    collectedStamps: Array<{ stampId: string }>;
    signature?: string | null;
}

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
        throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

/**
 * Reconstructs the exact JSON bytes the backend signed. Key order and
 * separators must byte-for-byte match Python's
 * `json.dumps(payload, sort_keys=True, separators=(",", ":"))` - that
 * means alphabetically-sorted keys (rank, score, sessionId, stampIds)
 * and no incidental whitespace. JSON.stringify doesn't sort keys on its
 * own, so the sorted order is produced here by insertion order instead.
 *
 * If you change the field set in `_canonical_signable_payload` on the
 * backend, update this function too, or verification will fail for
 * every passport (safely, as "unavailable" - see verifyPassportSignature
 * below - but pointlessly).
 */
export function canonicalPayloadString(
    payload: Omit<SignablePassportPayload, 'signature'>
): string {
    const stampIds = payload.collectedStamps
        .map((stamp) => stamp.stampId)
        .sort((a, b) => a.localeCompare(b));

    return JSON.stringify({
        rank: payload.currentRank,
        score: payload.totalScore,
        sessionId: payload.sessionId,
        stampIds,
    });
}

/**
 * Verifies the backend's signature over `payload`. Resolves - never
 * rejects - to one of:
 *  - "unavailable": no signature present, or no public key bundled
 *    (an unset/mismatched key must never read as "verified" - see the
 *    comment on PQC_PUBLIC_KEY_HEX in pqcPublicKey.ts).
 *  - "verified" / "failed": a signature was actually checked against
 *    the reconstructed message.
 */
export async function verifyPassportSignature(
    payload: SignablePassportPayload
): Promise<PqcVerificationStatus> {
    if (!payload.signature) {
        return 'unavailable';
    }

    if (!PQC_PUBLIC_KEY_HEX) {
        return 'unavailable';
    }

    try {
        const signatureBytes = hexToBytes(payload.signature);
        const publicKeyBytes = hexToBytes(PQC_PUBLIC_KEY_HEX);
        const message = new TextEncoder().encode(canonicalPayloadString(payload));

        const isValid = ml_dsa44.verify(publicKeyBytes, message, signatureBytes);
        return isValid ? 'verified' : 'failed';
    } catch {
        return 'failed';
    }
}