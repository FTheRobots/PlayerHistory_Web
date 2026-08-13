import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { api } from '../api/client';
import type { AuditLogEntry } from '../types';
import { formatTimestamp } from '../utils/eventHelpers';

export function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [steamFilter, setSteamFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listAuditLog({
        limit: 100,
        action: actionFilter || undefined,
        targetSteamId: steamFilter || undefined,
      });
      setEntries(result.data);
      setTotal(result.total);
      setActions(result.actions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, steamFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading audit log...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <ScrollText size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text">Audit log</h2>
          <span className="text-xs text-muted ml-auto">{total.toLocaleString()} entries</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-input border border-border rounded-sm"
          >
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <input
            value={steamFilter}
            onChange={(e) => setSteamFilter(e.target.value)}
            placeholder="Filter by Steam ID"
            className="px-3 py-1.5 text-sm bg-input border border-border rounded-sm font-mono min-w-[220px]"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted hover:text-text"
          >
            Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel/80 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-border/60 hover:bg-panel/30">
                  <td className="px-3 py-2 font-mono text-xs text-muted whitespace-nowrap">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2">{entry.username ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-accent-bright">{entry.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {entry.targetSteamId ?? entry.targetLabel ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{entry.ipAddress ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted max-w-xs truncate">
                    {entry.details ? JSON.stringify(entry.details) : '—'}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    No audit entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
