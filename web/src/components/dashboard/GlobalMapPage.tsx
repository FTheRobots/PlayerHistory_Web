import { Loader2, RefreshCw } from 'lucide-react';
import { useRealtimeDashboard } from '../../hooks/useRealtimeDashboard';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../auth/permissions';
import { GlobalMapPanel } from './GlobalMapPanel';
import { GlobalMapChatPanel } from './GlobalMapChatPanel';
import { InstanceScopeBanner } from '../InstanceScopeBanner';

interface GlobalMapPageProps {
  onSelectPlayer: (steamId: string) => void;
  onTrackItem?: (pid: string) => void;
}

export function GlobalMapPage({ onSelectPlayer, onTrackItem }: GlobalMapPageProps) {
  const { hasPermission } = useAuth();
  const canViewChat = hasPermission(PERMISSIONS.CHAT_VIEW);
  const { data, loading, error, reload } = useRealtimeDashboard();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading map...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <h1 className="text-lg font-semibold text-text">
          Global map
          {data?.map?.displayName && (
            <span className="text-muted font-normal text-base ml-2">{data.map.displayName}</span>
          )}
        </h1>
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

      {error && (
        <div className="p-3 rounded border border-event-session/40 bg-event-session/10 text-sm text-event-session shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0 gap-3">
        <div className="flex-1 min-h-0">
          <GlobalMapPanel
            players={data?.onlinePlayers ?? []}
            serverMap={data?.map}
            onSelectPlayer={onSelectPlayer}
            onTrackItem={onTrackItem}
          />
        </div>
        {canViewChat && <GlobalMapChatPanel onSelectPlayer={onSelectPlayer} />}
      </div>
    </div>
  );
}
