import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('maplibre-gl', () => {
  class MockMap {
    constructor(public options: unknown) {
      this.options = options;
    }

    public options: unknown;
    public on = vi.fn();
    public addSource = vi.fn();
    public addLayer = vi.fn();
    public remove = vi.fn();
    public easeTo = vi.fn();
  }

  class MockMarker {
    public setLngLat = vi.fn().mockReturnThis();
    public setRotation = vi.fn().mockReturnThis();
    public addTo = vi.fn().mockReturnThis();
    public remove = vi.fn();
  }

  return {
    default: { Map: MockMap, Marker: MockMarker },
    Map: MockMap,
    Marker: MockMarker,
  };
});
