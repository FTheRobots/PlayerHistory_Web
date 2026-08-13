import { useEffect, type RefObject } from 'react';
import type L from 'leaflet';
import type { MapDisplayMode, ResolvedMapConfig } from '../config/mapConfig';
import { replaceXamTileLayer, resolveTileUrl, type MapTileLayer } from '../utils/mapTileLayer';

/** Swap xam.nu topographic/satellite tiles when the user toggles layer preference. */
export function useSyncMapTileLayer(
  mapRef: RefObject<L.Map | null>,
  tileLayerRef: RefObject<L.TileLayer | null>,
  config: ResolvedMapConfig,
  mode: MapDisplayMode,
  layer: MapTileLayer,
  mapReadyKey: string
): void {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'tiles') return;

    const url = resolveTileUrl(config, layer);
    if (!url) return;

    const current = tileLayerRef.current;
    const currentUrl = current && '_url' in current ? String((current as L.TileLayer & { _url: string })._url) : '';
    if (currentUrl === url) return;

    tileLayerRef.current = replaceXamTileLayer(map, current, config, mode, layer);
  }, [mapRef, tileLayerRef, config, mode, layer, mapReadyKey]);
}
