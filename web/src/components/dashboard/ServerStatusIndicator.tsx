import { useBackendStatus } from '../../hooks/useBackendStatus';
import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard';

function StatusBadge({
  label,
  online,
  loading,
  title,
  onlineClass,
  dotClass = 'bg-green-bright shadow-[0_0_8px_rgba(74,222,128,0.8)]',
}: {
  label: string;
  online: boolean;
  loading?: boolean;
  title: string;
  onlineClass: string;
  dotClass?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border text-xs text-muted">
        <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
        Checking…
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-semibold uppercase tracking-wide ${
        online
          ? onlineClass
          : 'border-event-combat/40 bg-event-combat/10 text-event-combat'
      }`}
      title={title}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          online ? dotClass : 'bg-event-combat shadow-[0_0_8px_rgba(229,83,75,0.6)]'
        }`}
      />
      {label}
    </div>
  );
}

export function ServerStatusIndicator() {
  const { online: backendOnline, loading: backendLoading, error: backendError } = useBackendStatus();
  const { online: gameOnline, loading: gameLoading, error: gameError } = useRealtimeDashboard();

  const gameServerOnline = gameOnline && !gameError;
  const backendIsOnline = backendOnline === true;

  return (
    <div className="flex items-center gap-2">
      <StatusBadge
        label={backendIsOnline ? 'Backend online' : 'Backend offline'}
        online={backendIsOnline}
        loading={backendLoading}
        title={
          backendIsOnline
            ? 'Connected to PlayerHistory API'
            : backendError ?? 'Cannot reach PlayerHistory API — check server URL and that the backend is running'
        }
        onlineClass="border-accent/40 bg-accent/10 text-accent-bright"
        dotClass="bg-accent-bright shadow-[0_0_8px_rgba(56,189,248,0.8)]"
      />
      <StatusBadge
        label={gameServerOnline ? 'Server online' : 'Server offline'}
        online={gameServerOnline}
        loading={gameLoading && backendIsOnline}
        title={
          gameServerOnline
            ? 'DayZ server is writing live snapshots'
            : gameError ?? 'No recent server snapshot — DayZ server may be offline or mod not running'
        }
        onlineClass="border-green/40 bg-green/10 text-green-bright"
      />
    </div>
  );
}
