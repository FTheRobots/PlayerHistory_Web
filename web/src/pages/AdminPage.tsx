import { NavLink, Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import { canViewInstances } from '../utils/instanceAccess';

function tabClass({ isActive }: { isActive: boolean }) {
  return `px-4 py-2 text-sm border-b-2 transition-colors ${
    isActive
      ? 'border-accent text-accent-bright font-medium'
      : 'border-transparent text-muted hover:text-text'
  }`;
}

export function AdminPage() {
  const { hasPermission } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4 bg-panel/40">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={20} className="text-accent" />
          <h1 className="text-lg font-semibold text-text">Administration</h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {canViewInstances(hasPermission) && (
            <NavLink to="/admin/instances" className={tabClass}>
              Instances
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.USERS_MANAGE) && (
            <NavLink to="/admin/users" className={tabClass}>
              Users
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.USERS_MANAGE) && (
            <NavLink to="/admin/roles" className={tabClass}>
              Roles
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.AUDIT_VIEW) && (
            <NavLink to="/admin/audit" className={tabClass}>
              Audit log
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.BANS_VIEW) && (
            <NavLink to="/admin/bans" className={tabClass}>
              Bans
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.WATCHLIST_VIEW) && (
            <NavLink to="/admin/watchlist" className={tabClass}>
              Watchlist
            </NavLink>
          )}
          {hasPermission(PERMISSIONS.CFTOOLS_MANAGE) && (
            <NavLink to="/admin/cftools" className={tabClass}>
              CFTools
            </NavLink>
          )}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
