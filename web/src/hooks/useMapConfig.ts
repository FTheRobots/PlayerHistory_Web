import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { defaultMapConfig, resolveMapConfig, type ResolvedMapConfig } from '../config/mapConfig';
import type { DashboardMapConfig } from '../types';

let cachedMapConfig: ResolvedMapConfig | null = null;

export function setCachedMapConfig(config: ResolvedMapConfig): void {
  cachedMapConfig = config;
}

export function clearCachedMapConfig(): void {
  cachedMapConfig = null;
}

export function getCachedMapConfig(): ResolvedMapConfig {
  return cachedMapConfig ?? defaultMapConfig();
}

/** Resolve map tiles/size from dashboard data or GET /map/config. */
export function useMapConfig(serverMap?: DashboardMapConfig | null): ResolvedMapConfig {
  const [config, setConfig] = useState<ResolvedMapConfig>(() => {
    if (serverMap) return resolveMapConfig(serverMap);
    return cachedMapConfig ?? defaultMapConfig();
  });

  useEffect(() => {
    if (serverMap) {
      const resolved = resolveMapConfig(serverMap);
      cachedMapConfig = resolved;
      setConfig(resolved);
      return;
    }

    if (cachedMapConfig) {
      setConfig(cachedMapConfig);
      return;
    }

    let cancelled = false;
    void api.getMapConfig().then((remote) => {
      if (cancelled) return;
      const resolved = resolveMapConfig(remote);
      cachedMapConfig = resolved;
      setConfig(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [serverMap?.id, serverMap?.mapSize, serverMap?.tileUrl, serverMap?.tileUrlSatellite]);

  return config;
}
