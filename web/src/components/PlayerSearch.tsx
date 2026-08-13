import { useState, useEffect, useMemo, memo } from 'react';
import { Search, User, ExternalLink, RefreshCw, Circle, GitCompare, CheckSquare, Square } from 'lucide-react';
import { api } from '../api/client';
import type { PlayerSummary } from '../types';
import { steamProfileLink } from '../utils/eventHelpers';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import { MAX_COMPARE_PLAYERS } from '../utils/playerColors';
import { usePageVisible } from '../hooks/usePageVisible';

interface PlayerSearchProps {
  onSelect: (steamId: string) => void;
  selectedId?: string;
  compareSelection?: string[];
  onToggleCompare?: (steamId: string) => void;
  onCompare?: (steamIds: string[]) => void;
  refreshIntervalMs?: number;
}

const PlayerRow = memo(function PlayerRow({
  player,
  selectedId,
  compareSelected,
  onSelect,
  onToggleCompare,
  online = false,
}: {
  player: PlayerSummary;
  selectedId?: string;
  compareSelected?: boolean;
  onSelect: (steamId: string) => void;
  onToggleCompare?: (steamId: string) => void;
  online?: boolean;
}) {
  const selected = selectedId === player.steamId;

  return (
    <div
      className={`w-full flex items-stretch border-b border-surface-border/50 hover:bg-surface-overlay transition-colors ${
        selected
          ? online
            ? 'bg-green/10 border-l-2 border-l-green'
            : 'bg-accent-soft border-l-2 border-l-accent'
          : compareSelected
            ? 'bg-accent/5 border-l-2 border-l-accent/40'
            : online
              ? 'border-l-2 border-l-transparent hover:border-l-green/40'
              : ''
      }`}
    >
      {onToggleCompare && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(player.steamId);
          }}
          className="px-2 shrink-0 flex items-center text-dim hover:text-accent"
          title={compareSelected ? 'Remove from compare' : 'Add to compare'}
        >
          {compareSelected ? <CheckSquare size={14} className="text-accent" /> : <Square size={14} />}
        </button>
      )}
      <button type="button" onClick={() => onSelect(player.steamId)} className="flex-1 text-left px-2 py-3 min-w-0">
        <div className="flex items-center gap-2">
          {online ? (
            <Circle size={10} className="text-green shrink-0 fill-green" />
          ) : (
            <User size={14} className="text-muted shrink-0" />
          )}
          <span
            className={`font-medium text-sm truncate ${online ? 'text-green-bright' : 'text-text'}`}
          >
            {player.characterName ?? 'Unknown'}
          </span>
        </div>
        <div className={`text-xs font-mono mt-0.5 pl-5 ${online ? 'text-green/70' : 'text-muted'}`}>
          {player.steamId}
        </div>
        <div className={`text-xs mt-1 pl-5 ${online ? 'text-green/60' : 'text-dim'}`}>
          {(player.totalEvents ?? 0).toLocaleString()} events
          {player.lastSeen && ` · ${new Date(player.lastSeen).toLocaleDateString()}`}
        </div>
      </button>
    </div>
  );
});

export function PlayerSearch({
  onSelect,
  selectedId,
  compareSelection = [],
  onToggleCompare,
  onCompare,
  refreshIntervalMs = 10000,
}: PlayerSearchProps) {
  const { hasPermission } = useAuth();
  const canReindex = hasPermission(PERMISSIONS.SERVER_REINDEX);
  const pageVisible = usePageVisible();
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadPlayers = async (search?: string, soft = false) => {
    if (!soft) setLoading(true);
    try {
      const result = await api.listPlayers(search || undefined, 30);
      setPlayers(result.data);
      setLastRefresh(new Date());
    } catch {
      if (!soft) setPlayers([]);
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPlayers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!refreshIntervalMs || !pageVisible) return;
    const id = window.setInterval(() => {
      void loadPlayers(query, true);
    }, refreshIntervalMs);
    return () => window.clearInterval(id);
  }, [query, refreshIntervalMs, pageVisible]);

  const { onlinePlayers, offlinePlayers } = useMemo(() => {
    const online = players.filter((p) => p.isOnline);
    const offline = players.filter((p) => !p.isOnline);
    online.sort((a, b) => (a.characterName ?? '').localeCompare(b.characterName ?? ''));
    return { onlinePlayers: online, offlinePlayers: offline };
  }, [players]);

  const handleReindex = async () => {
    setIndexing(true);
    try {
      await api.triggerIndex();
      await loadPlayers(query);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-sm text-muted">Players</h2>
          {lastRefresh && (
            <span className="text-[10px] text-dim" title={lastRefresh.toLocaleString()}>
              auto-refresh
            </span>
          )}
          {canReindex && (
          <button
            type="button"
            onClick={handleReindex}
            disabled={indexing}
            className="ml-auto p-1.5 text-dim hover:text-accent rounded transition-colors disabled:opacity-50"
            title="Re-index logs"
          >
            <RefreshCw size={14} className={indexing ? 'animate-spin' : ''} />
          </button>
          )}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="text"
            placeholder="Search SteamID or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && players.length === 0 && (
          <div className="p-4 text-sm text-muted">Loading...</div>
        )}
        {!loading && players.length === 0 && (
          <div className="p-4 text-sm text-muted">
            No players found. Run the server mod and re-index.
          </div>
        )}

        {onlinePlayers.length > 0 && (
          <div>
            <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-green border-b border-border/60 bg-green/5 sticky top-0 z-10">
              Online Players ({onlinePlayers.length})
            </div>
            {onlinePlayers.map((p) => (
              <PlayerRow
                key={p.steamId}
                player={p}
                selectedId={selectedId}
                compareSelected={compareSelection.includes(p.steamId)}
                onSelect={onSelect}
                onToggleCompare={onToggleCompare}
                online
              />
            ))}
          </div>
        )}

        {offlinePlayers.length > 0 && (
          <div>
            {onlinePlayers.length > 0 && (
              <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-dim border-b border-border/60 bg-panel sticky top-0 z-10">
                All Players
              </div>
            )}
            {offlinePlayers.map((p) => (
              <PlayerRow
                key={p.steamId}
                player={p}
                selectedId={selectedId}
                compareSelected={compareSelection.includes(p.steamId)}
                onSelect={onSelect}
                onToggleCompare={onToggleCompare}
              />
            ))}
          </div>
        )}
      </div>

      {onCompare && compareSelection.length >= 2 && (
        <div className="p-3 border-t border-border bg-panel shrink-0">
          <button
            type="button"
            onClick={() => onCompare(compareSelection)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded bg-accent text-white hover:bg-accent-bright transition-colors"
          >
            <GitCompare size={16} />
            Compare {compareSelection.length} players
          </button>
          <p className="text-[10px] text-dim text-center mt-1.5">
            Select up to {MAX_COMPARE_PLAYERS} with checkboxes
          </p>
        </div>
      )}
    </div>
  );
}

export function PlayerHeader({ steamId, name }: { steamId: string; name?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        <h1 className="text-lg font-semibold">{name ?? 'Player Timeline'}</h1>
        <a
          href={steamProfileLink(steamId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted font-mono hover:text-accent inline-flex items-center gap-1"
        >
          {steamId}
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
