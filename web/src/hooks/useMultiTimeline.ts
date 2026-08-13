import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { PlayerEvent, TimelineFilters } from '../types';

export function useMultiTimeline(steamIds: string[], filters: TimelineFilters, pageSize = 100) {
  const [events, setEvents] = useState<PlayerEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const filtersKey = JSON.stringify(filters);
  const steamIdsKey = [...steamIds].sort().join(',');

  const loadMore = useCallback(
    async (reset = false) => {
      if (steamIds.length < 2) return;
      setLoading(true);
      setError(null);

      const offset = reset ? 0 : offsetRef.current;

      try {
        const result = await api.getMultiTimeline(steamIds, filters, pageSize, offset);
        if (reset) {
          setEvents(result.data);
          offsetRef.current = result.data.length;
        } else {
          setEvents((prev) => [...prev, ...result.data]);
          offsetRef.current += result.data.length;
        }
        setTotal(result.total);
        setHasMore(result.hasMore ?? false);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [steamIdsKey, filtersKey, pageSize]
  );

  useEffect(() => {
    offsetRef.current = 0;
    loadMore(true);
  }, [steamIdsKey, filtersKey]);

  return {
    events,
    total,
    loading,
    error,
    hasMore,
    loadMore: () => loadMore(false),
    refresh: () => loadMore(true),
  };
}
