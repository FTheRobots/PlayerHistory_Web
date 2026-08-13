import L from 'leaflet';
import type { MapDisplayMode, ResolvedMapConfig } from '../config/mapConfig';
import { mapBounds } from '../config/mapConfig';

export type MapTileLayer = 'topographic' | 'satellite';

export const MAP_TILE_LAYER_STORAGE_KEY = 'ph-map-tile-layer';

export const XAM_TILE_ATTRIBUTION =
  'Map tiles &copy; <a href="https://dayz.xam.nu/" target="_blank" rel="noreferrer">dayz.xam.nu</a>';

export function readStoredMapTileLayer(): MapTileLayer {
  try {
    const stored = localStorage.getItem(MAP_TILE_LAYER_STORAGE_KEY);
    return stored === 'satellite' ? 'satellite' : 'topographic';
  } catch {
    return 'topographic';
  }
}

export function writeStoredMapTileLayer(layer: MapTileLayer): void {
  try {
    localStorage.setItem(MAP_TILE_LAYER_STORAGE_KEY, layer);
  } catch {
    // ignore quota / private mode
  }
}

export function resolveTileUrl(
  config: Pick<ResolvedMapConfig, 'tileUrl' | 'tileUrlSatellite'>,
  layer: MapTileLayer
): string {
  if (layer === 'satellite') {
    if (config.tileUrlSatellite) return config.tileUrlSatellite;
    if (config.tileUrl.includes('/topographic/')) {
      return config.tileUrl.replace('/topographic/', '/satellite/');
    }
    return config.tileUrl;
  }

  if (config.tileUrl.includes('/satellite/')) {
    return config.tileUrl.replace('/satellite/', '/topographic/');
  }
  return config.tileUrl;
}

export function createXamTileLayer(
  map: L.Map,
  config: ResolvedMapConfig,
  mode: MapDisplayMode,
  layer: MapTileLayer
): L.TileLayer | null {
  if (mode !== 'tiles') return null;

  const url = resolveTileUrl(config, layer);
  if (!url) return null;

  const bounds = mapBounds(mode, config.mapSize);
  return L.tileLayer(url, {
    maxNativeZoom: config.maxNativeZoom,
    noWrap: true,
    bounds: L.latLngBounds(bounds),
    attribution: XAM_TILE_ATTRIBUTION,
  }).addTo(map);
}

export function replaceXamTileLayer(
  map: L.Map,
  previous: L.TileLayer | null,
  config: ResolvedMapConfig,
  mode: MapDisplayMode,
  layer: MapTileLayer
): L.TileLayer | null {
  if (previous) {
    map.removeLayer(previous);
  }
  const next = createXamTileLayer(map, config, mode, layer);
  next?.bringToBack();
  return next;
}
