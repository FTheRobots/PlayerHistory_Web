import { useCallback, useState } from 'react';
import {
  readStoredMapTileLayer,
  writeStoredMapTileLayer,
  type MapTileLayer,
} from '../utils/mapTileLayer';

export function useMapTileLayer() {
  const [layer, setLayerState] = useState<MapTileLayer>(readStoredMapTileLayer);

  const setLayer = useCallback((next: MapTileLayer) => {
    setLayerState(next);
    writeStoredMapTileLayer(next);
  }, []);

  return { layer, setLayer };
}
