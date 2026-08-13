import type { PlayerEvent } from '../types';

/** Categories exposed as quick show/hide toggles on Map Replay. */
export const MAP_REPLAY_FILTER_CATEGORIES = [
  'Session',
  'Combat',
  'Inventory',
  'Vehicle',
  'Action',
  'Position',
] as const;

export type MapReplayFilterCategory = (typeof MAP_REPLAY_FILTER_CATEGORIES)[number];

/** Map raw event categories onto the filter chips (kills → Combat, etc.). */
const CATEGORY_TO_FILTER: Record<string, MapReplayFilterCategory> = {
  Session: 'Session',
  Combat: 'Combat',
  Zombie: 'Combat',
  Animal: 'Combat',
  Bandit: 'Combat',
  Inventory: 'Inventory',
  Vehicle: 'Vehicle',
  Action: 'Action',
  Position: 'Position',
  PlayerState: 'Position',
  Chat: 'Session',
  World: 'Action',
  BaseBuilding: 'Action',
};

export function defaultMapReplayCategoryFilter(): Set<MapReplayFilterCategory> {
  return new Set(MAP_REPLAY_FILTER_CATEGORIES);
}

export function resolveMapReplayFilterCategory(
  category: string | undefined
): MapReplayFilterCategory | null {
  if (!category) return null;
  return CATEGORY_TO_FILTER[category] ?? null;
}

export function isMapReplayCategoryVisible(
  category: string | undefined,
  visible: Set<MapReplayFilterCategory>
): boolean {
  if (visible.size === 0) return false;

  const mapped = resolveMapReplayFilterCategory(category);
  if (!mapped) return false;
  return visible.has(mapped);
}

export function filterEventsByMapCategory(
  events: PlayerEvent[],
  visible: Set<MapReplayFilterCategory>
): PlayerEvent[] {
  if (visible.size === 0) return [];
  if (visible.size === MAP_REPLAY_FILTER_CATEGORIES.length) return events;
  return events.filter((e) => isMapReplayCategoryVisible(e.category, visible));
}

export function toggleMapReplayCategory(
  visible: Set<MapReplayFilterCategory>,
  category: MapReplayFilterCategory
): Set<MapReplayFilterCategory> {
  const next = new Set(visible);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  return next;
}

export function allMapReplayCategoriesVisible(visible: Set<MapReplayFilterCategory>): boolean {
  return MAP_REPLAY_FILTER_CATEGORIES.every((c) => visible.has(c));
}
