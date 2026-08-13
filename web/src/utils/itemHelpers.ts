import type { PlayerEvent } from '../types';
import { formatEventLabel, parseItemFromMeta } from './eventHelpers';

export interface EventLabelLinkParts {
  before: string;
  itemName: string;
  after: string;
  pid: string;
}

/** Split an event label so the item name can be rendered as a track link. */
export function getEventLabelLinkParts(event: PlayerEvent): EventLabelLinkParts | null {
  const label = formatEventLabel(event);
  const pid = extractItemPidFromEvent(event);
  const item = parseItemFromMeta(event.metadata?.item);

  if (!pid || !item.name || item.name === 'Item') return null;

  const nameIndex = label.indexOf(item.name);
  if (nameIndex === -1) return null;

  return {
    before: label.slice(0, nameIndex),
    itemName: item.name,
    after: label.slice(nameIndex + item.name.length),
    pid,
  };
}

export function eventLabelHasTrackableItem(event: PlayerEvent): boolean {
  return getEventLabelLinkParts(event) != null;
}

export function extractItemPid(metadata?: Record<string, string>): string | null {
  if (!metadata) return null;
  if (metadata.itemPid?.trim()) return metadata.itemPid.trim();

  const raw = metadata.item;
  if (!raw) return null;

  try {
    const item = JSON.parse(raw) as { pid?: string };
    if (item.pid?.trim()) return item.pid.trim();
  } catch {
    const match = raw.match(/"pid"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function extractItemPidFromEvent(event: PlayerEvent): string | null {
  return extractItemPid(event.metadata);
}

export function formatItemPidShort(pid: string): string {
  const parts = pid.split('-');
  if (parts.length >= 4) {
    return `${parts[0]}-${parts[1]}…${parts[3]}`;
  }
  if (pid.length > 16) return `${pid.slice(0, 8)}…${pid.slice(-4)}`;
  return pid;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildItemLinkHtml(itemName: string, itemPid: string): string {
  return `<button type="button" class="map-item-link" data-item-pid="${escapeHtml(itemPid)}" title="View full item history">${escapeHtml(itemName)}</button>`;
}

/** HTML for last-action labels with a clickable item name when pid is known. */
export function buildLastActionHtml(
  lastAction: string,
  itemPid?: string,
  itemName?: string
): string {
  if (!itemPid || !itemName) {
    return escapeHtml(lastAction);
  }

  const nameIndex = lastAction.indexOf(itemName);
  if (nameIndex !== -1) {
    return `${escapeHtml(lastAction.slice(0, nameIndex))}${buildItemLinkHtml(itemName, itemPid)}${escapeHtml(lastAction.slice(nameIndex + itemName.length))}`;
  }

  return `${escapeHtml(lastAction)} (${buildItemLinkHtml(itemName, itemPid)})`;
}
