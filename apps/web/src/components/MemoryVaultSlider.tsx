import React, { useState, useRef, useCallback } from 'react';

export interface MemoryVaultData {
  before_image_url?: string;
  after_image_url?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  caption?: string;
  year?: number;
}

export interface WaypointItem {
  id?: string;
  name?: string;
  km_mark?: number;
  memory_vault?: MemoryVaultData;
}

export interface TriviaQuestion {
  id: string;
  waypoint_id: string;
  question: string;
  options: string[];
}

export interface MemoryVaultSliderProps {
  stationId?: string;
  waypoint?: WaypointItem | null;
  triviaQuestion?: TriviaQuestion | null;
  triviaLoading?: boolean;
  triviaError?: string | null;
  onTriviaRequest?: () => void;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MemoryVaultSlider: React.FC<MemoryVaultSliderProps> = ({
  stationId,
  waypoint,
  triviaQuestion = null,
  triviaLoading = false,
  triviaError = null,
  onTriviaRequest,
  onClose,
  className = '',
  style,
}) => {
  const [splitPos, setSplitPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef<boolean>(false);

  const vault = waypoint?.memory_vault ?? {
    before_image_url: 'PLACEHOLDER_vault_before.jpg',
    after_image_url: 'PLACEHOLDER_vault_after.jpg',
    caption: `Historical archival perspective for ${stationId ?? waypoint?.id ?? 'this corridor stop'}.`,
    year: 1900,
  };

  const beforeUrl =
    vault.before_image_url || vault.beforeImageUrl || 'PLACEHOLDER_vault_before.jpg';
  const afterUrl =
    vault.after_image_url || vault.afterImageUrl || 'PLACEHOLDER_vault_after.jpg';
  const caption = vault.caption || 'Historical archival perspective.';
  const year = vault.year || 1900;
  const stationName = waypoint?.name || stationId || 'Corridor Waypoint';

  const calculatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    setSplitPos(Math.max(0, Math.min(100, percent)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    const target = e.currentTarget as HTMLDivElement;
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(e.pointerId);
    }
    calculatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    calculatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    const target = e.currentTarget as HTMLDivElement;
    try {
      if (typeof target.releasePointerCapture === 'function') {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Graceful fallback for non-captured targets.
    }
  };

  return (
    <div
      data-testid="memory-vault-card"
      className={`w-full max-w-[375px] mx-auto bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl text-neutral-100 flex flex-col box-border touch-none ${className}`}
      style={style}
    >
      <div className="flex justify-between items-center p-4 border-b border-white/10 bg-neutral-900/60">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <h3 className="text-base font-semibold tracking-wide text-neutral-100 uppercase truncate">
            {String(stationName).toUpperCase()}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close vault"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/10 transition-colors shrink-0"
          >
            <span className="text-base leading-none">&times;</span>
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-[220px] select-none cursor-ew-resize overflow-hidden bg-neutral-950 touch-none"
      >
        <img
          src={afterUrl}
          alt="Modern view"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <div
          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-amber-500 pointer-events-none"
          style={{ width: `${splitPos}%` }}
        >
          <img
            src={beforeUrl}
            alt="Historical archival view"
            draggable={false}
            className="absolute inset-y-0 left-0 h-full object-cover max-w-none"
            style={{
              width: containerRef.current ? containerRef.current.clientWidth : 375,
            }}
          />
        </div>

        <span className="absolute top-3 left-3 bg-neutral-950/80 border border-amber-500/40 text-amber-400 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-sm pointer-events-none">
          {year}
        </span>
        <span className="absolute top-3 right-3 bg-neutral-950/80 border border-white/10 text-neutral-400 font-mono text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-sm pointer-events-none">
          NOW
        </span>

        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)] flex items-center justify-center text-neutral-950 font-bold text-xs pointer-events-none select-none"
          style={{ left: `${splitPos}%` }}
        >
          ⇄
        </div>
      </div>

      <div className="p-4 bg-neutral-900/40 border-t border-white/5">
        <p className="text-sm text-neutral-300 leading-relaxed m-0">
          {caption}
        </p>
        {onTriviaRequest && waypoint?.id && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onTriviaRequest}
              disabled={triviaLoading}
              className="min-h-10 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
            >
              {triviaLoading ? 'Loading trivia...' : 'Trivia'}
            </button>
            {triviaError && <p role="alert" className="mt-3 text-sm text-rose-300">{triviaError}</p>}
            {triviaQuestion && (
              <div aria-live="polite" className="mt-3">
                <p className="text-sm font-semibold text-neutral-100">{triviaQuestion.question}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-300">
                  {triviaQuestion.options.map((option) => <li key={option}>{option}</li>)}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryVaultSlider;
