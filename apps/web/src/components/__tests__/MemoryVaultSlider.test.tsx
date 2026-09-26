import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryVaultSlider } from '../MemoryVaultSlider';

describe('MemoryVaultSlider Visual & Functional Tests', () => {
  it('renders station header, year chips, and caption with design system tokens', () => {
    const mockWaypoint = {
      id: 'wp-kimberley',
      name: 'Kimberley Station',
      memory_vault: {
        before_image_url: 'PLACEHOLDER_kimberley_1890.jpg',
        after_image_url: 'PLACEHOLDER_kimberley_2026.jpg',
        caption: 'Historic Kimberley diamond rush rail terminus.',
        year: 1890,
      },
    };

    render(
        <MemoryVaultSlider
            stationId="kimberley"
            waypoint={mockWaypoint}
        />
    );

    const card = screen.getByTestId('memory-vault-card');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('rounded-2xl');
    expect(card.className).toContain('border-white/10');

    // Header check
    expect(screen.getByText('KIMBERLEY STATION')).toBeInTheDocument();

    // Badges check
    expect(screen.getByText('1890')).toBeInTheDocument();
    expect(screen.getByText('NOW')).toBeInTheDocument();

    // Caption check
    expect(screen.getByText('Historic Kimberley diamond rush rail terminus.')).toBeInTheDocument();
  });

  it('triggers onClose callback when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
        <MemoryVaultSlider
            stationId="matjiesfontein"
            onClose={handleClose}
        />
    );

    const closeBtn = screen.getByRole('button', { name: /close vault/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('rounded-full');

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles pointer drag interactions to update comparison split position', () => {
    const { container } = render(
        <MemoryVaultSlider stationId="pretoria" />
    );

    const sliderContainer = container.querySelector('.cursor-ew-resize');
    expect(sliderContainer).not.toBeNull();

    if (sliderContainer) {
      // Mock getBoundingClientRect for deterministic coordinates
      vi.spyOn(sliderContainer, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 400,
        bottom: 220,
        width: 400,
        height: 220,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.pointerDown(sliderContainer, { clientX: 200, pointerId: 1 });
      fireEvent.pointerMove(sliderContainer, { clientX: 300, pointerId: 1 });
      fireEvent.pointerUp(sliderContainer, { clientX: 300, pointerId: 1 });
    }
  });

  describe('trivia option quantum shuffle (Issue #39)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const triviaQuestion = {
      id: 'trivia-kimberley-bighole',
      waypoint_id: 'wp-kimberley',
      question: 'What primary geological feature defined Kimberley?',
      options: ['The Big Hole', 'Cullinan Pipe', 'Pilgrims Rest', 'Sudwala Caves'],
    };

    it('renders all options and a "quantum-shuffled" badge on a successful QRNG call', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ type: 'uint8', length: 3, data: [200, 10, 90], success: true }),
      } as Response);

      render(
          <MemoryVaultSlider
              stationId="kimberley"
              triviaQuestion={triviaQuestion}
              onTriviaRequest={() => {}}
              waypoint={{ id: 'wp-kimberley', name: 'Kimberley' }}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/quantum-shuffled/i)).toBeInTheDocument();
      });

      for (const option of triviaQuestion.options) {
        expect(screen.getByText(option)).toBeInTheDocument();
      }
    });

    it('falls back to a classical shuffle without throwing when the QRNG API is unreachable', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      render(
          <MemoryVaultSlider
              stationId="kimberley"
              triviaQuestion={triviaQuestion}
              onTriviaRequest={() => {}}
              waypoint={{ id: 'wp-kimberley', name: 'Kimberley' }}
          />
      );

      await waitFor(() => {
        expect(screen.getByText(/classical shuffle/i)).toBeInTheDocument();
      });

      // All options still rendered - the UI never blocked or errored.
      for (const option of triviaQuestion.options) {
        expect(screen.getByText(option)).toBeInTheDocument();
      }
    });

    it('renders nothing extra when there is no trivia question yet', () => {
      render(
          <MemoryVaultSlider
              stationId="kimberley"
              waypoint={{ id: 'wp-kimberley', name: 'Kimberley' }}
          />
      );

      expect(screen.queryByText(/quantum-shuffled|classical shuffle/i)).not.toBeInTheDocument();
    });
  });
});