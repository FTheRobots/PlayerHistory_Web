import { ANIMAL_KILL_EVENTS, ANIMAL_KILL_LABELS, type AnimalKillEvent } from './animalKills';

export interface KillStatDefinition {
  event: string;
  label: string;
  accent: string;
  alwaysShow?: boolean;
}

function animalKillStatLabel(event: AnimalKillEvent): string {
  if (event === 'AnimalKill') return 'Other animal kills';
  const base = ANIMAL_KILL_LABELS[event];
  if (base.endsWith('s')) return `${base.slice(0, -1)} kills`;
  return `${base} kills`;
}

/** Ordered kill types for the stats panel — matches mod event names. */
export const KILL_STAT_DEFINITIONS: KillStatDefinition[] = [
  { event: 'PlayerKilled', label: 'Player kills', accent: 'text-event-combat', alwaysShow: true },
  { event: 'ZombieKill', label: 'Zombie kills', accent: 'text-red-400', alwaysShow: true },
  { event: 'BanditKill', label: 'Bandit kills', accent: 'text-purple-400', alwaysShow: true },
  ...ANIMAL_KILL_EVENTS.map((event) => ({
    event,
    label: animalKillStatLabel(event),
    accent: 'text-event-animal',
  })),
];

export function resolveKillCounts(stats: {
  killCounts?: Record<string, number>;
  animalKillCounts?: Record<string, number>;
  eventsByType?: Record<string, number>;
}): Record<string, number> {
  const merged: Record<string, number> = { ...(stats.killCounts ?? {}) };

  for (const [event, count] of Object.entries(stats.animalKillCounts ?? {})) {
    if (merged[event] == null) merged[event] = count;
  }

  for (const def of KILL_STAT_DEFINITIONS) {
    if (merged[def.event] == null && stats.eventsByType?.[def.event] != null) {
      merged[def.event] = stats.eventsByType[def.event];
    }
  }

  return merged;
}

export function totalKillCount(killCounts: Record<string, number>): number {
  return Object.values(killCounts).reduce((sum, n) => sum + n, 0);
}

export function getKillStatEntries(killCounts: Record<string, number>) {
  return KILL_STAT_DEFINITIONS.map((def) => ({
    ...def,
    count: killCounts[def.event] ?? 0,
  })).filter((def) => def.alwaysShow || def.count > 0);
}
