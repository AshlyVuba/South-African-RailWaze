import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { MapCanvas, type WaypointProperties } from './MapCanvas';
import { MemoryVaultSlider, WaypointItem } from './MemoryVaultSlider';
import { AudioCapsule } from './AudioCapsule';
import { PassportModal } from './PassportModal';
import { ConnectivityBanner } from './ConnectivityBanner';

const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export const UnifiedViewport: React.FC = () => {
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection<LineString>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<LineString>
  );
  const [waypointsGeoJson, setWaypointsGeoJson] = useState<FeatureCollection<Point>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<Point>
  );
  const [progress, setProgress] = useState<number>(0);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointItem | null>(null);
  const [showPassport, setShowPassport] = useState<boolean>(false);
  const [activeAudio, setActiveAudio] = useState<{
    isOpen: boolean;
    waypointId: string;
    waypointName: string;
    audioUrl: string;
    title: string;
    durationSeconds: number;
  } | null>(null);

  const lastAudioWaypointIdRef = useRef<string | null>(null);
  const sessionId = 'transkaroo-session-01';

  const handleWaypointSelect = useCallback((station: WaypointProperties) => {
    setActiveWaypoint({
      id: station.stationId,
      name: station.name,
      km_mark: typeof station.km_mark === 'number' ? station.km_mark : undefined,
      memory_vault: station.memory_vault as WaypointItem['memory_vault'],
    });
  }, []);

  // DoD 1: Fetch real route and waypoint datasets on mount
  useEffect(() => {
    let isMounted = true;

    async function loadCorridorData() {
      try {
        const [routeRes, waypointsRes] = await Promise.all([
          fetch('/data/route.geojson'),
          fetch('/data/waypoints.geojson'),
        ]);

        if (routeRes.ok && waypointsRes.ok) {
          const routeData = await routeRes.json();
          const waypointsData = await waypointsRes.json();

          if (isMounted) {
            setRouteGeoJson(routeData);
            setWaypointsGeoJson(waypointsData);

            // Set initial active waypoint if features exist
            if (waypointsData.features && waypointsData.features.length > 0) {
              const firstFeature = waypointsData.features[0];
              setActiveWaypoint({
                id: firstFeature.properties?.id || firstFeature.id,
                name: firstFeature.properties?.name,
                km_mark: firstFeature.properties?.km_mark,
                memory_vault: firstFeature.properties?.memory_vault,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load corridor GeoJSON data:', err);
      }
    }

    loadCorridorData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Issue #20 DoD: Geofence trigger to auto-open matching Audio Capsule once
  const handleWaypointReached = useCallback(
    (waypointId: string) => {
      if (!waypointsGeoJson.features) return;

      const matchedFeature = waypointsGeoJson.features.find(
        (f) => (f.properties?.id || f.id) === waypointId
      );

      if (!matchedFeature) return;

      const matchedWaypoint: WaypointItem = {
        id: matchedFeature.properties?.id || matchedFeature.id,
        name: matchedFeature.properties?.name,
        km_mark: matchedFeature.properties?.km_mark,
        memory_vault: matchedFeature.properties?.memory_vault,
      };

      setActiveWaypoint(matchedWaypoint);

      if (lastAudioWaypointIdRef.current !== waypointId) {
        lastAudioWaypointIdRef.current = waypointId;
        setActiveAudio({
          isOpen: true,
          waypointId,
          waypointName: matchedWaypoint.name || 'Station',
          audioUrl: `/audio/${waypointId}.mp3`,
          title: `${matchedWaypoint.name || 'Heritage Stop'} Oral History`,
          durationSeconds: 135,
        });
      }
    },
    [waypointsGeoJson]
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#060B19',
        fontFamily: 'sans-serif',
      }}
    >
      <ConnectivityBanner />

      {/* Real Map Canvas with dynamic route and waypoint layers */}
      <MapCanvas
        onSelectWaypoint={handleWaypointSelect}
        routeGeoJson={routeGeoJson}
        waypointsGeoJson={waypointsGeoJson}
        progressPercent={progress}
        onWaypointReached={handleWaypointReached}
      />

      {/* Top Header Controls */}
      <header
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(6, 11, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid rgba(245, 158, 11, 0.3)',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ color: '#FBBF24', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
            RAILWAZE 3D
          </span>
        </div>

        <button
          onClick={() => setShowPassport(true)}
          style={{
            backgroundColor: '#F59E0B',
            color: '#060B19',
            fontWeight: 700,
            fontSize: 12,
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
          }}
        >
          PASSPORT
        </button>
      </header>

      {/* Memory Vault Card (Overlay Bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 84,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: 375,
          zIndex: 15,
        }}
      >
        <MemoryVaultSlider waypoint={activeWaypoint} />
      </div>

      {/* Corridor Scrubber Slider */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: 375,
          backgroundColor: 'rgba(6, 11, 25, 0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '10px 16px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          zIndex: 20,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#FBBF24',
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 6,
            fontFamily: 'monospace',
          }}
        >
          <span>PROGRESS</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={(e) => setProgress(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#F59E0B',
            cursor: 'pointer',
          }}
        />
      </div>

<<<<<<< HEAD
      <div className="absolute top-2 right-2 z-40 pt-safe pr-safe">
        <ConnectivityBanner />
      </div>

      <header
        aria-label="Audio Capsule Bar"
        className="absolute top-0 inset-x-0 z-20 pointer-events-none pt-safe"
      >
        <div className="mx-auto max-w-md px-4 pt-2">
          <div className="pointer-events-auto flex items-center justify-between rounded-full bg-neutral-900/90 px-4 py-2 border border-white/10 backdrop-blur-md shadow-lg text-xs font-mono text-neutral-300">
            <span className="font-semibold text-amber-500">RailWaze Live</span>
            <span className="truncate max-w-[180px] text-neutral-400">
              {activeAudio ? activeAudio.title : 'PLACEHOLDER_AUDIO_TRACK'}
            </span>
          </div>
        </div>
      </header>

      {activeStation && (
        <section
          aria-label="Station Memory Vault"
          data-testid="memory-vault-panel"
          className="
            absolute z-30 transition-all duration-300 ease-out flex flex-col
            inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl pb-safe
            md:inset-y-4 md:left-4 md:right-auto md:w-[420px] md:max-h-[calc(100dvh-2rem)] md:rounded-2xl
            bg-neutral-900/95 border border-white/10 shadow-2xl backdrop-blur-md
          "
        >
          <div className="flex justify-center pt-2 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-neutral-700" />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <h2 className="text-base font-semibold tracking-wide text-neutral-100">
              {activeStation.name} Vault
            </h2>
            <button
  onClick={() => setIsPassportOpen(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rail-blue hover:bg-rail-blue-dark rounded-md transition-colors"
  aria-label="Open Trans-Karoo Passport"
>
  <PassportIcon className="w-4 h-4" />
  <span>Trans-Karoo Passport</span>
</button>
          </div>

          <div className="p-4 overflow-y-auto overflow-x-hidden min-h-0 flex-1">
            <MemoryVaultSlider stationId={activeStation.id ?? activeStation.stationId ?? ''} />
          </div>
        </section>
      )}

=======
      {/* Audio Capsule Modal */}
>>>>>>> c8f4007a5452f8894ba91babaca8ef4ac4a1d751
      {activeAudio && (
        <AudioCapsule
          isOpen={activeAudio.isOpen}
          onClose={() => setActiveAudio(null)}
          audioCapsuleId={activeAudio.waypointId}
          audioUrl={activeAudio.audioUrl}
          title={activeAudio.title}
          durationSeconds={activeAudio.durationSeconds}
        />
      )}

      {/* Passport Quest Modal */}
      {showPassport && (
        <PassportModal
          sessionId={sessionId}
          isOpen={showPassport}
          onClose={() => setShowPassport(false)}
        />
      )}
    </div>
  );
};