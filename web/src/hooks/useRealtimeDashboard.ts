import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { getAccessToken } from '../auth/storage';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import type { DashboardData } from '../types';
import { sharedWsHub } from './sharedWsHub';
import { clearCachedMapConfig, setCachedMapConfig } from './useMapConfig';
import { resolveMapConfig } from '../config/mapConfig';
import { isServerOnline } from '../utils/serverOnline';
import { usePageVisible } from './usePageVisible';

export { isServerOnline } from '../utils/serverOnline';

const POLL_MS = 5000;

function dashboardFingerprint(data: DashboardData): string {
  const s = data.server;
  const players = (data.onlinePlayers ?? [])
    .map(
      (p) =>
        `${p.steamId}:${p.position?.[0] ?? ''}:${p.position?.[2] ?? ''}:${p.lastActionTime ?? ''}:${p.lastAction ?? ''}`
    )
    .join('|');
  return `${s?.timestamp ?? ''}|${s?.live}|${s?.playerCount ?? ''}|${s?.serverFps ?? ''}|${players}`;
}

export function useRealtimeDashboard() {
  const { hasPermission, user, activeInstance } = useAuth();
  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD_VIEW);
  const pageVisible = usePageVisible();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const pollRef = useRef<number | null>(null);
  const fingerprintRef = useRef<string>('');

  const applyDashboard = useCallback((dashboard: DashboardData) => {
    if (!dashboard?.server || !Array.isArray(dashboard.onlinePlayers)) return;
    const next = dashboardFingerprint(dashboard);
    if (next === fingerprintRef.current) return;
    fingerprintRef.current = next;
    setData(dashboard);
    if (dashboard.map) {
      setCachedMapConfig(resolveMapConfig(dashboard.map));
    }
  }, []);

  const load = useCallback(async () => {
    if (!canViewDashboard) {
      setLoading(false);
      return;
    }
    try {
      const dashboard = await api.getDashboard();
      applyDashboard(dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Server connection lost... attempting to reconnect');
    } finally {
      setLoading(false);
    }
  }, [canViewDashboard, applyDashboard]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    if (!pageVisible) return;
    pollRef.current = window.setInterval(() => void load(), POLL_MS);
  }, [load, pageVisible]);

  useEffect(() => {
    if (!pageVisible) {
      stopPolling();
      return;
    }
    if (!wsConnected && canViewDashboard && user) {
      startPolling();
    }
  }, [pageVisible, wsConnected, canViewDashboard, user, startPolling, stopPolling]);

  useEffect(() => {
    if (!canViewDashboard || !user) return;

    setData(null);
    setLoading(true);
    fingerprintRef.current = '';
    clearCachedMapConfig();

    const token = getAccessToken();
    if (!token) return;

    void load();
    sharedWsHub.acquire(token, activeInstance?.id);
    sharedWsHub.subscribe('dashboard');

    const removeMessage = sharedWsHub.onMessage((msg) => {
      if (msg.type === 'update' && msg.channel === 'dashboard' && msg.data) {
        applyDashboard(msg.data as DashboardData);
        setError(null);
      }
    });

    const removeConnect = sharedWsHub.onConnect(() => {
      setWsConnected(true);
      stopPolling();
    });

    const removeDisconnect = sharedWsHub.onDisconnect(() => {
      setWsConnected(false);
      startPolling();
    });

    setWsConnected(sharedWsHub.isConnected());
    if (!sharedWsHub.isConnected()) {
      startPolling();
    }

    return () => {
      sharedWsHub.unsubscribe('dashboard');
      removeMessage();
      removeConnect();
      removeDisconnect();
      sharedWsHub.release();
      stopPolling();
    };
  }, [canViewDashboard, user?.id, activeInstance?.id, load, applyDashboard, startPolling, stopPolling]);

  const online = isServerOnline(data);
  const live = online && !error;

  return {
    data,
    loading,
    error,
    reload: load,
    online,
    live,
    wsConnected,
  };
}
