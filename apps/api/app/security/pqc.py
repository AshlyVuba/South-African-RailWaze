"""Post-quantum (ML-DSA / FIPS 204) signing of passport responses.

This is a narrow, additive tamper-evidence layer on top of the existing
passport contract - it does not replace TLS, does not touch rank/scoring
logic, and does not change the shape of any existing field. It signs a
small, explicitly-defined subset of the passport state (see
``_canonical_signable_payload``) rather than the full model dump, so the
signed bytes never depend on datetime formatting or on the model's
legacy compatibility fields (``rank`` vs ``current_rank``, etc.).

Uses ``dilithium-py`` (pure-Python, passes the official FIPS 204 KAT
vectors) rather than any hand-rolled cryptography. The companion
frontend verifier uses ``@noble/post-quantum`` - both are independent,
standards-based implementations of the same NIST algorithm.

Keypair handling
-----------------
Set ``RAILWAZE_PQC_SECRET_KEY`` / ``RAILWAZE_PQC_PUBLIC_KEY`` (hex) in the
environment to pin a stable keypair across restarts - required for the
frontend's *bundled* public key (apps/web/src/lib/pqcPublicKey.ts) to
actually match what the backend is signing with. Generate a pair with
``python apps/api/scripts/generate_pqc_keypair.py``.

If those env vars are unset, a fresh keypair is generated at startup as a
convenience fallback - the API still works, but every restart invalidates
the frontend's bundled public key, so the verified badge will simply
never appear until a pinned keypair is configured. That is the intended
graceful-degradation behaviour, not a bug.
"""

from __future__ import annotations

import json
import os

from dilithium_py.ml_dsa import ML_DSA_44

_keypair: tuple[bytes, bytes] | None = None


def _load_or_generate_keypair() -> tuple[bytes, bytes]:
    """Returns (public_key, secret_key), generated once and cached."""
    global _keypair
    if _keypair is not None:
        return _keypair

    secret_hex = os.environ.get("RAILWAZE_PQC_SECRET_KEY")
    public_hex = os.environ.get("RAILWAZE_PQC_PUBLIC_KEY")

    if secret_hex and public_hex:
        public_key = bytes.fromhex(public_hex)
        secret_key = bytes.fromhex(secret_hex)
    else:
        public_key, secret_key = ML_DSA_44.keygen()

    _keypair = (public_key, secret_key)
    return _keypair


def _canonical_signable_payload(passport) -> dict:
    """The exact, minimal set of fields that get signed.

    Mirrors apps/web/src/lib/pqcSignature.ts::canonicalPayloadString - if you
    change the field set here, update that file too, or verification will
    fail for every passport (safely, as "unavailable", but pointlessly).
    """
    return {
        "sessionId": passport.session_id,
        "rank": passport.current_rank.value,
        "score": (
            passport.total_score if passport.total_score is not None else passport.score
        ),
        "stampIds": sorted(
            stamp.stamp_id for stamp in passport.collected_stamps if stamp.stamp_id
        ),
    }


def _canonical_bytes(payload: dict) -> bytes:
    """Deterministic JSON encoding: sorted keys, no incidental whitespace.

    Must byte-for-byte match the frontend's reconstruction of the same
    payload, since that's what makes the signature verifiable client-side.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_passport(passport) -> str:
    """Signs a PassportState's canonical payload, returns hex signature."""
    _public_key, secret_key = _load_or_generate_keypair()
    message = _canonical_bytes(_canonical_signable_payload(passport))
    signature = ML_DSA_44.sign(secret_key, message)
    return signature.hex()