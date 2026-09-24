import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectivityStatus = 'online' | 'offline';

export interface UseConnectivityOptions {
    apiBaseUrl?: string;
    healthPath?: string;
    pollIntervalMs?: number;
}

export interface UseConnectivityResult {
    status: ConnectivityStatus;
    isOnline: boolean;
    lastCheckedAt: number | null;
}

/**
 * Tracks real connectivity to the RailWaze backend, not just the browser's
 * navigator.onLine flag. navigator.onLine only reflects whether the device
 * has *a* network interface up - a phone can report online=true on wifi
 * with no actual internet, which is exactly the failure mode a Karoo dead
 * zone produces. "Online" here means: the browser thinks it has a network
 * AND a recent /health request to the backend actually succeeded.
 */
export function useConnectivity(options: UseConnectivityOptions = {}): UseConnectivityResult {
    const {
        apiBaseUrl = 'http://localhost:8000',
        healthPath = '/health',
        pollIntervalMs = 15000,
    } = options;

    const [browserOnline, setBrowserOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [backendReachable, setBackendReachable] = useState<boolean>(true);
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
    const inFlightRef = useRef(false);

    const checkBackend = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`${apiBaseUrl}${healthPath}`, { signal: controller.signal });
            clearTimeout(timeout);
            setBackendReachable(res.ok);
        } catch {
            setBackendReachable(false);
        } finally {
            setLastCheckedAt(Date.now());
            inFlightRef.current = false;
        }
    }, [apiBaseUrl, healthPath]);

    useEffect(() => {
        const handleOnline = () => setBrowserOnline(true);
        const handleOffline = () => {
            setBrowserOnline(false);
            setBackendReachable(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!browserOnline) return;
        checkBackend();
        const interval = setInterval(checkBackend, pollIntervalMs);
        return () => clearInterval(interval);
    }, [browserOnline, checkBackend, pollIntervalMs]);

    const isOnline = browserOnline && backendReachable;

    return {
        status: isOnline ? 'online' : 'offline',
        isOnline,
        lastCheckedAt,
    };
}