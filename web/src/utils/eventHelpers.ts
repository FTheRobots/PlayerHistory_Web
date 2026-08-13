import {
  LogIn,
  LogOut,
  Package,
  Swords,
  Car,
  MapPin,
  Skull,
  Zap,
  DoorOpen,
  Hammer,
  PawPrint,
  Activity,
  Circle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlayerEvent } from '../types';
import { getCachedMapConfig } from '../hooks/useMapConfig';
import { resolveXamMapSlug, xamMapBaseUrl } from '../config/mapConfig';
import { formatAnimalKillLabel, isAnimalKillEvent } from './animalKills';

const CATEGORY_COLORS: Record<string, string> = {
  Session: 'text-event-session border-event-session/40 bg-event-session/15',
  Combat: 'text-event-combat border-event-combat/40 bg-event-combat/15',
  Inventory: 'text-event-inventory border-event-inventory/40 bg-event-inventory/15',
  Vehicle: 'text-event-vehicle border-event-vehicle/40 bg-event-vehicle/15',
  Action: 'text-event-action border-event-action/40 bg-event-action/15',
  Position: 'text-event-position border-event-position/40 bg-event-position/15',
  Zombie: 'text-event-zombie border-event-zombie/40 bg-event-zombie/15',
  Animal: 'text-event-animal border-event-animal/40 bg-event-animal/15',
  Bandit: 'text-event-combat border-event-combat/40 bg-event-combat/15',
  World: 'text-event-world border-event-world/40 bg-event-world/15',
  BaseBuilding: 'text-event-world border-event-world/40 bg-event-world/15',
  PlayerState: 'text-event-position border-event-position/40 bg-event-position/15',
};

const EVENT_ICONS: Record<string, LucideIcon> = {
  Join: LogIn,
  Disconnect: LogOut,
  Reconnect: LogIn,
  Respawn: Activity,
  PlayerDeath: Skull,
  PlayerKilled: Swords,
  DamageReceived: Swords,
  DamageDealt: Swords,
  ItemPickup: Package,
  ItemDrop: Package,
  ItemMove: Package,
  VehicleEnter: Car,
  VehicleExit: Car,
  VehicleDoor: DoorOpen,
  VehicleCrash: Car,
  VehicleDamage: Car,
  PositionUpdate: MapPin,
  ActionComplete: Zap,
  ZombieKill: Skull,
  ZombieHit: Skull,
  AnimalKill: PawPrint,
  AnimalHit: PawPrint,
  BearKill: PawPrint,
  WolfKill: PawPrint,
  BoarKill: PawPrint,
  DeerKill: PawPrint,
  BanditKill: Swords,
  Build: Hammer,
};

const EVENT_LABELS: Record<string, string> = {
  Join: 'Logged In',
  Disconnect: 'Logged Out',
  Reconnect: 'Reconnected',
  Respawn: 'Respawned',
  Kick: 'Kicked',
  Ban: 'Banned',
  Timeout: 'Timed Out',
  ServerRestart: 'Server Restart',
  PositionUpdate: 'Moved',
  PositionSnapshot: 'Position Snapshot',
  ItemPickup: 'Picked Up Item',
  ItemDrop: 'Dropped Item',
  ItemMove: 'Moved Item',
  ItemUse: 'Used Item',
  ItemAttach: 'Attached Item',
  ItemDetach: 'Detached Item',
  ContainerOpen: 'Opened Container',
  ContainerClose: 'Closed Container',
  InventorySnapshot: 'Inventory Snapshot',
  DamageDealt: 'Dealt Damage',
  DamageReceived: 'Took Damage',
  ShotFired: 'Fired Shot',
  PlayerKilled: 'Killed Player',
  PlayerDeath: 'Died',
  Unconscious: 'Knocked Unconscious',
  RegainConscious: 'Woke Up',
  Bleeding: 'Bleeding',
  VehicleEnter: 'Entered Vehicle',
  VehicleExit: 'Exited Vehicle',
  VehicleDoor: 'Vehicle Door',
  VehicleEngine: 'Engine',
  VehicleCrash: 'Crashed Vehicle',
  VehicleDamage: 'Vehicle Damaged',
  VehicleInventory: 'Vehicle Loot',
  ActionStart: 'Started Action',
  ActionComplete: 'Completed Action',
  ActionInterrupt: 'Action Interrupted',
  DoorOpen: 'Opened Door',
  DoorClose: 'Closed Door',
  Craft: 'Crafted',
  Cook: 'Cooked',
  Ignite: 'Lit Fire',
  Extinguish: 'Put Out Fire',
  ZombieKill: 'Killed Zombie',
  AnimalKill: 'Killed Animal',
  BearKill: 'Killed Bear',
  WolfKill: 'Killed Wolf',
  BoarKill: 'Killed Boar',
  DeerKill: 'Killed Deer',
  SheepKill: 'Killed Sheep',
  GoatKill: 'Killed Goat',
  FoxKill: 'Killed Fox',
  HareKill: 'Killed Hare',
  HenKill: 'Killed Hen',
  CowKill: 'Killed Cow',
  BanditKill: 'Killed Bandit',
  Build: 'Built',
  Dismantle: 'Dismantled',
  Lock: 'Locked',
  Unlock: 'Unlocked',
  PlayerStateSnapshot: 'Status Update',
};

