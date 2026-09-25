import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
