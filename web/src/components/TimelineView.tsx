import { useState, useEffect, lazy, Suspense } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FilterBar } from './FilterBar';
import { EventCard } from './EventCard';
import { StatisticsPanel } from './StatisticsPanel';
import { PlayerHeader } from './PlayerSearch';
import { ItemSearchPanel } from './ItemSearchPanel';
import { DeathManagerPanel } from './DeathManagerPanel';
import { DeletePlayerDialog } from './DeletePlayerDialog';
import { VirtualList } from './VirtualList';
import { useTimeline } from '../hooks/useTimeline';
import { api } from '../api/client';
import type { TimelineFilters, EventStatistics, PlayerProfile } from '../types';
import type { ContainerQuery } from '../utils/containerHelpers';

const MapReplayPanel = lazy(() =>
  import('./MapReplayPanel').then((m) => ({ default: m.MapReplayPanel }))
);

interface TimelineViewProps {
  steamId: string;
  onPlayerDeleted?: () => void;
  onTrackItem?: (pid: string | null) => void;
  onViewContainer?: (query: ContainerQuery) => void;
}

export function TimelineView({
  steamId,
  onPlayerDeleted,
  onTrackItem,
  onViewContainer,
}: TimelineViewProps) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'stats' | 'kills' | 'items' | 'deaths'>('timeline');
  const [killFeed, setKillFeed] = useState<Awaited<ReturnType<typeof api.getKillFeed>>>([]);

  const { events, total, loading, error, hasMore, loadMore } = useTimeline(steamId, filters);

  useEffect(() => {
    api.getCategories(steamId).then(setCategories).catch(() => {});
    api.getEventTypes(steamId).then(setEventTypes).catch(() => {});
  }, [steamId]);

  useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      api.getStatistics(steamId).then(setStats),
      api.getPlayer(steamId).then(setProfile).catch(() => null),
      api.getKillFeed(steamId).then(setKillFeed),
    ]).finally(() => setStatsLoading(false));
  }, [steamId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-border flex items-center justify-between gap-4 flex-wrap">
        <PlayerHeader steamId={steamId} name={profile?.characterName} />
        <div className="flex items-center gap-2">
          <a
            href={api.exportTimeline(steamId, 'json')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-border rounded hover:border-accent text-gray-400 hover:text-accent transition-colors"
          >
            <Download size={14} />
            JSON
          </a>
          <a
            href={api.exportTimeline(steamId, 'csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-border rounded hover:border-accent text-gray-400 hover:text-accent transition-colors"
          >
            <Download size={14} />
            CSV
          </a>
          {onPlayerDeleted && (
            <DeletePlayerDialog
              steamId={steamId}
              name={profile?.characterName}
              onDeleted={onPlayerDeleted}
            />
          )}
        </div>
      </div>

      <div className="flex border-b border-surface-border px-4">
        {(['timeline', 'map', 'items', 'deaths', 'stats', 'kills'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'kills' ? 'Kill feed' : tab === 'map' ? 'Map replay' : tab === 'deaths' ? 'Gear restore' : tab}
          </button>
        ))}
        <div className="ml-auto flex items-center text-xs text-gray-500">
          {total.toLocaleString()} events
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4 min-h-0">
        {activeTab === 'timeline' && (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              categories={categories}
              eventTypes={eventTypes}
            />

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded text-sm text-red-400 shrink-0">
                {error}
              </div>
            )}

            <VirtualList
              className="flex-1 min-h-0 overflow-y-auto pr-1"
              items={events}
              estimateSize={112}
              getKey={(event, i) => `${event.timestamp}-${event.event}-${i}`}
              onEndReached={hasMore && !loading ? loadMore : undefined}
              renderItem={(event) => (
                <div className="pb-2">
                  <EventCard
                    event={event}
                    onTrackItem={onTrackItem ?? undefined}
                    onViewContainer={onViewContainer}
                  />
                </div>
              )}
            />

            {loading && (
              <div className="flex items-center justify-center py-4 text-gray-500 shrink-0">
                <Loader2 size={20} className="animate-spin mr-2" />
                Loading events...
              </div>
            )}

            {!loading && events.length === 0 && (
              <div className="text-center py-12 text-gray-500 shrink-0">
                No events found for this player.
              </div>
            )}
          </>
        )}

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
              <MapReplayPanel steamId={steamId} onTrackItem={onTrackItem ?? undefined} />
            </Suspense>
          </div>
        )}

        {activeTab === 'items' && onTrackItem && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ItemSearchPanel steamId={steamId} onTrack={onTrackItem} />
          </div>
        )}

        {activeTab === 'deaths' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DeathManagerPanel steamId={steamId} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <StatisticsPanel stats={stats} loading={statsLoading} />
          </div>
        )}

        {activeTab === 'kills' && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {killFeed.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No combat events recorded.</div>
            ) : (
              killFeed.map((event, i) => (
                <EventCard key={`kill-${i}`} event={event} onTrackItem={onTrackItem ?? undefined} onViewContainer={onViewContainer} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
