import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import maplibregl, { Map, Marker } from 'maplibre-gl';
import length from '@turf/length';
import along from '@turf/along';
import bearing from '@turf/bearing';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface WaypointProperties {
  stationId: string;
  name: string;
  [key: string]: unknown;
}

type GeoJsonLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

type GeoJsonPointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type GeoJsonFeatureCollection<TGeometry> = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: Record<string, unknown> | null;
    geometry: TGeometry;
  }>;
};

export interface MapCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onSelectWaypoint?: (station: WaypointProperties) => void;
  routeGeoJson?: GeoJsonFeatureCollection<GeoJsonLineString>;
  waypointsGeoJson?: GeoJsonFeatureCollection<GeoJsonPointGeometry>;
  progressPercent?: number;
  onWaypointReached?: (waypointId: string) => void;
  proximityThresholdKm?: number;
}

const emptyRouteGeoJson: GeoJsonFeatureCollection<GeoJsonLineString> = {
  type: 'FeatureCollection',
  features: [],
};

const emptyWaypointsGeoJson: GeoJsonFeatureCollection<GeoJsonPointGeometry> = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * MapCanvas component
 *
 * Issue 2: 3D MapLibre terrain canvas for the Pretoria → Cape Town corridor.
 * Issue 4: train scrub position, heading, and waypoint reach triggers.
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
                                                      className = '',
                                                      style,
                                                      children,
                                                      onSelectWaypoint,
                                                      routeGeoJson = emptyRouteGeoJson,
                                                      waypointsGeoJson = emptyWaypointsGeoJson,
                                                      progressPercent = 0,
                                                      onWaypointReached,
                                                      proximityThresholdKm = 12.0,
                                                    }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const trainMarkerRef = useRef<Marker | null>(null);
  const lastTriggeredWpRef = useRef<string | null>(null);

  const lineFeature = routeGeoJson.features?.[0] ?? null;
  const totalLengthKm = useRef<number>(0);
  const initialCenter = useMemo<[number, number]>(() => {
    const routeCoords = lineFeature?.geometry.coordinates ?? [];
    const midpoint = routeCoords[Math.floor(routeCoords.length / 2)] ?? [0, 0];
    return [midpoint[0], midpoint[1]] as [number, number];
  }, [lineFeature]);

  useEffect(() => {
    totalLengthKm.current = lineFeature ? length(lineFeature, { units: 'kilometers' }) : 0;
  }, [lineFeature]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
          'terrain-rgb': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15,
          },
        },
        layers: [
          {
            id: 'background-base',
            type: 'background',
            paint: { 'background-color': '#060B19' },
          },
          {
            id: 'base-osm',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-opacity': 0.15,
              'raster-saturation': -0.9,
              'raster-contrast': 0.3,
            },
          },
        ],
        terrain: {
          source: 'terrain-rgb',
          exaggeration: 1.6,
        },
      },
      center: initialCenter,
      zoom: 5.5,
      pitch: 60,
      bearing: -22,
      antialias: true,
      maxPitch: 85,
    });

    map.on('load', () => {
      if (routeGeoJson.features.length > 0) {
        map.addSource('rail-corridor', {
          type: 'geojson',
          data: routeGeoJson,
        });

        map.addLayer({
          id: 'corridor-glow',
          type: 'line',
          source: 'rail-corridor',
          paint: {
            'line-color': '#F59E0B',
            'line-width': 6,
            'line-opacity': 0.25,
            'line-blur': 3,
          },
        });

        map.addLayer({
          id: 'corridor-track',
          type: 'line',
          source: 'rail-corridor',
          paint: {
            'line-color': '#FBBF24',
            'line-width': 2.5,
          },
        });
      }

      if (waypointsGeoJson.features.length > 0) {
        map.addSource('waypoints', {
          type: 'geojson',
          data: waypointsGeoJson,
        });

        map.addLayer({
          id: 'waypoint-halo',
          type: 'circle',
          source: 'waypoints',
          paint: {
            'circle-radius': 10,
            'circle-color': '#F59E0B',
            'circle-opacity': 0.3,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#FBBF24',
          },
        });

        map.addLayer({
          id: 'waypoint-points',
          type: 'circle',
          source: 'waypoints',
          paint: {
            'circle-radius': 5,
            'circle-color': '#FFFBEB',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#D97706',
          },
        });
      }

      mapRef.current = map;
    });

    return () => {
      if (trainMarkerRef.current) {
        trainMarkerRef.current.remove();
        trainMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter, routeGeoJson, waypointsGeoJson]);

  const updatePosition = useCallback(
      (pct: number) => {
        const map = mapRef.current;
        if (!map || !lineFeature || totalLengthKm.current === 0) {
          return;
        }

        const clamped = Math.max(0, Math.min(100, pct)) / 100;
        const targetDistKm = clamped * totalLengthKm.current;
        const currentPt = along(lineFeature, targetDistKm, { units: 'kilometers' });
        const [lng, lat] = currentPt.geometry.coordinates as [number, number];

        const lookaheadKm = Math.min(targetDistKm + 0.5, totalLengthKm.current);
        const aheadPt = along(lineFeature, lookaheadKm, { units: 'kilometers' });
        const currentBearing = bearing(currentPt, aheadPt);

        if (!trainMarkerRef.current) {
          const markerEl = document.createElement('div');
          markerEl.className = 'train-marker';
          markerEl.style.width = '28px';
          markerEl.style.height = '28px';
          markerEl.style.display = 'flex';
          markerEl.style.alignItems = 'center';
          markerEl.style.justifyContent = 'center';
          markerEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#F59E0B" stroke="#060B19" stroke-width="1.5">
            <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8-12.5c3.71 0 5.8 0.42 6 2H6c.2-1.58 2.29-2 6-2zm-5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-7 6c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1h-4z"/>
          </svg>
        `;

          trainMarkerRef.current = new Marker({ element: markerEl })
              .setLngLat([lng, lat])
              .setRotation(currentBearing)
              .addTo(map);
        } else {
          trainMarkerRef.current.setLngLat([lng, lat]);
          trainMarkerRef.current.setRotation(currentBearing);
        }

        map.easeTo({ center: [lng, lat], duration: 0, pitch: 60 });

        if (onWaypointReached && waypointsGeoJson.features.length > 0) {
          const currentTurfPt = point([lng, lat]);
          let activeWp: string | null = null;

          for (const wp of waypointsGeoJson.features) {
            const geometry = wp.geometry;
            const waypointCoords = geometry.coordinates;
            const d = distance(currentTurfPt, waypointCoords, { units: 'kilometers' });

            if (d <= proximityThresholdKm) {
              activeWp = String((wp.properties?.id as string | undefined) ?? wp.id ?? '');
              break;
            }
          }

          if (activeWp && activeWp !== lastTriggeredWpRef.current) {
            lastTriggeredWpRef.current = activeWp;
            onWaypointReached(activeWp);
          } else if (!activeWp) {
            lastTriggeredWpRef.current = null;
          }
        }
      },
      [lineFeature, onWaypointReached, proximityThresholdKm, waypointsGeoJson],
  );

  useEffect(() => {
    updatePosition(progressPercent);
  }, [progressPercent, updatePosition]);

  return (
      <div
          className={`map-canvas-container ${className}`}
          data-testid="map-canvas"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '320px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#121826',
            color: '#f3f4f6',
            overflow: 'hidden',
            boxSizing: 'border-box',
            touchAction: 'none',
            ...style,
          }}
      >
        <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '300px',
              position: 'relative',
              touchAction: 'none',
            }}
        />

        <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px',
              textAlign: 'center',
              maxWidth: '90%',
            }}
        >
          <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                letterSpacing: '0.025em',
              }}
          >
            {/* PLACEHOLDER_TERRAIN_VIEWPORT */}
            RailWaze Map Viewport
          </div>
          <p
              style={{
                fontSize: '0.875rem',
                color: '#9ca3af',
                margin: 0,
              }}
          >
            {/* // TODO: verify MapLibre GL 3D terrain and route.geojson layer integration */}
            Pretoria &rarr; Cape Town Corridor (MapLibre 3D Terrain)
          </p>

          {onSelectWaypoint && (
              <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    marginTop: '12px',
                  }}
              >
                <button
                    type="button"
                    onClick={() =>
                        onSelectWaypoint({
                          stationId: 'pretoria',
                          name: 'Pretoria Station',
                        })
                    }
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                >
                  {/* PLACEHOLDER_TEST_WAYPOINT_PRETORIA */}
                  Select Pretoria Station
                </button>
                <button
                    type="button"
                    onClick={() =>
                        onSelectWaypoint({
                          stationId: 'kimberley',
                          name: 'Kimberley Station',
                        })
                    }
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#374151',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                >
                  {/* PLACEHOLDER_TEST_WAYPOINT_KIMBERLEY */}
                  Select Kimberley Station
                </button>
              </div>
          )}
        </div>

        {children}
      </div>
  );
};

export default MapCanvas;