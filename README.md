# South African RailWaze

**Team:** TheLastCodeBenders
**Event:** Geekulcha Annual Hackathon 2026 (25–27 September 2026, Centurion, #GKHack26)
**Challenge track:** Train Journey Mapper
**Corridor:** Pretoria → Cape Town (1,600 km)

## What it is

South African RailWaze turns the 26-hour Pretoria–Cape Town rail journey into an interactive, offline-capable travel companion. Instead of staring at empty Karoo landscape for a day, passengers get a live 3D map of the terrain they're crossing, geofenced audio stories about the towns they're passing, a "then vs. now" photo archive of historic stations, and a lightweight passport game that rewards them for reaching waypoints.

The core idea: one unified viewport, not a set of disconnected app tabs. As the train moves along the route, the map layer updates in real time and three contextual panels — audio, archive, passport — surface automatically based on where the train is.

South African RailWaze is TheLastCodeBenders' submission to the Train Journey Mapper track of the Geekulcha Annual Hackathon 2026, built to the 2026 theme, **Build for use**: a solution with identified users, a validated problem, security-by-design, and a real go-to-market plan, ready to be used beyond demo day. The track itself is also positioned as a foundation for Geekulcha's follow-on Train Tourism Hackathon in 2027.

## Problem

- **In-transit disconnection** — over a day of travel with little interpretation of the landscape passing by.
- **Rural tourism invisibility** — small heritage towns along the line (De Aar, Matjiesfontein, etc.) have no digital discoverability.
- **Cultural and historical erasure** — regional folklore and railway history isn't documented anywhere accessible.
- **Low connectivity** — long dead zones across the Karoo break cloud-dependent travel apps.

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

- **Mapping / 3D:** MapLibre GL JS or Mapbox GL JS, RGB terrain elevation tiles, GeoJSON route paths
- **Frontend:** React / Next.js, Tailwind CSS, Framer Motion
- **Audio:** HTML5 Web Audio API with custom drag-slider for the photo comparison module
- **Backend:** Python (FastAPI) or Node.js serving GeoJSON waypoints and trivia state
- **Data:** SQLite / PostGIS-compatible coordinates
- **Offline:** Service workers pre-caching audio, map tiles, and images

## Security (SSDLC)

Security is designed in from the start, not bolted on:

- **Threat modelling (STRIDE):** GPS spoofing mitigated via sequential path-progress validation rather than simple radius checks; local cache integrity protected with SHA-256 manifests; traveler rank validated server-side, never trusted from the client.
- **Secure coding:** Strict Pydantic request validation in FastAPI, dependency scanning (SCA), secrets kept out of source control.
- **Testing:** SAST/DAST on the codebase, rate limiting on trivia endpoints (`slowapi`) against bot abuse, and offline cache integrity checks under simulated network failure.
- **Deployment:** Pre-deployment vulnerability scans, structured logging for anomaly detection, and a rollback plan for live-demo failure modes.

## Team composition

TheLastCodeBenders bring a mix of software, backend, architecture, and UI/UX skills to the challenge.

---
*#GKHack26*
