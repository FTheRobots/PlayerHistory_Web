import { PERMISSIONS, type Permission } from '../auth/permissions';
import { canViewInstances } from './instanceAccess';

export const ADMIN_AREA_PERMISSIONS: Permission[] = [
  PERMISSIONS.INSTANCES_VIEW,
  PERMISSIONS.INSTANCES_MANAGE,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.BANS_VIEW,
  PERMISSIONS.WATCHLIST_VIEW,
  PERMISSIONS.CFTOOLS_MANAGE,
];

export function hasAdminAreaAccess(hasPermission: (p: Permission) => boolean): boolean {
  return ADMIN_AREA_PERMISSIONS.some(hasPermission);
}

/** Relative admin tab path (under /admin). */
export function firstAdminTab(hasPermission: (p: Permission) => boolean): string {
  if (hasPermission(PERMISSIONS.USERS_MANAGE)) return 'users';
  if (canViewInstances(hasPermission)) return 'instances';
  if (hasPermission(PERMISSIONS.AUDIT_VIEW)) return 'audit';
  if (hasPermission(PERMISSIONS.BANS_VIEW)) return 'bans';
  if (hasPermission(PERMISSIONS.WATCHLIST_VIEW)) return 'watchlist';
  if (hasPermission(PERMISSIONS.CFTOOLS_MANAGE)) return 'cftools';
  return 'users';
}
