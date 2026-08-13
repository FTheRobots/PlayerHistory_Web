import type { Map as LeafletMap, Direction } from 'leaflet';
import type { PlayerEvent } from '../types';
import { formatEventLabel, isMapLabelEvent, isMapReplayNoiseEvent } from './eventHelpers';
import type { MapDisplayMode } from '../config/mapConfig';
import { positionToMapLatLng } from './gameCoords';
import {
  MAP_CLUSTER_METRES_MAX,
  MAP_CLUSTER_METRES_MIN,
  MAP_CLUSTER_RADIUS,
  MAP_CHIP_LABEL_MAX,
  MAP_ACTION_PANEL_COUNT,
  MAP_FORENSIC_THRESHOLD,
  type MapSignalMode,
} from '../config/mapReplayConfig';

const CATEGORY_COLORS: Record<string, string> = {
  Session: '#e8b84a',
  Combat: '#e5534b',
  Inventory: '#4ade80',
  Vehicle: '#e8b060',
  Action: '#79c0ff',
  Position: '#9aa3b2',
  Zombie: '#ff7b72',
  Animal: '#6ee7a0',
  World: '#79c0ff',
  BaseBuilding: '#79c0ff',
  PlayerState: '#9aa3b2',
};

export function categoryColor(category?: string): string {
  return CATEGORY_COLORS[category ?? ''] ?? '#9aa3b2';
}

export function parseTime(iso: string): number {
  return new Date(iso).getTime();
}

export type TimedPlayerEvent = PlayerEvent & { timestampMs: number };

/** Precompute `timestampMs` so scrub/playback avoids repeated Date parsing. */
export function withTimestampMs(events: PlayerEvent[]): TimedPlayerEvent[] {
  return events.map((e) =>
    'timestampMs' in e && typeof (e as TimedPlayerEvent).timestampMs === 'number'
      ? (e as TimedPlayerEvent)
      : { ...e, timestampMs: parseTime(e.timestamp) }
  );
}

export function eventTimeMs(e: PlayerEvent & { timestampMs?: number }): number {
  return e.timestampMs ?? parseTime(e.timestamp);
}

/**
 * First index with `eventTimeMs > timeMs` (upper bound). Assumes ASC chronological order.
 */
