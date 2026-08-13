import { normalizeServerUrl } from './serverUrl';

export interface SavedServerEntry {
  url: string;
  name?: string;
  lastUsedAt: number;
}

interface ServerTokenPair {
  accessToken: string;
  refreshToken: string;
}

const SAVED_SERVERS_KEY = 'ph_saved_servers';
const SERVER_TOKENS_KEY = 'ph_server_tokens';
const LEGACY_SERVER_URL_KEY = 'ph_server_url';

function tokenMapStorage(rememberMe: boolean): Storage {
  return rememberMe ? localStorage : sessionStorage;
}

function readJson<T>(key: string, storage: Storage, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, storage: Storage, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function migrateLegacySingleServer(): void {
  const legacy = localStorage.getItem(LEGACY_SERVER_URL_KEY);
  if (!legacy?.trim()) return;

  const url = legacy.replace(/\/$/, '');
  const servers = readJson<SavedServerEntry[]>(SAVED_SERVERS_KEY, localStorage, []);
  if (!servers.some((entry) => entry.url === url)) {
    servers.push({ url, lastUsedAt: Date.now() });
    writeSavedServers(servers);
  }
}

export function readSavedServers(): SavedServerEntry[] {
  migrateLegacySingleServer();
  const servers = readJson<SavedServerEntry[]>(SAVED_SERVERS_KEY, localStorage, []);
  return servers.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

function writeSavedServers(servers: SavedServerEntry[]): void {
  writeJson(SAVED_SERVERS_KEY, localStorage, servers);
}

export function upsertSavedServer(url: string, patch: Partial<Pick<SavedServerEntry, 'name'>> = {}): SavedServerEntry[] {
  const normalized = normalizeServerUrl(url);
  const servers = readSavedServers();
  const existing = servers.find((entry) => entry.url === normalized);

  if (existing) {
    existing.lastUsedAt = Date.now();
    if (patch.name) existing.name = patch.name;
  } else {
    servers.push({
      url: normalized,
      name: patch.name,
      lastUsedAt: Date.now(),
    });
  }

  writeSavedServers(servers);
  return readSavedServers();
}

export function removeSavedServer(url: string): SavedServerEntry[] {
  const normalized = normalizeServerUrl(url);
  writeSavedServers(readSavedServers().filter((entry) => entry.url !== normalized));
  clearStoredTokensForServer(normalized, true);
  clearStoredTokensForServer(normalized, false);
  return readSavedServers();
}

function readTokenMap(rememberMe: boolean): Record<string, ServerTokenPair> {
  return readJson<Record<string, ServerTokenPair>>(SERVER_TOKENS_KEY, tokenMapStorage(rememberMe), {});
}

function writeTokenMap(map: Record<string, ServerTokenPair>, rememberMe: boolean): void {
  writeJson(SERVER_TOKENS_KEY, tokenMapStorage(rememberMe), map);
}

export function getStoredTokensForServer(url: string, rememberMe: boolean): ServerTokenPair | null {
  const normalized = normalizeServerUrl(url);
  const map = readTokenMap(rememberMe);
  const pair = map[normalized];
  if (!pair?.accessToken || !pair.refreshToken) return null;
  return pair;
}

export function setStoredTokensForServer(
  url: string,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean
): void {
  const normalized = normalizeServerUrl(url);
  const map = readTokenMap(rememberMe);
  map[normalized] = { accessToken, refreshToken };
  writeTokenMap(map, rememberMe);
}

export function clearStoredTokensForServer(url: string, rememberMe: boolean): void {
  const normalized = normalizeServerUrl(url);
  const map = readTokenMap(rememberMe);
  if (!map[normalized]) return;
  delete map[normalized];
  writeTokenMap(map, rememberMe);
}

export function clearAllStoredTokensForServer(url: string): void {
  clearStoredTokensForServer(url, true);
  clearStoredTokensForServer(url, false);
}

export function formatServerLabel(entry: SavedServerEntry): string {
  return entry.name?.trim() || entry.url.replace(/^https?:\/\//, '');
}
