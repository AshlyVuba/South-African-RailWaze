import React, { useState, useCallback } from 'react';

// Conforms to AI Guardrails: Loud placeholders and mobile responsiveness
export interface MemoryVaultSliderProps {
  stationId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MemoryVaultSlider: Interactive "Then vs. Now" historical imagery comparison slider
 * From Issue #5 (Iteration 2)
 */
export const MemoryVaultSlider: React.FC<MemoryVaultSliderProps> = ({
  stationId,
  className = '',
  style,
}) => {
  // Slider position from 0 (all 'Now') to 100 (all 'Then')
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  }, []);

  // PLACEHOLDER_METADATA: Real archival assets must be verified via contracts / media pipeline
  // // TODO: verify historical photo archive source and copyright attribution for stationId
  const thenYear = 'PLACEHOLDER_THEN_YEAR (circa 1895)';
  const nowYear = 'PLACEHOLDER_NOW_YEAR (Present Day)';

  return (
    <div
      className={`memory-vault-slider w-full max-w-xl mx-auto flex flex-col gap-4 text-white ${className}`}
      data-testid="memory-vault-slider"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* Station context banner */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono uppercase tracking-wider">
          Station ID: {stationId}
        </span>
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
          {/* PLACEHOLDER_TAG */}
          PLACEHOLDER_HERITAGE_ARCHIVE
        </span>
      </div>

      {/* Comparison Viewport */}
      <div
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-xl overflow-hidden select-none bg-slate-950 border border-slate-800 shadow-inner"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#020617',
          border: '1px solid #1e293b',
          userSelect: 'none',
        }}
      >
        {/* Layer 1: "Now" (Contemporary - Base Layer) */}
        <div
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-800 to-slate-900"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: '#1e293b',
          }}
        >
          {/* PLACEHOLDER_NOW_IMAGE: Modern station view */}
          <div className="text-center space-y-2">
            <span className="text-4xl">🚆</span>
            <div className="text-sm font-semibold text-emerald-400">
              {/* PLACEHOLDER_MODERN_TAG */}
              {nowYear}
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {/* // TODO: verify contemporary photography source */}
              Modern passenger terminal and electrified rail infrastructure
            </p>
          </div>
        </div>

        {/* Layer 2: "Then" (Archival - Clipped Overlay) */}
        <div
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-stone-900 to-amber-950/80 filter sepia-[0.35]"
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: '#292524',
          }}
        >
          {/* PLACEHOLDER_THEN_IMAGE: Archival steam locomotive / station view */}
          <div className="text-center space-y-2">
            <span className="text-4xl">🚂</span>
            <div className="text-sm font-semibold text-amber-300">
              {/* PLACEHOLDER_ARCHIVE_TAG */}
              {thenYear}
            </div>
            <p className="text-xs text-stone-300 max-w-xs mx-auto">
              {/* // TODO: verify archival historical facts and collection rights */}
              Original Victorian-era masonry, steam depot, and telegraph lines
            </p>
          </div>
        </div>

        {/* Divider line indicator */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-10 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sliderPosition}%`,
            width: '2px',
            backgroundColor: '#ffffff',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '28px',
              height: '28px',
              borderRadius: '9999px',
              backgroundColor: '#0f172a',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            ⇄
          </div>
        </div>

        {/* Badges */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            fontSize: '11px',
            color: '#fde68a',
            zIndex: 10,
          }}
        >
          Then
        </div>
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            fontSize: '11px',
            color: '#6ee7b7',
            zIndex: 10,
          }}
        >
          Now
        </div>
      </div>

      {/* Interactive Range Slider Control */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Archival Past (1890s)</span>
          <span>Slide to Compare</span>
          <span>Present (2020s)</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPosition}
          onChange={handleSliderChange}
          aria-label="Compare Then and Now imagery"
          aria-valuenow={sliderPosition}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-amber-400 touch-none"
          style={{
            width: '100%',
            cursor: 'ew-resize',
          }}
        />
      </div>

      {/* Historical Context Caption */}
      <p className="text-xs text-slate-400 italic text-center">
        {/* // TODO: verify historical narrative for {stationId} */}
        {/* PLACEHOLDER_HISTORICAL_NARRATIVE */}
        Archival photos depict the arrival of the Cape Government Railways and early 20th-century gold and diamond corridor expansions.
      </p>
    </div>
  );
};

export default MemoryVaultSlider;
