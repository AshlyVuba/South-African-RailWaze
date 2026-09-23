// @turf/* v6.5.x packages ship real type declarations, but their
// package.json "exports" field isn't structured in a way TypeScript's
// "bundler" moduleResolution can follow (see TS7016 on build) - this
// applies to @turf/helpers too, so these shims are written against the
// globally available @types/geojson (already a transitive dependency via
// maplibre-gl) rather than importing from @turf/helpers itself. This is a
// known gap in this generation of turf packages, not a bug in this app.
// Consider upgrading to @turf/* v7.x (which fixed this properly) as a
// follow-up instead of carrying this file indefinitely.

type TurfUnits =
    | 'meters'
    | 'millimeters'
    | 'centimeters'
    | 'kilometers'
    | 'acres'
    | 'miles'
    | 'nauticalmiles'
    | 'inches'
    | 'yards'
    | 'feet'
    | 'radians'
    | 'degrees'
    | 'hectares';

declare module '@turf/length' {
    export default function length(
        feature: GeoJSON.Feature | GeoJSON.Geometry,
        options?: { units?: TurfUnits }
    ): number;
}

declare module '@turf/along' {
    export default function along(
        line: GeoJSON.Feature<GeoJSON.LineString> | GeoJSON.LineString,
        distance: number,
        options?: { units?: TurfUnits }
    ): GeoJSON.Feature<GeoJSON.Point>;
}

declare module '@turf/bearing' {
    export default function bearing(
        start: GeoJSON.Feature<GeoJSON.Point> | GeoJSON.Point | GeoJSON.Position,
        end: GeoJSON.Feature<GeoJSON.Point> | GeoJSON.Point | GeoJSON.Position,
        options?: { final?: boolean }
    ): number;
}

declare module '@turf/distance' {
    export default function distance(
        from: GeoJSON.Feature<GeoJSON.Point> | GeoJSON.Point | GeoJSON.Position,
        to: GeoJSON.Feature<GeoJSON.Point> | GeoJSON.Point | GeoJSON.Position,
        options?: { units?: TurfUnits }
    ): number;
}

declare module '@turf/helpers' {
    export function point<P = GeoJSON.GeoJsonProperties>(
        coordinates: GeoJSON.Position,
        properties?: P
    ): GeoJSON.Feature<GeoJSON.Point, P>;
}