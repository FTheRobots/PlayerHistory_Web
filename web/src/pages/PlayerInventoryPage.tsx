import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Package,
  RefreshCw,
  Search,
  Trash2,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import type { OnlinePlayerDetail, PlayerInventoryResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard';
import { InstanceScopeBanner } from '../components/InstanceScopeBanner';
import { formatItemPidShort } from '../utils/itemHelpers';

interface PlayerInventoryPageProps {
  onSelectPlayer: (steamId: string) => void;
  onTrackItem: (pid: string) => void;
  initialSteamId?: string;
}

function sourceLabel(data: PlayerInventoryResponse): string {
  if (data.source === 'live') {
    return data.capturedAt ? `Live capture · ${data.capturedAt}` : 'Live capture';
  }
  if (data.source === 'snapshot') {
    return data.capturedAt
      ? `Latest snapshot · ${data.capturedAt}`
      : 'Latest periodic snapshot (player may be offline)';
  }
  return 'No inventory data — capture while online or wait for periodic snapshot';
}

export function PlayerInventoryPage({
  onSelectPlayer,
  onTrackItem,
  initialSteamId = '',
}: PlayerInventoryPageProps) {
  const { hasPermission, activeInstance } = useAuth();
  const { data: dashboard } = useRealtimeDashboard();
  const [steamId, setSteamId] = useState(initialSteamId);
  const [inventory, setInventory] = useState<PlayerInventoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [spawnClass, setSpawnClass] = useState('');
  const [spawnQty, setSpawnQty] = useState('1');

  const canCapture = hasPermission(PERMISSIONS.ADMIN_CAPTURE_INVENTORY);
  const canDelete = hasPermission(PERMISSIONS.ADMIN_DELETE_ITEM);
  const canSpawn = hasPermission(PERMISSIONS.ADMIN_SPAWN);

  const onlinePlayers = dashboard?.onlinePlayers ?? [];
  const isOnline = useMemo(
    () => onlinePlayers.some((p) => p.steamId === steamId.trim()),
    [onlinePlayers, steamId]
  );
  const pendingPidSet = useMemo(() => {
    const set = new Set<string>();
    for (const entry of inventory?.pendingDeletions ?? []) {
      set.add(entry.itemPid);
    }
    return set;
  }, [inventory?.pendingDeletions]);

  const loadInventory = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setInventory(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await api.getPlayerLiveInventory(trimmed);
      setInventory(data);
    } catch (err) {
      setInventory(null);
      setMessage(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSteamId) setSteamId(initialSteamId);
  }, [initialSteamId]);

  useEffect(() => {
    setSteamId('');
    setInventory(null);
    setMessage(null);
  }, [activeInstance?.id]);

  useEffect(() => {
    const trimmed = steamId.trim();
    if (!trimmed) return;
    void loadInventory(trimmed);
  }, [steamId, loadInventory]);

  const captureLive = async () => {
    const trimmed = steamId.trim();
    if (!trimmed) return;
    if (!isOnline) {
      setMessage('Player must be online to capture live inventory.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.sendDashboardCommand({ type: 'captureinventory', steamId: trimmed });
      setMessage('Capture queued — refreshing in a few seconds…');
      await new Promise((r) => setTimeout(r, 2500));
      await loadInventory(trimmed);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (itemPid: string) => {
    const trimmed = steamId.trim();
    if (!trimmed || !itemPid) return;
    const confirmMsg = isOnline
      ? `Delete item ${formatItemPidShort(itemPid)} from this player?`
      : `Queue deletion of item ${formatItemPidShort(itemPid)} for when this player next logs in?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.sendDashboardCommand({ type: 'deleteitem', steamId: trimmed, itemPid });
      if (result.command?.queuedForLogin || !isOnline) {
        setMessage('Deletion queued — will be removed when the player logs in.');
      } else {
        setMessage('Delete queued — refreshing…');
      }
      await new Promise((r) => setTimeout(r, 1500));
      if (isOnline && canCapture && !result.command?.queuedForLogin) {
        await api.sendDashboardCommand({ type: 'captureinventory', steamId: trimmed });
        await new Promise((r) => setTimeout(r, 2000));
      }
      await loadInventory(trimmed);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  const spawnItem = async () => {
    const trimmed = steamId.trim();
    const classname = spawnClass.trim();
    if (!trimmed || !classname) return;
    const quantity = Math.max(1, Number.parseInt(spawnQty, 10) || 1);
    setBusy(true);
    setMessage(null);
    try {
      await api.sendDashboardCommand({
        type: 'spawn',
        steamId: trimmed,
        classname,
        quantity,
      });
      setMessage(`Spawn queued: ${quantity}× ${classname}`);
      setSpawnClass('');
      await new Promise((r) => setTimeout(r, 2000));
      if (isOnline && canCapture) {
        await api.sendDashboardCommand({ type: 'captureinventory', steamId: trimmed });
        await new Promise((r) => setTimeout(r, 2000));
      }
      await loadInventory(trimmed);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Spawn failed');
    } finally {
      setBusy(false);
    }
  };

  const selectOnline = (player: OnlinePlayerDetail) => {
    setSteamId(player.steamId);
  };

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold text-text flex items-center gap-2">
          <Package size={18} className="text-accent" />
          Player inventory
        </h1>
        <p className="text-xs text-muted mt-1">
          Inspect gear on online players (live capture) or the latest snapshot when offline. Remove duped or banned items by PID — offline deletes apply on next login.
        </p>
        <div className="mt-2">
          <InstanceScopeBanner />
        </div>
      </div>

      <div className="shrink-0 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-muted mb-1">Steam ID</label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="76561198…"
            className="w-full px-3 py-2 rounded bg-input border border-border text-sm font-mono"
          />
        </div>
        {canCapture && (
          <button
            type="button"
            disabled={busy || !steamId.trim() || !isOnline}
            onClick={() => void captureLive()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-sm hover:border-accent disabled:opacity-50"
            title={isOnline ? 'Capture current inventory' : 'Player must be online'}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Capture live
          </button>
        )}
        <button
          type="button"
          disabled={loading || !steamId.trim()}
          onClick={() => void loadInventory(steamId)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-sm hover:border-accent disabled:opacity-50"
        >
          <Search size={14} />
          Reload
        </button>
      </div>

      {onlinePlayers.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1.5">
          <span className="text-xs text-muted self-center mr-1">Online:</span>
          {onlinePlayers.map((p) => (
            <button
              key={p.steamId}
              type="button"
              onClick={() => selectOnline(p)}
              className={`text-xs px-2 py-1 rounded border ${
                steamId === p.steamId
                  ? 'border-accent text-accent-bright bg-accent/10'
                  : 'border-border text-muted hover:text-text'
              }`}
            >
              {p.characterName ?? p.steamId.slice(-8)}
            </button>
          ))}
        </div>
      )}

      {canSpawn && steamId.trim() && (
        <div className="shrink-0 flex flex-wrap gap-2 items-end border border-border rounded p-3 bg-panel/50">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs text-muted mb-1">Spawn classname</label>
            <input
              type="text"
              value={spawnClass}
              onChange={(e) => setSpawnClass(e.target.value)}
              placeholder="Apple"
              className="w-full px-2 py-1.5 rounded bg-input border border-border text-sm"
            />
          </div>
          <div className="w-20">
            <label className="block text-xs text-muted mb-1">Qty</label>
            <input
              type="number"
              min={1}
              value={spawnQty}
              onChange={(e) => setSpawnQty(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-input border border-border text-sm"
            />
          </div>
          <button
            type="button"
            disabled={busy || !spawnClass.trim() || !isOnline}
            onClick={() => void spawnItem()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-sm hover:border-accent disabled:opacity-50"
          >
            <Plus size={14} />
            Spawn
          </button>
        </div>
      )}

      {message && <p className="text-sm text-amber-400 shrink-0">{message}</p>}

      {inventory && (inventory.pendingDeletions?.length ?? 0) > 0 && (
        <p className="text-xs text-amber-400 shrink-0">
          {inventory.pendingDeletions!.length} item(s) queued for deletion on next login.
        </p>
      )}

      {inventory && (
        <p className="text-xs text-muted shrink-0">
          {sourceLabel(inventory)}
          {inventory.source === 'snapshot' && isOnline && canCapture && (
            <span> — use Capture live for current gear.</span>
          )}
          {' · '}
          {inventory.rootItemCount} root items · {inventory.items.length} total rows
          {isOnline ? ' · online' : ' · offline'}
        </p>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 border border-border rounded bg-panel/30">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted text-sm">
            <Loader2 size={18} className="animate-spin mr-2" />
            Loading inventory…
          </div>
        )}

        {!loading && inventory?.items.length === 0 && (
          <div className="text-center py-12 text-muted text-sm px-4">
            No inventory items found for this player.
          </div>
        )}

        {!loading &&
          inventory?.items.map((row, idx) => (
            <div
              key={`${row.itemTypeName}-${row.depth}-${row.itemPid ?? idx}`}
              className="flex items-center gap-2 px-3 py-2 border-b border-border/60 text-sm hover:bg-input/30"
              style={{ paddingLeft: `${12 + row.depth * 16}px` }}
            >
              <Package size={14} className="text-event-inventory shrink-0 opacity-70" />
              <div className="min-w-0 flex-1">
                <div className="text-text truncate">
                  {row.itemTypeName}
                  {row.inHands && <span className="text-accent ml-1.5 text-xs">(hands)</span>}
                  {row.quantity != null && row.quantity > 1 && (
                    <span className="text-muted ml-1.5 text-xs">×{row.quantity}</span>
                  )}
                </div>
                {row.itemPid && (
                  <div className="text-xs font-mono text-dim truncate">{row.itemPid}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {row.itemPid && (
                  <button
                    type="button"
                    onClick={() => onTrackItem(row.itemPid!)}
                    className="p-1.5 text-muted hover:text-accent-bright rounded"
                    title="Track item history"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
                {row.itemPid && pendingPidSet.has(row.itemPid) && (
                  <span className="text-xs text-amber-400 px-1.5 py-0.5 border border-amber-400/40 rounded">
                    queued
                  </span>
                )}
                {canDelete && row.itemPid && !pendingPidSet.has(row.itemPid) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteItem(row.itemPid!)}
                    className="p-1.5 text-muted hover:text-red-400 rounded disabled:opacity-50"
                    title={isOnline ? 'Delete item from player' : 'Queue deletion on next login'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {steamId.trim() && hasPermission(PERMISSIONS.TIMELINE_VIEW) && (
        <button
          type="button"
          onClick={() => onSelectPlayer(steamId.trim())}
          className="shrink-0 text-xs text-accent hover:underline self-start"
        >
          Open player timeline →
        </button>
      )}
    </div>
  );
}
