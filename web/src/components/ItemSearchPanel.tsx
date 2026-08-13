import { useEffect, useRef, useState } from 'react';
import { Package, Loader2, Search } from 'lucide-react';
import { api } from '../api/client';
import type { ItemSummary } from '../types';
import { formatItemPidShort } from '../utils/itemHelpers';
import { formatTimestamp } from '../utils/eventHelpers';

interface ItemSearchPanelProps {
  steamId?: string;
  onTrack: (pid: string) => void;
  initialQuery?: string;
  /** When true and query is a full PID, open tracker immediately if item exists. */
  autoTrackPid?: boolean;
}

export function ItemSearchPanel({
  steamId,
  onTrack,
  initialQuery = '',
  autoTrackPid = false,
}: ItemSearchPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const autoTrackedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const trimmed = query.trim();
    const delay = trimmed ? 250 : 0;
    const timer = setTimeout(() => {
      const searchPromise = api.searchItems(trimmed || undefined, steamId, 50);
      const exactPid =
        /^\d+-\d+-\d+-\d+$/.test(trimmed) && !steamId
          ? api.getItemSummary(trimmed).catch(() => null)
          : Promise.resolve(null);

      Promise.all([searchPromise, exactPid])
        .then(([results, exact]) => {
          if (requestId !== requestIdRef.current) return;
          if (exact && !results.some((r) => r.pid === exact.pid)) {
            setItems([exact, ...results]);
          } else {
            setItems(results);
          }
          if (
            autoTrackPid &&
            !autoTrackedRef.current &&
            /^\d+-\d+-\d+-\d+$/.test(trimmed) &&
            (exact || results.some((r) => r.pid === trimmed))
          ) {
            autoTrackedRef.current = true;
            onTrack(trimmed);
          }
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setItems([]);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, steamId, autoTrackPid, onTrack]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (/^\d+-\d+-\d+-\d+$/.test(trimmed)) {
      onTrack(trimmed);
    }
  };

  const showFullSpinner = loading && items.length === 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative max-w-xl">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Item name, classname, or full PID (e.g. 1197078636-592119802-904010906-1499729226)"
          className="w-full bg-input border border-border rounded-sm pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent font-mono"
        />
        {loading && items.length > 0 && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-dim" />
        )}
      </form>

      {showFullSpinner && (
        <div className="flex items-center text-muted text-sm py-8">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading items…
        </div>
      )}

      {!showFullSpinner && !loading && items.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          {steamId
            ? 'No tracked items for this player yet. Item PIDs are logged on pickup, move, and drop after mod update.'
            : 'No tracked items found.'}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.pid}
            type="button"
            onClick={() => onTrack(item.pid)}
            className="w-full text-left p-3 rounded border border-border bg-panel hover:border-event-inventory/50 hover:bg-event-inventory/5 transition-colors"
          >
            <div className="flex items-start gap-2">
              <Package size={16} className="text-event-inventory shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-text truncate">
                  {item.name ?? item.classname ?? 'Unknown item'}
                </div>
                <div className="text-xs font-mono text-dim mt-0.5">{formatItemPidShort(item.pid)}</div>
                <div className="text-xs text-muted mt-1">
                  {item.eventCount} events
                  {item.lastSeen && ` · ${formatTimestamp(item.lastSeen)}`}
                  {item.lastPlayerName && ` · ${item.lastPlayerName}`}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
