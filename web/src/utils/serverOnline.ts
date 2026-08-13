import type { DashboardData } from '../types';

const DEFAULT_SNAPSHOT_INTERVAL_SECONDS = 10;
const MIN_LIVE_AGE_MS = 60_000;
const MAX_LIVE_AGE_MS = 900_000;

function snapshotMaxAgeMs(intervalSeconds: number): number {
  const intervalMs = Math.max(5, intervalSeconds) * 1000;
  const scaled = intervalMs * 2.5 + 15_000;
  return Math.min(MAX_LIVE_AGE_MS, Math.max(MIN_LIVE_AGE_MS, scaled));
}

/** Prefer server-computed live flag; fall back to timestamp age when API is older. */
export function isServerOnline(data: DashboardData | null): boolean {
  if (!data?.server?.snapshotAvailable) return false;
  if (typeof data.server.live === 'boolean') return data.server.live;

  const age = Date.now() - new Date(data.server.timestamp).getTime();
  if (Number.isNaN(age) || age < 0) return false;
  return age <= snapshotMaxAgeMs(DEFAULT_SNAPSHOT_INTERVAL_SECONDS);
}
