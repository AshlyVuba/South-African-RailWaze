import React, { useEffect, useState, useCallback } from 'react';

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

  const fetchPassport = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBaseUrl}/passport/${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        throw new Error(`Failed to load passport: ${res.statusText}`);
      }
      const data: PassportState = await res.json();
      setPassport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching passport');
    } finally {
      setLoading(false);
    }
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-amber-50 border-4 border-amber-900 shadow-2xl p-6 text-stone-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-dashed border-amber-800 pb-3 mb-4">
          <div>
            <h2 className="text-2xl font-serif font-bold tracking-wide text-amber-950">
              Trans-Karoo Passport
            </h2>
            <p className="text-xs font-mono text-amber-800">
              Session: {sessionId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Passport"
            className="text-amber-900 hover:text-amber-700 text-xl font-bold p-1 rounded transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {loading && !passport && (
          <div className="py-12 text-center text-sm font-mono text-amber-900">
            Checking station ledger...
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-xs font-mono text-rose-700">
            {error}
          </div>
        )}

        {passport && (
          <div className="overflow-y-auto flex-1 space-y-5 pr-1">
            {/* Rank Card: Strictly reflects backend state */}
            <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3 text-center">
              <span className="text-xs uppercase tracking-widest text-amber-800 block mb-1">
                Traveler Rank
              </span>
              <span className="text-xl font-serif font-black text-amber-950 uppercase tracking-wider">
                {passport.current_rank}
              </span>
              <span className="block text-xs font-mono text-amber-700 mt-1">
                Score: {passport.score} pts
              </span>
            </div>

            {/* Collected Stamps */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900 mb-3 border-b border-amber-200 pb-1">
                Collected Stamps ({passport.collected_stamps.length})
              </h3>

              {passport.collected_stamps.length === 0 ? (
                <div className="text-center py-6 text-xs italic text-amber-800">
                  No stamps collected yet. Solve waystation trivia along the corridor to earn stamps!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {passport.collected_stamps.map((stamp) => (
                    <div
                      key={stamp.stamp_id}
                      className="border-2 border-dashed border-amber-800/40 rounded-lg p-2 flex flex-col items-center text-center bg-amber-50/50"
                    >
                      <div className="w-12 h-12 rounded-full border border-amber-800 flex items-center justify-center mb-1 text-xs font-bold font-serif bg-amber-200/50 uppercase">
                        {stamp.waypoint_id.replace(/^wp-/, '').slice(0, 3)}
                      </div>
                      <span className="font-semibold text-xs text-amber-950 uppercase">
                        {stamp.waypoint_id}
                      </span>
                      <span className="text-[10px] text-amber-800 font-mono mt-0.5">
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
        <div className="pt-4 border-t border-amber-200 mt-auto flex justify-end">
          <button
            onClick={fetchPassport}
            disabled={loading}
            className="text-xs font-mono bg-amber-800 text-amber-50 hover:bg-amber-900 px-3 py-1.5 rounded transition disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Stamps'}
          </button>
        </div>
      </div>
    </div>
  );
};