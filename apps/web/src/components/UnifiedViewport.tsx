import React, { useCallback, useRef, useState } from 'react';
import { AudioCapsule } from './AudioCapsule';
import { MapCanvas } from './MapCanvas';
import { MemoryVaultSlider } from './MemoryVaultSlider';
import { ConnectivityBanner } from './ConnectivityBanner';

interface WaypointProperties {
  id?: string;
  stationId?: string;
  name: string;
  [key: string]: unknown;
}

interface ActiveAudioState {
  waypointId: string;
  title: string;
  audioUrl: string;
  durationSeconds: number;
}

export const UnifiedViewport: React.FC = () => {
  const [activeStation, setActiveStation] = useState<WaypointProperties | null>(null);
  const [activeAudio, setActiveAudio] = useState<ActiveAudioState | null>(null);
  const lastAudioWaypointIdRef = useRef<string | null>(null);

  const handleWaypointSelect = useCallback((station: WaypointProperties) => {
    setActiveStation(station);
  }, []);

  const handleCloseVault = useCallback(() => {
    setActiveStation(null);
  }, []);

  const handleAudioClose = useCallback(() => {
    setActiveAudio(null);
    lastAudioWaypointIdRef.current = null;
  }, []);

  const handleWaypointReached = useCallback((waypointId: string) => {
    if (!waypointId || lastAudioWaypointIdRef.current === waypointId) {
      return;
    }

    lastAudioWaypointIdRef.current = waypointId;

    const stationName = activeStation?.name ?? waypointId.replace(/^wp_/, '').replace(/[-_]/g, ' ');
    const prettyStationName = stationName
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    setActiveAudio({
      waypointId,
      title: `${prettyStationName || 'Waypoint'} Folklore & Oral History`,
      audioUrl: `/audio/${waypointId}.mp3`,
      durationSeconds: 150,
    });
  }, [activeStation]);

  return (
    <main
      data-testid="unified-viewport-root"
      className="relative w-full h-[100dvh] max-w-[100vw] overflow-x-hidden overflow-y-hidden bg-slate-900 select-none"
    >
      <div className="absolute inset-0 z-0">
        <MapCanvas
          onSelectWaypoint={handleWaypointSelect}
          onWaypointReached={handleWaypointReached}
        />
      </div>

      <div className="absolute top-2 right-2 z-40 pt-safe pr-safe">
        <ConnectivityBanner />
      </div>

      <header
        aria-label="Audio Capsule Bar"
        className="absolute top-0 inset-x-0 z-20 pointer-events-none pt-safe"
      >
        <div className="mx-auto max-w-md px-4 pt-2">
          <div className="pointer-events-auto flex items-center justify-between rounded-full bg-slate-900/80 px-4 py-2 border border-slate-700/60 backdrop-blur shadow-lg text-xs text-slate-300">
            <span className="font-semibold text-amber-400">RailWaze Live</span>
            <span className="truncate max-w-[180px] text-slate-400">
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
            bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md
          "
        >
          <div className="flex justify-center pt-2 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-slate-700" />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <h2 className="text-lg font-bold text-white tracking-wide">
              {activeStation.name} Vault
            </h2>
            <button
              onClick={handleCloseVault}
              className="p-2 text-slate-400 hover:text-white rounded-lg active:bg-slate-800 focus:outline-none"
              aria-label="Close card"
            >
              ✕
            </button>
          </div>

          <div className="p-4 overflow-y-auto overflow-x-hidden min-h-0 flex-1">
            <MemoryVaultSlider stationId={activeStation.id ?? activeStation.stationId ?? ''} />
          </div>
        </section>
      )}

      {activeAudio && (
        <AudioCapsule
          audioCapsuleId={activeAudio.waypointId}
          audioUrl={activeAudio.audioUrl}
          title={activeAudio.title}
          durationSeconds={activeAudio.durationSeconds}
          isOpen
          onClose={handleAudioClose}
          className="fixed bottom-20 left-4 right-4 pb-safe md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-30"
        />
      )}

      <footer
        aria-label="Journey HUD"
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none pb-safe"
      >
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 shadow-lg backdrop-blur border border-emerald-400/30 transition-transform active:scale-95"
          >
            Passport Stub
          </button>
        </div>
      </footer>
    </main>
  );
};