import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Activity, LogOut, Loader2 } from 'lucide-react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PlayerSearch } from './components/PlayerSearch';
import { ContainerStorageModal } from './components/ContainerStorageModal';
import { ItemTrackerModal } from './components/ItemTrackerModal';
import { ServerStatusIndicator } from './components/dashboard/ServerStatusIndicator';
import { ConnectPage } from './pages/ConnectPage';
import { LoginPage } from './pages/LoginPage';
import { AlertBell } from './components/AlertBell';
import { ServerInstanceSelector } from './components/ServerInstanceSelector';
import { VersionInfo, VersionMismatchBanner } from './components/VersionInfo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { PERMISSIONS, type Permission } from './auth/permissions';
import { hasAdminAreaAccess } from './utils/adminAccess';
import { canViewInstances } from './utils/instanceAccess';
import { comparePlayersQuery, MAX_COMPARE_PLAYERS, parseComparePlayersParam } from './utils/playerColors';
import type { ContainerQuery } from './utils/containerHelpers';

import { DashboardPage } from './components/dashboard/DashboardPage';
const GlobalMapPage = lazy(() =>
  import('./components/dashboard/GlobalMapPage').then((m) => ({ default: m.GlobalMapPage }))
);
const TimelineView = lazy(() =>
  import('./components/TimelineView').then((m) => ({ default: m.TimelineView }))
);
const CompareTimelineView = lazy(() =>
  import('./components/CompareTimelineView').then((m) => ({ default: m.CompareTimelineView }))
);
const ItemSearchPage = lazy(() =>
  import('./pages/ItemSearchPage').then((m) => ({ default: m.ItemSearchPage }))
);
const AdvancedSearchPage = lazy(() =>
  import('./pages/AdvancedSearchPage').then((m) => ({ default: m.AdvancedSearchPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const PlayerInventoryPage = lazy(() =>
  import('./pages/PlayerInventoryPage').then((m) => ({ default: m.PlayerInventoryPage }))
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('./pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const BansPage = lazy(() => import('./pages/BansPage').then((m) => ({ default: m.BansPage })));
const WatchlistPage = lazy(() =>
  import('./pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage }))
);
const CFToolsPage = lazy(() =>
  import('./pages/CFToolsPage').then((m) => ({ default: m.CFToolsPage }))
);
const InstancesPage = lazy(() =>
  import('./pages/InstancesPage').then((m) => ({ default: m.InstancesPage }))
);
const AdminIndexRedirect = lazy(() =>
  import('./pages/AdminIndexRedirect').then((m) => ({ default: m.AdminIndexRedirect }))
);

function firstAvailablePath(hasPermission: (p: Permission) => boolean): string {
  if (hasPermission(PERMISSIONS.DASHBOARD_VIEW)) return '/';
  if (hasPermission(PERMISSIONS.MAP_VIEW)) return '/map';
  if (hasPermission(PERMISSIONS.ITEMS_SEARCH)) return '/items';
  if (hasPermission(PERMISSIONS.ANALYTICS_VIEW)) return '/analytics';
  if (hasPermission(PERMISSIONS.QUERY_VIEW)) return '/search';
  if (hasPermission(PERMISSIONS.INVENTORY_VIEW)) return '/inventory';
  if (hasAdminAreaAccess(hasPermission)) return '/admin';
  return '/';
}

function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center text-muted gap-2">
      <Loader2 className="animate-spin" size={18} />
      Loading...
    </div>
  );
}

function mainNavClass({ isActive }: { isActive: boolean }) {
  return `px-4 py-2 text-sm border-b-2 transition-colors ${
    isActive
      ? 'border-accent text-accent-bright font-medium'
      : 'border-transparent text-muted hover:text-text'
  }`;
}

function PlayerTimelineRoute({
  onPlayerDeleted,
  onTrackItem,
  onViewContainer,
}: {
  onPlayerDeleted: () => void;
  onTrackItem: (pid: string | null) => void;
  onViewContainer: (query: ContainerQuery) => void;
}) {
  const { steamId } = useParams<{ steamId: string }>();
  const navigate = useNavigate();

  if (!steamId) return <Navigate to="/" replace />;

  return (
    <TimelineView
      steamId={steamId}
      onTrackItem={onTrackItem}
      onViewContainer={onViewContainer}
      onPlayerDeleted={() => {
        onPlayerDeleted();
        navigate('/');
      }}
    />
  );
}

function CompareTimelineRoute({
  onTrackItem,
  onViewContainer,
}: {
  onTrackItem: (pid: string | null) => void;
  onViewContainer: (query: ContainerQuery) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const steamIds = parseComparePlayersParam(searchParams.get('players'));

  if (steamIds.length < 2) {
    return <Navigate to="/" replace />;
  }

  const updatePlayers = (next: string[]) => {
    if (next.length < 2) {
      navigate(next.length === 1 ? `/player/${next[0]}` : '/');
      return;
    }
    setSearchParams({ players: comparePlayersQuery(next) }, { replace: true });
  };

  return (
    <CompareTimelineView
      steamIds={steamIds}
      onRemovePlayer={(id) => updatePlayers(steamIds.filter((s) => s !== id))}
      onSelectPlayer={(id) => navigate(`/player/${id}`)}
      onTrackItem={onTrackItem}
      onViewContainer={onViewContainer}
    />
  );
}

function AuthenticatedApp() {
  const [playerListKey, setPlayerListKey] = useState(0);
  const [trackedItemPid, setTrackedItemPid] = useState<string | null>(null);
  const [containerQuery, setContainerQuery] = useState<ContainerQuery | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission, activeInstance, serverUrl, changeServer, serverHealth } = useAuth();
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const selectedSteamId = location.pathname.startsWith('/player/')
    ? location.pathname.split('/player/')[1]?.split('/')[0]
    : undefined;
  const isCompareRoute = location.pathname === '/compare';

  useEffect(() => {
    if (isCompareRoute) {
      const params = new URLSearchParams(location.search);
      setCompareSelection(parseComparePlayersParam(params.get('players')));
    }
  }, [isCompareRoute, location.search]);

  const toggleCompare = useCallback((steamId: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(steamId)) {
        return prev.filter((id) => id !== steamId);
      }
      if (prev.length >= MAX_COMPARE_PLAYERS) return prev;
      return [...prev, steamId];
    });
  }, []);

  const startCompare = useCallback(
    (steamIds: string[]) => {
      const ids = [...new Set(steamIds)].slice(0, MAX_COMPARE_PLAYERS);
      if (ids.length < 2) return;
      navigate(`/compare?players=${comparePlayersQuery(ids)}`);
    },
    [navigate]
  );

  return (
    <div className="h-screen flex flex-col">
      <VersionMismatchBanner serverHealth={serverHealth} />
      <header className="border-b border-border bg-input shrink-0">
        <div className="flex items-center gap-3 px-5 py-2.5 min-h-[44px]">
          <NavLink to="/" className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity">
            <Activity className="text-accent-bright shrink-0" size={20} />
            <div>
              <div className="font-semibold text-sm text-text tracking-wide">Player History</div>
              <div className="text-[11px] text-muted uppercase tracking-wider">DayZ Server Dashboard</div>
            </div>
          </NavLink>

          <ServerInstanceSelector />

          <nav className="flex-1 flex items-center justify-center gap-1">
            {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && (
              <NavLink to="/" end className={mainNavClass}>
                Server dashboard
              </NavLink>
            )}
            {hasPermission(PERMISSIONS.MAP_VIEW) && (
              <NavLink to="/map" className={mainNavClass}>
                Global map
              </NavLink>
            )}
            {hasPermission(PERMISSIONS.ITEMS_SEARCH) && (
              <NavLink to="/items" className={mainNavClass}>
                Item search
              </NavLink>
            )}
            {hasPermission(PERMISSIONS.ANALYTICS_VIEW) && (
              <NavLink to="/analytics" className={mainNavClass}>
                Analytics
              </NavLink>
            )}
            {hasPermission(PERMISSIONS.QUERY_VIEW) && (
              <NavLink to="/search" className={mainNavClass}>
                Search
              </NavLink>
            )}
            {hasPermission(PERMISSIONS.INVENTORY_VIEW) && (
              <NavLink to="/inventory" className={mainNavClass}>
                Player inventory
              </NavLink>
            )}
            {hasAdminAreaAccess(hasPermission) && (
              <NavLink to="/admin" end={false} className={mainNavClass}>
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <VersionInfo serverHealth={serverHealth} compact />
            <ServerStatusIndicator />
            <AlertBell />
            {serverUrl && (
              <button
                type="button"
                onClick={() => void changeServer()}
                className="text-xs text-muted hover:text-accent hidden md:inline truncate max-w-[160px]"
                title={`Switch server (${serverUrl})`}
              >
                {serverUrl.replace(/^https?:\/\//, '')}
              </button>
            )}
            <span className="text-xs text-muted hidden sm:inline">{user?.username}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="p-1.5 text-muted hover:text-text rounded"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {hasPermission(PERMISSIONS.PLAYERS_VIEW) && (
          <aside className="w-72 shrink-0 border-r border-border bg-panel flex flex-col">
            <PlayerSearch
              key={`${playerListKey}-${activeInstance?.id ?? 'default'}`}
              onSelect={(id) => navigate(`/player/${id}`)}
              selectedId={isCompareRoute ? undefined : selectedSteamId}
              compareSelection={compareSelection}
              onToggleCompare={hasPermission(PERMISSIONS.TIMELINE_VIEW) ? toggleCompare : undefined}
              onCompare={hasPermission(PERMISSIONS.TIMELINE_VIEW) ? startCompare : undefined}
            />
          </aside>
        )}

        <main className="flex-1 overflow-hidden bg-deep">
          <ErrorBoundary fallbackTitle="This page crashed">
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                hasPermission(PERMISSIONS.DASHBOARD_VIEW) ? (
                  <DashboardPage onSelectPlayer={(id) => navigate(`/player/${id}`)} />
                ) : firstAvailablePath(hasPermission) !== '/' ? (
                  <Navigate to={firstAvailablePath(hasPermission)} replace />
                ) : (
                  <div className="p-8 text-sm text-muted">No pages are available for this account.</div>
                )
              }
            />
            {hasPermission(PERMISSIONS.MAP_VIEW) && (
              <Route
                path="/map"
                element={
                  <GlobalMapPage
                    onSelectPlayer={(id) => navigate(`/player/${id}`)}
                    onTrackItem={setTrackedItemPid}
                  />
                }
              />
            )}
            {hasPermission(PERMISSIONS.ITEMS_SEARCH) && (
              <Route
                path="/items"
                element={<ItemSearchPage onTrackItem={setTrackedItemPid} />}
              />
            )}
            {hasPermission(PERMISSIONS.ANALYTICS_VIEW) && (
              <Route path="/analytics" element={<AnalyticsPage />} />
            )}
            {hasPermission(PERMISSIONS.QUERY_VIEW) && (
              <Route path="/search" element={<AdvancedSearchPage />} />
            )}
            {hasPermission(PERMISSIONS.INVENTORY_VIEW) && (
              <Route
                path="/inventory"
                element={
                  <PlayerInventoryPage
                    onSelectPlayer={(id) => navigate(`/player/${id}`)}
                    onTrackItem={setTrackedItemPid}
                    initialSteamId={selectedSteamId}
                  />
                }
              />
            )}
            {hasPermission(PERMISSIONS.TIMELINE_VIEW) && (
              <>
                <Route
                  path="/compare"
                  element={
                    <CompareTimelineRoute
                      onTrackItem={setTrackedItemPid}
                      onViewContainer={
                        hasPermission(PERMISSIONS.ITEMS_SEARCH) ? setContainerQuery : () => {}
                      }
                    />
                  }
                />
                <Route
                  path="/player/:steamId"
                  element={
                    <PlayerTimelineRoute
                      onPlayerDeleted={() => setPlayerListKey((k) => k + 1)}
                      onTrackItem={setTrackedItemPid}
                      onViewContainer={
                        hasPermission(PERMISSIONS.ITEMS_SEARCH) ? setContainerQuery : () => {}
                      }
                    />
                  }
                />
              </>
            )}
            {hasAdminAreaAccess(hasPermission) && (
              <Route path="/admin" element={<AdminPage />}>
                <Route index element={<AdminIndexRedirect />} />
                {canViewInstances(hasPermission) && (
                  <Route path="instances" element={<InstancesPage />} />
                )}
                {hasPermission(PERMISSIONS.USERS_MANAGE) && (
                  <>
                    <Route path="users" element={<UsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                  </>
                )}
                {hasPermission(PERMISSIONS.AUDIT_VIEW) && <Route path="audit" element={<AuditPage />} />}
                {hasPermission(PERMISSIONS.BANS_VIEW) && <Route path="bans" element={<BansPage />} />}
                {hasPermission(PERMISSIONS.WATCHLIST_VIEW) && (
                  <Route path="watchlist" element={<WatchlistPage />} />
                )}
                {hasPermission(PERMISSIONS.CFTOOLS_MANAGE) && (
                  <Route path="cftools" element={<CFToolsPage />} />
                )}
              </Route>
            )}
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>

          <ItemTrackerModal
            pid={trackedItemPid}
            onClose={() => setTrackedItemPid(null)}
            onSelectPlayer={(id) => navigate(`/player/${id}`)}
            onTrackItem={setTrackedItemPid}
            onViewContainer={hasPermission(PERMISSIONS.ITEMS_SEARCH) ? setContainerQuery : undefined}
          />

          {hasPermission(PERMISSIONS.ITEMS_SEARCH) && (
            <ContainerStorageModal
              query={containerQuery}
              onClose={() => setContainerQuery(null)}
              onSelectPlayer={(id) => navigate(`/player/${id}`)}
              onTrackItem={setTrackedItemPid}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, needsSetup, connected } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-muted">
        Loading...
      </div>
    );
  }

  if (!connected) {
    return <ConnectPage />;
  }

  if (!user || needsSetup) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary fallbackTitle="The admin app crashed after sign-in">
      <AuthenticatedApp />
    </ErrorBoundary>
  );
}
