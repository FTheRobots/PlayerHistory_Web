import type { EventStatistics } from '../types';
import { getCategoryStyle } from '../utils/eventHelpers';
import { getKillStatEntries, resolveKillCounts, totalKillCount } from '../utils/killStats';

interface StatisticsPanelProps {
  stats: EventStatistics | null;
  loading: boolean;
}

export function StatisticsPanel({ stats, loading }: StatisticsPanelProps) {
  if (loading) {
    return (
      <div className="p-4 bg-surface-raised border border-surface-border rounded-lg animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface-overlay rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const topCategories = Object.entries(stats.eventsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const killCounts = resolveKillCounts(stats);
  const killEntries = getKillStatEntries(killCounts);
  const allKills = totalKillCount(killCounts);

  return (
    <div className="p-4 bg-surface-raised border border-surface-border rounded-lg space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">Statistics</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total events" value={stats.totalEvents.toLocaleString()} />
        <StatCard label="Sessions" value={stats.sessionCount} />
        <StatCard label="Deaths" value={stats.deathCount} accent="text-event-combat" />
        <StatCard label="Total kills" value={allKills} accent="text-event-inventory" />
      </div>

      <div>
        <h4 className="text-xs text-gray-500 mb-2">Kills by type</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {killEntries.map(({ event, label, count, accent }) => (
            <div key={event} className="bg-surface p-2.5 rounded-lg border border-surface-border">
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`text-lg font-semibold ${accent}`}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {topCategories.length > 0 && (
        <div>
          <h4 className="text-xs text-gray-500 mb-2">By category</h4>
          <div className="space-y-1.5">
            {topCategories.map(([cat, count]) => {
              const pct = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-2 text-xs">
                  <span className={`w-20 truncate ${getCategoryStyle(cat).split(' ')[0]}`}>{cat}</span>
                  <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-16 text-right">{count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(stats.firstEvent || stats.lastEvent) && (
        <div className="text-xs text-gray-500 font-mono pt-2 border-t border-surface-border">
          {stats.firstEvent && <div>First: {new Date(stats.firstEvent).toLocaleString()}</div>}
          {stats.lastEvent && <div>Last: {new Date(stats.lastEvent).toLocaleString()}</div>}
        </div>
      )}

      {Object.keys(stats.eventsByType ?? {}).length > 0 && (
        <div>
          <h4 className="text-xs text-gray-500 mb-2">Top event types</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(stats.eventsByType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 9)
              .map(([type, count]) => (
                <div key={type} className="bg-surface p-2 rounded-lg border border-surface-border text-xs">
                  <div className="text-gray-500 truncate">{type}</div>
                  <div className="text-sm font-semibold">{count.toLocaleString()}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-surface p-3 rounded-lg border border-surface-border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${accent ?? 'text-white'}`}>{value}</div>
    </div>
  );
}
