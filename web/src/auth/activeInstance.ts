import { getServerUrl } from './storage';

const ACTIVE_INSTANCE_KEY = 'ph_active_instance_by_server';

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACTIVE_INSTANCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>): void {
  localStorage.setItem(ACTIVE_INSTANCE_KEY, JSON.stringify(map));
}

function scopedKey(serverUrl?: string | null): string | null {
  const url = (serverUrl ?? getServerUrl()).trim();
  return url || null;
}

export function getActiveInstanceId(serverUrl?: string | null): string | null {
  const key = scopedKey(serverUrl);
  if (!key) return null;
  return readMap()[key] ?? null;
}

export function setActiveInstanceId(id: string, serverUrl?: string | null): void {
  const key = scopedKey(serverUrl);
  if (!key) return;
  const map = readMap();
  map[key] = id;
  writeMap(map);
}

export function clearActiveInstanceId(serverUrl?: string | null): void {
  const key = scopedKey(serverUrl);
  if (!key) return;
  const map = readMap();
  delete map[key];
  writeMap(map);
}