/** Events too frequent for play-by-play announcements */
const MAP_REPLAY_NOISE = new Set([
  'PositionUpdate',
  'PositionSnapshot',
  'PlayerStateSnapshot',
  'InventorySnapshot',
  'ZombieHit',
  'AnimalHit',
  'ShotFired',
]);

export function getCategoryStyle(category?: string): string {
  return CATEGORY_COLORS[category ?? ''] ?? 'text-event-default border-event-default/40 bg-event-default/15';
}

export function getEventIcon(event: string): LucideIcon {
  return EVENT_ICONS[event] ?? Circle;
}

export function humanizeType(name?: string): string {
  if (!name) return '';
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

const SLOT_LABELS: Record<string, string> = {
  Hands: 'Hands',
  Shoulder: 'Shoulder',
  Melee: 'Melee',
  Headgear: 'Head',
  Mask: 'Mask',
  Eyewear: 'Eyewear',
  Gloves: 'Gloves',
  Armband: 'Armband',
  Vest: 'Vest',
  Body: 'Body',
  Back: 'Backpack',
  Hips: 'Hips',
  Legs: 'Legs',
  Feet: 'Feet',
  Pistol: 'Pistol',
  Ground: 'Ground',
  PlayerInventory: 'Inventory',
};

function humanizeSlot(slot?: string): string {
  if (!slot) return 'Unknown';
  return SLOT_LABELS[slot] ?? humanizeType(slot);
}

export function parseItemFromMeta(raw?: string): { name: string; classname?: string; pid?: string } {
  if (!raw) return { name: 'Item' };
  try {
    const obj = JSON.parse(raw) as { displayName?: string; classname?: string; pid?: string };
    const name = obj.displayName?.trim() || humanizeType(obj.classname) || 'Item';
    return { name, classname: obj.classname, pid: obj.pid?.trim() || undefined };
  } catch {
    const displayMatch = raw.match(/"displayName"\s*:\s*"([^"]+)"/);
    const classMatch = raw.match(/"classname"\s*:\s*"([^"]+)"/);
    const pidMatch = raw.match(/"pid"\s*:\s*"([^"]+)"/);
    const classname = classMatch?.[1];
    return {
      name: displayMatch?.[1]?.trim() || humanizeType(classname) || 'Item',
      classname,
      pid: pidMatch?.[1],
    };
  }
}

export function formatInventoryLocation(
  slot?: string,
  entity?: string
): string {
  if (!slot || slot === 'Ground') return 'Ground';

  const slotLabel = humanizeSlot(slot);
  if (!entity || entity === 'None' || entity.startsWith('Player')) {
    return slotLabel;
  }

  const entityType = entity.includes(':') ? entity.split(':').pop()! : entity;
  const container = humanizeType(entityType);
  if (container && container !== slotLabel && slot !== 'PlayerInventory') {
    return `${container} (${slotLabel})`;
  }
  return slotLabel;
}

export function inventoryItemName(meta: Record<string, string>): string {
  const named = meta.itemDisplayName?.trim();
  if (named && named !== 'Unknown') return named;
  const parsed = parseItemFromMeta(meta.item);
  if (parsed.name && parsed.name !== 'Item') return parsed.name;
  if (parsed.classname) return humanizeType(parsed.classname);
  return parsed.name || 'Item';
}

