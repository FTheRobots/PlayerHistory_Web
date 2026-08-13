import type { PlayerEvent } from '../types';
import { formatInventoryLocation, humanizeType, inventoryItemName } from './eventHelpers';
import { extractItemPidFromEvent } from './itemHelpers';

export interface ContainerQuery {
  x: number;
  z: number;
  radius?: number;
  containerPid?: string;
  label: string;
}

export type EventLabelSegment =
  | { kind: 'text'; text: string }
  | { kind: 'item'; name: string; pid: string }
  | { kind: 'container'; label: string; query: ContainerQuery };

export function parseMetadataPosition(raw?: string): [number, number, number] | null {
  if (!raw?.trim()) return null;

  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed) && parsed.length >= 3) {
      const x = Number(parsed[0]);
      const y = Number(parsed[1]);
      const z = Number(parsed[2]);
      if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) return [x, y, z];
    }
  } catch {
    // fall through
  }

  const match = trimmed.match(/\[?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]?/);
  if (!match) return null;

  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  const z = parseFloat(match[3]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null;
  return [x, y, z];
}

function isWorldContainerEntity(entity?: string): boolean {
  if (!entity || entity === 'None' || entity.startsWith('Player')) return false;
  return true;
}

export function getContainerQueryFromSide(
  meta: Record<string, string>,
  side: 'from' | 'to'
): ContainerQuery | null {
  const entity = side === 'from' ? meta.fromEntity : meta.toEntity;
  if (!isWorldContainerEntity(entity)) return null;

  const pos = parseMetadataPosition(
    side === 'from' ? meta.fromContainerPosition : meta.toContainerPosition
  );
  if (!pos) return null;

  const slot = side === 'from' ? meta.from : meta.to;
  const label = formatInventoryLocation(slot, entity);
  const containerPid = (side === 'from' ? meta.fromContainerPid : meta.toContainerPid)?.trim();

  return {
    x: pos[0],
    z: pos[2],
    containerPid: containerPid || undefined,
    label,
  };
}

function appendItemSegment(segments: EventLabelSegment[], name: string, pid: string | null): void {
  if (pid) segments.push({ kind: 'item', name, pid });
  else segments.push({ kind: 'text', text: name });
}

function appendLocationSegment(
  segments: EventLabelSegment[],
  label: string,
  query: ContainerQuery | null
): void {
  if (query) segments.push({ kind: 'container', label, query });
  else segments.push({ kind: 'text', text: label });
}

/** Rich label segments for inventory events (item + container links). */
export function getEventLabelSegments(event: PlayerEvent): EventLabelSegment[] | null {
  const meta = event.metadata ?? {};
  const itemName = inventoryItemName(meta);
  const pid = extractItemPidFromEvent(event);
  const fromLabel = formatInventoryLocation(meta.from, meta.fromEntity);
  const toLabel = formatInventoryLocation(meta.to, meta.toEntity);
  const fromQuery = getContainerQueryFromSide(meta, 'from');
  const toQuery = getContainerQueryFromSide(meta, 'to');

  if (meta.action === 'IntoHands') {
    const segments: EventLabelSegment[] = [];
    appendItemSegment(segments, itemName, pid);
    segments.push({ kind: 'text', text: ' moved to Hands' });
    return segments;
  }

  if (meta.action === 'OutOfHands') {
    const segments: EventLabelSegment[] = [];
    appendItemSegment(segments, itemName, pid);
    segments.push({ kind: 'text', text: ' moved from Hands' });
    return segments;
  }

  switch (event.event) {
    case 'ItemPickup': {
      const segments: EventLabelSegment[] = [{ kind: 'text', text: 'Picked up ' }];
      appendItemSegment(segments, itemName, pid);
      return segments;
    }
    case 'ItemDrop': {
      const segments: EventLabelSegment[] = [{ kind: 'text', text: 'Dropped ' }];
      appendItemSegment(segments, itemName, pid);
      return segments;
    }
    case 'ItemAttach': {
      const segments: EventLabelSegment[] = [{ kind: 'text', text: 'Attached ' }];
      appendItemSegment(segments, itemName, pid);
      if (meta.to) {
        segments.push({ kind: 'text', text: ' to ' });
        appendLocationSegment(segments, toLabel, toQuery);
      }
      return segments;
    }
    case 'ItemDetach': {
      const segments: EventLabelSegment[] = [{ kind: 'text', text: 'Detached ' }];
      appendItemSegment(segments, itemName, pid);
      if (meta.from) {
        segments.push({ kind: 'text', text: ' from ' });
        appendLocationSegment(segments, fromLabel, fromQuery);
      }
      return segments;
    }
    case 'ItemUse': {
      const segments: EventLabelSegment[] = [{ kind: 'text', text: 'Used ' }];
      appendItemSegment(segments, itemName, pid);
      return segments;
    }
    case 'ItemMove': {
      if (!meta.from || !meta.to) return null;
      const segments: EventLabelSegment[] = [];
      appendItemSegment(segments, itemName, pid);
      segments.push({ kind: 'text', text: ' moved from ' });
      appendLocationSegment(segments, fromLabel, fromQuery);
      segments.push({ kind: 'text', text: ' to ' });
      appendLocationSegment(segments, toLabel, toQuery);
      return segments;
    }
    default:
      return null;
  }
}

export function formatContainerPosition(query: ContainerQuery): string {
  return `${Math.round(query.x)} / ${Math.round(query.z)} (X / Z)`;
}

export function containerDisplayTitle(query: ContainerQuery): string {
  const entityType = query.label.split(' (')[0]?.trim();
  return entityType || humanizeType(query.label) || 'Storage';
}
