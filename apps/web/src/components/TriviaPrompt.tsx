import React, { useCallback, useEffect, useState } from 'react';
import { queuedRequest, flushQueue } from '../lib/offlineQueue';

export interface TriviaQuestionPublic {
    id: string;
    waypoint_id: string;
    question: string;
    options: string[];
}

export interface StampAward {
    stampId: string;
    waypointId: string;
    collectedAt: string;
    waypointName?: string;
    badgeIcon?: string;
}

export interface AnswerResult {
    correct: boolean;
    correctOptionIndex: number;
    explanation: string;
    stampAwarded: StampAward | null;
}

type SubmitStatus = 'idle' | 'submitting' | 'queued' | 'answered' | 'error';

export interface TriviaPromptProps {
    waypointId: string;
    sessionId: string;
    isOpen: boolean;
    onClose: () => void;
    apiBaseUrl?: string;
}

const TRIVIA_ANSWER_QUEUE = 'trivia-answers';

/**
 * Issue #28 DoD item 2: the trivia-answer submission is the concrete
 * "action that requires connectivity" - it must queue and retry when
 * offline instead of failing silently. Fetching the questions (a GET)
 * degrades gracefully to a plain error if unreachable, since there's
 * nothing to retry there; submitting an answer (a POST) is what goes
 * through queuedRequest/flushQueue so a dead-zone tap isn't lost.
 */
export const TriviaPrompt: React.FC<TriviaPromptProps> = ({
                                                              waypointId,
                                                              sessionId,
                                                              isOpen,
                                                              onClose,
                                                              apiBaseUrl = 'http://localhost:8000',
                                                          }) => {
    const [questions, setQuestions] = useState<TriviaQuestionPublic[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);

    const fetchQuestions = useCallback(async () => {
        if (!waypointId) return;
        setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(`${apiBaseUrl}/waypoints/${encodeURIComponent(waypointId)}/trivia`);
            if (!res.ok) {
                throw new Error(`Request failed: ${res.status} ${res.statusText}`);
            }
            const data = (await res.json()) as TriviaQuestionPublic[];
            setQuestions(data);
        } catch {
            // Loading the question list has nothing to retry against later -
            // there's no queue for a GET, just a clear "try again" state.
            setLoadError('Could not load trivia right now. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [waypointId, apiBaseUrl]);

    // Reset per-waypoint state and load fresh questions whenever the prompt
    // opens for a (possibly new) waypoint.
    useEffect(() => {
        if (!isOpen) return;
        setQuestions(null);
        setSelectedIndex(null);
        setSubmitStatus('idle');
        setSubmitError(null);
        setAnswerResult(null);
        fetchQuestions();
    }, [isOpen, waypointId, fetchQuestions]);

    const handleSubmit = useCallback(async () => {
        const question = questions?.[0];
        if (!question || selectedIndex === null) return;

        setSubmitStatus('submitting');
        setSubmitError(null);

        const url = `${apiBaseUrl}/waypoints/${encodeURIComponent(waypointId)}/trivia/answer`;
        const result = await queuedRequest<AnswerResult>(TRIVIA_ANSWER_QUEUE, url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId,
            },
            body: JSON.stringify({ sessionId, selectedOptionIndex: selectedIndex }),
        });

        if (result.status === 'ok' && result.data) {
            setAnswerResult(result.data);
            setSubmitStatus('answered');
            window.dispatchEvent(new CustomEvent('railwaze:trivia-answered'));
        } else if (result.status === 'queued') {
            // Network unreachable, not a real error - the answer is saved
            // locally and will be replayed once connectivity returns.
            setSubmitStatus('queued');
        } else {
            setSubmitStatus('error');
            setSubmitError(result.error ?? 'Unknown error submitting answer');
        }
    }, [questions, selectedIndex, apiBaseUrl, waypointId, sessionId]);

    // Auto-retry once the browser reports connectivity is back, mirroring
    // PassportModal's pattern - event-driven rather than polled.
    useEffect(() => {
        const handleOnline = () => {
            if (submitStatus === 'queued') {
                flushQueue(TRIVIA_ANSWER_QUEUE).then((flushResult) => {
                    if (flushResult.succeeded > 0) {
                        // flushQueue replays the raw request and only reports counts,
                        // not the response body, so we can't show correct/incorrect
                        // here - but the passport (score, stamps) is now authoritative
                        // and up to date, which is what actually matters.
                        setSubmitStatus('answered');
                        window.dispatchEvent(new CustomEvent('railwaze:trivia-answered'));
                    }
                });
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [submitStatus]);

    if (!isOpen) return null;

    const question = questions?.[0] ?? null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Waypoint Trivia"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <div className="relative w-full max-w-md rounded-2xl bg-neutral-900/95 backdrop-blur-md border border-white/10 shadow-2xl p-4 text-neutral-100 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                    <h2 className="text-base font-semibold tracking-wide text-neutral-100">
                        Waystation Trivia
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close Trivia"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/10 transition-colors shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading && (
                    <div className="py-8 text-center text-sm font-mono text-neutral-400">
                        Loading trivia...
                    </div>
                )}

                {loadError && (
                    <div className="py-4 px-3 mb-2 text-center text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg">
                        {loadError}
                        <button
                            onClick={fetchQuestions}
                            className="block mx-auto mt-2 text-xs font-mono font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !loadError && questions && questions.length === 0 && (
                    <div className="py-8 text-center text-sm font-mono text-neutral-400">
                        No trivia available for this waypoint yet.
                    </div>
                )}

                {!loading && question && submitStatus !== 'answered' && submitStatus !== 'queued' && (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-200">{question.question}</p>
                        <div className="space-y-2">
                            {question.options.map((option, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setSelectedIndex(index)}
                                    aria-pressed={selectedIndex === index}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                                        selectedIndex === index
                                            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                                            : 'border-white/10 bg-neutral-800/60 text-neutral-200 hover:bg-neutral-800'
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>

                        {submitStatus === 'error' && submitError && (
                            <div className="py-2 px-3 text-center text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg">
                                {submitError}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={selectedIndex === null || submitStatus === 'submitting'}
                            className="w-full text-xs font-mono font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
                        >
                            {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Answer'}
                        </button>
                    </div>
                )}

                {submitStatus === 'queued' && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="p-3 text-center text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg leading-relaxed"
                    >
                        You&apos;re offline — your answer has been saved and will be submitted
                        automatically once you&apos;re back in range.
                    </div>
                )}

                {submitStatus === 'answered' && (
                    <div className="space-y-2">
                        {answerResult ? (
                            <>
                                <div
                                    className={`p-3 text-center text-sm font-semibold rounded-lg border ${
                                        answerResult.correct
                                            ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-300'
                                            : 'border-rose-800/40 bg-rose-950/40 text-rose-300'
                                    }`}
                                >
                                    {answerResult.correct ? 'Correct!' : 'Not quite.'}
                                </div>
                                <p className="text-xs text-neutral-400">{answerResult.explanation}</p>
                                {answerResult.stampAwarded && (
                                    <p className="text-xs font-mono text-amber-400">
                                        Stamp earned: {answerResult.stampAwarded.waypointName ?? waypointId}
                                    </p>
                                )}
                            </>
                        ) : (
                            <div className="p-3 text-center text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                Your answer went through — check your passport for the result.
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full text-xs font-mono font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 px-4 py-2.5 rounded-lg min-h-[44px]"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TriviaPrompt;