import React, { useEffect, useState, useCallback } from 'react';
import { queuedRequest, flushQueue } from '../lib/offlineQueue';

export type TravelerRank = 'Stoker' | 'Track Master' | 'Karoo Scout' | 'Rail Legend';

export interface PassportStamp {
  stamp_id: string;
  waypoint_id: string;
  collected_at: string;
}

export interface PassportState {
  session_id: string;
  current_rank: TravelerRank;
  score: number;
  collected_stamps: PassportStamp[];
  completed_trivia_ids: string[];
}

interface PassportModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl?: string;
}

export const PassportModal: React.FC<PassportModalProps> = ({
                                                              sessionId,
                                                              isOpen,
                                                              onClose,
                                                              apiBaseUrl = 'http://localhost:8000',
                                                            }) => {
  const [passport, setPassport] = useState<PassportState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState<boolean>(false);

  const fetchPassport = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setIsQueued(false);

    const url = `${apiBaseUrl}/passport/${encodeURIComponent(sessionId)}`;
    const result = await queuedRequest<PassportState>('passport-refresh', url);

    if (result.status === 'ok' && result.data) {
      setPassport(result.data);
    } else if (result.status === 'queued') {
      // Network unreachable - not a real error. Keep whatever passport
      // state is already on screen (from a previous successful fetch)
      // and surface a clear, non-alarming "will retry" state instead.
      setIsQueued(true);
    } else {
      setError(result.error ?? 'Unknown error fetching passport');
    }
    setLoading(false);
  }, [sessionId, apiBaseUrl]);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPassport();
    }
  }, [isOpen, fetchPassport]);

  // Listen for trivia submission event dispatched by MapLibre canvas without reloading page
  useEffect(() => {
    const handleTriviaCompleted = () => {
      fetchPassport();
    };

    window.addEventListener('railwaze:trivia-answered', handleTriviaCompleted);
    return () => {
      window.removeEventListener('railwaze:trivia-answered', handleTriviaCompleted);
    };
  }, [fetchPassport]);

  // Auto-retry once the browser reports connectivity is back - deliberately
  // event-driven rather than polled, so this doesn't add extra fetch calls
  // while the app is online and everything is working normally.
  useEffect(() => {
    const handleOnline = () => {
      if (isQueued) {
        flushQueue('passport-refresh').then(() => fetchPassport());
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isQueued, fetchPassport]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl p-4 text-neutral-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
          <div>
            <h2 className="text-base font-semibold tracking-wide text-neutral-100">
              Trans-Karoo Passport
            </h2>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              Session: {sessionId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Passport"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/10 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        {loading && !passport && (
          <div className="py-8 text-center text-sm font-mono text-neutral-400">
            Checking station ledger...
          </div>
        )}

        {error && (
          <div className="py-4 px-3 mb-2 text-center text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg">
            {error}
          </div>
        )}

        {isQueued && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 mb-3 text-center text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg leading-relaxed"
          >
            You&apos;re offline — showing your last saved passport. This will refresh
            automatically once you&apos;re back in range.
          </div>
        )}

        {passport && (
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {/* Rank Card: Strictly reflects backend state */}
            <div className="bg-neutral-800/60 border border-white/10 rounded-lg p-3 text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 block mb-1">
                Traveler Rank
              </span>
              <span className="text-base font-semibold tracking-wide text-amber-500 uppercase block">
                {passport.current_rank}
              </span>
              <span className="block text-xs font-mono text-neutral-400 mt-1">
                Score: {passport.score} pts
              </span>
            </div>

            {/* Collected Stamps */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>Collected Stamps ({passport.collected_stamps.length})</span>
              </h3>

              {passport.collected_stamps.length === 0 ? (
                <div className="text-center py-6 text-sm text-neutral-400 italic">
                  No stamps collected yet. Solve waystation trivia along the corridor to earn stamps!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {passport.collected_stamps.map((stamp) => (
                    <div
                      key={stamp.stamp_id}
                      className="border border-amber-500/30 rounded-lg p-3 flex flex-col items-center text-center bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500 flex items-center justify-center mb-1.5 text-xs font-bold font-mono text-amber-400 bg-amber-500/20 uppercase shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        {stamp.waypoint_id.replace(/^wp-/, '').slice(0, 3)}
                      </div>
                      <span className="font-semibold text-xs text-neutral-200 uppercase tracking-wide">
                        {stamp.waypoint_id}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 mt-0.5">
                        {new Date(stamp.collected_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 mt-auto flex justify-end">
          <button
            onClick={fetchPassport}
            disabled={loading}
            className="text-xs font-mono font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center shadow-md"
          >
            {loading ? 'Refreshing...' : 'Refresh Stamps'}
          </button>
        </div>
      </div>
    </div>
  );
};