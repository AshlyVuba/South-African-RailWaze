/**
 * South African RailWaze Design System Tokens
 *
 * Normalizes visual language across Passport UI, Memory Vault, Audio Capsule,
 * and Viewport shells per the Visual Consistency Audit:
 * - Color Hierarchy: Consistent card framing (bg-neutral-900/95 with backdrop-blur-md and border-white/10)
 * - Accents & Badges: Karoo gold (amber-500) for stamps/badges, cyan/sky (sky-400/sky-500) for audio/playback
 * - Typography: text-base font-semibold (headers), text-xs font-mono (meta/subtext), text-sm (body)
 * - Spacing & Radii: p-4 container padding, rounded-2xl dialogs, rounded-lg interactive chips/buttons
 * - Action Targets: h-8 w-8 rounded-full close buttons and min-44px touch targets
 */

export const designTokens = {
  // Container & Backdrop Framing
  containers: {
    dialog: 'bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4',
    card: 'bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4',
    compactSheet: 'bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3',
    subCard: 'bg-neutral-800/60 border border-white/10 rounded-lg p-3',
    backdrop: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4',
  },

  // Color Hierarchy & Interactive Accents
  colors: {
    // Karoo Gold / Amber accents for stamps, traveler rank, waystation badges
    karooGold: 'text-amber-500',
    karooGoldBg: 'bg-amber-500',
    karooGoldBorder: 'border-amber-500',
    karooGoldBadge: 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs rounded-lg px-2.5 py-1 font-semibold',
    karooGoldButton: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-mono font-bold rounded-lg transition-colors min-h-[44px] px-4 py-2 flex items-center justify-center shadow-md',

    // Cyan / Sky accents for active audio playback & waveform visualization
    audioActive: 'text-sky-400',
    audioActiveBg: 'bg-sky-500',
    audioActiveBorder: 'border-sky-500',
    audioBadge: 'text-xs font-mono tracking-widest uppercase font-semibold text-sky-400 block',
    audioButton: 'w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 text-neutral-950 flex items-center justify-center font-bold transition-colors shrink-0 shadow-md shadow-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed',
    audioWaveformActive: '#38bdf8', // sky-400 for 2D canvas context
    audioWaveformInactive: '#404040', // neutral-700
  },

  // Typography Tokens
  typography: {
    cardHeader: 'text-base font-semibold tracking-wide text-neutral-100',
    subtextMeta: 'text-xs font-mono text-neutral-400',
    body: 'text-sm text-neutral-300 leading-relaxed',
  },

  // Spacing & Radii Tokens
  spacing: {
    containerPadding: 'p-4',
    compactPadding: 'p-3',
    dialogRadius: 'rounded-2xl',
    interactiveRadius: 'rounded-lg',
  },

  // Unified Action & Touch Target Tokens
  actions: {
    closeButton: 'w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/10 transition-colors shrink-0',
    touchTargetMin: 'min-h-[44px] min-w-[44px]',
  },
} as const;

export default designTokens;
