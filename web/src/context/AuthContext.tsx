import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  activateServerTokens,
  clearActiveTokens,
  clearAuth,
  getAccessToken,
  getApiBase,
  getRefreshToken,
  getServerUrl,
  getRememberMe,
  setRememberMe,
  setRememberedUsername,
  setServerUrl,
  setTokens,
  setAccessToken,
  stashCurrentServerTokens,
  clearServerUrl,
  probeServerHealth,
  type ServerHealthInfo,
} from '../auth/storage';
import { getActiveInstanceId, setActiveInstanceId, clearActiveInstanceId } from '../auth/activeInstance';
import {
  readSavedServers,
  removeSavedServer as removeSavedServerEntry,
  upsertSavedServer,
  type SavedServerEntry,
} from '../auth/savedServers';
import { normalizeServerUrl } from '../auth/serverUrl';
import { api } from '../api/client';
import { CLIENT_VERSION, CLIENT_VERSION_HEADER } from '../version';
import type { DayZInstance } from '../types';
import type { AuthUser, Permission } from '../auth/permissions';
import { PERMISSIONS } from '../auth/permissions';

interface AuthState {
  user: AuthUser | null;
  permissions: Set<Permission>;
  loading: boolean;
  needsSetup: boolean;
  connected: boolean;
  serverHealth: ServerHealthInfo | null;
  serverUrl: string;
  activeInstance: DayZInstance | null;
  instances: DayZInstance[];
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  setupOwner: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (p: Permission) => boolean;
  connectToServer: (url: string) => Promise<ServerHealthInfo>;
  switchInstance: (instanceId: string) => void;
  disconnect: () => void;
  changeServer: () => Promise<void>;
  skipConnectPageAutoConnect: boolean;
  savedServers: SavedServerEntry[];
  removeSavedServer: (url: string) => void;
  refreshInstances: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function canListInstances(perms: Set<Permission>): boolean {
  return perms.has(PERMISSIONS.INSTANCES_VIEW) || perms.has(PERMISSIONS.INSTANCES_MANAGE);
}

async function fetchSetupStatus(): Promise<boolean> {
  const res = await fetch(`${getApiBase()}/setup/status`);
  if (!res.ok) throw new Error('Cannot reach server');
  const data = (await res.json()) as { needsSetup: boolean };
  return data.needsSetup;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serverHealth, setServerHealth] = useState<ServerHealthInfo | null>(null);
  const [serverUrl, setServerUrlState] = useState(() => getServerUrl());
  const [instances, setInstances] = useState<DayZInstance[]>([]);
  const [activeInstance, setActiveInstanceState] = useState<DayZInstance | null>(null);
  const [skipConnectPageAutoConnect, setSkipConnectPageAutoConnect] = useState(false);
  const [savedServers, setSavedServers] = useState<SavedServerEntry[]>(() => readSavedServers());
  const permissionsRef = useRef(permissions);
  permissionsRef.current = permissions;

  const applySession = useCallback((authUser: AuthUser, perms: Permission[], access: string, refresh: string) => {
    setTokens(access, refresh);
    setUser(authUser);
    setPermissions(new Set(Array.isArray(perms) ? perms : []));
    setNeedsSetup(false);
  }, []);

  const loadMe = useCallback(async (): Promise<{ ok: true; permissions: Permission[] } | { ok: false }> => {
    const token = getAccessToken();
    if (!token) return { ok: false };
    let res = await fetch(`${getApiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return { ok: false };
      res = await fetch(`${getApiBase()}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
    }
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { user: AuthUser; permissions: Permission[] };
    setUser(data.user);
    setPermissions(new Set(Array.isArray(data.permissions) ? data.permissions : []));
    return { ok: true, permissions: data.permissions };
  }, []);

  const refreshInstances = useCallback(async (permsOverride?: Set<Permission>) => {
    if (!getAccessToken()) return;
    const perms = permsOverride ?? permissionsRef.current;
    if (!canListInstances(perms)) {
      setInstances([]);
      setActiveInstanceState(null);
      clearActiveInstanceId();
      return;
    }
    try {
      const data = await api.listInstances();
      setInstances(data.instances);
      const activeId = getActiveInstanceId() || data.defaultInstanceId;
      const active = data.instances.find((i) => i.id === activeId) ?? data.instances[0] ?? null;
      if (active) {
        setActiveInstanceId(active.id);
        setActiveInstanceState(active);
      }
    } catch {
      // not logged in yet or missing permission
    }
  }, []);

