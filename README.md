# South African RailWaze

**Team:** TheLastCodeBenders
**Event:** Geekulcha Annual Hackathon 2026 (25–27 September 2026, Centurion, #GKHack26)
**Challenge track:** Train Journey Mapper
**Corridor:** Pretoria → Cape Town (1,600 km)
**Status:** TRL 3 (proof-of-concept) → building toward Iteration 2 (Sept 16–18, 2026)

## What it is

South African RailWaze turns the 26-hour Pretoria–Cape Town rail journey into an interactive, offline-capable travel companion. Instead of staring at empty Karoo landscape for a day, passengers get a live 3D map of the terrain they're crossing, geofenced audio stories about the towns they're passing, a "then vs. now" photo archive of historic stations, and a lightweight passport game that rewards them for reaching waypoints.

The core idea: one unified viewport, not a set of disconnected app tabs. As the train moves along the route, the map layer updates in real time and three contextual panels: audio, archive, passport, surface automatically based on where the train is.

South African RailWaze is TheLastCodeBenders' submission to the Train Journey Mapper track of the Geekulcha Annual Hackathon 2026, built to the 2026 theme, **Build for use**: a solution with identified users, a validated problem, security-by-design, and a real go-to-market plan, ready to be used beyond demo day. The track itself is also positioned as a foundation for Geekulcha's follow-on Train Tourism Hackathon in 2027.

## Problem

- **In-transit disconnection** — 26+ hours of travel with little interpretation of the landscape passing by.
- **Rural tourism invisibility** — small heritage towns along the line (De Aar, Kimberley, Matjiesfontein) have no digital discoverability.
- **Cultural and historical erasure** — regional folklore and railway history isn't documented anywhere accessible.
- **Low connectivity** — long dead zones across the Karoo break cloud-dependent travel apps.

## Who it's for

Domestic rail tourists, backpackers, scenic travelers, and school groups riding the corridor. On the B2B side: PRASA, Shosholoza Meyl, Rovos Rail, provincial tourism agencies (Gauteng Tourism, Wesgro), and rural farmstalls along the route.

## Core features

| Feature | Description |
|---|---|
| 3D scenic railsurface map | Real-time topographic map tracking elevation, biome shifts, and day/night cycles as the train progresses |
| Geofenced audio capsules | 45–60 second localized folklore and history clips that trigger automatically at waypoints |
| Memory vault ("then vs. now") | Interactive slider comparing historical station photography (1880s–1950s) with modern views |
| Trans-Karoo passport | Station micro-trivia that awards collectible digital stamps and traveler rank (Stoker → Rail Legend) |
| ⚛ Quantum-shuffled trivia | Trivia answer order is shuffled using live true-random bytes from the ANU Quantum Random Number Generator, with an on-screen indicator so the quantum call is visibly verifiable on camera |
| 🔏 Post-quantum passport signatures | Each passport response carries an ML-DSA (FIPS 204) signature, verified client-side before showing a "✓ PQC-verified" badge — a second, independent quantum-tech contribution alongside the QRNG shuffle |
| Offline-first PWA | Service-worker caching of app-shell assets and a demo-safe slice of map tiles, with SHA-256 integrity checks on cached data; audio/photo precaching is planned once real media assets exist |

## MVP route anchor waypoints

1. **Pretoria / Joburg** — NZASM history and the Witwatersrand gold rush
2. **Kimberley** — Sol Plaatje's legacy and the Big Hole diamond rush
3. **Matjiesfontein** — Victorian railway health spa and Karoo stargazing heritage
4. **Hex River Pass → Cape Town** — engineering of the Hex River rail tunnel down to sea level

## Tech stack

- **Mapping / 3D:** MapLibre GL JS, RGB terrain elevation tiles, GeoJSON route paths, Turf.js for train-position interpolation along the route
- **Frontend:** React 18 + TypeScript, built with Vite, styled with Tailwind CSS
- **Audio:** HTML5 Web Audio API (canvas waveform visualizer) with a custom drag-slider for the photo comparison module
- **Randomness:** ANU Quantum Random Number Generator API for live quantum-seeded shuffling of trivia answer order, with a tested classical fallback
- **Post-quantum cryptography:** ML-DSA (Dilithium, NIST FIPS 204) signatures over each passport response — `dilithium-py` (backend) signs, `@noble/post-quantum` (frontend) verifies against a bundled public key, with a tested graceful fallback if unavailable
- **Backend:** Python FastAPI serving GeoJSON waypoints and trivia state, Pydantic v2-validated, rate-limited with slowapi
- **Data:** GeoJSON + JSON Schema/OpenAPI contracts as the source of truth; an in-memory per-session store for passport/trivia progression (no database yet — planned before a production deployment)
- **Offline:** A hand-written service worker pre-caching a narrow, demo-safe slice of map tiles, plus app-shell assets, backed by a generated SHA-256 integrity manifest to detect tampering on cache reads

## Quantum tech integration

South African RailWaze's bonus quantum-tech contribution is a genuine, live integration — not a simulated or named-only reference:

- **Live entropy source:** `quantumShuffle()` (`apps/web/src/lib/quantumRandom.ts`) calls the [ANU Quantum Random Number Generator API](https://qrng.anu.edu.au/) to fetch true-random bytes, then runs a Fisher–Yates shuffle over the displayed trivia answer options using that quantum entropy.
- **Demoable on camera:** the trivia card shows a live "⚛ Quantum-shuffled (ANU QRNG, live)" indicator when the call succeeds, so the integration is visibly verifiable during the pitch rather than only narrated.
- **Graceful, tested fallback:** any QRNG failure (offline, rate-limited, malformed response) is caught inside `quantumShuffle()` itself and silently substitutes `Math.random()` — it never throws or blocks the UI. This is covered by dedicated tests simulating a rejected fetch, a 429 response, and a malformed payload (`lib/__tests__/quantumRandom.test.ts`).
- **Honest scope:** each shuffled item still carries its original server-assigned index, so the integration is ready to seed answer-submission logic once that flow is built, rather than being cosmetic-only.

### Post-quantum signature verification (passport stamps)

A second, independent quantum-tech contribution, scoped narrowly so it doesn't touch scoring, transport security, or the existing passport contract:

- **Real, standardized algorithm, not hand-rolled crypto:** ML-DSA (Dilithium, NIST FIPS 204). The backend (`apps/api/app/security/pqc.py`) signs with [`dilithium-py`](https://pypi.org/project/dilithium-py/) (a pure-Python implementation that passes the official FIPS 204 KAT test vectors); the frontend (`apps/web/src/lib/pqcVerify.ts`) verifies with [`@noble/post-quantum`](https://www.npmjs.com/package/@noble/post-quantum) — two independent implementations of the same NIST standard, not one library trusting itself.
- **Additive, not breaking:** `GET /passport/{sessionId}` gains one new optional field, `signature` (hex-encoded), over the existing response. Nothing else about the contract, rank/scoring logic, or TLS/transport changes.
- **Demoable on camera:** the passport modal shows a "✓ PQC-verified (ML-DSA)" badge when the signature checks out client-side, or "⚠ signature unavailable" otherwise — mirroring the QRNG badge pattern so both quantum-tech contributions are visibly verifiable, not just narrated.
- **Graceful, tested fallback:** a missing signature, an unbundled public key, malformed hex, or a genuinely invalid/tampered signature all resolve the same way — the passport still renders normally, it just never shows the verified badge. Covered by tests on both sides, including a simulated tampered-payload case.
- **Setup required before demo day:** run `python apps/api/scripts/generate_pqc_keypair.py` once, put the secret key in `apps/api/.env`, and paste the public key into `apps/web/src/lib/pqcPublicKey.ts`. Without this the app still works fine — the badge just stays off, since an unset key is a deliberate fail-safe default, not a bug.

## Security (SSDLC)

- **Threat modelling (STRIDE):** GPS spoofing mitigated via sequential path-progress validation rather than simple radius checks; local cache integrity protected with SHA-256 manifests; traveler rank validated server-side, never trusted from the client; passport responses carry an ML-DSA (FIPS 204) signature as a tamper-evidence layer, verified client-side.
- **Secure coding:** Strict Pydantic request validation in FastAPI (`extra="forbid"` on submission schemas), secrets kept out of source control.
- **Testing:** Backend pytest suite covering rate-limit rejection (HTTP 429), schema validation, and dedicated tests that a client-forged rank or stamp is always rejected server-side; ruff linting and ESLint enforced in CI. Automated dependency/static-analysis scanning (SCA/SAST) is not yet wired into CI — planned before final submission.
- **Deployment:** A rollback plan for live-demo failure modes; structured anomaly logging is planned but not yet implemented.

## Sprint roadmap

| Iteration | Window | Focus |
|---|---|---|
| 1 | Sept 14 – Sept 15 | Core architecture & repo setup — PWA shell, FastAPI skeleton, initial Pretoria–Kimberley GeoJSON |
| **2 (current)** | **Sept 16 – Sept 18** | **Geospatial viewport & UI modules — MapLibre 3D terrain canvas, train marker interpolation, Memory Vault slider, Pydantic schemas** |
| 3 | Sept 19 – Sept 21 | Offline resilience & gamification — geofenced audio triggers, trivia endpoints with rate limiting, service-worker caching with SHA-256 manifests |
| 4 | Sept 22 – Sept 24 | Integration, audio layering & pitch readiness — security testing, folklore audio recording, UI polish, pitch rehearsal |


## Repository structure

```
south-african-railwaze/
├── apps/
│   ├── web/                        # React + Vite PWA (frontend)
│   │   ├── public/
│   │   │   ├── data/                # runtime copy of route/waypoint GeoJSON
│   │   │   ├── manifest.json
│   │   │   └── sw.js                # service worker (registered from here, not a top-level folder)
│   │   ├── scripts/
│   │   │   └── generate-integrity-manifest.mjs
│   │   ├── src/
│   │   │   ├── components/          # MapCanvas, AudioCapsule, MemoryVaultSlider, PassportModal, UnifiedViewport, ConnectivityBanner
│   │   │   ├── lib/                 # connectivity, offlineQueue, integrity, tileMath, quantumRandom, pqcVerify, pqcPublicKey, designTokens
│   │   │   └── main.tsx
│   │   └── package.json
│   └── api/                        # FastAPI backend
│       ├── app/
│       │   ├── routers/             # waypoints, trivia, passport
│       │   ├── schemas/             # Pydantic models (mirror contracts/)
│       │   ├── db/                  # in-memory session store + seed data
│       │   ├── middleware/          # error handlers
│       │   ├── security/            # pqc.py - ML-DSA passport signing
│       │   ├── rate_limit.py
│       │   └── main.py
│       ├── scripts/
│       │   └── generate_pqc_keypair.py
│       ├── tests/
│       ├── .env.example
│       └── requirements.txt
├── data/
│   └── geojson/                    # route.geojson, waypoints.geojson (source of truth; copied into apps/web/public/data/ for runtime use)
├── contracts/                      # frozen data-shape source of truth
│   ├── waypoint.schema.json
│   ├── trivia-passport.schema.json
│   └── api-openapi.yaml
├── docs/
│   └── DECISIONS.md                # architectural decision log
├── .github/
│   └── workflows/ci.yml
└── README.md
```

> Note: `data/geojson/` and `apps/web/public/data/` are currently two copies of the same files — a known duplication flagged in `docs/DECISIONS.md`, to be resolved with a build step before Iteration 4.

## Team composition

TheLastCodeBenders —  working across an "Avatar" thematic role split:

| Member | Role | Domain |
|---|---|---|
| Ntsika Gajula | Waterbender | Frontend & PWA — frontend PWA development, Tailwind CSS styling, responsive mobile layouts, the unified single-canvas viewport interface |
| Tshepang Mogane | Firebender | Backend & API security — FastAPI backend architecture, Pydantic validation schemas, trivia state endpoints, server-side path-progress validation |
| Keamogetswe Mokoena | Earthbender | Geospatial & 3D visualization — MapLibre GL JS 3D elevation rendering, GeoJSON coordinate pipelines, spatial camera animation, train marker tracking |
| Aphiwe Vuba | Airbender | Offline-first & security architecture — service-worker caching, SHA-256 asset manifest verification, rate limiting (slowapi), vulnerability scanning |
| Lauren Steenkamp | The Avatar | Product strategy & content — UI/UX wireframing, the Memory Vault photo-comparison slider, gamified passport UI, pitch deck storytelling |

## How to run our code

**Backend**
```
cd apps\api
.venv\Scripts\activate
pip install -r requirements.txt
ruff check .
pytest
```

**Frontend**
```
cd apps\web
npm install
npm run lint
npm test
npm run build
```

---
*#GKHack26*