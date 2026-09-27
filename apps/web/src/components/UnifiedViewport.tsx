import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { MapCanvas, type WaypointProperties } from './MapCanvas';
import {
  MemoryVaultSlider,
  type TriviaAnswerResult,
  type TriviaQuestion,
  type WaypointItem,
} from './MemoryVaultSlider';
import { AudioCapsule } from './AudioCapsule';
import { PassportModal } from './PassportModal';
import { ConnectivityBanner } from './ConnectivityBanner';
import { ShieldCheck } from 'lucide-react';
import { designTokens } from '../lib/designTokens';
import { getApiBaseUrl } from '../lib/api';
import { flushQueue, queuedRequest } from '../lib/offlineQueue';
import {
  dismissOperationsBroadcast,
  isOperationsBroadcastDismissed,
  OPERATIONS_BROADCAST_EVENT,
  OPERATIONS_BROADCAST_STORAGE_KEY,
  readOperationsBroadcast,
  type OperationsBroadcast,
} from '../lib/operationsBroadcast';

const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

interface MemoryVaultEntry {
  waypoint_id: string;
  then_image_url?: string;
  now_image_url?: string;
  then_year?: string;
  caption: string;
}

type MemoryVaultCatalog = Record<string, MemoryVaultEntry>;

const toWaypointItem = (
  feature: Feature<Point>,
  catalog: MemoryVaultCatalog,
): WaypointItem => {
  const properties = feature.properties ?? {};
  const id = String(properties.id ?? feature.id ?? '');
  const name = typeof properties.name === 'string' ? properties.name : 'Waypoint';
  const vault = Object.values(catalog).find((item) => item.waypoint_id === id);
  const year = vault?.then_year?.match(/\d{4}/)?.[0];

  return {
    id,
    name,
    km_mark: typeof properties.km_mark === 'number' ? properties.km_mark : undefined,
    memory_vault: {
      before_image_url: vault?.then_image_url,
      after_image_url: vault?.now_image_url,
      caption: vault?.caption ?? `Historical archival perspective for ${name}.`,
      year: year ? Number(year) : undefined,
    },
  };
};

