/** Human-readable labels for permission keys (server catalog is source of truth for groups). */
export function permissionLabel(permission: string): string {
  return permission
    .split('.')
    .map((part) => part.replace(/_/g, ' '))
    .join(' · ');
}
