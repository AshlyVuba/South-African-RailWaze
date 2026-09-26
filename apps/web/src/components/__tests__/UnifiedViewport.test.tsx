import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedViewport } from '../UnifiedViewport';

type MockWaypointFeature = {
  id?: string | number;
  properties?: Record<string, unknown> | null;
};

type MockMapCanvasProps = {
  waypointsGeoJson?: { features: MockWaypointFeature[] };
  onSelectWaypoint?: (station: { stationId: string; name: string; [key: string]: unknown }) => void;
};

vi.mock('../MapCanvas', () => ({
  MapCanvas: ({ waypointsGeoJson, onSelectWaypoint }: MockMapCanvasProps) => (
    <div data-testid="map-canvas">
      {waypointsGeoJson?.features.map((feature) => {
        const properties = feature.properties ?? {};
        const id = String(properties.id ?? feature.id ?? '');
        const name = String(properties.name ?? 'Waypoint');
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectWaypoint?.({ ...properties, stationId: id, name })}
          >
            Select {name}
          </button>
        );
      })}
    </div>
  ),
}));

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
    ['station-pretoria', 'Pretoria'],
    ['station-kimberley', 'Kimberley'],
    ['station-matjiesfontein', 'Matjiesfontein'],
    ['station-cape-town', 'Hex River / Cape Town'],
  ].map(([id, name]) => ({
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { id, name, km_mark: 0, memory_vault_id: `vault-${id}` },
  })),
};

const mockMemoryVaultData = {
  memory_vault_captions: [
    { waypoint_id: 'station-pretoria', caption: 'Pretoria archive caption.' },
    { waypoint_id: 'station-kimberley', caption: 'Kimberley archive caption.' },
    { waypoint_id: 'station-matjiesfontein', caption: 'Matjiesfontein archive caption.' },
    { waypoint_id: 'station-cape-town', caption: 'Hex River archive caption.' },
  ],
};

const stationTrivia = [
  { waypoint_id: 'station-pretoria', id: 'trivia-pretoria', question: 'Pretoria question?', options: ['A', 'B'] },
  { waypoint_id: 'station-kimberley', id: 'trivia-kimberley', question: 'Kimberley question?', options: ['A', 'B'] },
  { waypoint_id: 'station-matjiesfontein', id: 'trivia-matjiesfontein', question: 'Matjiesfontein question?', options: ['A', 'B'] },
  { waypoint_id: 'station-cape-town', id: 'trivia-cape-town', question: 'Hex River question?', options: ['A', 'B'] },
];

describe('UnifiedViewport Component (#37)', () => {
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
      if (url.includes('memory-vault.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMemoryVaultData),
        });
      }
      if (url.includes('/trivia')) {
        const waypointId = decodeURIComponent(url.split('/waypoints/')[1].split('/')[0]);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(stationTrivia.filter((item) => item.waypoint_id === waypointId)),
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

    expect(screen.queryByTestId('memory-vault-card')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Select Pretoria' }));
    expect(await screen.findByText('Pretoria archive caption.')).toBeInTheDocument();
  });

  it.each([
    ['station-pretoria', 'Pretoria', 'Pretoria archive caption.', 'Pretoria question?'],
    ['station-kimberley', 'Kimberley', 'Kimberley archive caption.', 'Kimberley question?'],
    ['station-matjiesfontein', 'Matjiesfontein', 'Matjiesfontein archive caption.', 'Matjiesfontein question?'],
    ['station-cape-town', 'Hex River / Cape Town', 'Hex River archive caption.', 'Hex River question?'],
  ])('selecting %s opens its vault and loads its trivia', async (waypointId, name, caption, question) => {
    render(<UnifiedViewport />);

    fireEvent.click(await screen.findByRole('button', { name: `Select ${name}` }));
    expect(screen.getByRole('heading', { name: name.toUpperCase() })).toBeInTheDocument();
    expect(screen.getByText(caption)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));
    expect(await screen.findByText(question)).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `http://localhost:8000/waypoints/${waypointId}/trivia`
    );
  });
});