function formatInventoryEvent(event: PlayerEvent): string | null {
  const meta = event.metadata ?? {};
  const item = { ...parseItemFromMeta(meta.item), name: inventoryItemName(meta) };

  if (meta.action === 'IntoHands') {
    return `${item.name} moved to Hands`;
  }
  if (meta.action === 'OutOfHands') {
    return `${item.name} moved from Hands`;
  }

  const from = formatInventoryLocation(meta.from, meta.fromEntity);
  const to = formatInventoryLocation(meta.to, meta.toEntity);

  switch (event.event) {
    case 'ItemPickup':
      return `Picked up ${item.name}`;
    case 'ItemDrop':
      return `Dropped ${item.name}`;
    case 'ItemAttach':
      return meta.to ? `Attached ${item.name} to ${to}` : `Attached ${item.name}`;
    case 'ItemDetach':
      return meta.from ? `Detached ${item.name} from ${from}` : `Detached ${item.name}`;
    case 'ItemUse':
      return `Used ${item.name}`;
    case 'ItemMove':
      if (meta.from && meta.to) {
        return `${item.name} moved from ${from} to ${to}`;
      }
      return `${item.name} moved`;
    default:
      return null;
  }
}

function humanizeActionClass(actionClass?: string): string {
  if (!actionClass) return '';
  const stripped = actionClass
    .replace(/^Action/i, '')
    .replace(/(CB|Continuous)$/i, '')
    .trim();
  return humanizeType(stripped || actionClass);
}

function actionDetail(meta: Record<string, string>): string {
  const itemName = meta.itemDisplayName?.trim() || parseItemFromMeta(meta.item).name;
  if (itemName && itemName !== 'Item' && itemName !== 'Unknown') return itemName;
  if (meta.target) return humanizeType(meta.target);
  return '';
}

function formatActionLabel(meta: Record<string, string>, fallback: string): string {
  const action = humanizeActionClass(meta.actionClass);
  const detail = actionDetail(meta);
  if (action && detail && !action.toLowerCase().includes(detail.toLowerCase())) {
    return `${action} — ${detail}`;
  }
  if (action) return action;
  if (detail) return `${fallback} — ${detail}`;
  return fallback;
}

export function formatEventLabel(event: PlayerEvent): string {
  const meta = event.metadata ?? {};
  const base = EVENT_LABELS[event.event] ?? humanizeType(event.event);

  const inventoryLabel = formatInventoryEvent(event);
  if (inventoryLabel) return inventoryLabel;

  switch (event.event) {
    case 'PlayerDeath':
      return meta.killer ? `Died — killed by ${meta.killer}` : 'Died';
    case 'PlayerKilled':
      return meta.victim ? `Killed ${meta.victim}` : 'Killed Player';
    case 'DamageReceived':
      return meta.source ? `Took damage from ${meta.source}` : 'Took Damage';
    case 'DamageDealt':
      return meta.target ? `Dealt damage to ${humanizeType(meta.target)}` : 'Dealt Damage';
    case 'ZombieKill':
      return meta.zombieType ? `Killed ${humanizeType(meta.zombieType)}` : 'Killed Zombie';
    case 'AnimalKill':
    case 'BearKill':
    case 'WolfKill':
    case 'BoarKill':
    case 'DeerKill':
    case 'SheepKill':
    case 'GoatKill':
    case 'FoxKill':
    case 'HareKill':
    case 'HenKill':
    case 'CowKill':
      if (isAnimalKillEvent(event.event)) {
        return formatAnimalKillLabel(event.event, meta);
      }
      return meta.animalType ? `Killed ${humanizeType(meta.animalType)}` : 'Killed Animal';
    case 'BanditKill': {
      const banditType = meta.banditType ?? meta.targetType ?? meta.zombieType;
      return banditType ? `Killed ${humanizeType(banditType)}` : 'Killed Bandit';
    }
    case 'VehicleEnter':
      return meta.vehicle ? `Entered ${humanizeType(meta.vehicle)}` : 'Entered Vehicle';
    case 'VehicleExit':
      return meta.vehicle ? `Exited ${humanizeType(meta.vehicle)}` : 'Exited Vehicle';
    case 'VehicleCrash':
      return meta.vehicle ? `Crashed ${humanizeType(meta.vehicle)}` : 'Crashed Vehicle';
    case 'VehicleDamage':
      return meta.vehicle ? `${humanizeType(meta.vehicle)} damaged` : 'Vehicle Damaged';
    case 'ActionStart':
      return formatActionLabel(meta, 'Started Action');
    case 'ActionComplete':
      return formatActionLabel(meta, 'Completed Action');
    case 'ActionInterrupt':
      return formatActionLabel(meta, 'Action Interrupted');
    case 'Join':
      return meta.characterName ? `Logged in — ${meta.characterName}` : 'Logged In';
    case 'Disconnect':
      return meta.reason ? `Logged out — ${meta.reason}` : 'Logged Out';
    default:
      return base;
  }
}

