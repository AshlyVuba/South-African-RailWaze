from dilithium_py.ml_dsa import ML_DSA_44
from fastapi.testclient import TestClient

import app.security.pqc as pqc
from app.db.session_store import get_passport
from app.main import app
from app.security.pqc import (
    _canonical_bytes,
    _canonical_signable_payload,
    sign_passport,
)

client = TestClient(app)


# --- DoD: backend signs the passport payload and includes it in the ------
# --- response -------------------------------------------------------------


def test_passport_response_includes_a_non_empty_hex_signature():
    response = client.get("/passport/pqc-fresh-session")
    assert response.status_code == 200
    data = response.json()

    assert "signature" in data
    assert isinstance(data["signature"], str)
    assert len(data["signature"]) > 0
    # Must be valid hex - raises ValueError otherwise.
    bytes.fromhex(data["signature"])


def test_two_different_sessions_get_different_signatures():
    sig_a = client.get("/passport/pqc-session-a").json()["signature"]
    sig_b = client.get("/passport/pqc-session-b").json()["signature"]
    assert sig_a != sig_b


# --- DoD: signature generation (backend) ----------------------------------


def test_signature_verifies_against_the_module_public_key():
    passport = get_passport("pqc-verify-roundtrip")
    signature_hex = sign_passport(passport)

    public_key, _secret_key = pqc._load_or_generate_keypair()
    message = _canonical_bytes(_canonical_signable_payload(passport))

    assert ML_DSA_44.verify(public_key, message, bytes.fromhex(signature_hex))


# --- DoD: a simulated tampered-payload case -------------------------------


def test_tampered_payload_fails_verification():
    passport = get_passport("pqc-tamper-check")
    signature_hex = sign_passport(passport)
    public_key, _secret_key = pqc._load_or_generate_keypair()

    tampered_payload = _canonical_signable_payload(passport)
    tampered_payload["score"] = (tampered_payload["score"] or 0) + 999999
    tampered_message = _canonical_bytes(tampered_payload)

    assert not ML_DSA_44.verify(
        public_key, tampered_message, bytes.fromhex(signature_hex)
    )


def test_signature_from_one_session_does_not_verify_another_sessions_payload():
    passport_a = get_passport("pqc-cross-session-a")
    passport_b = get_passport("pqc-cross-session-b")
    signature_a = sign_passport(passport_a)

    public_key, _secret_key = pqc._load_or_generate_keypair()
    message_b = _canonical_bytes(_canonical_signable_payload(passport_b))

    assert not ML_DSA_44.verify(public_key, message_b, bytes.fromhex(signature_a))