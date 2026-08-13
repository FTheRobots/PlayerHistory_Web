import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Play, Plus, Save, Trash2, Bell } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import type {
  EventQueryRequest,
  EventQueryResult,
  QueryFieldDefinition,
  QueryFilter,
  QueryOperator,
  QueryPreset,
  SavedQueryRecord,
} from '../types/query';

const DEFAULT_QUERY: EventQueryRequest = {
  mode: 'events',
  filters: [],
  limit: 100,
  order: 'desc',
};

function encodeQueryParam(q: EventQueryRequest): string {
  return btoa(JSON.stringify(q));
}

function decodeQueryParam(raw: string | null): EventQueryRequest | null {
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as EventQueryRequest;
  } catch {
    return null;
  }
}

function emptyFilter(): QueryFilter {
  return { field: 'event', op: 'eq', value: '' };
}

export function AdvancedSearchPage() {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = hasPermission(PERMISSIONS.QUERY_MANAGE);

  const [fields, setFields] = useState<QueryFieldDefinition[]>([]);
  const [presets, setPresets] = useState<QueryPreset[]>([]);
  const [query, setQuery] = useState<EventQueryRequest>(() => decodeQueryParam(searchParams.get('q')) ?? DEFAULT_QUERY);
  const [result, setResult] = useState<EventQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQueryRecord[]>([]);
  const [saveName, setSaveName] = useState('');
  const [watchSave, setWatchSave] = useState(false);

  useEffect(() => {
    api.getQueryFields().then((r) => {
      setFields(r.fields);
      setPresets(r.presets);
    });
    if (canManage) api.listSavedQueries().then((r) => setSaved(r.queries)).catch(() => {});
  }, [canManage]);

  const runQuery = useCallback(async (q: EventQueryRequest = query) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runQuery(q);
      setResult(res);
      setSearchParams({ q: encodeQueryParam(q) }, { replace: true });
    } catch (e) {
      setError(String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('q')) void runQuery(decodeQueryParam(searchParams.get('q')) ?? query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (index: number, patch: Partial<QueryFilter>) => {
    const filters = [...(query.filters ?? [])];
    filters[index] = { ...filters[index], ...patch };
    setQuery({ ...query, filters });
  };

  const fieldDef = (field: string) => fields.find((f) => f.field === field);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await api.createSavedQuery({ name: saveName.trim(), query, isWatch: watchSave });
    setSaveName('');
    setWatchSave(false);
    const r = await api.listSavedQueries();
    setSaved(r.queries);
  };

  const handleExport = async () => {
    const blob = await api.exportQueryCsv(query);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Advanced search</h1>
          <p className="text-xs text-muted mt-1">Filter any event field, aggregate, or export results.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runQuery()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-accent text-bg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-border hover:border-accent"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => {
              setQuery(p.query);
              void runQuery(p.query);
            }}
            className="text-xs px-2.5 py-1 rounded border border-border bg-panel hover:border-accent"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3 bg-panel border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="text-xs text-muted">
              Mode
              <select
                value={query.mode ?? 'events'}
                onChange={(e) => setQuery({ ...query, mode: e.target.value as EventQueryRequest['mode'] })}
                className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
              >
                <option value="events">Events</option>
                <option value="count">Count</option>
                <option value="groupBy">Group by</option>
                <option value="topN">Top N</option>
                <option value="timeseries">Time series</option>
              </select>
            </label>
            {(query.mode === 'groupBy' || query.mode === 'topN') && (
              <label className="text-xs text-muted">
                Group field
                <select
                  value={typeof query.groupBy === 'string' ? query.groupBy : 'event'}
                  onChange={(e) => setQuery({ ...query, groupBy: e.target.value })}
                  className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                >
                  {fields.map((f) => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </select>
              </label>
            )}
            {query.mode === 'timeseries' && (
              <label className="text-xs text-muted">
                Interval
                <select
                  value={query.timeseriesInterval ?? 'hour'}
                  onChange={(e) => setQuery({ ...query, timeseriesInterval: e.target.value as 'hour' | 'day' })}
                  className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                >
                  <option value="hour">Hourly</option>
                  <option value="day">Daily</option>
                </select>
              </label>
            )}
            <label className="text-xs text-muted">
              Limit
              <input
                type="number"
                min={1}
                max={500}
                value={query.limit ?? 100}
                onChange={(e) => setQuery({ ...query, limit: parseInt(e.target.value, 10) || 100 })}
                className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filters</h3>
              <button
                type="button"
                onClick={() => setQuery({ ...query, filters: [...(query.filters ?? []), emptyFilter()] })}
                className="text-xs text-accent flex items-center gap-1"
              >
                <Plus size={12} /> Add filter
              </button>
            </div>
            {(query.filters ?? []).map((f, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-end">
                <select
                  value={f.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value, op: fieldDef(e.target.value)?.operators[0] ?? 'eq' })}
                  className="bg-input border border-border rounded px-2 py-1.5 text-sm min-w-[140px]"
                >
                  {fields.map((fd) => (
                    <option key={fd.field} value={fd.field}>{fd.label}</option>
                  ))}
                </select>
                <select
                  value={f.op}
                  onChange={(e) => updateFilter(i, { op: e.target.value as QueryOperator })}
                  className="bg-input border border-border rounded px-2 py-1.5 text-sm"
                >
                  {(fieldDef(f.field)?.operators ?? ['eq']).map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
                {!['isNull', 'isNotNull'].includes(f.op) && (
                  <input
                    type="text"
                    value={String(f.value ?? '')}
                    onChange={(e) => updateFilter(i, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 min-w-[120px] bg-input border border-border rounded px-2 py-1.5 text-sm"
                  />
                )}
                {f.op === 'between' && (
                  <input
                    type="text"
                    value={String(f.valueTo ?? '')}
                    onChange={(e) => updateFilter(i, { valueTo: e.target.value })}
                    placeholder="to"
                    className="w-28 bg-input border border-border rounded px-2 py-1.5 text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setQuery({ ...query, filters: query.filters?.filter((_, j) => j !== i) })}
                  className="p-1.5 text-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {canManage && (
          <div className="space-y-3 bg-panel border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Save size={14} /> Saved queries
            </h3>
            <input
              type="text"
              placeholder="Name…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={watchSave} onChange={(e) => setWatchSave(e.target.checked)} />
              <Bell size={12} /> Watch for new matches
            </label>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!saveName.trim()}
              className="w-full py-1.5 text-sm rounded bg-accent/20 text-accent border border-accent/40 disabled:opacity-50"
            >
              Save current query
            </button>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {saved.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setQuery(s.query);
                    void runQuery(s.query);
                  }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-input border border-transparent hover:border-border"
                >
                  {s.isWatch && <Bell size={10} className="inline mr-1 text-accent" />}
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-3">{error}</div>}

      {result && (
        <div className="space-y-3">
          <div className="text-xs text-muted">
            Mode: {result.mode} · Total: {result.total.toLocaleString()}
            {result.count != null && ` · Count: ${result.count.toLocaleString()}`}
          </div>

          {result.mode === 'count' && (
            <div className="text-4xl font-semibold text-accent">{result.count?.toLocaleString()}</div>
          )}

          {result.groups && result.groups.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-panel text-muted text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Key</th>
                    <th className="text-right px-3 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {result.groups.map((g) => (
                    <tr key={g.key} className="border-t border-border/50 hover:bg-panel/50">
                      <td className="px-3 py-2 font-mono text-xs">{g.key}</td>
                      <td className="px-3 py-2 text-right">{g.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.timeseries && result.timeseries.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-panel text-muted text-xs sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Bucket</th>
                    <th className="text-right px-3 py-2">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {result.timeseries.map((row) => (
                    <tr key={row.bucket} className="border-t border-border/50">
                      <td className="px-3 py-2 font-mono text-xs">{row.bucket}</td>
                      <td className="px-3 py-2 text-right">{row.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.events && (
            <div className="space-y-2">
              {result.events.map((event, i) => (
                <EventCard key={`${event.timestamp}-${i}`} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
