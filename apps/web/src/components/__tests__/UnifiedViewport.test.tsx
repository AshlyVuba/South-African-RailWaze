import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedViewport } from '../UnifiedViewport';

type MockWaypointFeature = {
  id?: string | number;
  properties?: Record<string, unknown> | null;
};

type MockMapCanvasProps = {
  waypointsGeoJson?: { features: MockWaypointFeature[] };
  onSelectWaypoint?: (station: { stationId: string; name: string; [key: string]: unknown }) => void;
  onWaypointReached?: (waypointId: string) => void;
};

vi.mock('../MapCanvas', () => ({
  MapCanvas: ({ waypointsGeoJson, onSelectWaypoint, onWaypointReached }: MockMapCanvasProps) => (
    <div data-testid="map-canvas">
      {waypointsGeoJson?.features.map((feature) => {
        const properties = feature.properties ?? {};
        const id = String(properties.id ?? feature.id ?? '');
        const name = String(properties.name ?? 'Waypoint');
        return (
          <div key={id}>
            <button
              type="button"
              onClick={() => onSelectWaypoint?.({ ...properties, stationId: id, name })}
            >
              Select {name}
            </button>
            <button type="button" onClick={() => onWaypointReached?.(id)}>
              Reach {name}
            </button>
          </div>
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
  'vault-station-pretoria': { waypoint_id: 'station-pretoria', caption: 'Pretoria archive caption.', then_image_url: '/images/stations/pretoria-then.jpg', now_image_url: '/images/stations/pretoria-now.jpg', then_year: 'circa 1893' },
  'vault-station-kimberley': { waypoint_id: 'station-kimberley', caption: 'Kimberley archive caption.', then_image_url: '/images/stations/kimberley-then.jpg', now_image_url: '/images/stations/kimberley-now.jpg', then_year: 'circa 1875' },
  'vault-station-matjiesfontein': { waypoint_id: 'station-matjiesfontein', caption: 'Matjiesfontein archive caption.', then_image_url: '/images/stations/matjiesfontein-then.jpg', now_image_url: '/images/stations/matjiesfontein-now.jpg', then_year: 'circa 1895' },
  'vault-station-cape-town': { waypoint_id: 'station-cape-town', caption: 'Hex River archive caption.', then_image_url: '/images/stations/capetown-then.jpg', now_image_url: '/images/stations/capetown-now.jpg', then_year: 'circa 1880' },
};

const stationTrivia = [
  { waypoint_id: 'station-pretoria', id: 'trivia-pretoria', question: 'Pretoria question?', options: ['A', 'B'] },
  { waypoint_id: 'station-kimberley', id: 'trivia-kimberley', question: 'Kimberley question?', options: ['A', 'B'] },
  { waypoint_id: 'station-matjiesfontein', id: 'trivia-matjiesfontein', question: 'Matjiesfontein question?', options: ['A', 'B'] },
  { waypoint_id: 'station-cape-town', id: 'trivia-cape-town', question: 'Hex River question?', options: ['A', 'B'] },
];
let rejectTriviaFetch = false;

describe('UnifiedViewport Component (#41)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rejectTriviaFetch = false;
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
        if (rejectTriviaFetch) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
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
    expect(await screen.findByText('Pretoria archive caption.', {}, { timeout: 10000 })).toBeInTheDocument();
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
    expect(screen.getByAltText('Historical archival view')).toHaveAttribute(
      'src',
      `/images/stations/${waypointId === 'station-cape-town' ? 'capetown' : waypointId.replace('station-', '')}-then.jpg`,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));
    expect(await screen.findByText(question)).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `http://localhost:8000/waypoints/${waypointId}/trivia`
    );
  }, 10000);

  it('shows a visible error when the trivia API cannot be reached', async () => {
    rejectTriviaFetch = true;
    render(<UnifiedViewport />);

    fireEvent.click(await screen.findByRole('button', { name: 'Select Pretoria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load station trivia. Check the API URL and your connection.'
    );
  });

  it('uses VITE_API_BASE_URL when configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://railwaze-api.example.test/');
    render(<UnifiedViewport />);

    fireEvent.click(await screen.findByRole('button', { name: 'Select Pretoria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));

    expect(await screen.findByText('Pretoria question?')).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://railwaze-api.example.test/waypoints/station-pretoria/trivia'
    );
  });

  it('submits the original option index and session id to the trivia answer endpoint', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('route.geojson')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRouteGeoJson) });
      if (url.includes('waypoints.geojson')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockWaypointsGeoJson) });
      if (url.includes('memory-vault.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMemoryVaultData) });
      if (url.includes('/trivia/answer')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ correct: true, correctOptionIndex: 1, explanation: 'That is correct.' }),
      });
      if (url.includes('/trivia')) return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(stationTrivia.filter((item) => item.waypoint_id === 'station-pretoria')),
      });
      return Promise.reject(new Error('Unknown endpoint'));
    });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<UnifiedViewport />);
    fireEvent.click(await screen.findByRole('button', { name: 'Select Pretoria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trivia' }));
    await screen.findByText('Pretoria question?');
    fireEvent.click(await screen.findByRole('button', { name: /A$/ }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/waypoints/station-pretoria/trivia/answer',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringMatching(/"sessionId":"[0-9a-f-]{36}"/),
        }),
      );
      expect(screen.getByText(/Correct — stamp awarded/)).toBeInTheDocument();
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'railwaze:trivia-answered' }));
    });
  });

  it.each([
    ['station-pretoria', 'Pretoria'],
    ['station-kimberley', 'Kimberley'],
    ['station-matjiesfontein', 'Matjiesfontein'],
    ['station-cape-town', 'Hex River / Cape Town'],
  ])('shows the audio fallback when %s is reached without an audio file', async (waypointId, name) => {
    render(<UnifiedViewport />);

    fireEvent.click(await screen.findByRole('button', { name: `Reach ${name}` }));

    const player = await screen.findByLabelText('Audio Capsule Player');
    const audioElement = player.querySelector('audio');
    expect(audioElement?.getAttribute('src')).toBe(`/audio/${waypointId}.mp3`);
    if (audioElement) {
      fireEvent.error(audioElement);
    }

    expect(await within(player).findByRole('status')).toHaveTextContent(
      "Audio coming soon. This station's recording isn't available yet."
    );
  });
});