/** Generic kind label for map chips — no item, zombie, or action names. */
export function formatMapChipLabel(event: PlayerEvent): string {
  return EVENT_LABELS[event.event] ?? humanizeType(event.event);
}

/** Extra inspector line: item, action, zombie, move path. */
export function formatMapInspectorDetail(event: PlayerEvent): string | null {
  const meta = event.metadata ?? {};
  const parts: string[] = [];
  const itemName = inventoryItemName(meta);
  const hasItem = itemName !== 'Item' && itemName !== 'Unknown';
  const action = humanizeActionClass(meta.actionClass);

  if (action && event.event.startsWith('Action')) parts.push(action);
  if (hasItem) parts.push(itemName);
  if (meta.target && event.event.startsWith('Action')) parts.push(humanizeType(meta.target));
  if (meta.zombieType) parts.push(humanizeType(meta.zombieType));
  if (meta.animalType) parts.push(humanizeType(meta.animalType));
  if (meta.from && meta.to && event.event === 'ItemMove') {
    parts.push(
      `${formatInventoryLocation(meta.from, meta.fromEntity)} → ${formatInventoryLocation(meta.to, meta.toEntity)}`
    );
  }

  const subtitle = formatEventSubtitle(event);
  if (subtitle) parts.push(subtitle);

  const title = formatEventLabel(event).toLowerCase();
  const unique = [...new Set(parts.filter((part) => part && !title.includes(part.toLowerCase())))];
  return unique.length > 0 ? unique.join(' · ') : null;
}

/** Short secondary line for toasts and popups */
export function formatEventSubtitle(event: PlayerEvent): string | null {
  const meta = event.metadata ?? {};
  const parts: string[] = [];

  if (meta.speed) parts.push(`${Math.round(Number(meta.speed))} km/h`);
  if (meta.damage) parts.push(`${meta.damage} dmg`);
  if (meta.distance) parts.push(`${Number(meta.distance).toFixed(0)}m`);
  if (meta.seat) parts.push(`seat ${meta.seat}`);
  if (meta.zone) parts.push(humanizeType(meta.zone));
  if (meta.action) parts.push(meta.action);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function isMapReplayNoiseEvent(event: PlayerEvent): boolean {
  return MAP_REPLAY_NOISE.has(event.event);
}

/** Events worth a map marker / label (skip high-frequency noise). */
export function isMapLabelEvent(event: PlayerEvent): boolean {
  if (isMapReplayNoiseEvent(event)) return false;
  if (event.event === 'PositionUpdate') return false;
  return true;
}

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  } catch {
    return iso;
  }
}

export function formatPosition(pos?: [number, number, number]): string {
  if (!pos) return '—';
  return `${pos[0].toFixed(0)} / ${pos[2].toFixed(0)} (X / Z)`;
}

export function xamMapLink(pos?: [number, number, number], mapSlug?: string): string | null {
  if (!pos) return null;
  const slug = mapSlug ?? resolveXamMapSlug(getCachedMapConfig());
  const base = xamMapBaseUrl(slug);
  return `${base}#${pos[0].toFixed(2)};${pos[2].toFixed(2)};5`;
}

export function steamProfileLink(steamId: string): string {
  return `https://steamcommunity.com/profiles/${steamId}`;
}

export function cftoolsProfileLink(cftoolsId: string): string {
  return `https://app.cftools.cloud/profile/${encodeURIComponent(cftoolsId)}`;
}
