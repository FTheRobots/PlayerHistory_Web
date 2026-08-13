import type { LatLngExpression } from 'leaflet';
import type { MapDisplayMode } from '../config/mapConfig';

/**
 * Convert DayZ world position [x, height, z] to Leaflet coordinates [lat, lng].
 */
export function positionToMapLatLng(
  position: [number, number, number],
  mapSize: number,
  mode: MapDisplayMode = 'tiles'
): LatLngExpression {
  const [x, , z] = position;
  if (mode === 'tiles') {
    return [256 * (z / mapSize) - 256, 256 * (x / mapSize)];
  }
  return [mapSize - z, x];
}

export function mapLatLngToPosition(
  lat: number,
  lng: number,
  mapSize: number,
  mode: MapDisplayMode = 'tiles'
): [number, number, number] {
  if (mode === 'tiles') {
    const x = (lng * mapSize) / 256;
    const z = ((lat + 256) * mapSize) / 256;
    return [x, 0, z];
  }
  const x = lng;
  const z = mapSize - lat;
  return [x, 0, z];
}

export function trailToMapLatLngs(
  trail: [number, number][],
  mapSize: number,
  mode: MapDisplayMode = 'tiles'
): LatLngExpression[] {
  return trail.map(([x, z]) => positionToMapLatLng([x, 0, z], mapSize, mode));
}

export function mapLatLngBounds(mapSize: number): [[number, number], [number, number]] {
  return [
    [0, 0],
    [mapSize, mapSize],
  ];
}
