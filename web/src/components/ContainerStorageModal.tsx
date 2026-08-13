import { useEffect, useMemo, useState } from 'react';
import { Archive, Loader2, Package, User, X } from 'lucide-react';
import { api } from '../api/client';
import type { ContainerStorageEvent } from '../types';
import type { ContainerQuery } from '../utils/containerHelpers';
import { containerDisplayTitle, formatContainerPosition } from '../utils/containerHelpers';
import { formatTimestamp } from '../utils/eventHelpers';
import { extractItemPidFromEvent } from '../utils/itemHelpers';
import { parseItemFromMeta } from '../utils/eventHelpers';

interface ContainerStorageModalProps {
  query: ContainerQuery | null;
  onClose: () => void;
  onSelectPlayer?: (steamId: string) => void;
  onTrackItem?: (pid: string) => void;
}

export function ContainerStorageModal({
  query,
  onClose,
  onSelectPlayer,
  onTrackItem,
}: ContainerStorageModalProps) {
  const [entries, setEntries] = useState<ContainerStorageEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeWithdrawals, setIncludeWithdrawals] = useState(false);

  useEffect(() => {
    if (!query) {
      setEntries([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getItemsAtContainer({
        x: query.x,
        z: query.z,
        radius: query.radius ?? 0.5,
        containerPid: query.containerPid,
        limit: 500,
      })
      .then((result) => setEntries(result.data))
      .catch((err) => {
        setError(String(err));
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [query]);

  const visible = useMemo(() => {
    if (includeWithdrawals) return entries;
    return entries.filter((entry) => entry.direction === 'into');
  }, [entries, includeWithdrawals]);

  if (!query) return null;

  const title = containerDisplayTitle(query);

  return (
    <div className="fixed inset-0 z-[2000] flex items-stretch justify-end bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-panel border-l border-border shadow-panel flex flex-col h-full">
        <div className="flex items-start gap-3 p-4 border-b border-border shrink-0">
          <div className="p-2 rounded-sm bg-event-world/15 border border-event-world/30 text-event-world">
            <Archive size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text truncate">{title}</h2>
            <p className="text-xs font-mono text-muted mt-0.5">{formatContainerPosition(query)}</p>
            {query.containerPid && (
              <p className="text-xs text-dim mt-1 font-mono break-all" title={query.containerPid}>
                Container PID {query.containerPid}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-sm hover:bg-grey-btn transition-colors"
            aria-label="Close container history"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border/60 flex flex-wrap items-center gap-3 text-xs shrink-0">
          <div>
            <div className="text-dim uppercase tracking-wide text-[10px]">Deposits shown</div>
            <div className="text-text font-semibold">{visible.length.toLocaleString()}</div>
          </div>
          <label className="ml-auto flex items-center gap-2 text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeWithdrawals}
              onChange={(e) => setIncludeWithdrawals(e.target.checked)}
              className="rounded-sm border-border accent-accent"
            />
            Include removals
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted">
              <Loader2 className="animate-spin mr-2" size={18} />
              Loading container history…
            </div>
          )}

          {error && (
            <div className="p-3 rounded border border-danger/40 bg-danger/10 text-sm text-event-combat">
              {error}
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">
              No items recorded at this storage location yet. New moves need the updated PlayerHistory mod
              with container position logging.
            </div>
          )}

          {!loading &&
            visible.map((entry, i) => {
              const event = entry.event;
              const meta = event.metadata ?? {};
              const item = parseItemFromMeta(meta.item);
              const pid = extractItemPidFromEvent(event);
              const playerName = event.playerName ?? event.steamid;

              return (
                <div
                  key={`${event.timestamp}-${event.event}-${i}`}
                  className="border border-border rounded-lg p-3 bg-surface-raised/40 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <Package size={16} className="text-event-inventory shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {pid && onTrackItem ? (
                          <button
                            type="button"
                            onClick={() => onTrackItem(pid)}
                            className="font-medium text-sm text-event-inventory hover:text-green-bright underline decoration-event-inventory/50 underline-offset-2"
                          >
                            {item.name}
                          </button>
                        ) : (
                          <span className="font-medium text-sm text-text">{item.name}</span>
                        )}
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                            entry.direction === 'into'
                              ? 'text-event-inventory border-event-inventory/40 bg-event-inventory/10'
                              : 'text-event-action border-event-action/40 bg-event-action/10'
                          }`}
                        >
                          {entry.direction === 'into' ? 'Added' : 'Removed'}
                        </span>
                      </div>
                      <div className="text-xs text-muted font-mono mt-1">
                        {formatTimestamp(event.timestamp)}
                      </div>
                      {onSelectPlayer && event.steamid ? (
                        <button
                          type="button"
                          onClick={() => onSelectPlayer(event.steamid)}
                          className="inline-flex items-center gap-1 text-xs text-accent-bright hover:underline mt-1"
                        >
                          <User size={12} />
                          {playerName}
                        </button>
                      ) : (
                        <div className="text-xs text-dim mt-1">{playerName}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
