import { useCallback, useState } from 'react';
import {
  readStoredMapSignalMode,
  writeStoredMapSignalMode,
  type MapSignalMode,
} from '../config/mapReplayConfig';

export function useMapSignalMode() {
  const [signalMode, setSignalModeState] = useState(readStoredMapSignalMode);

  const setSignalMode = useCallback((mode: MapSignalMode) => {
    setSignalModeState(mode);
    writeStoredMapSignalMode(mode);
  }, []);

  return { signalMode, setSignalMode };
}
