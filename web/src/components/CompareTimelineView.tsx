import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Loader2, Users, X } from 'lucide-react';
import { FilterBar } from './FilterBar';
import { EventCard } from './EventCard';
import { VirtualList } from './VirtualList';
import { useMultiTimeline } from '../hooks/useMultiTimeline';
import { api } from '../api/client';
import type { TimelineFilters, PlayerProfile } from '../types';
import type { ContainerQuery } from '../utils/containerHelpers';
import { buildPlayerColorMap } from '../utils/playerColors';
import { steamProfileLink } from '../utils/eventHelpers';

const CompareMapReplayPanel = lazy(() =>
  import('./CompareMapReplayPanel').then((m) => ({ default: m.CompareMapReplayPanel }))
);

interface CompareTimelineViewProps {
  steamIds: string[];
  onRemovePlayer?: (steamId: string) => void;
  onSelectPlayer?: (steamId: string) => void;
  onTrackItem?: (pid: string | null) => void;
  onViewContainer?: (query: ContainerQuery) => void;
}

export function CompareTimelineView({
  steamIds,
  onRemovePlayer,
  onSelectPlayer,
  onTrackItem,
  onViewContainer,
}: CompareTimelineViewProps) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, PlayerProfile>>(new Map());
  const [activeTab, setActiveTab] = useState<'timeline' | 'map'>('timeline');

  const { events, total, loading, error, hasMore, loadMore } = useMultiTimeline(steamIds, filters);

  const colorMap = useMemo(() => buildPlayerColorMap(steamIds), [steamIds.join(',')]);

  useEffect(() => {
    api.getCategories(undefined, steamIds).then(setCategories).catch(() => {});
    api.getEventTypes(undefined, steamIds).then(setEventTypes).catch(() => {});
  }, [steamIds.join(',')]);

  useEffect(() => {
    Promise.all(
      steamIds.map((id) =>
        api.getPlayer(id).then((p) => [id, p] as const).catch(() => [id, null] as const)
      )
    ).then((rows) => {
      const next = new Map<string, PlayerProfile>();
      for (const [id, profile] of rows) {
        if (profile) next.set(id, profile);
      }
      setProfiles(next);
    });
  }, [steamIds.join(',')]);

  const showRangeHint = !filters.from && !filters.to;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-accent shrink-0" />
            <div>
              <h1 className="text-lg font-semibold">Compare timelines</h1>
              <p className="text-xs text-muted">
                {steamIds.length} players · merged chronological view
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {steamIds.map((id) => {
            const entry = colorMap.get(id);
            const profile = profiles.get(id);
            const name = profile?.characterName ?? 'Unknown';
            return (
              <div
                key={id}
                className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded border text-xs ${entry?.color.badge ?? ''}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${entry?.color.dot ?? 'bg-gray-400'}`} />
                <button
                  type="button"
                  onClick={() => onSelectPlayer?.(id)}
                  className="font-medium hover:underline text-left"
                  title={id}
                >
                  {name}
                </button>
                <a
                  href={steamProfileLink(id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] opacity-70 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {id.slice(-8)}
                </a>
                {onRemovePlayer && steamIds.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemovePlayer(id)}
                    className="p-0.5 rounded hover:bg-black/20 text-muted hover:text-text"
                    title="Remove from compare"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex border-b border-surface-border px-4">
        {(['timeline', 'map'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'map' ? 'Map replay' : 'Timeline'}
          </button>
        ))}
        <div className="ml-auto flex items-center text-xs text-gray-500">
          {activeTab === 'timeline' ? `${total.toLocaleString()} events` : `${steamIds.length} players`}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 min-h-0">
        {activeTab === 'map' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64 text-muted gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Loading map...
                </div>
              }
            >
              <CompareMapReplayPanel steamIds={steamIds} onTrackItem={onTrackItem ?? undefined} />
            </Suspense>
          </div>
        )}

        {activeTab === 'timeline' && (
          <>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories}
          eventTypes={eventTypes}
        />

        {showRangeHint && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2 shrink-0">
            Tip: set a From/To time range to keep compare loads fast when players have large histories.
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded text-sm text-red-400 shrink-0">
            {error}
          </div>
        )}

        <VirtualList
          className="flex-1 min-h-0 overflow-y-auto pr-1"
          items={events}
          estimateSize={120}
          getKey={(event, i) => `${event.steamid}-${event.timestamp}-${event.event}-${i}`}
          onEndReached={hasMore && !loading ? loadMore : undefined}
          renderItem={(event) => {
            const entry = colorMap.get(event.steamid);
            return (
              <div className="pb-2">
                <EventCard
                  event={event}
                  playerBadge={
                    entry
                      ? {
                          name: profiles.get(event.steamid)?.characterName ?? event.playerName,
                          steamId: event.steamid,
                          color: entry.color,
                        }
                      : undefined
                  }
                  onTrackItem={onTrackItem ?? undefined}
                  onViewContainer={onViewContainer}
                />
              </div>
            );
          }}
        />

        {loading && (
          <div className="flex items-center justify-center py-4 text-gray-500 shrink-0">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading events...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-12 text-gray-500 shrink-0">
            No events found for the selected players and filters.
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
