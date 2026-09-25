import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useConnectivity } from '../connectivity';

describe('useConnectivity', () => {
    beforeEach(() => {
        vi.stubGlobal('navigator', { ...navigator, onLine: true });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    test('reports online when the health check succeeds', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

        const { result } = renderHook(() => useConnectivity({ apiBaseUrl: 'http://localhost:8000' }));

        await waitFor(() => {
            expect(result.current.status).toBe('online');
        });
    });

    test('reports offline when the health check fails (backend unreachable)', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        const { result } = renderHook(() => useConnectivity({ apiBaseUrl: 'http://localhost:8000' }));

        await waitFor(() => {
            expect(result.current.status).toBe('offline');
        });
    });

    test('reports offline immediately when the browser fires an offline event', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

        const { result } = renderHook(() => useConnectivity({ apiBaseUrl: 'http://localhost:8000' }));

        await waitFor(() => {
            expect(result.current.status).toBe('online');
        });

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        await waitFor(() => {
            expect(result.current.status).toBe('offline');
        });
    });
});