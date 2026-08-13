import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Package, Loader2, User } from 'lucide-react';
import { api } from '../api/client';
import type { ItemSummary, PlayerEvent } from '../types';
import { EventCard } from './EventCard';
import { VirtualList } from './VirtualList';
import { formatItemPidShort } from '../utils/itemHelpers';
import { formatTimestamp } from '../utils/eventHelpers';

import type { ContainerQuery } from '../utils/containerHelpers';

const TIMELINE_PAGE = 150;

interface ItemTrackerModalProps {
  pid: string | null;
  onClose: () => void;
  onSelectPlayer?: (steamId: string) => void;
  onTrackItem?: (pid: string) => void;
  onViewContainer?: (query: ContainerQuery) => void;
}

export function ItemTrackerModal({ pid, onClose, onSelectPlayer, onTrackItem, onViewContainer }: ItemTrackerModalProps) {
  const [summary, setSummary] = useState<ItemSummary | null>(null);
  const [events, setEvents] = useState<PlayerEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!pid) {
      setSummary(null);
      setEvents([]);
      setHasMore(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents([]);
    setSummary(null);
    setHasMore(false);

    api
      .getItemSummary(pid)
      .then((itemSummary) => {
        if (!cancelled) setSummary(itemSummary);
      })
      .catch(() => {
        /* timeline fetch still reports missing items */
      });

    api
      .getItemTimeline(pid, TIMELINE_PAGE, 0)
      .then((timeline) => {
        if (cancelled) return;
        setEvents(timeline.data);
        setHasMore(Boolean(timeline.hasMore));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pid]);

  const loadMore = useCallback(() => {
    if (!pid || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const offset = events.length;
    api
      .getItemTimeline(pid, TIMELINE_PAGE, offset)
      .then((timeline) => {
        setEvents((prev) => [...prev, ...timeline.data]);
        setHasMore(Boolean(timeline.hasMore));
      })
      .catch(() => setHasMore(false))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [pid, hasMore, events.length]);

  if (!pid) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-stretch justify-end bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-panel border-l border-border shadow-panel flex flex-col h-full">
        <div className="flex items-start gap-3 p-4 border-b border-border shrink-0">
          <div className="p-2 rounded-sm bg-event-inventory/15 border border-event-inventory/30 text-event-inventory">
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text truncate">
              {summary?.name ?? 'Item tracker'}
            </h2>
            <p className="text-xs font-mono text-muted mt-0.5 break-all" title={pid}>
              PID {formatItemPidShort(pid)}
              <span className="text-dim ml-1 hidden sm:inline">({pid})</span>
            </p>
            {summary?.classname && (
              <p className="text-xs text-dim mt-1 font-mono">{summary.classname}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-sm hover:bg-grey-btn transition-colors"
            aria-label="Close item tracker"
          >
            <X size={18} />
          </button>
        </div>

        {summary && (
          <div className="px-4 py-3 border-b border-border/60 grid grid-cols-2 gap-3 text-xs shrink-0">
            <div>
              <div className="text-dim uppercase tracking-wide text-[10px]">Events</div>
              <div className="text-text font-semibold">{summary.eventCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-dim uppercase tracking-wide text-[10px]">Last seen</div>
              <div className="text-muted font-mono">
                {summary.lastSeen ? formatTimestamp(summary.lastSeen) : '—'}
              </div>
            </div>
            {summary.lastPlayerSteamId && (
              <div className="col-span-2">
                <div className="text-dim uppercase tracking-wide text-[10px] mb-1">Last player</div>
                {onSelectPlayer ? (
                  <button
                    type="button"
                    onClick={() => onSelectPlayer(summary.lastPlayerSteamId!)}
                    className="inline-flex items-center gap-1.5 text-accent-bright hover:underline text-sm"
                  >
                    <User size={14} />
                    {summary.lastPlayerName ?? summary.lastPlayerSteamId}
                  </button>
                ) : (
                  <span className="text-muted">{summary.lastPlayerName ?? summary.lastPlayerSteamId}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          {loading && events.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted">
              <Loader2 className="animate-spin mr-2" size={18} />
              Loading item history…
            </div>
          )}

          {error && (
            <div className="m-4 p-3 rounded border border-danger/40 bg-danger/10 text-sm text-event-combat">
              {error}
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">
              No tracked events for this item. Re-index after updating the server mod.
            </div>
          )}

          {events.length > 0 && (
            <VirtualList
              className="flex-1 min-h-0 overflow-y-auto p-4"
              items={events}
              estimateSize={112}
              getKey={(event, i) => `${event.timestamp}-${event.event}-${i}`}
              onEndReached={hasMore && !loadingMore ? loadMore : undefined}
              renderItem={(event) => (
                <div className="pb-2">
                  <EventCard
                    event={event}
                    onTrackItem={onTrackItem}
                    onViewContainer={onViewContainer}
                  />
                </div>
              )}
            />
          )}

          {loadingMore && (
            <div className="flex items-center justify-center py-3 text-muted text-xs shrink-0">
              <Loader2 className="animate-spin mr-2" size={14} />
              Loading more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
