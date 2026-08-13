import { normalizeServerUrl } from './serverUrl';
import {
  clearAllStoredTokensForServer,
  getStoredTokensForServer,
  migrateLegacySingleServer,
  setStoredTokensForServer,
} from './savedServers';
import { CLIENT_VERSION, CLIENT_VERSION_HEADER } from '../version';

export { normalizeServerUrl };

const SERVER_URL_KEY = 'ph_server_url';
const ACCESS_TOKEN_KEY = 'ph_access_token';
const REFRESH_TOKEN_KEY = 'ph_refresh_token';
const REMEMBER_ME_KEY = 'ph_remember_me';
const REMEMBER_USERNAME_KEY = 'ph_remember_username';

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
}

export function setRememberMe(remember: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
  if (!remember) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    const access = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export function getRememberedUsername(): string {
  return localStorage.getItem(REMEMBER_USERNAME_KEY) ?? '';
}

export function setRememberedUsername(username: string): void {
  if (username.trim()) {
    localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
  } else {
    localStorage.removeItem(REMEMBER_USERNAME_KEY);
  }
}

function tokenStorage(): Storage {
  return getRememberMe() ? localStorage : sessionStorage;
}

export function getServerUrl(): string {
  migrateLegacySingleServer();
  const stored = localStorage.getItem(SERVER_URL_KEY);
  if (stored) return stored.replace(/\/$/, '');
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (env) return env.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return '';
}

export function setServerUrl(url: string): void {
  localStorage.setItem(SERVER_URL_KEY, normalizeServerUrl(url));
}

export function clearServerUrl(): void {
  localStorage.removeItem(SERVER_URL_KEY);
}

export function getApiBase(): string {
  const server = getServerUrl();
  if (server) return `${server}/api`;
  return import.meta.env.VITE_API_BASE_URL ?? '/api';
}

export function getWsUrl(): string {
  const wsEnv = import.meta.env.VITE_API_WS_URL as string | undefined;
  if (wsEnv) return wsEnv.replace(/\/$/, '');

  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envBase?.startsWith('http')) {
    const root = envBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${root.replace(/^http/, 'ws')}/api/ws`;
  }

  const server = getServerUrl();
  if (server) {
    return `${server.replace(/^http/, 'ws')}/api/ws`;
  }

  if (import.meta.env.DEV) {
    return 'ws://127.0.0.1:3847/api/ws';
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/ws`;
}

export function getAccessToken(): string | null {
  return tokenStorage().getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return tokenStorage().getItem(REFRESH_TOKEN_KEY) ?? localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  const store = tokenStorage();
  store.setItem(ACCESS_TOKEN_KEY, accessToken);
  store.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (store === sessionStorage) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  const serverUrl = getServerUrl();
  if (serverUrl) {
    setStoredTokensForServer(serverUrl, accessToken, refreshToken, getRememberMe());
  }
}

export function stashCurrentServerTokens(): void {
  const serverUrl = getServerUrl();
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!serverUrl || !accessToken || !refreshToken) return;
  setStoredTokensForServer(serverUrl, accessToken, refreshToken, getRememberMe());
}

export function activateServerTokens(serverUrl: string): boolean {
  clearTokens();
  const rememberMe = getRememberMe();
  let pair = getStoredTokensForServer(serverUrl, rememberMe);
  if (!pair && rememberMe) {
    pair = getStoredTokensForServer(serverUrl, false);
  }
  if (!pair && !rememberMe) {
    pair = getStoredTokensForServer(serverUrl, true);
  }
  if (!pair) return false;
  setTokens(pair.accessToken, pair.refreshToken);
  return true;
}

export function setAccessToken(accessToken: string): void {
  tokenStorage().setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Drop the active session tokens only (keeps per-server saved tokens for switching). */
export function clearActiveTokens(): void {
  clearTokens();
}

export function clearAuth(): void {
  const serverUrl = getServerUrl();
  clearTokens();
  if (serverUrl) {
    clearAllStoredTokensForServer(serverUrl);
  }
}

export interface ServerHealthInfo {
  status: string;
  name?: string;
  version?: string;
  codename?: string;
  apiVersion?: number;
  minClientVersion?: string;
  publicBaseUrl?: string;
  apiBaseUrl?: string;
  websocketUrl?: string;
  needsAuth?: boolean;
}

export async function probeServerHealth(apiBase?: string): Promise<ServerHealthInfo> {
  const base = (apiBase ?? getApiBase()).replace(/\/$/, '');
  const url = `${base}/health`;
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { [CLIENT_VERSION_HEADER]: CLIENT_VERSION },
  });
  if (!res.ok) {
    throw new Error(`Server returned ${res.status} (${url})`);
  }
  return (await res.json()) as ServerHealthInfo;
}
