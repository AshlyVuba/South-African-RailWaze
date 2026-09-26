from dilithium_py.ml_dsa import ML_DSA_44


def main() -> None:
    public_key, secret_key = ML_DSA_44.keygen()

    print("# --- apps/api/.env -----------------------------------------")
    print(f"RAILWAZE_PQC_SECRET_KEY={secret_key.hex()}")
    print(f"RAILWAZE_PQC_PUBLIC_KEY={public_key.hex()}")
    print()
    print("# --- apps/web/src/lib/pqcPublicKey.ts ------------------------")
    print(f'export const PQC_PUBLIC_KEY_HEX = "{public_key.hex()}";')


if __name__ == "__main__":
    main()