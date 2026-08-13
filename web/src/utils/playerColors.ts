export const MAX_COMPARE_PLAYERS = 5;

export interface PlayerColorStyle {
  badge: string;
  dot: string;
  ring: string;
  mapFill: string;
  mapStroke: string;
}

export const PLAYER_COLOR_PALETTE: PlayerColorStyle[] = [
  {
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
    dot: 'bg-sky-400',
    ring: 'ring-sky-500/60',
    mapFill: '#38bdf8',
    mapStroke: '#ffffff',
  },
  {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    dot: 'bg-amber-400',
    ring: 'ring-amber-500/60',
    mapFill: '#fbbf24',
    mapStroke: '#ffffff',
  },
  {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-500/60',
    mapFill: '#34d399',
    mapStroke: '#ffffff',
  },
  {
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50',
    dot: 'bg-fuchsia-400',
    ring: 'ring-fuchsia-500/60',
    mapFill: '#e879f9',
    mapStroke: '#ffffff',
  },
  {
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    dot: 'bg-rose-400',
    ring: 'ring-rose-500/60',
    mapFill: '#fb7185',
    mapStroke: '#ffffff',
  },
];

export function getPlayerColor(index: number): PlayerColorStyle {
  return PLAYER_COLOR_PALETTE[index % PLAYER_COLOR_PALETTE.length];
}

export function buildPlayerColorMap(steamIds: string[]): Map<string, { index: number; color: PlayerColorStyle }> {
  const map = new Map<string, { index: number; color: PlayerColorStyle }>();
  steamIds.forEach((id, index) => {
    map.set(id, { index, color: getPlayerColor(index) });
  });
  return map;
}

export function parseComparePlayersParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_COMPARE_PLAYERS);
}

export function comparePlayersQuery(steamIds: string[]): string {
  return steamIds.slice(0, MAX_COMPARE_PLAYERS).join(',');
}
