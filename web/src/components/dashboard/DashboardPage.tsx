import { Loader2, RefreshCw } from 'lucide-react';
import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard';
import { useDashboardAdminCommand } from '../../hooks/useDashboardAdminCommand';
import { InstanceScopeBanner } from '../InstanceScopeBanner';
import type { DashboardServerStats } from '../../types';
import { ServerStatsBar } from './ServerStatsBar';
import { OnlinePlayersTable } from './OnlinePlayersTable';

const EMPTY_STATS: DashboardServerStats = {
  timestamp: new Date(0).toISOString(),
  playerCount: 0,
  totalPlayers: 0,
  eventsLastHour: 0,
  eventsLast24h: 0,
  snapshotAvailable: false,
};

interface DashboardPageProps {
  onSelectPlayer: (steamId: string) => void;
}

export function DashboardPage({ onSelectPlayer }: DashboardPageProps) {
  const { data, loading, error, reload, live } = useRealtimeDashboard();
  const { notice: adminNotice, runAdminCommand, clearNotice } = useDashboardAdminCommand(reload);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold text-text">Server dashboard</h1>
        <InstanceScopeBanner />
        <button
          type="button"
          onClick={() => reload()}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-sm text-muted hover:text-accent-bright"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {adminNotice && (
        <div className="p-3 rounded border border-accent/40 bg-accent-soft text-sm text-accent-bright font-mono">
          {adminNotice}
          <button
            type="button"
            onClick={clearNotice}
            className="ml-3 text-xs text-muted hover:text-text underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded border border-event-session/40 bg-event-session/10 text-sm text-event-session">
          {error}
        </div>
      )}

      {(data || error) && (
        <>
          <ServerStatsBar stats={data?.server ?? EMPTY_STATS} live={live} />

          {data && (
            <>
              <OnlinePlayersTable
                players={data.onlinePlayers}
                cftoolsConfigured={data.cftools?.configured}
                onSelectPlayer={onSelectPlayer}
                onAdminCommand={runAdminCommand}
                adminNotice={adminNotice}
              />

              {!live && !error && (
                <p className="text-xs text-dim">
                  Live server stats and the online player list require a recent{' '}
                  <code className="text-muted">server.json</code> from the DayZ server. If this persists,
                  lower <code className="text-muted">serverSnapshotIntervalSeconds</code> in mod config
                  (recommended 10–30s).
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
