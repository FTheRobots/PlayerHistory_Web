import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { timeWindowMs, type TimeWindowId } from '../config/mapConfig';
import type { HeatmapMode, HeatmapResponse } from '../types';

const DEFAULT_WINDOW: TimeWindowId = '1h';

export function useHeatmap(enabled: boolean, mode: HeatmapMode, windowId: TimeWindowId = DEFAULT_WINDOW) {
  const { activeInstance } = useAuth();
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setError(null);
      return;
    }

    const ms = timeWindowMs(windowId) ?? 60 * 60 * 1000;
    const from = new Date(Date.now() - ms).toISOString();

    setLoading(true);
    try {
      const response = await api.getHeatmap({ mode, from });
      setData(response);
      setError(null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [enabled, mode, windowId, activeInstance?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