export const UnifiedViewport: React.FC = () => {
  const [operationsAlert, setOperationsAlert] = useState<OperationsBroadcast | null>(() => {
    const latest = readOperationsBroadcast();
    return latest && !isOperationsBroadcastDismissed(latest.id) ? latest : null;
  });
  const [routeGeoJson, setRouteGeoJson] = useState<FeatureCollection<LineString>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<LineString>
  );
  const [waypointsGeoJson, setWaypointsGeoJson] = useState<FeatureCollection<Point>>(
    EMPTY_FEATURE_COLLECTION as FeatureCollection<Point>
  );
  const [memoryVaultCatalog, setMemoryVaultCatalog] = useState<MemoryVaultCatalog>({});
  const [progress, setProgress] = useState<number>(0);
  const [activeWaypoint, setActiveWaypoint] = useState<WaypointItem | null>(null);
  const [triviaQuestion, setTriviaQuestion] = useState<TriviaQuestion | null>(null);
  const [triviaLoading, setTriviaLoading] = useState<boolean>(false);
  const [triviaSubmitting, setTriviaSubmitting] = useState<boolean>(false);
  const [triviaQueued, setTriviaQueued] = useState<boolean>(false);
  const [triviaError, setTriviaError] = useState<string | null>(null);
  const [triviaAnswerResult, setTriviaAnswerResult] = useState<TriviaAnswerResult | null>(null);
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
  const [sessionId] = useState(() => window.crypto.randomUUID());

  useEffect(() => {
    const syncOperationsAlert = (event?: Event) => {
      if (event instanceof StorageEvent && event.key !== OPERATIONS_BROADCAST_STORAGE_KEY) {
        return;
      }
      const latest = readOperationsBroadcast();
      setOperationsAlert(
        latest && !isOperationsBroadcastDismissed(latest.id) ? latest : null
      );
    };

    window.addEventListener('storage', syncOperationsAlert);
    window.addEventListener(OPERATIONS_BROADCAST_EVENT, syncOperationsAlert);
    return () => {
      window.removeEventListener('storage', syncOperationsAlert);
      window.removeEventListener(OPERATIONS_BROADCAST_EVENT, syncOperationsAlert);
    };
  }, []);

  const dismissOperationsAlert = () => {
    if (!operationsAlert) return;
    try {
      dismissOperationsBroadcast(operationsAlert.id);
      setOperationsAlert(null);
    } catch (error) {
      console.error('Unable to save the dismissed RailWaze update.', error);
      setOperationsAlert(null);
    }
  };

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
    setTriviaAnswerResult(null);
    setTriviaQueued(false);
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
            : {};

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
    setTriviaAnswerResult(null);
    setTriviaQueued(false);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/waypoints/${encodeURIComponent(waypointId)}/trivia`
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
      const message = error instanceof Error && error.message.startsWith('Trivia request failed')
        ? error.message
        : 'Unable to load station trivia. Check the API URL and your connection.';
      setTriviaError(message);
    } finally {
      setTriviaLoading(false);
    }
  }, [activeWaypoint?.id]);

  const handleTriviaAnswer = useCallback(async (selectedOptionIndex: number) => {
    const waypointId = activeWaypoint?.id;
    if (!waypointId || !triviaQuestion) {
      return;
    }

    setTriviaSubmitting(true);
    setTriviaError(null);
    setTriviaAnswerResult(null);
    const result = await queuedRequest<TriviaAnswerResult>(
      'trivia-answers',
      `${getApiBaseUrl()}/waypoints/${encodeURIComponent(waypointId)}/trivia/answer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          selectedOptionIndex,
        }),
      },
    );

    if (result.status === 'ok' && result.data) {
      setTriviaAnswerResult(result.data);
      setTriviaQueued(false);
      window.dispatchEvent(new CustomEvent('railwaze:trivia-answered'));
    } else if (result.status === 'queued') {
      setTriviaQueued(true);
    } else {
      setTriviaError(result.error ?? 'Unable to submit your answer.');
    }
    setTriviaSubmitting(false);
  }, [activeWaypoint?.id, sessionId, triviaQuestion]);

  useEffect(() => {
    const handleOnline = () => {
      flushQueue('trivia-answers').then(({ succeeded, stillQueued }) => {
        if (succeeded > 0) {
          window.dispatchEvent(new CustomEvent('railwaze:trivia-answered'));
        }
        if (stillQueued === 0) {
          setTriviaQueued(false);
        }
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

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
      setTriviaQuestion(null);
      setTriviaError(null);
      setTriviaAnswerResult(null);
      setTriviaQueued(false);

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
    <div className={`${designTokens.shell.viewport} relative h-[100dvh] w-full overflow-hidden font-sans`}>
      {/* Real Map Canvas with dynamic route and waypoint layers */}
      <MapCanvas
        onSelectWaypoint={handleWaypointSelect}
        routeGeoJson={routeGeoJson}
        waypointsGeoJson={waypointsGeoJson}
        progressPercent={progress}
        onWaypointReached={handleWaypointReached}
      />

      {/* Top Header Controls (Floating Overlay) */}
      <header className="absolute inset-x-3 top-3 z-10 flex items-center justify-between pointer-events-none">
        <div className={`${designTokens.shell.panel} ${designTokens.containers.compactSheet} pointer-events-auto`}>
          <span className={`${designTokens.typography.cardHeader} ${designTokens.colors.karooGold}`}>
            RAILWAZE 3D
          </span>
        </div>

        <div className="pointer-events-auto">
          <ConnectivityBanner apiBaseUrl={getApiBaseUrl()} />
        </div>

        <a
          href="/?demo=operations"
          className="pointer-events-auto inline-flex min-h-10 items-center rounded-xl border border-cyan-500/40 bg-slate-950/80 px-3 text-xs font-bold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-950/60"
        >
          OPS DEMO
        </a>

        <button
          onClick={() => setShowPassport(true)}
          className={`${designTokens.elements.fire.button} pointer-events-auto`}
        >
          PASSPORT
        </button>
      </header>

      {operationsAlert && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Verified crew update"
          className="absolute inset-x-3 top-[4.75rem] z-30 mx-auto max-w-2xl rounded-2xl border border-cyan-400/30 bg-slate-950/90 p-3 shadow-xl shadow-black/30 backdrop-blur-md sm:top-16 sm:p-4"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck size={19} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Verified crew update · You&apos;re safe</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-100">{operationsAlert.message}</p>
              <a
                href="/?demo=operations&role=passenger"
                className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                View reassurance and updated ETA
              </a>
            </div>
            <button
              type="button"
              onClick={dismissOperationsAlert}
              aria-label="Dismiss crew update"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </aside>
      )}

      {/* Memory Vault Card (Overlay Bottom) */}
      {activeWaypoint && (
        <div className="absolute bottom-[84px] left-1/2 z-[15] w-[92%] max-w-[375px] -translate-x-1/2">
          <MemoryVaultSlider
            waypoint={activeWaypoint}
            triviaQuestion={triviaQuestion}
            triviaLoading={triviaLoading}
            triviaSubmitting={triviaSubmitting}
            triviaQueued={triviaQueued}
            triviaError={triviaError}
            triviaAnswerResult={triviaAnswerResult}
            onTriviaRequest={handleTriviaRequest}
            onTriviaAnswer={handleTriviaAnswer}
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
        data-testid="corridor-progress-panel"
        className={`absolute bottom-4 left-1/2 z-20 box-border w-[94%] max-w-[560px] -translate-x-1/2 ${designTokens.shell.panel} ${designTokens.containers.card}`}
      >
        <nav aria-label="Corridor stations" className="mb-3 flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {waypointsGeoJson.features.map((feature, index) => {
            const properties = feature.properties ?? {};
            const stationId = String(properties.id ?? feature.id ?? '');
            const stationName = typeof properties.name === 'string' ? properties.name : stationId;
            const station = { ...properties, stationId, name: stationName } as WaypointProperties;
            return (
              <button
                key={stationId}
                type="button"
                onClick={() => handleWaypointSelect(station)}
                aria-label={`Open ${stationName}`}
                className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
              >
                <span className="flex w-full items-center">
                  {index > 0 && <span className="h-px flex-1 bg-amber-500/50" />}
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-amber-300 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,.45)] transition group-hover:scale-125 group-hover:bg-cyan-300" />
                  {index < waypointsGeoJson.features.length - 1 && <span className="h-px flex-1 bg-amber-500/50" />}
                </span>
                <span className="max-w-[82px] truncate text-[9px] font-bold uppercase tracking-wide text-slate-200 transition group-hover:text-cyan-200 sm:max-w-none sm:text-[10px]">
                  {stationName.replace('Hex River / ', '')}
                </span>
              </button>
            );
          })}
        </nav>
        <div className={`mb-1.5 flex justify-between font-mono text-xs font-bold ${designTokens.elements.fire.accent}`}>
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
          className={`w-full cursor-pointer ${designTokens.elements.fire.range}`}
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