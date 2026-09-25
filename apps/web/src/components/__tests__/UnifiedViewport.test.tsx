import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedViewport } from '../UnifiedViewport';

vi.mock('../MapCanvas', () => ({
  MapCanvas: ({
    onSelectWaypoint,
    onWaypointReached,
  }: {
    onSelectWaypoint: (st: { id?: string; stationId?: string; name: string; [key: string]: unknown }) => void;
    onWaypointReached?: (waypointId: string) => void;
  }) => (
    <div data-testid="map-canvas">
      <button onClick={() => onSelectWaypoint({ stationId: 'pretoria', name: 'Pretoria Station' })}>
        Select Pretoria Station
      </button>
      <button onClick={() => onSelectWaypoint({ stationId: 'kimberley', name: 'Kimberley Station' })}>
        Select Kimberley Station
      </button>
      <button onClick={() => onWaypointReached?.('wp_kimberley')}>
        Reach Kimberley Waypoint First
      </button>
      <button onClick={() => onWaypointReached?.('wp_kimberley')}>
        Reach Kimberley Waypoint Again
      </button>
    </div>
  ),
}));

vi.mock('../MemoryVaultSlider', () => ({
  MemoryVaultSlider: ({ stationId }: { stationId: string }) => (
    <div data-testid="mock-memory-slider">Station ID: {stationId}</div>
  ),
}));

vi.mock('../ConnectivityBanner', () => ({
  ConnectivityBanner: () => <div data-testid="mock-connectivity-banner" />,
}));

describe('UnifiedViewport Integration & Responsive DoD Tests', () => {
  it('enforces horizontal overflow containment on root container', () => {
    render(<UnifiedViewport />);
    const root = screen.getByTestId('unified-viewport-root');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('overflow-x-hidden');
    expect(root.className).toContain('max-w-[100vw]');
  });

  it('verifies safe-area padding utilities on contextual anchors', () => {
    render(<UnifiedViewport />);
    expect(screen.getByLabelText('Audio Capsule Bar').className).toContain('pt-safe');
    expect(screen.getByLabelText('Journey HUD').className).toContain('pb-safe');
  });

  const breakpoints = [
    { name: 'small mobile (375px - iPhone SE)', width: 375, height: 667 },
    { name: 'standard mobile (414px - iPhone Plus/Max)', width: 414, height: 896 },
    { name: 'tablet breakpoint (768px - iPad)', width: 768, height: 1024 },
  ];

  breakpoints.forEach(({ name, width, height }) => {
    it(`verifies coexistence and no horizontal scroll at ${name} (${width}x${height})`, () => {
      window.innerWidth = width;
      window.innerHeight = height;
      window.dispatchEvent(new Event('resize'));

      render(<UnifiedViewport />);

      const root = screen.getByTestId('unified-viewport-root');
      expect(root.className).toContain('overflow-x-hidden');
      expect(root.className).toContain('max-w-[100vw]');

      expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
      expect(screen.getByLabelText('Audio Capsule Bar')).toBeInTheDocument();
      expect(screen.getByLabelText('Journey HUD')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Select Pretoria Station/i }));
      const panel = screen.getByTestId('memory-vault-panel');
      expect(panel).toBeInTheDocument();
      expect(panel.className).toContain('pb-safe');
      expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    });
  });

  it('renders MapCanvas without opening the Memory Vault initially', () => {
    render(<UnifiedViewport />);
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    expect(screen.queryByLabelText('Station Memory Vault')).not.toBeInTheDocument();
  });

  it('mounts the connectivity status indicator', () => {
    render(<UnifiedViewport />);
    expect(screen.getByTestId('mock-connectivity-banner')).toBeInTheDocument();
  });

  it('tapping Pretoria waypoint opens Pretoria card (not any other station)', () => {
    render(<UnifiedViewport />);

    const pretoriaBtn = screen.getByRole('button', { name: /Select Pretoria Station/i });
    fireEvent.click(pretoriaBtn);

    const vault = screen.getByLabelText('Station Memory Vault');
    expect(vault).toBeInTheDocument();
    expect(screen.getByText('Pretoria Station Vault')).toBeInTheDocument();
    expect(screen.getByText(/Station ID:\s*pretoria/i)).toBeInTheDocument();
    expect(screen.queryByText('Kimberley Station Vault')).not.toBeInTheDocument();
  });

  it('tapping a different station opens that specific station card', () => {
    render(<UnifiedViewport />);

    const kimberleyBtn = screen.getByRole('button', { name: /Select Kimberley Station/i });
    fireEvent.click(kimberleyBtn);

    expect(screen.getByText('Kimberley Station Vault')).toBeInTheDocument();
    expect(screen.getByText(/Station ID:\s*kimberley/i)).toBeInTheDocument();
    expect(screen.queryByText('Pretoria Station Vault')).not.toBeInTheDocument();
  });

  it('closing the card dismisses the drawer while preserving map mount state', () => {
    render(<UnifiedViewport />);

    fireEvent.click(screen.getByRole('button', { name: /Select Pretoria Station/i }));
    expect(screen.getByLabelText('Station Memory Vault')).toBeInTheDocument();

    const mapCanvas = screen.getByTestId('map-canvas');
    expect(mapCanvas).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close card/i }));

    expect(screen.queryByLabelText('Station Memory Vault')).not.toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBe(mapCanvas);
  });

  it('automatically opens the Audio Capsule once when a waypoint is reached and prevents duplicate stacking', () => {
    render(<UnifiedViewport />);

    fireEvent.click(screen.getByRole('button', { name: /Reach Kimberley Waypoint First/i }));
    expect(screen.getAllByLabelText('Audio Capsule Player')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Reach Kimberley Waypoint Again/i }));
    expect(screen.getAllByLabelText('Audio Capsule Player')).toHaveLength(1);
  });
});