export function upperBoundByTime(
  events: Array<PlayerEvent & { timestampMs?: number }>,
  timeMs: number
): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (eventTimeMs(events[mid]) <= timeMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First index with `eventTimeMs >= timeMs`. Assumes ASC chronological order. */
function lowerBoundByTime(
  events: Array<PlayerEvent & { timestampMs?: number }>,
  timeMs: number
): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (eventTimeMs(events[mid]) < timeMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function looksSortedAsc(events: Array<PlayerEvent & { timestampMs?: number }>): boolean {
  const n = events.length;
  if (n < 2) return true;
  const step = Math.max(1, Math.floor(n / 16));
  let prev = eventTimeMs(events[0]);
  for (let i = step; i < n; i += step) {
    const t = eventTimeMs(events[i]);
    if (t < prev) return false;
    prev = t;
  }
  return eventTimeMs(events[n - 1]) >= prev;
}

export interface TimelineMark {
  ms: number;
  category?: string;
  count: number;
  label?: string;
}

/** Positions for tick marks on the replay scrubber (excludes position noise). */
export function buildTimelineMarks(
  events: PlayerEvent[],
  rangeStart: number,
  rangeEnd: number,
  maxMarks = 120
): TimelineMark[] {
  const span = rangeEnd - rangeStart;
  if (span <= 0) return [];

  const inRange = events.filter((e) => {
    const t = eventTimeMs(e);
    return t >= rangeStart && t <= rangeEnd && !isMapReplayNoiseEvent(e);
  });

  if (inRange.length === 0) return [];

  if (inRange.length <= maxMarks) {
    return inRange.map((e) => ({
      ms: eventTimeMs(e),
      category: e.category,
      count: 1,
      label: formatEventLabel(e),
    }));
  }

  const bucketMs = span / maxMarks;
  const buckets = new Map<number, TimelineMark>();

  for (const event of inRange) {
    const t = eventTimeMs(event);
    const idx = Math.min(maxMarks - 1, Math.floor((t - rangeStart) / bucketMs));
    const existing = buckets.get(idx);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(idx, {
        ms: t,
        category: event.category,
        count: 1,
        label: formatEventLabel(event),
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.ms - b.ms);
}

export function timelineMarkTitle(mark: TimelineMark): string {
  if (mark.count > 1) {
    return `${mark.count} events${mark.category ? ` · ${mark.category}` : ''}`;
  }
  return mark.label ?? 'Event';
}

/** Sorted unique timestamps for meaningful events in the visible window. */
export function collectSnapEventTimes(
  events: PlayerEvent[],
  rangeStart: number,
  rangeEnd: number
): number[] {
  const times = new Set<number>();
  for (const event of events) {
    const t = eventTimeMs(event);
    if (t >= rangeStart && t <= rangeEnd && !isMapReplayNoiseEvent(event)) {
      times.add(t);
    }
  }
  return Array.from(times).sort((a, b) => a - b);
}

export function findPreviousEventTime(times: number[], scrubMs: number): number | null {
  let prev: number | null = null;
  for (const t of times) {
    if (t >= scrubMs) break;
    prev = t;
  }
  return prev;
}

export function findNextEventTime(times: number[], scrubMs: number): number | null {
  for (const t of times) {
    if (t > scrubMs) return t;
  }
  return null;
}

export function eventLabelKey(event: PlayerEvent): string {
  return `${event.timestamp}|${event.event}`;
}

const MAP_EVENT_PRIORITY: Record<string, number> = {
  PlayerDeath: 100,
  PlayerKilled: 99,
  DamageDealt: 96,
  DamageReceived: 94,
  ZombieKill: 93,
  BanditKill: 93,
  AnimalKill: 91,
  BearKill: 91,
  WolfKill: 91,
  BoarKill: 91,
  DeerKill: 91,
  VehicleCrash: 78,
  VehicleDamage: 72,
  Respawn: 50,
  VehicleEnter: 44,
  VehicleExit: 44,
  ItemPickup: 38,
  ItemDrop: 36,
  ItemMove: 34,
  Build: 40,
  Kick: 22,
  Ban: 22,
  Timeout: 18,
  Join: 15,
  Disconnect: 15,
  Reconnect: 15,
  ActionComplete: 8,
};

const MAP_CATEGORY_PRIORITY: Record<string, number> = {
  Combat: 95,
  Zombie: 92,
  Bandit: 92,
  Animal: 89,
  Vehicle: 46,
  Inventory: 36,
  BaseBuilding: 38,
  World: 28,
  Session: 15,
  Action: 8,
  PlayerState: 12,
  Position: 4,
};

/** Events at or above this score get label priority over mundane activity. */
export const MAP_SIGNIFICANCE_THRESHOLD = 65;

export function eventMatchesSignalMode(event: PlayerEvent, mode: MapSignalMode): boolean {
  if (!isMapLabelEvent(event)) return false;
  if (mode === 'everything') return true;
  const priority = mapEventPriority(event);
  if (mode === 'quiet') return priority >= MAP_SIGNIFICANCE_THRESHOLD;
  return priority >= MAP_FORENSIC_THRESHOLD;
}

export function filterEventsBySignalMode(
  events: PlayerEvent[],
  mode: MapSignalMode
): PlayerEvent[] {
  if (mode === 'everything') return events.filter(isMapLabelEvent);
  return events.filter((event) => eventMatchesSignalMode(event, mode));
}

function escapeChipHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Compact map chip: named event when split, count badge when clustered. */
export function clusterChipHtml(cluster: MapEventCluster): string {
  const color = categoryColor(cluster.latest.category);
  if (cluster.events.length > 1) {
    return `<div class="map-event-chip map-event-chip-badge" style="color:${color}">${cluster.events.length}</div>`;
  }
  return `<div class="map-event-chip map-event-chip-name" style="color:${color}">${escapeChipHtml(formatEventLabel(cluster.latest))}</div>`;
}

export function clusterChipLayoutText(cluster: MapEventCluster): string {
  return cluster.events.length > 1
    ? String(cluster.events.length)
    : formatEventLabel(cluster.latest);
}

/** Higher = more important on the map (combat beats mundane actions). */
export function mapEventPriority(event: PlayerEvent): number {
  return MAP_EVENT_PRIORITY[event.event] ?? MAP_CATEGORY_PRIORITY[event.category ?? ''] ?? 35;
}

export function pickClusterHighlightEvent(events: PlayerEvent[]): PlayerEvent {
  return events.reduce((best, event) => {
    const bestPriority = mapEventPriority(best);
    const eventPriority = mapEventPriority(event);
    if (eventPriority > bestPriority) return event;
    if (eventPriority === bestPriority && eventTimeMs(event) > eventTimeMs(best)) {
      return event;
    }
    return best;
  });
}

/**
 * Keeps combat/kills/deaths even when recent mundane
 * actions (e.g. Open Doors) would otherwise fill the label quota.
 */
export function recentMapLabelEvents(
  events: PlayerEvent[],
  scrubMs: number,
  rangeStart: number,
  count = MAP_ACTION_PANEL_COUNT,
  preferSignificant = false
): PlayerEvent[] {
  let eligible: PlayerEvent[];
  if (looksSortedAsc(events)) {
    const start = lowerBoundByTime(events, rangeStart);
    const end = upperBoundByTime(events, scrubMs);
    eligible = events.slice(start, end).filter((e) => e.position && isMapLabelEvent(e));
  } else {
    eligible = events.filter((e) => {
      if (!e.position || !isMapLabelEvent(e)) return false;
      const t = eventTimeMs(e);
      return t >= rangeStart && t <= scrubMs;
    });
  }

  if (!preferSignificant || eligible.length <= count) {
    return eligible.slice(-count);
  }

  const significanceThreshold = MAP_SIGNIFICANCE_THRESHOLD;
  const significant = eligible.filter((e) => mapEventPriority(e) >= significanceThreshold);

  if (significant.length >= count) {
    return significant.slice(-count);
  }

  const result = [...significant];
  const mundane = eligible.filter((e) => mapEventPriority(e) < significanceThreshold);
  for (const event of mundane.slice(-(count - result.length))) {
    result.push(event);
  }

  return result.sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
}

/** Server connection session — from Join/Reconnect until Disconnect (not each life). */
const SESSION_START_EVENTS = new Set(['Join', 'Reconnect']);

/** Most recent server connect at or before rangeEnd; fallback one hour. */
export function findSessionStart(events: PlayerEvent[], rangeEnd: number): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!SESSION_START_EVENTS.has(event.event)) continue;
    const t = eventTimeMs(event);
    if (t <= rangeEnd) return t;
  }
  return rangeEnd - 60 * 60 * 1000;
}

/** Session id for the active connection window (if known). */
export function findSessionId(events: PlayerEvent[], rangeEnd: number): string | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!SESSION_START_EVENTS.has(event.event)) continue;
    const t = eventTimeMs(event);
    if (t <= rangeEnd) {
      return event.sessionId ?? event.metadata?.sessionId;
    }
  }
  return undefined;
}

