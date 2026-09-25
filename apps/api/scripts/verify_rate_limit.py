import sys

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def main():
    print("--- Running Rate Limit Proof-of-Concept ---")
    hit_429 = False
    for i in range(1, 35):
        res = client.get("/waypoints/WP_PRETORIA/trivia")
        print(f"Request {i}: Status {res.status_code}")
        if res.status_code == 429:
            hit_429 = True
            print(
                "\nSUCCESS: Rate limiting triggered 429 Too Many Requests as expected!"
            )
            break

    if not hit_429:
        print("\nFAIL: Did not hit 429 within 35 requests.")
        sys.exit(1)


if __name__ == "__main__":
    main()