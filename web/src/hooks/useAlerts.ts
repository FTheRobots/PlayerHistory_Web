import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { getAccessToken } from '../auth/storage';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import type { AlertRecord } from '../types';
import type { QueryWatchAlert } from '../types/query';
import { sharedWsHub } from './sharedWsHub';

export type BellAlert =
  | {
      kind: 'watchlist';
      id: number;
      createdAt: string;
      eventType: string;
      message: string;
      read: boolean;
    }
  | {
      kind: 'query';
      id: number;
      createdAt: string;
      message: string;
      read: boolean;
    };

function toWatchlistBell(alert: AlertRecord): BellAlert {
  return {
    kind: 'watchlist',
    id: alert.id,
    createdAt: alert.createdAt,
    eventType: alert.eventType,
    message: alert.message,
    read: alert.read,
  };
}

function toQueryBell(alert: QueryWatchAlert): BellAlert {
  return {
    kind: 'query',
    id: alert.id,
    createdAt: alert.createdAt,
    message: alert.message,
    read: alert.read,
  };
}

export function useAlerts() {
  const { hasPermission, user } = useAuth();
  const watchlistEnabled = hasPermission(PERMISSIONS.WATCHLIST_VIEW);
  const queryWatchEnabled = hasPermission(PERMISSIONS.QUERY_MANAGE);
  const enabled = watchlistEnabled || queryWatchEnabled;

  const [watchlistAlerts, setWatchlistAlerts] = useState<AlertRecord[]>([]);
  const [queryAlerts, setQueryAlerts] = useState<QueryWatchAlert[]>([]);
  const [latestToast, setLatestToast] = useState<BellAlert | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;

    const tasks: Promise<void>[] = [];

    if (watchlistEnabled) {
      tasks.push(
        api.listAlerts({ limit: 30 }).then((result) => {
          setWatchlistAlerts(result.data);
        })
      );
    } else {
      setWatchlistAlerts([]);
    }

    if (queryWatchEnabled) {
      tasks.push(
        api.listQueryWatchAlerts().then((result) => {
          setQueryAlerts(result.alerts);
        })
      );
    } else {
      setQueryAlerts([]);
    }

    try {
      await Promise.all(tasks);
    } catch {
      // ignore — dashboard may be offline
    }
  }, [enabled, watchlistEnabled, queryWatchEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!watchlistEnabled || !user) return;

    const token = getAccessToken();
    if (!token) return;

    sharedWsHub.acquire(token);
    sharedWsHub.subscribe('alerts');

    const removeMessage = sharedWsHub.onMessage((msg) => {
      if (msg.type === 'alert' && msg.data) {
        const alert = msg.data as AlertRecord;
        setLatestToast(toWatchlistBell(alert));
        setWatchlistAlerts((prev) => [alert, ...prev].slice(0, 50));
      }
    });

    return () => {
      sharedWsHub.unsubscribe('alerts');
      removeMessage();
      sharedWsHub.release();
    };
  }, [watchlistEnabled, user?.id]);

  useEffect(() => {
    if (!enabled || !user) return;
    const poll = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(poll);
  }, [enabled, user?.id, load]);

  const alerts = useMemo(() => {
    const merged = [
      ...watchlistAlerts.map(toWatchlistBell),
      ...queryAlerts.map(toQueryBell),
    ];
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return merged.slice(0, 50);
  }, [watchlistAlerts, queryAlerts]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const markRead = useCallback(
    async (alert: BellAlert) => {
      if (alert.kind === 'watchlist') {
        await api.markAlertRead(alert.id);
        setWatchlistAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a)));
        return;
      }

      await api.markQueryWatchAlertRead(alert.id);
      setQueryAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, read: true } : a)));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const tasks: Promise<unknown>[] = [];
    if (watchlistEnabled) tasks.push(api.markAllAlertsRead());
    if (queryWatchEnabled) tasks.push(api.markAllQueryWatchAlertsRead());
    await Promise.all(tasks);
    setWatchlistAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setQueryAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, [watchlistEnabled, queryWatchEnabled]);

  const dismissToast = useCallback(() => setLatestToast(null), []);

  return {
    enabled,
    watchlistEnabled,
    queryWatchEnabled,
    alerts,
    unreadCount,
    latestToast,
    markRead,
    markAllRead,
    dismissToast,
    reload: load,
  };
}
