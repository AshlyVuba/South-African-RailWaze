/**
 * Bundled ML-DSA-44 (NIST FIPS 204) public key, used by pqcSignature.ts to
 * check the signature the backend attaches to each /passport/{sessionId}
 * response.
 *
 * Generate a real keypair with:
 *
 *   python apps/api/scripts/generate_pqc_keypair.py
 *
 * then:
 *   1. paste the printed RAILWAZE_PQC_SECRET_KEY / RAILWAZE_PQC_PUBLIC_KEY
 *      lines into apps/api/.env (never commit apps/api/.env)
 *   2. paste the printed public-key hex below, replacing the empty string
 *      (safe to commit - it's a public key)
 *
 * Left empty, verifyPassportSignature() always resolves to 'unavailable' -
 * the passport still renders normally, it just never shows the verified
 * badge. That's a deliberate fail-safe default, not a bug: an unset or
 * mismatched key must never be treated as "verified".
 */
export const PQC_PUBLIC_KEY_HEX = '';