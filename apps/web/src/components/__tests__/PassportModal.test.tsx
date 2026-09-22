import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest';
import { PassportModal, PassportState } from '../PassportModal';

const mockPassportData: PassportState = {
  session_id: '550e8400-e29b-41d4-a716-446655440000',
  current_rank: 'Karoo Scout',
  score: 150,
  collected_stamps: [
    {
      stamp_id: 'stamp-matjiesfontein-01',
      waypoint_id: 'matjiesfontein',
      collected_at: '2026-09-22T10:00:00Z',
    },
  ],
  completed_trivia_ids: ['trivia-matjiesfontein-01'],
};

describe('PassportModal Component', () => {
  beforeEach(() => {
    // vi.fn() directly replaces jest.fn() in Vite setups
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPassportData),
      } as Response)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('fetches and renders server rank and collected stamps per schema', async () => {
    render(
      <PassportModal
        sessionId="550e8400-e29b-41d4-a716-446655440000"
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Karoo Scout')).toBeInTheDocument();
      expect(screen.getByText('matjiesfontein')).toBeInTheDocument();
      expect(screen.getByText('Score: 150 pts')).toBeInTheDocument();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/passport/550e8400-e29b-41d4-a716-446655440000'
    );
  });

  test('re-fetches state upon custom event without full page reload', async () => {
    render(
      <PassportModal
        sessionId="550e8400-e29b-41d4-a716-446655440000"
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Karoo Scout')).toBeInTheDocument();
    });

    fireEvent(window, new CustomEvent('railwaze:trivia-answered'));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });
});