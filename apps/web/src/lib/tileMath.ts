export interface LonLatBbox {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}

export interface TileCoord {
    z: number;
    x: number;
    y: number;
}

/**
 * Standard slippy-map (Web Mercator) lon/lat -> tile x/y conversion,
 * used by MapLibre, OpenStreetMap, and every {z}/{x}/{y} raster tile scheme.
 */
export function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * All tile coordinates covering a lon/lat bounding box at a given zoom.
 * Used to precache the actual Pretoria-Cape Town corridor's tile range at
 * install time, rather than either the whole world or nothing at all.
 */
export function tileRangeForBbox(bbox: LonLatBbox, zoom: number): TileCoord[] {
    const topLeft = lonLatToTile(bbox.minLon, bbox.maxLat, zoom);
    const bottomRight = lonLatToTile(bbox.maxLon, bbox.minLat, zoom);

    const tiles: TileCoord[] = [];
    for (let x = topLeft.x; x <= bottomRight.x; x += 1) {
        for (let y = topLeft.y; y <= bottomRight.y; y += 1) {
            tiles.push({ z: zoom, x, y });
        }
    }
    return tiles;
}

export function tileUrlsForBbox(
    urlTemplate: string,
    bbox: LonLatBbox,
    zoom: number
): string[] {
    return tileRangeForBbox(bbox, zoom).map(({ z, x, y }) =>
        urlTemplate.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
    );
}