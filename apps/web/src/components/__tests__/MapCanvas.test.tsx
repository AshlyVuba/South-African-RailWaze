import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapCanvas } from '../MapCanvas';

const mapMocks = vi.hoisted(() => ({
  Map: vi.fn(),
  Marker: vi.fn(),
}));

vi.mock('maplibre-gl', () => mapMocks);

describe('MapCanvas', () => {
  let mapInstance: {
    on: ReturnType<typeof vi.fn>;
    setTerrain: ReturnType<typeof vi.fn>;
    setSky: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    fitBounds: ReturnType<typeof vi.fn>;
    addSource: ReturnType<typeof vi.fn>;
    addLayer: ReturnType<typeof vi.fn>;
    getCanvas: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    easeTo: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mapInstance = {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'load') handler();
        return mapInstance;
      }),
      setTerrain: vi.fn(),
      setSky: vi.fn(),
      resize: vi.fn(),
      fitBounds: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getCanvas: vi.fn(() => ({ style: {} })),
      remove: vi.fn(),
      easeTo: vi.fn(),
    };
    mapMocks.Map.mockImplementation(function () {
      return mapInstance;
    });
    mapMocks.Marker.mockImplementation(function () {
      return {
        setLngLat: vi.fn().mockReturnThis(),
        setRotation: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      };
    });
  });

  it('starts with an elevated camera and explicitly enables terrain after the style loads', () => {
    render(<MapCanvas />);

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
    expect(mapMocks.Map).toHaveBeenCalledWith(expect.objectContaining({
      pitch: 65,
      maxPitch: 85,
    }));
    expect(mapInstance.setTerrain).toHaveBeenCalledWith({
      source: 'terrain-rgb',
      exaggeration: 2.2,
    });
    expect(mapInstance.resize).toHaveBeenCalled();
  });
});
