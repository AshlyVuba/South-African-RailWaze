# Architectural Decision Log

## 2026-09-18: Unified Viewport Drawer & Slider Implementation
- **Context:** Issue: Wire Memory Vault nodes onto map canvas (Iter 2).
- **Decision:** Implemented the Memory Vault as an overlay drawer (`max-h-[70vh]`, blurred backdrop, safe-area inset padding) mounted over the MapLibre canvas rather than navigating to a separate route.
- **Reasoning:** Enforces the "single unified viewport" principle and preserves the underlying map instance, camera position, and zoom state on dismissal.
- **Image Comparison:** Implemented via responsive CSS clip-path inside `MemoryVaultSlider.tsx` with explicit `PLACEHOLDER_` assets pending verified archival records.

- 2026-09-18: Configured Vitest + JSDOM in apps/web; wired UnifiedViewport bottom-sheet drawer for MemoryVaultSlider upon station selection.
- **2026-09-18**: Core data contract frozen at `v1.0.0` covering `waypoint.schema.json`, `trivia-passport.schema.json`, and `api-openapi.yaml` for Iteration 2 frontend and backend parity.
- **2026-09-20**: Content baseline locked for 4 anchor stations (Pretoria, Kimberley, Matjiesfontein, Cape Town).
    - **Archival Photo Licensing Status**:
        - `station-pretoria` (NZASM archives): `placeholder` — needs licensing check (Transnet Heritage Foundation / National Archives).
        - `station-kimberley` (Big Hole archival plate): `placeholder` — needs licensing check (McGregor Museum / public domain review).
        - `station-matjiesfontein` (Lord Milner Victorian era): `placeholder` — needs licensing check (Logan Heritage Collection).
        - `station-cape-town` (Hex River Pass construction): `placeholder` — needs licensing check (CGR archival survey records).
    - **Notice**: All historical images are marked `needs licensing check` and served as local placeholders until formal public-domain clearance is completed.
## 2026-09-22: Responsive Viewport Bifurcation & Waypoint Contract Alignment
- **Context:** Issue #5: Responsive layout pass and contract alignment for Unified Viewport.
- **Decision:** Split Memory Vault overlay into a mobile bottom-sheet drawer (`<768px`, `max-h-[70vh]`, `pb-safe`) and a docked side card (`>=768px`, `w-[420px]`). Enforced root viewport horizontal containment (`overflow-x-hidden`, `max-w-[100vw]`).
- **Contract Compatibility:** Aligned `WaypointProperties` to consume canonical `id` per `contracts/waypoint.schema.json` with fallback support for `stationId` (`activeStation.id ?? activeStation.stationId`) during migration.
## 2026-09-22: Audio Capsule Visualizer & Slot Coexistence Architecture
- **Context:** Issue #4: Lightweight folklore audio player with Web Audio API waveform visualizer (Iter 2).
- **Audio Architecture:** Implemented dynamic canvas visualizer via `AudioContext` analyser node with a static canvas progress-bar fallback for restricted or headless runtimes. Gated play button on `isAudioLoaded` metadata availability.
- **Viewport Coexistence:** Exposed `className` override on `AudioCapsule` to allow docking inside `UnifiedViewport` top safe-area slot (`pt-safe`) or floating at `bottom-20 pb-safe`, preventing collisions with the Memory Vault bottom drawer.
- **Contract Traceability:** Bound `audioCapsuleId` to match `audio_capsule_id` in `contracts/waypoint.schema.json`.
