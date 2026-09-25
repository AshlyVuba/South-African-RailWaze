import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, afterEach, test, expect } from 'vitest';
import { TriviaPrompt } from '../TriviaPrompt';

const mockQuestions = [
    {
        id: 'trivia-kimberley-01',
        waypoint_id: 'station-kimberley',
        question: 'What was discovered at the Big Hole?',
        options: ['Gold', 'Diamonds', 'Coal', 'Copper'],
    },
];

const mockCorrectResult = {
    correct: true,
    correctOptionIndex: 1,
    explanation: 'The Big Hole diamond rush founded the city.',
    stampAwarded: {
        stampId: 'stamp-station-kimberley',
        waypointId: 'station-kimberley',
        collectedAt: '2026-09-24T10:00:00Z',
        waypointName: 'Kimberley',
    },
};

function mockFetchRouting(postImpl: () => Promise<Response>) {
    return vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.endsWith('/answer')) {
            return postImpl();
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockQuestions),
        } as Response);
    });
}

describe('TriviaPrompt Component', () => {
    afterEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    test('fetches and renders the trivia question and its options', async () => {
        globalThis.fetch = mockFetchRouting(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve(mockCorrectResult) } as Response)
        );

        render(
            <TriviaPrompt
                waypointId="station-kimberley"
                sessionId="test-session"
                isOpen={true}
                onClose={() => {}}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('What was discovered at the Big Hole?')).toBeInTheDocument();
        });
        expect(screen.getByText('Diamonds')).toBeInTheDocument();
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'http://localhost:8000/waypoints/station-kimberley/trivia'
        );
    });

    test('submitting an answer while online shows the result and dispatches railwaze:trivia-answered', async () => {
        globalThis.fetch = mockFetchRouting(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve(mockCorrectResult) } as Response)
        );

        const onAnswered = vi.fn();
        window.addEventListener('railwaze:trivia-answered', onAnswered);

        render(
            <TriviaPrompt
                waypointId="station-kimberley"
                sessionId="test-session"
                isOpen={true}
                onClose={() => {}}
            />
        );

        await waitFor(() => expect(screen.getByText('Diamonds')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Diamonds'));
        fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

        await waitFor(() => {
            expect(screen.getByText('Correct!')).toBeInTheDocument();
        });
        expect(screen.getByText(/Big Hole diamond rush/i)).toBeInTheDocument();
        expect(onAnswered).toHaveBeenCalledTimes(1);

        window.removeEventListener('railwaze:trivia-answered', onAnswered);
    });

    test('submitting an answer while offline shows a queued state, not a raw error', async () => {
        globalThis.fetch = mockFetchRouting(() => Promise.reject(new TypeError('Failed to fetch')));

        render(
            <TriviaPrompt
                waypointId="station-kimberley"
                sessionId="test-session"
                isOpen={true}
                onClose={() => {}}
            />
        );

        await waitFor(() => expect(screen.getByText('Diamonds')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Diamonds'));
        fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));

        await waitFor(() => {
            expect(screen.getByText(/you.re offline.*saved and will be submitted/i)).toBeInTheDocument();
        });
        expect(screen.queryByText(/unknown error submitting answer/i)).not.toBeInTheDocument();
    });

    test('automatically retries and notifies once connectivity returns', async () => {
        globalThis.fetch = mockFetchRouting(() => Promise.reject(new TypeError('Failed to fetch')));

        render(
            <TriviaPrompt
                waypointId="station-kimberley"
                sessionId="test-session"
                isOpen={true}
                onClose={() => {}}
            />
        );

        await waitFor(() => expect(screen.getByText('Diamonds')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Diamonds'));
        fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
        await waitFor(() => {
            expect(screen.getByText(/you.re offline/i)).toBeInTheDocument();
        });

        const onAnswered = vi.fn();
        window.addEventListener('railwaze:trivia-answered', onAnswered);

        // Connectivity returns - the queued answer should now replay successfully.
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
        fireEvent(window, new Event('online'));

        await waitFor(() => {
            expect(onAnswered).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByText(/answer went through/i)).toBeInTheDocument();

        window.removeEventListener('railwaze:trivia-answered', onAnswered);
    });
});