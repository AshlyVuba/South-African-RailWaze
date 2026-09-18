import React from 'react';

export interface WaypointProperties {
  stationId: string;
  name: string;
  [key: string]: unknown;
}

// TODO: verify props when full 3D MapLibre viewport is wired
export interface MapCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onSelectWaypoint?: (station: WaypointProperties) => void;
}

/**
 * MapCanvas component
 * 
 * Target: MapLibre 3D terrain canvas for Pretoria -> Cape Town rail corridor
 * Conforms to AI Guardrails: placeholder tags used until maplibre-gl is wired.
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
  className = '',
  style,
  children,
  onSelectWaypoint,
}) => {
  return (
    <div
      className={`map-canvas-container ${className}`}
      data-testid="map-canvas"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121826',
        color: '#f3f4f6',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {/* PLACEHOLDER_MAP_CANVAS: MapLibre GL 3D terrain canvas initialization */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '16px',
          textAlign: 'center',
          maxWidth: '90%',
        }}
      >
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '0.025em',
          }}
        >
          {/* PLACEHOLDER_TERRAIN_VIEWPORT */}
          RailWaze Map Viewport
        </div>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            margin: 0,
          }}
        >
          {/* // TODO: verify MapLibre GL 3D terrain and route.geojson layer integration */}
          Pretoria &rarr; Cape Town Corridor (MapLibre 3D Terrain)
        </p>

        {onSelectWaypoint && (
          <button
            type="button"
            onClick={() =>
              onSelectWaypoint({
                stationId: 'kimberley',
                name: 'Kimberley Station',
              })
            }
            style={{
              marginTop: '12px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {/* PLACEHOLDER_TEST_WAYPOINT */}
            Select Kimberley Station (Test Vault)
          </button>
        )}
      </div>

      {children}
    </div>
  );
};

export default MapCanvas;
