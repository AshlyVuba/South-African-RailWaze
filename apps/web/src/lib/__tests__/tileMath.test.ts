import { describe, test, expect } from 'vitest';
import { lonLatToTile, tileRangeForBbox, tileUrlsForBbox } from '../tileMath';

// Real Pretoria -> Cape Town corridor bbox, from data/geojson/route.geojson
const CORRIDOR_BBOX = {
    minLon: 18.4241,
    minLat: -33.9249,
    maxLon: 28.1895,
    maxLat: -25.7565,
};

describe('lonLatToTile', () => {
    test('matches the known Cape Town tile at zoom 5', () => {
        const { x, y } = lonLatToTile(18.4241, -33.9249, 5);
        expect(x).toBe(17);
        expect(y).toBe(19);
    });

    test('matches the known Pretoria-area tile at zoom 5', () => {
        const { x, y } = lonLatToTile(28.1895, -25.7565, 5);
        expect(x).toBe(18);
        expect(y).toBe(18);
    });
});

describe('tileRangeForBbox', () => {
    test('covers the whole corridor with a small, install-time-safe tile count at zoom 5', () => {
        const tiles = tileRangeForBbox(CORRIDOR_BBOX, 5);
        expect(tiles.length).toBe(4);
        expect(tiles.every((t) => t.z === 5)).toBe(true);
    });

    test('produces more tiles at a higher zoom level', () => {
        const zoom5 = tileRangeForBbox(CORRIDOR_BBOX, 5);
        const zoom7 = tileRangeForBbox(CORRIDOR_BBOX, 7);
        expect(zoom7.length).toBeGreaterThan(zoom5.length);
    });
});

describe('tileUrlsForBbox', () => {
    test('substitutes z/x/y into the URL template for every tile in range', () => {
        const urls = tileUrlsForBbox(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            CORRIDOR_BBOX,
            5
        );
        expect(urls.length).toBe(4);
        expect(urls[0]).toMatch(/^https:\/\/tile\.openstreetmap\.org\/5\/\d+\/\d+\.png$/);
    });
});