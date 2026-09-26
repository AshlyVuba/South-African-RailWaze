import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { MapCanvas, type WaypointProperties } from './MapCanvas';
import { MemoryVaultSlider, type TriviaQuestion, type WaypointItem } from './MemoryVaultSlider';
import { AudioCapsule } from './AudioCapsule';
import { PassportModal } from './PassportModal';
import { ConnectivityBanner } from './ConnectivityBanner';

const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

interface MemoryVaultCaption {
  waypoint_id: string;
  caption: string;
}

interface MemoryVaultCatalog {
  memory_vault_captions: MemoryVaultCaption[];
}

const toWaypointItem = (
  feature: Feature<Point>,
  catalog: MemoryVaultCatalog,
): WaypointItem => {
  const properties = feature.properties ?? {};
  const id = String(properties.id ?? feature.id ?? '');
  const name = typeof properties.name === 'string' ? properties.name : 'Waypoint';
  const caption = catalog.memory_vault_captions.find((item) => item.waypoint_id === id)?.caption;

  return {
    id,
    name,
    km_mark: typeof properties.km_mark === 'number' ? properties.km_mark : undefined,
    memory_vault: {
      caption: caption ?? `Historical archival perspective for ${name}.`,
    },
  };
};

export const UnifiedViewport: React.FC = () => {
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection<LineString>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<LineString>
  );
  const [waypointsGeoJson, setWaypointsGeoJson] = useState<FeatureCollection<Point>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<Point>
  );
  const [memoryVaultCatalog, setMemoryVaultCatalog] = useState<MemoryVaultCatalog>({
    memory_vault_captions: [],
  });
  const [progress, setProgress] = useState<number>(0);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointItem | null>(null);
  const [triviaQuestion, setTriviaQuestion] = useState<TriviaQuestion | null>(null);
  const [triviaLoading, setTriviaLoading] = useState<boolean>(false);
  const [triviaError, setTriviaError] = useState<string | null>(null);
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
    const feature = waypointsGeoJson.features.find(
      (item) => String(item.properties?.id ?? item.id ?? '') === station.stationId
    );

    if (!feature) {
      return;
    }

    setActiveWaypoint(toWaypointItem(feature, memoryVaultCatalog));
    setTriviaQuestion(null);
    setTriviaError(null);
  }, [memoryVaultCatalog, waypointsGeoJson]);

  // DoD 1: Fetch real route and waypoint datasets on mount
  useEffect(() => {
    let isMounted = true;

    async function loadCorridorData() {
      try {
        const [routeRes, waypointsRes, memoryVaultRes] = await Promise.all([
          fetch('/data/route.geojson'),
          fetch('/data/waypoints.geojson'),
          fetch('/data/memory-vault.json'),
        ]);

        if (routeRes.ok && waypointsRes.ok) {
          const [routeData, waypointsData] = await Promise.all([
            routeRes.json(),
            waypointsRes.json(),
          ]);
          const catalog: MemoryVaultCatalog = memoryVaultRes.ok
            ? await memoryVaultRes.json()
            : { memory_vault_captions: [] };

          if (isMounted) {
            setRouteGeoJson(routeData);
            setWaypointsGeoJson(waypointsData);
            setMemoryVaultCatalog(catalog);
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

  const handleTriviaRequest = useCallback(async () => {
    const waypointId = activeWaypoint?.id;
    if (!waypointId) {
      return;
    }

    setTriviaLoading(true);
    setTriviaError(null);
    setTriviaQuestion(null);

    try {
      const response = await fetch(
        `http://localhost:8000/waypoints/${encodeURIComponent(waypointId)}/trivia`
      );
      if (!response.ok) {
        throw new Error(`Trivia request failed (${response.status}).`);
      }

      const questions = await response.json() as TriviaQuestion[];
      const question = questions.find((item) => item.waypoint_id === waypointId);
      if (!question) {
        throw new Error('No trivia question is available for this station.');
      }
      setTriviaQuestion(question);
    } catch (error) {
      setTriviaError(error instanceof Error ? error.message : 'Unable to load station trivia.');
    } finally {
      setTriviaLoading(false);
    }
  }, [activeWaypoint?.id]);

  // Issue #20 DoD: Geofence trigger to auto-open matching Audio Capsule once
  const handleWaypointReached = useCallback(
    (waypointId: string) => {
      if (!waypointsGeoJson.features) return;

      const matchedFeature = waypointsGeoJson.features.find(
        (f) => (f.properties?.id || f.id) === waypointId
      );

      if (!matchedFeature) return;

      const matchedWaypoint = toWaypointItem(matchedFeature, memoryVaultCatalog);

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
    [memoryVaultCatalog, waypointsGeoJson]
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
      {activeWaypoint && (
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
          <MemoryVaultSlider
            waypoint={activeWaypoint}
            triviaQuestion={triviaQuestion}
            triviaLoading={triviaLoading}
            triviaError={triviaError}
            onTriviaRequest={handleTriviaRequest}
            onClose={() => {
              setActiveWaypoint(null);
              setTriviaQuestion(null);
              setTriviaError(null);
            }}
          />
        </div>
      )}

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

      {/* Audio Capsule Modal */}
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