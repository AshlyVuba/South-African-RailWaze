# Architectural Decision Log

## 2026-09-18: Unified Viewport Drawer & Slider Implementation
- **Context:** Issue: Wire Memory Vault nodes onto map canvas (Iter 2).
- **Decision:** Implemented the Memory Vault as an overlay drawer (`max-h-[70vh]`, blurred backdrop, safe-area inset padding) mounted over the MapLibre canvas rather than navigating to a separate route.
- **Reasoning:** Enforces the "single unified viewport" principle and preserves the underlying map instance, camera position, and zoom state on dismissal.
- **Image Comparison:** Implemented via responsive CSS clip-path inside `MemoryVaultSlider.tsx` with explicit `PLACEHOLDER_` assets pending verified archival records.

- 2026-09-18: Configured Vitest + JSDOM in apps/web; wired UnifiedViewport bottom-sheet drawer for MemoryVaultSlider upon station selection.
