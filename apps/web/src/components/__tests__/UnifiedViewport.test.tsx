import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedViewport } from '../UnifiedViewport';

const mockRouteGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [28.1895, -25.7565],
          [24.7645, -28.7383],
        ],
      },
      properties: { name: 'Mainline' },
    },
  ],
};

const mockWaypointsGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'wp_kimberley',
      geometry: {
        type: 'Point',
        coordinates: [24.7645, -28.7383],
      },
      properties: {
        id: 'wp_kimberley',
        name: 'Kimberley Station',
        km_mark: 612.0,
        memory_vault: {
          before_image_url: 'PLACEHOLDER_kimberley_old.jpg',
          after_image_url: 'PLACEHOLDER_kimberley_now.jpg',
          caption: 'Diamond rush rail junction.',
          year: 1890,
        },
      },
    },
  ],
};

describe('UnifiedViewport Component (#36)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('route.geojson')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRouteGeoJson),
        });
      }
      if (url.includes('waypoints.geojson')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWaypointsGeoJson),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('fetches real route and waypoint datasets on mount and does not render placeholder viewport', async () => {
    render(<UnifiedViewport />);

    // Check placeholder viewport is removed
    expect(screen.queryByTestId('placeholder-terrain-viewport')).not.toBeInTheDocument();
    expect(screen.queryByText(/RailWaze Map Viewport/i)).not.toBeInTheDocument();

    // Verify fetch calls
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/data/route.geojson');
      expect(globalThis.fetch).toHaveBeenCalledWith('/data/waypoints.geojson');
    });

    // Check MapCanvas container renders
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();

    // Check Memory Vault updates with fetched waypoint
    await waitFor(() => {
      expect(screen.getByText(/KIMBERLEY STATION/i)).toBeInTheDocument();
    });
  });
});