export interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    body?: unknown;
    queuedAt: number;
}

const STORAGE_PREFIX = 'railwaze:offline-queue:';

function storageKey(queueName: string): string {
    return `${STORAGE_PREFIX}${queueName}`;
}

function readQueue(queueName: string): QueuedRequest[] {
    try {
        const raw = localStorage.getItem(storageKey(queueName));
        return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
    } catch {
        return [];
    }
}

function writeQueue(queueName: string, items: QueuedRequest[]): void {
    try {
        localStorage.setItem(storageKey(queueName), JSON.stringify(items));
    } catch {
        // Storage unavailable (private browsing, quota exceeded) - degrade to
        // in-memory-only for this session; queued items just won't survive a reload.
    }
}

export interface QueuedRequestResult<T> {
    status: 'ok' | 'queued' | 'error';
    data?: T;
    error?: string;
}

/**
 * Attempts a network request. If it fails because the network itself is
 * unreachable (not because the server returned an error), the request is
 * persisted to localStorage instead of throwing, so the caller can show a
 * "queued, will retry" state rather than a raw error or a silent failure.
 *
 * Call flushQueue(queueName) once connectivity returns (e.g. from the
 * browser's 'online' event) to replay everything that queued up.
 *
 * This is the utility any future connectivity-dependent action should use -
 * in particular the trivia-answer submission endpoint (Iteration 4 Issue
 * #0b, not yet built as of this ticket) should call this rather than a
 * bare fetch, once it exists.
 */
export async function queuedRequest<T>(
    queueName: string,
    url: string,
    init: RequestInit = {}
): Promise<QueuedRequestResult<T>> {
    try {
        // Preserve a bare single-argument fetch(url) call when no options are
        // given, rather than always passing a (possibly empty) second argument -
        // this keeps callers' existing test expectations (e.g. toHaveBeenCalledWith(url))
        // intact for the common GET case.
        const hasInit = Object.keys(init).length > 0;
        const res = hasInit ? await fetch(url, init) : await fetch(url);

        if (!res.ok) {
            return { status: 'error', error: `Request failed: ${res.status} ${res.statusText}` };
        }
        const data = (await res.json()) as T;
        return { status: 'ok', data };
    } catch {
        // Network-level failure (offline, DNS, timeout, connection refused) -
        // queue it rather than surfacing a raw error to the passenger.
        const queue = readQueue(queueName);
        queue.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url,
            method: init.method ?? 'GET',
            body: init.body,
            queuedAt: Date.now(),
        });
        writeQueue(queueName, queue);
        return { status: 'queued' };
    }
}

export function getQueueLength(queueName: string): number {
    return readQueue(queueName).length;
}

export interface FlushResult {
    succeeded: number;
    stillQueued: number;
}

/**
 * Replays every queued request for a given queue name. Items that succeed
 * are removed; items that still fail (still offline, or a genuine server
 * error this time) stay queued for the next flush attempt.
 */
export async function flushQueue(queueName: string): Promise<FlushResult> {
    const queue = readQueue(queueName);
    if (queue.length === 0) return { succeeded: 0, stillQueued: 0 };

    const remaining: QueuedRequest[] = [];
    let succeeded = 0;

    for (const item of queue) {
        try {
            const res = await fetch(item.url, {
                method: item.method,
                headers: item.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
                body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
            });
            if (res.ok) {
                succeeded += 1;
            } else {
                remaining.push(item);
            }
        } catch {
            remaining.push(item);
        }
    }

    writeQueue(queueName, remaining);
    return { succeeded, stillQueued: remaining.length };
}