export function findPositionAtTime(events: PlayerEvent[], timeMs: number): PlayerEvent | null {
  if (looksSortedAsc(events)) {
    for (let i = upperBoundByTime(events, timeMs) - 1; i >= 0; i--) {
      if (events[i].position) return events[i];
    }
    return null;
  }
  let last: PlayerEvent | null = null;
  for (const e of events) {
    if (!e.position) continue;
    const t = eventTimeMs(e);
    if (t <= timeMs) last = e;
    else break;
  }
  return last;
}

export function eventsUpToTime(events: PlayerEvent[], timeMs: number, rangeStart: number): PlayerEvent[] {
  if (events.length === 0) return [];

  if (looksSortedAsc(events)) {
    const start = lowerBoundByTime(events, rangeStart);
    const end = upperBoundByTime(events, timeMs);
    const sliced = events.slice(start, end);
    return sliced.filter((e) => e.position);
  }

  return events.filter((e) => {
    if (!e.position) return false;
    const t = eventTimeMs(e);
    return t >= rangeStart && t <= timeMs;
  });
}

/** Evenly sample trail points when longer than maxPoints (keeps endpoints). */
export function densifyTrail(points: [number, number][], maxPoints = 800): [number, number][] {
  if (points.length <= maxPoints) return points;
  if (maxPoints <= 1) return points.length > 0 ? [points[points.length - 1]] : [];

  const out: [number, number][] = new Array(maxPoints);
  const last = points.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    out[i] = points[Math.round((i * last) / (maxPoints - 1))];
  }
  return out;
}

export function trailUpToTime(events: PlayerEvent[], timeMs: number, rangeStart: number): [number, number][] {
  const points = eventsUpToTime(events, timeMs, rangeStart).map(
    (e) => [e.position![0], e.position![2]] as [number, number]
  );
  return densifyTrail(points);
}

