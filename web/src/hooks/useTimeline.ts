import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { PlayerEvent, TimelineFilters } from '../types';
import { usePageVisible } from './usePageVisible';

export function useTimeline(steamId: string, filters: TimelineFilters, pageSize = 100, refreshIntervalMs = 10000) {
  const [events, setEvents] = useState<PlayerEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const filtersKey = JSON.stringify(filters);
  const pageVisible = usePageVisible();

  const loadMore = useCallback(async (reset = false, soft = false) => {
    if (!steamId) return;
    if (!soft) setLoading(true);
    setError(null);

    const offset = reset ? 0 : offsetRef.current;

    try {
      const result = await api.getTimeline(steamId, filters, pageSize, offset);
      if (reset && soft && offset === 0) {
        setEvents((prev) => {
          const rest = prev.slice(result.data.length);
          const headIds = new Set(
            result.data.map((e) => `${e.timestamp}|${e.event}|${e.steamid}`)
          );
          const filteredRest = rest.filter(
            (e) => !headIds.has(`${e.timestamp}|${e.event}|${e.steamid}`)
          );
          return [...result.data, ...filteredRest];
        });
        offsetRef.current = Math.max(offsetRef.current, result.data.length);
      } else if (reset) {
        setEvents(result.data);
        offsetRef.current = result.data.length;
      } else {
        setEvents((prev) => [...prev, ...result.data]);
        offsetRef.current += result.data.length;
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(String(err));
    } finally {
      if (!soft) setLoading(false);
    }
  }, [steamId, filtersKey, pageSize]);

  useEffect(() => {
    offsetRef.current = 0;
    void loadMore(true);
  }, [steamId, filtersKey]);

  useEffect(() => {
    if (!refreshIntervalMs || !steamId || !pageVisible) return;
    const id = window.setInterval(() => {
      void loadMore(true, true);
    }, refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [steamId, filtersKey, refreshIntervalMs, loadMore, pageVisible]);

  return { events, total, loading, error, hasMore, loadMore: () => loadMore(false), refresh: () => loadMore(true) };
}
