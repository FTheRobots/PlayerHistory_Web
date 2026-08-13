import { useCallback, useEffect, useState } from 'react';
import { Eye, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { WatchlistEntry } from '../types';
import { formatTimestamp } from '../utils/eventHelpers';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';

const ALERT_TOGGLES = [
  { key: 'alertOnJoin' as const, label: 'Join' },
  { key: 'alertOnLeave' as const, label: 'Leave' },
  { key: 'alertOnDeath' as const, label: 'Death' },
  { key: 'alertOnKill' as const, label: 'Kill' },
  { key: 'alertOnBan' as const, label: 'Ban' },
];

export function WatchlistPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.WATCHLIST_MANAGE);
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    steamId: '',
    scope: 'personal' as 'global' | 'personal',
    note: '',
    alertOnJoin: true,
    alertOnLeave: false,
    alertOnDeath: true,
    alertOnKill: false,
    alertOnBan: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.listWatchlist());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addEntry = async () => {
    if (!form.steamId.trim()) return;
    try {
      await api.addWatchlistEntry(form);
      setShowCreate(false);
      setForm({
        steamId: '',
        scope: 'personal',
        note: '',
        alertOnJoin: true,
        alertOnLeave: false,
        alertOnDeath: true,
        alertOnKill: false,
        alertOnBan: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleAlert = async (entry: WatchlistEntry, key: (typeof ALERT_TOGGLES)[number]['key']) => {
    if (!canManage) return;
    try {
      await api.updateWatchlistEntry(entry.id, { [key]: !entry[key] });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const removeEntry = async (entry: WatchlistEntry) => {
    if (!window.confirm(`Remove ${entry.steamId} from watchlist?`)) return;
    try {
      await api.deleteWatchlistEntry(entry.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading watchlist...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Eye size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text">Watchlist & alerts</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-bg text-sm"
            >
              <Plus size={14} />
              Add player
            </button>
          )}
        </div>

        <p className="text-sm text-muted">
          Global entries alert all staff with watchlist access. Personal entries alert only you.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {showCreate && canManage && (
          <div className="border border-border rounded-lg p-4 bg-panel space-y-3">
            <h3 className="font-medium text-text">Watch player</h3>
            <input
              value={form.steamId}
              onChange={(e) => setForm((f) => ({ ...f, steamId: e.target.value }))}
              placeholder="Steam ID64"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm font-mono"
            />
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Note (optional)"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm"
            />
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'global' | 'personal' }))}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm"
            >
              <option value="personal">Personal (only me)</option>
              <option value="global">Global (all staff)</option>
            </select>
            <div className="flex flex-wrap gap-3">
              {ALERT_TOGGLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="rounded-sm border-border accent-accent"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted">
                Cancel
              </button>
              <button type="button" onClick={() => void addEntry()} className="px-3 py-1.5 text-xs border border-accent rounded-sm text-accent-bright">
                Add
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="border border-border rounded-lg p-4 bg-panel">
              <div className="flex flex-wrap items-start gap-2">
                <div>
                  <div className="font-medium text-text">
                    {entry.characterName ?? entry.steamId}
                    {entry.isOnline && (
                      <span className="ml-2 text-xs text-green-bright font-normal">online</span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-muted">{entry.steamId}</div>
                  {entry.note && <div className="text-sm text-muted mt-1">{entry.note}</div>}
                </div>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded border ${
                    entry.scope === 'global'
                      ? 'border-accent/40 text-accent-bright'
                      : 'border-border text-muted'
                  }`}
                >
                  {entry.scope}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {ALERT_TOGGLES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!canManage}
                    onClick={() => void toggleAlert(entry, key)}
                    className={`px-2 py-1 text-xs rounded border ${
                      entry[key]
                        ? 'border-accent/50 text-accent-bright bg-accent-soft'
                        : 'border-border text-muted'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-muted">
                <span>
                  Added {formatTimestamp(entry.createdAt)}
                  {entry.createdByUsername ? ` by ${entry.createdByUsername}` : ''}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => void removeEntry(entry)}
                    className="inline-flex items-center gap-1 text-muted hover:text-event-combat"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center text-muted py-12 border border-border rounded-lg">
              No watchlist entries yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
