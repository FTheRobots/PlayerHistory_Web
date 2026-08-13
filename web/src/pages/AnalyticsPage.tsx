import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { api } from '../api/client';
import type { EventQueryResult, QueryPreset } from '../types/query';

function Widget({
  title,
  description,
  loading,
  result,
}: {
  title: string;
  description: string;
  loading: boolean;
  result: EventQueryResult | null;
}) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}
      {!loading && result?.groups && (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {result.groups.slice(0, 12).map((g) => (
            <li key={g.key} className="flex justify-between gap-2 text-xs">
              <span className="truncate font-mono text-text">{g.key}</span>
              <span className="text-muted shrink-0">{g.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      {!loading && result?.timeseries && (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {result.timeseries.slice(-12).map((row) => (
            <li key={row.bucket} className="flex justify-between gap-2 text-xs">
              <span className="truncate font-mono text-text">{row.bucket}</span>
              <span className="text-muted shrink-0">{row.count.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      {!loading && result?.mode === 'count' && (
        <div className="text-2xl font-semibold text-accent">{result.count?.toLocaleString()}</div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const [presets, setPresets] = useState<QueryPreset[]>([]);
  const [widgets, setWidgets] = useState<Record<string, EventQueryResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { presets: p } = await api.getQueryFields();
      setPresets(p);
      const ids = [
        'popular-pickups',
        'zombie-kills-by-weapon',
        'pvp-kills-by-weapon',
        'top-killers',
        'kills-by-victim-type',
        'ground-weapons',
        'activity-hourly',
      ];
      const next: Record<string, EventQueryResult | null> = {};
      await Promise.all(
        ids.map(async (id) => {
          const preset = p.find((x) => x.id === id);
          if (!preset) return;
          try {
            next[id] = await api.runQuery(preset.query);
          } catch {
            next[id] = null;
          }
        })
      );
      setWidgets(next);
      setLoading(false);
    })();
  }, []);

  const preset = (id: string) => presets.find((p) => p.id === id);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Server analytics</h1>
          <p className="text-xs text-muted mt-1">Live aggregates from indexed event data.</p>
        </div>
        <Link
          to="/search"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border hover:border-accent"
        >
          <Search size={14} />
          Advanced search
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={18} /> Loading analytics…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Widget
          title="Popular pickups"
          description={preset('popular-pickups')?.description ?? ''}
          loading={loading}
          result={widgets['popular-pickups'] ?? null}
        />
        <Widget
          title="Ground weapons looted"
          description={preset('ground-weapons')?.description ?? ''}
          loading={loading}
          result={widgets['ground-weapons'] ?? null}
        />
        <Widget
          title="Zombie kills by weapon"
          description={preset('zombie-kills-by-weapon')?.description ?? ''}
          loading={loading}
          result={widgets['zombie-kills-by-weapon'] ?? null}
        />
        <Widget
          title="PvP kills by weapon"
          description={preset('pvp-kills-by-weapon')?.description ?? ''}
          loading={loading}
          result={widgets['pvp-kills-by-weapon'] ?? null}
        />
        <Widget
          title="Top PvP killers"
          description={preset('top-killers')?.description ?? ''}
          loading={loading}
          result={widgets['top-killers'] ?? null}
        />
        <Widget
          title="Kills by victim type"
          description={preset('kills-by-victim-type')?.description ?? ''}
          loading={loading}
          result={widgets['kills-by-victim-type'] ?? null}
        />
        <Widget
          title="Activity by hour"
          description={preset('activity-hourly')?.description ?? ''}
          loading={loading}
          result={widgets['activity-hourly'] ?? null}
        />
      </div>
    </div>
  );
}
