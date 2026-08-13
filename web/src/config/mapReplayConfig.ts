export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export const PLAYBACK_TICK_MS = 100;

export function nextPlaybackSpeed(current: PlaybackSpeed): PlaybackSpeed {
  const idx = PLAYBACK_SPEEDS.indexOf(current);
  return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
}

export function formatPlaybackSpeed(speed: PlaybackSpeed): string {
  return speed >= 1 ? `${speed}×` : `${speed}×`;
}

/** Trail and marker styling (DayZ P3D Explorer–inspired) */
export const MAP_TRAIL = {
  color: '#c45c5c',
  outline: '#ffffff',
  weight: 7,
  outlineWeight: 10,
  opacity: 0.92,
} as const;

export const MAP_PLAYER = {
  fill: '#e5534b',
  stroke: '#ffffff',
  radius: 13,
  weight: 3,
} as const;

export const MAP_EVENT = {
  radius: 11,
  weight: 3,
  stroke: '#f0f2f5',
} as const;

export const MAP_EVENT_SELECTED = {
  stroke: '#e8b84a',
  weight: 5,
} as const;

/** How many named/count chips to try to place without overlap. */
export const MAP_CHIP_LABEL_MAX = 24;

/** Now-feed size in the inspector. */
export const MAP_ACTION_PANEL_COUNT = 20;

export const MAP_SIGNAL_MODES = ['quiet', 'forensic', 'everything'] as const;
export type MapSignalMode = (typeof MAP_SIGNAL_MODES)[number];

export const MAP_SIGNAL_MODE_DEFAULT: MapSignalMode = 'forensic';
export const MAP_SIGNAL_MODE_STORAGE_KEY = 'ph-map-signal-mode';

/** Inventory / vehicle floor for Forensic mode (ItemMove = 34). */
export const MAP_FORENSIC_THRESHOLD = 34;

export const MAP_SIGNAL_MODE_LABELS: Record<MapSignalMode, string> = {
  quiet: 'Quiet',
  forensic: 'Forensic',
  everything: 'Everything',
};

export function isMapSignalMode(value: string | null): value is MapSignalMode {
  return value === 'quiet' || value === 'forensic' || value === 'everything';
}

export function readStoredMapSignalMode(): MapSignalMode {
  try {
    const raw = localStorage.getItem(MAP_SIGNAL_MODE_STORAGE_KEY);
    return isMapSignalMode(raw) ? raw : MAP_SIGNAL_MODE_DEFAULT;
  } catch {
    return MAP_SIGNAL_MODE_DEFAULT;
  }
}

export function writeStoredMapSignalMode(mode: MapSignalMode): void {
  try {
    localStorage.setItem(MAP_SIGNAL_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}

/** Cluster radius in world metres at max zoom (individual events). */
export const MAP_CLUSTER_METRES_MIN = 4;

/** Cluster radius in world metres at min zoom (aggregated activity). */
export const MAP_CLUSTER_METRES_MAX = 240;

/** Pixel radius bounds for zoom-aware event clusters. */
export const MAP_CLUSTER_RADIUS = {
  single: MAP_EVENT.radius,
  min: MAP_EVENT.radius + 2,
  max: MAP_EVENT.radius + 16,
} as const;

/** Inset inside the map frame so permanent tooltips are not clipped at edges. */
export const MAP_TOOLTIP_INSET_PX = 48;
