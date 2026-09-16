# South African RailWaze

**Team:** TheLastCodeBenders (WeThinkCode_)
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
| Offline-first PWA | Full service-worker caching of map tiles and audio so the experience survives Karoo dead zones |

## MVP route anchor waypoints

1. **Pretoria / Joburg** — NZASM history and the Witwatersrand gold rush
2. **Kimberley** — Sol Plaatje's legacy and the Big Hole diamond rush
3. **Matjiesfontein** — Victorian railway health spa and Karoo stargazing heritage
4. **Hex River Pass → Cape Town** — engineering of the Hex River rail tunnel down to sea level

## Tech stack

- **Mapping / 3D:** MapLibre GL JS, RGB terrain elevation tiles, GeoJSON route paths
- **Frontend:** React / Next.js, Tailwind CSS, Framer Motion
- **Audio:** HTML5 Web Audio API with a custom drag-slider for the photo comparison module
- **Backend:** Python FastAPI serving GeoJSON waypoints and trivia state, Pydantic-validated
- **Data:** SQLite / PostGIS-compatible coordinates
- **Offline:** Service workers pre-caching audio, map tiles, and images

## Security (SSDLC)

- **Threat modelling (STRIDE):** GPS spoofing mitigated via sequential path-progress validation rather than simple radius checks; local cache integrity protected with SHA-256 manifests; traveler rank validated server-side, never trusted from the client.
- **Secure coding:** Strict Pydantic request validation in FastAPI, dependency scanning (SCA), secrets kept out of source control.
- **Testing:** SAST/DAST on the codebase, rate limiting on trivia endpoints (`slowapi`) against bot abuse, and offline cache integrity checks under simulated network failure.
- **Deployment:** Pre-deployment vulnerability scans, structured logging for anomaly detection, and a rollback plan for live-demo failure modes.

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
│   ├── web/                       # React/Next.js PWA (frontend)
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── manifest.json
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── map/           # MapLibre canvas, train marker
│   │   │   │   ├── audio-capsule/
│   │   │   │   ├── memory-vault/  # "then vs. now" slider
│   │   │   │   └── passport/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   ├── app/                # or pages/, depending on Next.js router choice
│   │   │   └── types/
│   │   ├── service-worker/
│   │   └── package.json
│   └── api/                       # FastAPI backend
│       ├── app/
│       │   ├── routers/
│       │   ├── schemas/           # Pydantic models (mirror contracts/)
│       │   ├── models/
│       │   ├── services/
│       │   ├── security/
│       │   └── main.py
│       ├── tests/
│       └── requirements.txt
├── data/
│   ├── geojson/                   # route.geojson, waypoints.geojson
│   ├── media/
│   │   ├── audio/
│   │   └── photos/then-now/
│   └── trivia/
├── contracts/                     # frozen data-shape source of truth
│   ├── waypoint.schema.json
│   ├── trivia-passport.schema.json
│   └── api-openapi.yaml
├── docs/
│   ├── AI_GUARDRAILS.md
│   ├── CONVENTIONS.md
│   ├── DECISIONS.md
│   └── ARCHITECTURE.md
├── .github/
│   └── ISSUE_TEMPLATE/
├── .env.example
└── README.md
```

## Team composition

TheLastCodeBenders —  working across an "Avatar" thematic role split:

| Member | Role | Domain |
|---|---|---|
| Ntsika Gajula | Waterbender | Full-stack engineering & 3D mapping (React, MapLibre) |
| Tshepang Mogane | Firebender | Backend & security engineering (FastAPI, SSDLC) |
| Keamogetswe Mokoena | Earthbender | Product strategy & go-to-market |
| Aphiwe Vuba | Airbender | Cultural research & storytelling |
| Lauren Steenkamp | The Avatar | Systems integration & offline data |

---
*#GKHack26*
