import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { ConnectivityBanner } from '../ConnectivityBanner';

describe('ConnectivityBanner', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('shows "Online" when the backend health check succeeds', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

        render(<ConnectivityBanner apiBaseUrl="http://localhost:8000" />);

        await waitFor(() => {
            expect(screen.getByText('Online')).toBeInTheDocument();
        });
    });

    test('shows a non-alarming offline message when the backend is unreachable', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        render(<ConnectivityBanner apiBaseUrl="http://localhost:8000" />);

        await waitFor(() => {
            expect(screen.getByText('Offline · Running from cache')).toBeInTheDocument();
        });
    });

    test('exposes its status via role="status" for accessibility', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

        render(<ConnectivityBanner apiBaseUrl="http://localhost:8000" />);

        await waitFor(() => {
            expect(screen.getByRole('status', { name: 'Connectivity Status' })).toBeInTheDocument();
        });
    });
});