  const establishConnection = useCallback(async () => {
    const url = getServerUrl();
    if (!url) {
      setConnected(false);
      return;
    }

    activateServerTokens(url);

    try {
      const health = await probeServerHealth();
      setServerHealth(health);
      setConnected(true);
      setServerUrlState(url);
      setSavedServers(upsertSavedServer(url, { name: health.name }));

      const setup = await fetchSetupStatus();
      setNeedsSetup(setup);

      if (!setup) {
        const me = await loadMe();
        if (me.ok) {
          await refreshInstances(new Set(me.permissions));
        } else {
          setUser(null);
          setPermissions(new Set());
        }
      }
    } catch {
      setConnected(false);
      setServerHealth(null);
      setUser(null);
      setPermissions(new Set());
    }
  }, [loadMe, refreshInstances]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      await establishConnection();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // Bootstrap once on mount; connectToServer handles manual connections afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSavedServers = useCallback(() => {
    setSavedServers(readSavedServers());
  }, []);

  const removeSavedServer = useCallback(
    (url: string) => {
      setSavedServers(removeSavedServerEntry(url));
      if (getServerUrl() === normalizeServerUrl(url)) {
        clearActiveTokens();
        clearServerUrl();
        setServerUrlState('');
        setConnected(false);
        setServerHealth(null);
        setUser(null);
        setPermissions(new Set());
        setNeedsSetup(false);
        setInstances([]);
        setActiveInstanceState(null);
        clearActiveInstanceId(url);
      }
    },
    []
  );

  const connectToServer = useCallback(async (url: string) => {
    const normalized = normalizeServerUrl(url);
    const previous = getServerUrl();

    if (previous && previous !== normalized) {
      stashCurrentServerTokens();
      clearActiveTokens();
      clearActiveInstanceId(previous);
      setUser(null);
      setPermissions(new Set());
      setInstances([]);
      setActiveInstanceState(null);
    }

    setServerUrl(normalized);
    setServerUrlState(normalized);
    setSkipConnectPageAutoConnect(false);
    setNeedsSetup(false);
    activateServerTokens(normalized);

    try {
      const health = await probeServerHealth(`${normalized}/api`);
      setServerHealth(health);
      setConnected(true);
      setSavedServers(upsertSavedServer(normalized, { name: health.name }));

      const setup = await fetchSetupStatus();
      setNeedsSetup(setup);

      if (!setup) {
        const me = await loadMe();
        if (me.ok) await refreshInstances(new Set(me.permissions));
        else {
          setUser(null);
          setPermissions(new Set());
        }
      }

      return health;
    } catch (err) {
      setConnected(false);
      setServerHealth(null);
      throw err;
    }
  }, [loadMe, refreshInstances]);

  const switchInstance = useCallback(
    (instanceId: string) => {
      const next = instances.find((i) => i.id === instanceId);
      if (!next) return;
      setActiveInstanceId(instanceId);
      setActiveInstanceState(next);
      window.location.href = '/';
    },
    [instances]
  );

  const disconnect = useCallback(() => {
    stashCurrentServerTokens();
    clearActiveTokens();
    setConnected(false);
    setServerHealth(null);
    setUser(null);
    setPermissions(new Set());
    setNeedsSetup(false);
    setInstances([]);
    setActiveInstanceState(null);
    refreshSavedServers();
  }, [refreshSavedServers]);

  /** Return to the connect screen while keeping the saved server URL for editing. */
  const changeServer = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    setSkipConnectPageAutoConnect(true);
    disconnect();
  }, [disconnect]);

  const login = useCallback(
    async (username: string, password: string, rememberMe = getRememberMe()) => {
      setRememberMe(rememberMe);
      if (rememberMe) {
        setRememberedUsername(username);
      } else {
        setRememberedUsername('');
      }

      const res = await fetch(`${getApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Login failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
        permissions: Permission[];
      };
      applySession(data.user, data.permissions, data.accessToken, data.refreshToken);
      await refreshInstances(new Set(data.permissions));
    },
    [applySession, refreshInstances]
  );

  const setupOwner = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(`${getApiBase()}/setup/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Setup failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
        permissions: Permission[];
      };
      applySession(data.user, data.permissions, data.accessToken, data.refreshToken);
      await refreshInstances(new Set(data.permissions));
    },
    [applySession, refreshInstances]
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearAuth();
    setUser(null);
    setPermissions(new Set());
    setInstances([]);
    setActiveInstanceState(null);
    clearActiveInstanceId();
  }, []);

  const hasPermission = useCallback((p: Permission) => permissions.has(p), [permissions]);

  const value = useMemo(
    () => ({
      user,
      permissions,
      loading,
      needsSetup,
      connected,
      serverHealth,
      serverUrl,
      activeInstance,
      instances,
      login,
      setupOwner,
      logout,
      hasPermission,
      connectToServer,
      switchInstance,
      disconnect,
      changeServer,
      skipConnectPageAutoConnect,
      savedServers,
      removeSavedServer,
      refreshInstances,
    }),
    [
      user,
      permissions,
      loading,
      needsSetup,
      connected,
      serverHealth,
      serverUrl,
      activeInstance,
      instances,
      login,
      setupOwner,
      logout,
      hasPermission,
      connectToServer,
      switchInstance,
      disconnect,
      changeServer,
      skipConnectPageAutoConnect,
      savedServers,
      removeSavedServer,
      refreshInstances,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function appendInstanceToUrl(input: string): string {
  const instanceId = getActiveInstanceId();
  if (!instanceId) return input;

  let url = input.startsWith('http') ? input : `${getApiBase()}${input.replace(/^\/api/, '')}`;
  if (url.includes('/instances') && !url.includes('/players')) {
    return url;
  }
  if (url.includes('instanceId=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}instanceId=${encodeURIComponent(instanceId)}`;
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  let token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const instanceId = getActiveInstanceId();
  if (instanceId) headers.set('X-Instance-Id', instanceId);

  headers.set(CLIENT_VERSION_HEADER, CLIENT_VERSION);

  const url = appendInstanceToUrl(input);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && getRefreshToken()) {
    token = await refreshAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      res = await fetch(url, { ...init, headers });
    }
  }
  return res;
}
