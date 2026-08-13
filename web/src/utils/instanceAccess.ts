import { PERMISSIONS, type Permission } from '../auth/permissions';

export function canViewInstances(hasPermission: (p: Permission) => boolean): boolean {
  return hasPermission(PERMISSIONS.INSTANCES_VIEW) || hasPermission(PERMISSIONS.INSTANCES_MANAGE);
}

export function canManageInstances(hasPermission: (p: Permission) => boolean): boolean {
  return hasPermission(PERMISSIONS.INSTANCES_MANAGE);
}
