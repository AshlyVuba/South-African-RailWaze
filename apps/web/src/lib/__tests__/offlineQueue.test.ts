import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { queuedRequest, flushQueue, getQueueLength } from '../offlineQueue';

describe('offlineQueue', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    test('returns ok and the parsed data on a successful request', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ hello: 'world' }),
        } as Response);

        const result = await queuedRequest<{ hello: string }>('test-queue', 'http://localhost:8000/thing');

        expect(result.status).toBe('ok');
        expect(result.data).toEqual({ hello: 'world' });
        expect(getQueueLength('test-queue')).toBe(0);
    });

    test('calls fetch with a single argument when no init options are given', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        } as Response);
        globalThis.fetch = fetchMock;

        await queuedRequest('test-queue', 'http://localhost:8000/thing');

        expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/thing');
    });

    test('returns error status (not queued) when the server responds with a non-ok status', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({}),
        } as Response);

        const result = await queuedRequest('test-queue', 'http://localhost:8000/thing');

        expect(result.status).toBe('error');
        expect(getQueueLength('test-queue')).toBe(0);
    });

    test('queues the request instead of throwing when the network is unreachable', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        const result = await queuedRequest('trivia-answers', 'http://localhost:8000/answer', {
            method: 'POST',
            body: JSON.stringify({ answer: 'opt_1' }),
        });

        expect(result.status).toBe('queued');
        expect(getQueueLength('trivia-answers')).toBe(1);
    });

    test('flushQueue replays queued requests and clears the ones that succeed', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        await queuedRequest('trivia-answers', 'http://localhost:8000/answer', { method: 'POST' });
        expect(getQueueLength('trivia-answers')).toBe(1);

        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
        const result = await flushQueue('trivia-answers');

        expect(result.succeeded).toBe(1);
        expect(result.stillQueued).toBe(0);
        expect(getQueueLength('trivia-answers')).toBe(0);
    });

    test('flushQueue leaves still-failing requests in the queue', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        await queuedRequest('trivia-answers', 'http://localhost:8000/answer', { method: 'POST' });

        const result = await flushQueue('trivia-answers');

        expect(result.succeeded).toBe(0);
        expect(result.stillQueued).toBe(1);
        expect(getQueueLength('trivia-answers')).toBe(1);
    });
});