/** DayZ map config — defaults from env, overridden at runtime by server-reported world */

export interface ResolvedMapConfig {
  id: string;
  displayName: string;
  mapSize: number;
  tileUrl: string;
  tileUrlSatellite: string;
  /** dayz.xam.nu path segment (e.g. namalsk, livonia; empty for Chernarus root) */
  xamMapSlug: string;
  maxNativeZoom: number;
  imageUrl: string;
}

export type MapDisplayMode = 'tiles' | 'image' | 'grid';

/** Chernarus uses the site root; other maps use /{slug}. */
export function xamMapBaseUrl(slug?: string): string {
  const normalized = (slug ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'chernarusplus' || normalized === 'chernarus') {
    return 'https://dayz.xam.nu/';
  }
  return `https://dayz.xam.nu/${normalized}`;
}

export function extractXamMapSlugFromTileUrl(tileUrl?: string): string | undefined {
  if (!tileUrl) return undefined;
  const match = tileUrl.match(/\/dayz\/maps\/([^/]+)\//i);
  return match?.[1];
}

export function resolveXamMapSlug(config: {
  xamMapSlug?: string;
  tileSlug?: string;
  tileUrl?: string;
  id?: string;
}): string {
  if (config.xamMapSlug != null && config.xamMapSlug !== '') {
    return config.xamMapSlug;
  }
  if (config.tileSlug) return config.tileSlug;
  const fromTiles = extractXamMapSlugFromTileUrl(config.tileUrl);
  if (fromTiles) return fromTiles;
  if (config.id === 'enoch') return 'livonia';
  return config.id ?? 'chernarusplus';
}

export function defaultMapConfig(): ResolvedMapConfig {
  const id = import.meta.env.VITE_MAP_NAME || 'chernarusplus';
  const tileUrl = import.meta.env.VITE_MAP_TILES || '';
  return {
    id,
    displayName: 'Chernarus Plus',
    mapSize: Number(import.meta.env.VITE_MAP_SIZE || 15360),
    tileUrl,
    tileUrlSatellite: import.meta.env.VITE_MAP_TILES_SATELLITE || '',
    xamMapSlug: resolveXamMapSlug({ tileUrl, id }),
    maxNativeZoom: Number(import.meta.env.VITE_MAP_MAX_ZOOM || 7),
    imageUrl: import.meta.env.VITE_MAP_IMAGE || '',
  };
}

type ServerMapInput = Partial<ResolvedMapConfig> & {
  tileSlug?: string;
  /** @deprecated legacy API field — use xamMapSlug */
  izurviveSlug?: string;
};

/** Merge server-reported map with env fallbacks (static image when tiles unavailable). */
export function resolveMapConfig(server?: ServerMapInput | null): ResolvedMapConfig {
  const env = defaultMapConfig();
  if (!server?.id) return env;

  const tileUrl =
    server.tileUrl ||
    (env.tileUrl && (!server.id || env.id === server.id) ? env.tileUrl : '');
  const tileUrlSatellite =
    server.tileUrlSatellite ||
    (env.tileUrlSatellite && (!server.id || env.id === server.id) ? env.tileUrlSatellite : '');

  return {
    id: server.id,
    displayName: server.displayName || server.id,
    mapSize: server.mapSize && server.mapSize > 0 ? server.mapSize : env.mapSize,
    tileUrl,
    tileUrlSatellite,
    xamMapSlug: resolveXamMapSlug({
      xamMapSlug: server.xamMapSlug,
      tileSlug: server.tileSlug,
      tileUrl,
      id: server.id,
    }),
    maxNativeZoom: server.maxNativeZoom ?? env.maxNativeZoom,
    imageUrl:
      server.imageUrl ||
      (env.imageUrl && (!server.id || env.id === server.id) ? env.imageUrl : ''),
  };
}

export function mapConfigKey(config: ResolvedMapConfig): string {
  return `${config.id}:${config.mapSize}:${config.tileUrl}:${config.tileUrlSatellite}:${config.imageUrl}`;
}

export function mapDisplayMode(config: ResolvedMapConfig): MapDisplayMode {
  if (config.tileUrl) return 'tiles';
  if (config.imageUrl) return 'image';
  return 'grid';
}

export const TIME_WINDOWS = [
  { id: 'session', label: 'This session' },
  { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { id: '10h', label: '10 hours', ms: 10 * 60 * 60 * 1000 },
  { id: '2d', label: '2 days', ms: 2 * 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
] as const;

export type TimeWindowId = (typeof TIME_WINDOWS)[number]['id'];

export const HEATMAP_TIME_WINDOWS = TIME_WINDOWS.filter(
  (entry): entry is (typeof TIME_WINDOWS)[number] & { ms: number } => 'ms' in entry
);

export function timeWindowMs(id: TimeWindowId): number | null {
  const w = TIME_WINDOWS.find((entry) => entry.id === id);
  return w && 'ms' in w ? w.ms : null;
}

export function mapBounds(mode: MapDisplayMode, mapSize: number): [[number, number], [number, number]] {
  if (mode === 'tiles') {
    return [
      [-256, 0],
      [0, 256],
    ];
  }
  return [
    [0, 0],
    [mapSize, mapSize],
  ];
}

export function mapPanBounds(
  mode: MapDisplayMode,
  mapSize: number,
  padding = 72
): [[number, number], [number, number]] {
  const [[south, west], [north, east]] = mapBounds(mode, mapSize);
  return [
    [south - padding, west - padding],
    [north + padding, east + padding],
  ];
}
