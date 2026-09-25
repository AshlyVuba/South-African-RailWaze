import React from 'react';
import { useConnectivity } from '../lib/connectivity';

export interface ConnectivityBannerProps {
    apiBaseUrl?: string;
}

/**
 * Issue #23 "Offline UX state": a visible, non-alarming indicator of
 * whether the app is running online or from cache. Deliberately
 * understated - a passenger in a Karoo dead zone should read this as
 * "the app is working fine, just offline," not as an error state.
 */
export const ConnectivityBanner: React.FC<ConnectivityBannerProps> = ({ apiBaseUrl }) => {
    const { status } = useConnectivity({ apiBaseUrl });
    const isOffline = status === 'offline';

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Connectivity Status"
            className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur transition-colors ${
                isOffline
                    ? 'border-amber-700/60 bg-amber-950/80 text-amber-300'
                    : 'border-slate-700/50 bg-slate-900/60 text-emerald-400'
            }`}
        >
      <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400'}`}
      />
            {isOffline ? 'Offline · Running from cache' : 'Online'}
        </div>
    );
};