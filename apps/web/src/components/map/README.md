# Map viewport and scrubber contract

This module defines the integration contract for the geospatial rail viewport and train scrub logic used in Iteration 2 Issue 4.

## Scope

The real implementation is provided by [apps/web/src/components/MapCanvas.tsx](../MapCanvas.tsx). The contract below describes the expected behavior for the scrubber, waypoint proximity logic, and downstream audio/trivia integration.

## Contract summary

The viewport must support:

- a GeoJSON rail corridor route
- waypoint features with coordinates and ids
- a train position driven by percentage progress along the route
- heading derived from track bearing, not direct lat/lng interpolation
- waypoint arrival events emitted when the train enters a proximity threshold

## Required data contracts

### Route GeoJSON

```ts
type GeoJsonLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

type RouteFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJsonLineString;
    properties?: Record<string, unknown>;
  }>;
};
```

The route must be a continuous line representing the Pretoria → Kimberley → Matjiesfontein → Hex River → Cape Town corridor.

### Waypoint GeoJSON

```ts
type GeoJsonPoint = {
  type: 'Point';
  coordinates: [number, number];
};

type WaypointFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string | number;
    geometry: GeoJsonPoint;
    properties?: {
      id?: string;
      name?: string;
      [key: string]: unknown;
    };
  }>;
};
```

Waypoint ids are expected to be stable string identifiers such as the stop name or route key, and the callback emits the same identifier back to downstream consumers.

## Scrubber / viewport props

```ts
export interface MapCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onSelectWaypoint?: (station: { stationId: string; name: string }) => void;
  routeGeoJson?: RouteFeatureCollection;
  waypointsGeoJson?: WaypointFeatureCollection;
  progressPercent?: number;
  onWaypointReached?: (waypointId: string) => void;
  proximityThresholdKm?: number;
}
```

### Behavior

- progressPercent is normalized from 0 to 100.
- The train marker is placed on the route using Turf along and route length.
- The heading is computed from Turf bearing between the current point and a short look-ahead point.
- When a waypoint resides within proximityThresholdKm of the current train position, the component emits onWaypointReached(waypointId).
- Each waypoint is only emitted once per contiguous “not nearby” state; this prevents duplicate arrival events while the train remains in range.

## Turf-based implementation rules

Issue 4 requires the following calculation model:

- `@turf/length` to compute total track distance
- `@turf/along` to compute the exact point at the current distance along the corridor
- `@turf/bearing` to orient the train marker to the track heading
- `@turf/distance` to estimate waypoint proximity in kilometers

This is intentionally different from a linear lat/lng interpolation approach. The route should be treated as a measured polyline, not as a simple straight-line position calculation.

## Callback contract for Iteration 3

Downstream consumers should use the following pattern:

```ts
<MapCanvas
  routeGeoJson={routeGeoJson}
  waypointsGeoJson={waypointsGeoJson}
  progressPercent={progress}
  proximityThresholdKm={12}
  onWaypointReached={(waypointId) => {
    // Trigger audio capsule, passport, or trivia pipeline
    // The waypointId is the stable route identifier.
  }}
/>
```

### Callback guarantees

1. waypointId is a stable route identifier from the waypoint feature or its explicit property id.
2. The callback fires only when the train crosses into the waypoint threshold.
3. The callback is debounced by the component’s active proximity state to prevent repeated emissions while the train stays inside the threshold radius.
4. Downstream code should treat the callback as the trigger for the next audio or trivia event in Iteration 3.

## Integration notes

- The viewport component is responsible for spatial calculation only.
- Audio, narrative, and trivia responses belong in the parent screen or orchestration layer.
- The contract remains stable even if the UI is refactored into a dedicated TrainScrubber component later.

## Acceptance checklist for Issue 4

- [x] Train marker position calculated along track distance via Turf
- [x] Track heading computed via Turf bearing
- [x] Progress value drives movement along the route
- [x] Waypoint proximity triggers onWaypointReached callback within threshold
- [x] Contract documented for downstream Iteration 3 integration

## Current implementation status

The active implementation in [apps/web/src/components/MapCanvas.tsx](../MapCanvas.tsx) conforms to this contract for the route position, heading, and callback behavior.
