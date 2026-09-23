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

export interface MemoryVaultSliderProps {
  stationId?: string;
  waypoint?: WaypointItem | null;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MemoryVaultSlider: React.FC<MemoryVaultSliderProps> = ({
  stationId,
  waypoint,
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
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    calculatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Graceful fallback for non-captured targets.
    }
  };

  return (
    <div
      data-testid="memory-vault-card"
      className={className}
      style={{
        width: '100%',
        maxWidth: 375,
        margin: '0 auto',
        backgroundColor: '#060B19',
        border: '1px solid #1E293B',
        borderRadius: 12,
        overflow: 'hidden',
        color: '#E2E8F0',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        touchAction: 'none',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #1E293B',
          background: 'rgba(11, 19, 43, 0.7)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FBBF24', letterSpacing: 0.5 }}>
          {String(stationName).toUpperCase()}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close vault"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          height: 220,
          userSelect: 'none',
          cursor: 'ew-resize',
          overflow: 'hidden',
          backgroundColor: '#0B132B',
          touchAction: 'none',
        }}
      >
        <img
          src={afterUrl}
          alt="Modern view"
          draggable={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${splitPos}%`,
            height: '100%',
            overflow: 'hidden',
            borderRight: '2px solid #F59E0B',
            pointerEvents: 'none',
          }}
        >
          <img
            src={beforeUrl}
            alt="Historical archival view"
            draggable={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: containerRef.current ? containerRef.current.clientWidth : 375,
              height: '100%',
              maxWidth: 'none',
              objectFit: 'cover',
            }}
          />
        </div>

        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(6, 11, 25, 0.85)',
            color: '#F59E0B',
            border: '1px solid #F59E0B',
            padding: '2px 6px',
            fontSize: 10,
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          {year}
        </span>
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(6, 11, 25, 0.85)',
            color: '#94A3B8',
            border: '1px solid #334155',
            padding: '2px 6px',
            fontSize: 10,
            borderRadius: 4,
            fontWeight: 700,
          }}
        >
          NOW
        </span>

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${splitPos}%`,
            transform: 'translate(-50%, -50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            boxShadow: '0 0 8px rgba(245, 158, 11, 0.7)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ padding: '12px 14px' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: '#CBD5E1' }}>
          {caption}
        </p>
      </div>
    </div>
  );
};

export default MemoryVaultSlider;
