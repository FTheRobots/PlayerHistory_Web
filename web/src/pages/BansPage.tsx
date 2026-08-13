import { useCallback, useEffect, useState } from 'react';
import { Ban, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { BanRecord } from '../types';
import { formatTimestamp } from '../utils/eventHelpers';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';

export function BansPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BANS_MANAGE);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ steamId: '', reason: '', banDurationMinutes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBans(await api.listBans());
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

  const createBan = async () => {
    if (!form.steamId.trim()) return;
    try {
      const duration = form.banDurationMinutes.trim()
        ? Number.parseInt(form.banDurationMinutes, 10)
        : 0;
      await api.createBan({
        steamId: form.steamId.trim(),
        reason: form.reason.trim(),
        banDurationMinutes: Number.isNaN(duration) ? 0 : duration,
      });
      setShowCreate(false);
      setForm({ steamId: '', reason: '', banDurationMinutes: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const unban = async (steamId: string) => {
    if (!window.confirm(`Remove ban for ${steamId}?`)) return;
    try {
      await api.removeBan(steamId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading && bans.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading bans...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Ban size={18} className="text-event-combat" />
          <h2 className="text-lg font-semibold text-text">Ban manager</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-bg text-sm"
            >
              <Plus size={14} />
              Ban player
            </button>
          )}
        </div>

        <p className="text-sm text-muted">
          Bans are stored on the DayZ server profile and enforced on join. Offline players can be banned directly from here.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {showCreate && canManage && (
          <div className="border border-border rounded-lg p-4 bg-panel space-y-3">
            <h3 className="font-medium text-text">New ban</h3>
            <input
              value={form.steamId}
              onChange={(e) => setForm((f) => ({ ...f, steamId: e.target.value }))}
              placeholder="Steam ID64"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm font-mono"
            />
            <input
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm"
            />
            <input
              value={form.banDurationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, banDurationMinutes: e.target.value }))}
              placeholder="Duration in minutes (empty = permanent)"
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm font-mono"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted">
                Cancel
              </button>
              <button type="button" onClick={() => void createBan()} className="px-3 py-1.5 text-xs border border-event-combat/40 rounded-sm text-event-combat">
                Ban
              </button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-panel/80 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Steam ID</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Banned</th>
                <th className="px-3 py-2">Expires</th>
                {canManage && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {bans.map((ban) => (
                <tr key={ban.steamId} className="border-t border-border/60 hover:bg-panel/30">
                  <td className="px-3 py-2">{ban.characterName ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ban.steamId}</td>
                  <td className="px-3 py-2">{ban.reason || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">
                    {ban.bannedAt ? formatTimestamp(ban.bannedAt) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {ban.isPermanent ? 'Permanent' : ban.expiresAt ? formatTimestamp(ban.expiresAt) : '—'}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void unban(ban.steamId)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-sm text-muted hover:text-event-combat"
                      >
                        <Trash2 size={12} />
                        Unban
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {bans.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center text-muted">
                    No active bans.
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