/** Cheap identity for visible map-label events (length + endpoints + zoom). */
export function mapEventsFingerprint(events: PlayerEvent[], zoom: number): string {
  return `${zoom}|${events.length}|${events.at(-1)?.timestamp ?? ''}|${events[0]?.timestamp ?? ''}`;
}

export function formatScrubTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Events newly crossed while scrubbing forward */
export function eventsBetween(
  events: PlayerEvent[],
  fromMs: number,
  toMs: number,
  rangeStart: number
): PlayerEvent[] {
  if (toMs <= fromMs) return [];
  return events.filter((e) => {
    if (!e.position) return false;
    const t = eventTimeMs(e);
    return t > fromMs && t <= toMs && t >= rangeStart;
  });
}

export interface MapEventCluster {
  key: string;
  events: PlayerEvent[];
  latest: PlayerEvent;
}

/** Legacy default — use {@link clusterBucketMetersForZoom} for map views. */
export const MAP_CLUSTER_METRES = MAP_CLUSTER_METRES_MIN;

/**
 * World-space cluster cell size from Leaflet zoom.
 * Zoomed out → large cells (one big marker); zoomed in → small cells (split per action).
 */
export function clusterBucketMetersForZoom(
  zoom: number,
  mapSize: number,
  maxNativeZoom = 7
): number {
  const maxZoom = maxNativeZoom + 2;
  const t = Math.max(0, Math.min(1, zoom / maxZoom));
  const maxBucket = Math.min(MAP_CLUSTER_METRES_MAX, Math.max(MAP_CLUSTER_METRES_MIN * 4, mapSize / 50));
  const ratio = MAP_CLUSTER_METRES_MIN / maxBucket;
  return Math.max(MAP_CLUSTER_METRES_MIN, Math.round(maxBucket * ratio ** t));
}

/** Circle marker radius in px — grows with event count when clustered. */
export function clusterMarkerRadius(eventCount: number): number {
  if (eventCount <= 1) return MAP_CLUSTER_RADIUS.single;
  const extra = Math.min(
    MAP_CLUSTER_RADIUS.max - MAP_CLUSTER_RADIUS.min,
    Math.log2(eventCount + 1) * 3.5
  );
  return Math.round(MAP_CLUSTER_RADIUS.min + extra);
}

export function isClusterAggregate(cluster: MapEventCluster): boolean {
  return cluster.events.length > 1;
}

/** Group nearby events so labels and markers do not stack on the same spot. */
export function clusterEventsByPosition(
  events: PlayerEvent[],
  bucketMeters = MAP_CLUSTER_METRES_MIN
): MapEventCluster[] {
  const buckets = new Map<string, PlayerEvent[]>();

  for (const event of events) {
    if (!event.position) continue;
    const [x, , z] = event.position;
    const key = `${Math.round(x / bucketMeters)},${Math.round(z / bucketMeters)}`;
    const list = buckets.get(key) ?? [];
    list.push(event);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries(), ([key, clusterEvents]) => ({
    key,
    events: clusterEvents,
    latest: pickClusterHighlightEvent(clusterEvents),
  }));
}

export interface TooltipLayout {
  direction: Direction;
  offset: [number, number];
  showLabel: boolean;
}

interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxesOverlap(a: ScreenBox, b: ScreenBox, padding = 6): boolean {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

const TOOLTIP_DIRECTIONS: Direction[] = ['top', 'bottom', 'right', 'left'];

function getClusterTooltipLabels(cluster: MapEventCluster): string[] {
  return [clusterChipLayoutText(cluster)];
}

function estimateTooltipBox(
  point: { x: number; y: number },
  labels: string[],
  offset: [number, number]
): ScreenBox {
  const text = labels[0] ?? '';
  const isBadge = /^\d+$/.test(text);
  const w = isBadge ? 36 : Math.min(224, Math.max(72, text.length * 6.5 + 20));
  const h = isBadge ? 24 : 26;
  const anchorX = point.x + offset[0];
  const anchorY = point.y + offset[1];

  if (offset[1] >= 0) {
    return { x: anchorX - w / 2, y: anchorY + 8, w, h };
  }
  if (offset[0] < -8) {
    return { x: anchorX - w - 12, y: anchorY - h / 2, w, h };
  }
  if (offset[0] > 8) {
    return { x: anchorX + 12, y: anchorY - h / 2, w, h };
  }
  return { x: anchorX - w / 2, y: anchorY - h - 8, w, h };
}

const BASE_DIRECTION_OFFSETS: Record<Direction, [number, number]> = {
  top: [0, -12],
  bottom: [0, 14],
  left: [-14, 0],
  right: [14, 0],
  center: [0, 0],
  auto: [0, -12],
};

function buildOffsetCandidates(lineCount: number): [number, number][] {
  const candidates: [number, number][] = [];
  for (const direction of TOOLTIP_DIRECTIONS) {
    candidates.push(BASE_DIRECTION_OFFSETS[direction]);
  }
  const stackStep = 28 + lineCount * 6;
  for (let i = 1; i <= 4; i++) {
    candidates.push([0, -12 - stackStep * i]);
    candidates.push([0, 14 + stackStep * i]);
    candidates.push([-14 - 48 * i, -12]);
    candidates.push([14 + 48 * i, -12]);
  }
  return candidates;
}

/** Pick tooltip positions that avoid screen overlap; newest clusters get labels first. */
export function layoutClusterTooltips(
  map: LeafletMap,
  clusters: MapEventCluster[],
  mapSize: number,
  maxLabels = MAP_CHIP_LABEL_MAX,
  mode: MapDisplayMode = 'tiles'
): Map<string, TooltipLayout> {
  const layouts = new Map<string, TooltipLayout>();
  const placed: ScreenBox[] = [];
  const mapSizePx = map.getSize();

  const sorted = [...clusters].sort((a, b) => {
    const priorityDiff = mapEventPriority(b.latest) - mapEventPriority(a.latest);
    if (priorityDiff !== 0) return priorityDiff;
    return eventTimeMs(b.latest) - eventTimeMs(a.latest);
  });

  for (let i = 0; i < sorted.length; i++) {
    const cluster = sorted[i];
    const labels = getClusterTooltipLabels(cluster);
    const showLabel = i < maxLabels && labels.length > 0;

    if (!showLabel) {
      layouts.set(cluster.key, { direction: 'top', offset: [0, -12], showLabel: false });
      continue;
    }

    const latLng = positionToMapLatLng(cluster.latest.position!, mapSize, mode);
    const point = map.latLngToContainerPoint(latLng);
    const candidates = buildOffsetCandidates(labels.length);

    let chosenOffset: [number, number] = BASE_DIRECTION_OFFSETS.top;
    let chosenBox: ScreenBox | null = null;

    for (const offset of candidates) {
      const box = estimateTooltipBox(point, labels, offset);
      const inViewport =
        box.x >= 4 &&
        box.y >= 4 &&
        box.x + box.w <= mapSizePx.x - 4 &&
        box.y + box.h <= mapSizePx.y - 4;
      if (!inViewport) continue;
      if (!placed.some((p) => boxesOverlap(box, p, 10))) {
        chosenOffset = offset;
        chosenBox = box;
        break;
      }
    }

    if (!chosenBox) {
      layouts.set(cluster.key, { direction: 'top', offset: [0, -12], showLabel: false });
      continue;
    }

    placed.push(chosenBox);

    const direction =
      chosenOffset[1] >= 8 ? 'bottom' : chosenOffset[0] <= -20 ? 'left' : chosenOffset[0] >= 20 ? 'right' : 'top';

    layouts.set(cluster.key, {
      direction,
      offset: chosenOffset,
      showLabel: true,
    });
  }

  return layouts;
}

/** Filter to mappable events and cluster using zoom-aware bucket size. */
export function clusterMapLabelEvents(
  events: PlayerEvent[],
  zoom = 99,
  mapSize = 15360,
  maxNativeZoom = 7
): MapEventCluster[] {
  const labelEvents = events.filter(isMapLabelEvent);
  const bucketMeters = clusterBucketMetersForZoom(zoom, mapSize, maxNativeZoom);

  if (bucketMeters <= MAP_CLUSTER_METRES_MIN + 1) {
    return labelEvents
      .filter((e) => e.position)
      .map((event) => ({
        key: `${event.steamid ?? ''}|${eventLabelKey(event)}`,
        events: [event],
        latest: event,
      }));
  }

  return clusterEventsByPosition(labelEvents, bucketMeters);
}

/** Chronological action list for cluster popups (oldest → newest). */
export function sortClusterEventsForTimeline(events: PlayerEvent[]): PlayerEvent[] {
  return [...events].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
}
