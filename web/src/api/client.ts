import type {
  PaginatedResult,
  PlayerEvent,
  PlayerProfile,
  PlayerSummary,
  EventStatistics,
  ItemSummary,
  TimelineFilters,
  ContainerStorageEvent,
  DeathSnapshotItemRow,
  PlayerInventoryResponse,
  DeathSnapshotSummary,
  DashboardData,
  DashboardMapConfig,
  DashboardCommandRequest,
  DashboardCommand,
  AuditLogEntry,
  BanRecord,
  WatchlistEntry,
  AlertRecord,
  HeatmapMode,
  HeatmapResponse,
  ChatMessage,
  ChatTab,
  CFToolsConfigPublic,
  CFToolsPlayerProfile,
} from '../types';
import { formatApiError } from '../utils/apiErrors';
import { getApiBase } from '../auth/storage';
import { authFetch } from '../context/AuthContext';
import type { RoleName } from '../auth/permissions';
import { CLIENT_VERSION, CLIENT_VERSION_HEADER } from '../version';

function apiUrl(path: string): string {
  const base = getApiBase();
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const headers = new Headers(init?.headers);
    headers.set(CLIENT_VERSION_HEADER, CLIENT_VERSION);
    const res = await authFetch(apiUrl(url), { ...init, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    throw new Error(formatApiError(err));
  }
}

async function fetchMutate<T>(url: string, init: RequestInit): Promise<T> {
  try {
    const headers = new Headers(init.headers);
    headers.set(CLIENT_VERSION_HEADER, CLIENT_VERSION);
    const res = await authFetch(apiUrl(url), { ...init, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `API error: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    throw new Error(formatApiError(err));
  }
}

export const api = {
  listPlayers(search?: string, limit = 50, offset = 0): Promise<PaginatedResult<PlayerSummary>> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.set('search', search);
    return fetchJson(`/players?${params}`);
  },

  getPlayer(steamId: string): Promise<PlayerProfile> {
    return fetchJson(`/player/${steamId}`);
  },

  getTimeline(steamId: string, filters: TimelineFilters = {}, limit = 100, offset = 0): Promise<PaginatedResult<PlayerEvent>> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (filters.event) params.set('event', filters.event);
    if (filters.category) params.set('category', filters.category);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.search) params.set('search', filters.search);
    return fetchJson(`/timeline/${steamId}?${params}`);
  },

  getMultiTimeline(
    steamIds: string[],
    filters: TimelineFilters = {},
    limit = 100,
    offset = 0
  ): Promise<PaginatedResult<PlayerEvent>> {
    const params = new URLSearchParams({
      steamids: steamIds.join(','),
      limit: String(limit),
      offset: String(offset),
    });
    if (filters.event) params.set('event', filters.event);
    if (filters.category) params.set('category', filters.category);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.search) params.set('search', filters.search);
    return fetchJson(`/timeline?${params}`);
  },

  getStatistics(steamId: string): Promise<EventStatistics> {
    return fetchJson(`/statistics/${steamId}`);
  },

  getKillFeed(steamId: string, limit = 50): Promise<PlayerEvent[]> {
    return fetchJson(`/kills/${steamId}?limit=${limit}`);
  },

  getVehicleHistory(steamId: string, limit = 100): Promise<PlayerEvent[]> {
    return fetchJson(`/vehicles/${steamId}?limit=${limit}`);
  },

  getMapEvents(
    steamId: string,
    from?: string,
    to?: string,
    limit = 8000,
    slim = false
  ): Promise<PlayerEvent[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('slim', slim ? '1' : '0');
    return fetchJson(`/map/${steamId}?${params}`);
  },

  getHeatmap(options: {
    mode?: HeatmapMode;
    from?: string;
    to?: string;
    limit?: number;
  } = {}): Promise<HeatmapResponse> {
    const params = new URLSearchParams();
    if (options.mode) params.set('mode', options.mode);
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
    if (options.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    return fetchJson(`/map/heatmap${qs ? `?${qs}` : ''}`);
  },

  getChatMessages(options: {
    tab?: ChatTab | 'all';
    since?: string;
    limit?: number;
  } = {}): Promise<{ data: ChatMessage[]; total: number }> {
    const params = new URLSearchParams();
    if (options.tab && options.tab !== 'all') params.set('tab', options.tab);
    if (options.since) params.set('since', options.since);
    if (options.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    return fetchJson(`/chat${qs ? `?${qs}` : ''}`);
  },

  getPositionHistory(steamId: string, from?: string, to?: string): Promise<PlayerEvent[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return fetchJson(`/positions/${steamId}?${params}`);
  },

  getEventTypes(steamId?: string, steamIds?: string[]): Promise<string[]> {
    const params = new URLSearchParams();
    if (steamIds?.length) params.set('steamids', steamIds.join(','));
    else if (steamId) params.set('steamid', steamId);
    const qs = params.toString();
    return fetchJson(`/events/types${qs ? `?${qs}` : ''}`);
  },

  getCategories(steamId?: string, steamIds?: string[]): Promise<string[]> {
    const params = new URLSearchParams();
    if (steamIds?.length) params.set('steamids', steamIds.join(','));
    else if (steamId) params.set('steamid', steamId);
    const qs = params.toString();
    return fetchJson(`/events/categories${qs ? `?${qs}` : ''}`);
  },

  exportTimeline(steamId: string, format: 'json' | 'csv' = 'json', from?: string, to?: string): string {
    const params = new URLSearchParams({ format });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return apiUrl(`/export/${steamId}?${params}`);
  },

  triggerIndex(): Promise<{ filesProcessed: number; eventsIndexed: number }> {
    return fetchMutate('/index', { method: 'POST' });
  },

  deletePlayer(
    steamId: string,
    deleteFiles = true
  ): Promise<{
    steamId: string;
    eventsDeleted: number;
    playerDeleted: number;
    indexedFilesRemoved: number;
    logFilesDeleted: boolean;
  }> {
    const params = new URLSearchParams({ deleteFiles: String(deleteFiles) });
    return fetchMutate(`/player/${steamId}?${params}`, { method: 'DELETE' });
  },

  searchItems(search?: string, steamId?: string, limit = 30): Promise<ItemSummary[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('q', search);
    if (steamId) params.set('steamid', steamId);
    return fetchJson(`/items/search?${params}`);
  },

  getItemSummary(pid: string): Promise<ItemSummary> {
    return fetchJson(`/item/${encodeURIComponent(pid)}`);
  },

  getItemTimeline(pid: string, limit = 200, offset = 0): Promise<PaginatedResult<PlayerEvent>> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return fetchJson(`/item/${encodeURIComponent(pid)}/timeline?${params}`);
  },

  listPlayerItems(steamId: string, limit = 50): Promise<ItemSummary[]> {
    return fetchJson(`/items/player/${steamId}?limit=${limit}`);
  },

  getItemsAtContainer(options: {
    x: number;
    z: number;
    radius?: number;
    containerPid?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<ContainerStorageEvent>> {
    const params = new URLSearchParams({
      x: String(options.x),
      z: String(options.z),
    });
    if (options.radius != null) params.set('radius', String(options.radius));
    if (options.containerPid) params.set('containerPid', options.containerPid);
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);
    if (options.limit != null) params.set('limit', String(options.limit));
    if (options.offset != null) params.set('offset', String(options.offset));
    return fetchJson(`/items/at-container?${params}`);
  },

  getDashboard(): Promise<DashboardData> {
    return fetchJson('/dashboard');
  },

  getMapConfig(): Promise<DashboardMapConfig> {
    return fetchJson('/map/config');
  },

  getPlayerDeaths(steamId: string, includeRestored = false): Promise<DeathSnapshotSummary[]> {
    const params = new URLSearchParams();
    if (includeRestored) params.set('includeRestored', 'true');
    const qs = params.toString();
    return fetchJson(`/player/${steamId}/deaths${qs ? `?${qs}` : ''}`);
  },

  getDeathItems(steamId: string, entryId: string): Promise<DeathSnapshotItemRow[]> {
    return fetchJson(`/player/${steamId}/deaths/${encodeURIComponent(entryId)}/items`);
  },

  getPlayerInventorySnapshots(steamId: string, includeRestored = false): Promise<DeathSnapshotSummary[]> {
    const params = new URLSearchParams();
    if (includeRestored) params.set('includeRestored', 'true');
    const qs = params.toString();
    return fetchJson(`/player/${steamId}/inventory-snapshots${qs ? `?${qs}` : ''}`);
  },

  getInventorySnapshotItems(steamId: string, entryId: string): Promise<DeathSnapshotItemRow[]> {
    return fetchJson(
      `/player/${steamId}/inventory-snapshots/${encodeURIComponent(entryId)}/items`
    );
  },

  getPlayerLiveInventory(steamId: string): Promise<PlayerInventoryResponse> {
    return fetchJson(`/player/${steamId}/inventory/live`);
  },

  sendDashboardCommand(body: DashboardCommandRequest): Promise<{ ok: boolean; command?: DashboardCommand }> {
    return fetchMutate('/dashboard/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  listUsers(): Promise<
    Array<{
      id: number;
      username: string;
      role: RoleName;
      permissionGrants: string[];
      permissionDenies: string[];
    }>
  > {
    return fetchJson('/users');
  },

  getPermissionCatalog(): Promise<{ permissions: string[]; groups: Array<{ label: string; permissions: string[] }> }> {
    return fetchJson('/roles/permissions');
  },

  listRoles(): Promise<
    Array<{
      id: number;
      name: string;
      slug: string;
      permissions: string[];
      isSystem: boolean;
      userCount: number;
    }>
  > {
    return fetchJson('/roles');
  },

  createRole(body: { name: string; slug?: string; permissions: string[] }): Promise<unknown> {
    return fetchMutate('/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  updateRole(id: number, body: { name?: string; permissions?: string[] }): Promise<unknown> {
    return fetchMutate(`/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  deleteRole(id: number): Promise<{ ok: boolean }> {
    return fetchMutate(`/roles/${id}`, { method: 'DELETE' });
  },

  createUser(body: {
    username: string;
    password: string;
    role: RoleName;
    permissionGrants?: string[];
    permissionDenies?: string[];
  }): Promise<unknown> {
    return fetchMutate('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  updateUser(
    id: number,
    body: {
      password?: string;
      role?: RoleName;
      permissionGrants?: string[];
      permissionDenies?: string[];
    }
  ): Promise<unknown> {
    return fetchMutate(`/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  deleteUser(id: number): Promise<{ ok: boolean }> {
    return fetchMutate(`/users/${id}`, { method: 'DELETE' });
  },

  getHealth(): Promise<{ status: string; serverJsonAgeMs: number | null }> {
    return fetchJson('/health');
  },

  listAuditLog(params: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: number;
    targetSteamId?: string;
    from?: string;
    to?: string;
  } = {}): Promise<{ data: AuditLogEntry[]; total: number; actions: string[] }> {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    if (params.action) qs.set('action', params.action);
    if (params.userId != null) qs.set('userId', String(params.userId));
    if (params.targetSteamId) qs.set('targetSteamId', params.targetSteamId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const q = qs.toString();
    return fetchJson(`/audit${q ? `?${q}` : ''}`);
  },

  listBans(): Promise<BanRecord[]> {
    return fetchJson('/bans');
  },

  createBan(body: { steamId: string; reason?: string; banDurationMinutes?: number }): Promise<BanRecord> {
    return fetchMutate('/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  removeBan(steamId: string): Promise<{ ok: boolean }> {
    return fetchMutate(`/bans/${encodeURIComponent(steamId)}`, { method: 'DELETE' });
  },

  listWatchlist(): Promise<WatchlistEntry[]> {
    return fetchJson('/watchlist');
  },

  addWatchlistEntry(body: {
    steamId: string;
    scope: 'global' | 'personal';
    note?: string;
    alertOnJoin?: boolean;
    alertOnLeave?: boolean;
    alertOnDeath?: boolean;
    alertOnKill?: boolean;
    alertOnBan?: boolean;
  }): Promise<WatchlistEntry> {
    return fetchMutate('/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  updateWatchlistEntry(
    id: number,
    body: {
      note?: string;
      alertOnJoin?: boolean;
      alertOnLeave?: boolean;
      alertOnDeath?: boolean;
      alertOnKill?: boolean;
      alertOnBan?: boolean;
    }
  ): Promise<WatchlistEntry> {
    return fetchMutate(`/watchlist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  deleteWatchlistEntry(id: number): Promise<{ ok: boolean }> {
    return fetchMutate(`/watchlist/${id}`, { method: 'DELETE' });
  },

  listAlerts(params: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<{
    data: AlertRecord[];
    total: number;
    unreadCount: number;
  }> {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    if (params.unreadOnly) qs.set('unreadOnly', 'true');
    const q = qs.toString();
    return fetchJson(`/alerts${q ? `?${q}` : ''}`);
  },

  markAlertRead(id: number): Promise<{ ok: boolean; unreadCount: number }> {
    return fetchMutate(`/alerts/${id}/read`, { method: 'POST' });
  },

  markAllAlertsRead(): Promise<{ ok: boolean; marked: number; unreadCount: number }> {
    return fetchMutate('/alerts/read-all', { method: 'POST' });
  },

  getCFToolsConfig(): Promise<CFToolsConfigPublic> {
    return fetchJson('/integrations/cftools/config');
  },

  saveCFToolsConfig(body: {
    enabled: boolean;
    applicationId: string;
    applicationSecret?: string;
    serverApiId: string;
    banlistId: string;
  }): Promise<CFToolsConfigPublic> {
    return fetchMutate('/integrations/cftools/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  testCFToolsConnection(): Promise<{
    ok: boolean;
    serverName?: string;
    grantCount?: number;
    onlineSessionCount?: number;
    error?: string;
  }> {
    return fetchMutate('/integrations/cftools/test', { method: 'POST' });
  },

  getCFToolsPlayer(steamId: string): Promise<CFToolsPlayerProfile> {
    return fetchJson(`/integrations/cftools/player/${encodeURIComponent(steamId)}`);
  },

  listInstances(): Promise<{ instances: import('../types').DayZInstance[]; defaultInstanceId: string }> {
    return fetchJson('/instances');
  },

  createInstance(body: { name: string; playerHistoryPath: string }): Promise<import('../types').DayZInstance> {
    return fetchMutate('/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  updateInstance(id: string, body: { name?: string; playerHistoryPath?: string }): Promise<import('../types').DayZInstance> {
    return fetchMutate(`/instances/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  deleteInstance(id: string): Promise<{ ok: boolean; instanceId: string }> {
    return fetchMutate(`/instances/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  getQueryFields(): Promise<{ fields: import('../types/query').QueryFieldDefinition[]; presets: import('../types/query').QueryPreset[] }> {
    return fetchJson('/query/fields');
  },

  runQuery(body: import('../types/query').EventQueryRequest): Promise<import('../types/query').EventQueryResult> {
    return fetchMutate('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  exportQueryCsv(body: import('../types/query').EventQueryRequest): Promise<Blob> {
    return authFetch(apiUrl('/query/export'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    });
  },

  listSavedQueries(): Promise<{ queries: import('../types/query').SavedQueryRecord[] }> {
    return fetchJson('/query/saved');
  },

  createSavedQuery(body: {
    name: string;
    description?: string;
    query: import('../types/query').EventQueryRequest;
    isWatch?: boolean;
  }): Promise<import('../types/query').SavedQueryRecord> {
    return fetchMutate('/query/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  updateSavedQuery(
    id: number,
    body: Partial<{ name: string; description: string; query: import('../types/query').EventQueryRequest; isWatch: boolean }>
  ): Promise<import('../types/query').SavedQueryRecord> {
    return fetchMutate(`/query/saved/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  deleteSavedQuery(id: number): Promise<{ ok: boolean }> {
    return fetchMutate(`/query/saved/${id}`, { method: 'DELETE' });
  },

  listQueryWatchAlerts(unreadOnly = false): Promise<{ alerts: import('../types/query').QueryWatchAlert[] }> {
    return fetchJson(`/query/watch-alerts${unreadOnly ? '?unread=true' : ''}`);
  },

  markQueryWatchAlertRead(id: number): Promise<{ ok: boolean }> {
    return fetchMutate(`/query/watch-alerts/${id}/read`, { method: 'POST' });
  },

  markAllQueryWatchAlertsRead(): Promise<{ ok: boolean }> {
    return fetchMutate('/query/watch-alerts/read-all', { method: 'POST' });
  },
};
