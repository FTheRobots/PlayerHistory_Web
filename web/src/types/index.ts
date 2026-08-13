export interface PlayerEvent {
  timestamp: string;
  steamid: string;
  playerName?: string;
  sessionId?: string;
  event: string;
  category?: string;
  position?: [number, number, number];
  orientation?: number;
  metadata?: Record<string, string>;
}

export interface PlayerSummary {
  steamId: string;
  characterName?: string;
  firstSeen?: string;
  lastSeen?: string;
  totalEvents: number;
  isOnline?: boolean;
}

export interface DayZInstance {
  id: string;
  name: string;
  playerHistoryPath: string;
  createdAt: string;
}

export interface PlayerProfile {
  steamId: string;
  characterName?: string;
  firstSeen?: string;
  lastSeen?: string;
  totalSessions?: number;
  isOnline?: boolean;
  ipAddress?: string;
  sessionJoinTime?: string;
}

export interface OnlinePlayerDetail {
  steamId: string;
  characterName?: string;
  ipAddress?: string;
  country?: string;
  sessionJoinTime?: string;
  timeOnline?: string;
  position?: [number, number, number];
  lastAction?: string;
  lastActionTime?: string;
  lastActionCategory?: string;
  lastActionItemPid?: string;
  lastActionItemName?: string;
  totalEvents?: number;
  totalSessions?: number;
  firstSeen?: string;
  lastSeen?: string;
  isOnline?: boolean;
  cftoolsId?: string;
  cftoolsBan?: {
    banId: string;
    reason: string;
    expiresAt?: string | null;
    status: string;
  };
}

export interface DashboardCFToolsStatus {
  enabled: boolean;
  configured: boolean;
}

export interface DashboardServerStats {
  timestamp: string;
  serverFps?: number;
  playerCount: number;
  zombieCount?: number;
  animalCount?: number;
  aiCount?: number;
  totalPlayers: number;
  eventsLastHour: number;
  eventsLast24h: number;
  snapshotAvailable: boolean;
  /** When false, snapshot timestamp is older than the mod write interval allows. */
  live?: boolean;
  worldName?: string;
  worldSize?: number;
}

export interface DashboardMapConfig {
  id: string;
  displayName: string;
  mapSize: number;
  tileUrl: string;
  tileUrlSatellite?: string;
  /** dayz.xam.nu path segment (e.g. namalsk, livonia; empty for Chernarus root) */
  xamMapSlug: string;
  maxNativeZoom: number;
  imageUrl?: string;
}

export interface DashboardData {
  server: DashboardServerStats;
  onlinePlayers: OnlinePlayerDetail[];
  map: DashboardMapConfig;
  cftools?: DashboardCFToolsStatus;
}

export interface CFToolsConfigPublic {
  enabled: boolean;
  applicationId: string;
  serverApiId: string;
  banlistId: string;
  hasSecret: boolean;
  updatedAt: string | null;
}

export interface CFToolsBanEntry {
  id: string;
  reason: string;
  created?: string;
  expiration?: string | null;
  status?: string;
  banlistId?: string;
  banlistName?: string;
}

export interface CFToolsPlayerProfile {
  configured: boolean;
  steamId: string;
  lookup: {
    cftoolsId?: string;
    steamId?: string;
    battleyeGuid?: string;
    bohemiaUid?: string;
    ipAddress?: string;
    country?: string;
    raw?: unknown;
  } | null;
  stats: Record<string, unknown> | null;
  bans: CFToolsBanEntry[];
  activeBan: {
    banId: string;
    reason: string;
    expiresAt?: string | null;
    status: string;
    banlistId?: string;
    banlistName?: string;
    banlistCount?: number;
  } | null;
  whitelist: Record<string, unknown> | null;
  queuePriority: Record<string, unknown> | null;
  error?: string;
}

export type HeatmapMode = 'all' | 'deaths' | 'combat' | 'activity';

export interface HeatmapPoint {
  x: number;
  z: number;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  total: number;
  truncated: boolean;
  mode: HeatmapMode;
  from?: string;
  to?: string;
}

