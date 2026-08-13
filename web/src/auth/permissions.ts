export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  PLAYERS_VIEW: 'players.view',
  TIMELINE_VIEW: 'timeline.view',
  MAP_VIEW: 'map.view',
  CHAT_VIEW: 'chat.view',
  ITEMS_SEARCH: 'items.search',
  DEATHS_VIEW: 'deaths.view',
  DEATHS_VIEW_RESTORED: 'deaths.view_restored',
  DEATHS_RESTORE: 'deaths.restore',
  DEATHS_RERESTORE: 'deaths.rerestore',
  DEATHS_DELETE: 'deaths.delete',
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_VIEW_RESTORED: 'inventory.view_restored',
  INVENTORY_RESTORE: 'inventory.restore',
  INVENTORY_RERESTORE: 'inventory.rerestore',
  INVENTORY_DELETE: 'inventory.delete',
  ADMIN_HEAL: 'admin.heal',
  ADMIN_KILL: 'admin.kill',
  ADMIN_KICK: 'admin.kick',
  ADMIN_BAN: 'admin.ban',
  ADMIN_MESSAGE: 'admin.message',
  ADMIN_TELEPORT: 'admin.teleport',
  ADMIN_SPAWN: 'admin.spawn',
  ADMIN_DELETE_ITEM: 'admin.delete_item',
  ADMIN_CAPTURE_INVENTORY: 'admin.capture_inventory',
  SERVER_REINDEX: 'server.reindex',
  SERVER_CLEAR_INDEX: 'server.clear_index',
  INSTANCES_VIEW: 'instances.view',
  INSTANCES_MANAGE: 'instances.manage',
  PLAYERS_DELETE_DATA: 'players.delete_data',
  USERS_MANAGE: 'users.manage',
  AUDIT_VIEW: 'audit.view',
  BANS_VIEW: 'bans.view',
  BANS_MANAGE: 'bans.manage',
  WATCHLIST_VIEW: 'watchlist.view',
  WATCHLIST_MANAGE: 'watchlist.manage',
  CFTOOLS_VIEW: 'cftools.view',
  CFTOOLS_MANAGE: 'cftools.manage',
  QUERY_VIEW: 'query.view',
  QUERY_MANAGE: 'query.manage',
  ANALYTICS_VIEW: 'analytics.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleName = string;

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  permissionGrants: string[];
  permissionDenies: string[];
}