export type DashboardCommandType =
  | 'heal'
  | 'kill'
  | 'teleport'
  | 'spawn'
  | 'restoredeath'
  | 'deletedeath'
  | 'restoreinventory'
  | 'deleteinventory'
  | 'captureinventory'
  | 'deleteitem'
  | 'kick'
  | 'ban'
  | 'message';

export interface DashboardCommandRequest {
  type: DashboardCommandType;
  steamId: string;
  classname?: string;
  deathEntryId?: string;
  itemPid?: string;
  message?: string;
  banDurationMinutes?: number;
  x?: number;
  y?: number;
  z?: number;
  quantity?: number;
  forceRestore?: boolean;
}

export interface DashboardCommand extends DashboardCommandRequest {
  id: string;
  createdAt: string;
  queuedForLogin?: boolean;
}

export interface DeathSnapshotSummary {
  entryId: string;
  ownerSteam64: string;
  ownerName?: string;
  deathTimeText?: string;
  deathPosition?: [number, number, number];
  wasRestored: boolean;
  rootItemCount: number;
}

export interface DeathSnapshotItemRow {
  itemTypeName: string;
  depth: number;
  itemPid?: string;
  inHands?: boolean;
  quantity?: number;
  ammoCount?: number;
}

export interface PendingDeletionEntry {
  itemPid: string;
  queuedAt: string;
}

export interface PlayerInventoryResponse {
  source: 'live' | 'snapshot' | 'none';
  steamId: string;
  capturedAt?: string;
  snapshotEntryId?: string;
  rootItemCount: number;
  items: DeathSnapshotItemRow[];
  pendingDeletions?: PendingDeletionEntry[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface EventStatistics {
  steamId: string;
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByType: Record<string, number>;
  firstEvent?: string;
  lastEvent?: string;
  deathCount: number;
  killCount: number;
  sessionCount: number;
  animalKillCounts: Record<string, number>;
  killCounts?: Record<string, number>;
}

export interface ItemSummary {
  pid: string;
  name?: string;
  classname?: string;
  eventCount: number;
  firstSeen?: string;
  lastSeen?: string;
  lastPlayerSteamId?: string;
  lastPlayerName?: string;
}

export type ContainerStorageDirection = 'into' | 'out_of';

export interface ContainerStorageEvent {
  direction: ContainerStorageDirection;
  containerPid?: string;
  containerPosition: [number, number, number];
  containerClass?: string;
  event: PlayerEvent;
}

export interface TimelineFilters {
  event?: string;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface AuditLogEntry {
  id: number;
  createdAt: string;
  userId: number | null;
  username: string | null;
  action: string;
  targetSteamId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

export interface BanRecord {
  steamId: string;
  reason: string;
  bannedAt: string;
  expiresAt: string;
  isPermanent: boolean;
  isExpired: boolean;
  characterName?: string;
}

export type WatchlistScope = 'global' | 'personal';

export interface WatchlistEntry {
  id: number;
  steamId: string;
  scope: WatchlistScope;
  userId: number | null;
  note: string;
  alertOnJoin: boolean;
  alertOnLeave: boolean;
  alertOnDeath: boolean;
  alertOnKill: boolean;
  alertOnBan: boolean;
  createdAt: string;
  createdByUserId: number | null;
  createdByUsername: string | null;
  characterName?: string;
  isOnline?: boolean;
}

export type AlertEventType = 'join' | 'leave' | 'death' | 'kill' | 'ban';

export interface AlertRecord {
  id: number;
  createdAt: string;
  watchlistEntryId: number | null;
  steamId: string;
  playerName: string | null;
  eventType: AlertEventType;
  message: string;
  scope: WatchlistScope;
  userId: number | null;
  read: boolean;
}

export type ChatTab = 'global' | 'team' | 'admin' | 'transport';

/** UI filter — includes combined view across all channels. */
export type ChatFeedTab = ChatTab | 'all';

export interface ChatMessage {
  timestamp: string;
  steamId: string;
  playerName?: string;
  message: string;
  chatTab: ChatTab;
  chatChannel?: string;
  chatSource?: string;
  groupTag?: string;
}
