import { useCallback, useEffect, useState } from 'react';
import { Archive, Loader2, Package, RotateCcw, Skull, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import type { DeathSnapshotItemRow, DeathSnapshotSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';

interface DeathManagerPanelProps {
  steamId: string;
}

type SnapshotTab = 'deaths' | 'inventory';

function formatPosition(pos?: [number, number, number]): string {
  if (!pos) return '—';
  return `${pos[0].toFixed(0)} / ${pos[2].toFixed(0)}`;
}

export function DeathManagerPanel({ steamId }: DeathManagerPanelProps) {
  const { hasPermission } = useAuth();
  const canViewRestoredDeaths = hasPermission(PERMISSIONS.DEATHS_VIEW_RESTORED);
  const canViewRestoredInventory = hasPermission(PERMISSIONS.INVENTORY_VIEW_RESTORED);
  const canRestoreDeaths = hasPermission(PERMISSIONS.DEATHS_RESTORE);
  const canRerestoreDeaths = hasPermission(PERMISSIONS.DEATHS_RERESTORE);
  const canDeleteDeaths = hasPermission(PERMISSIONS.DEATHS_DELETE);
  const canRestoreInventory = hasPermission(PERMISSIONS.INVENTORY_RESTORE);
  const canRerestoreInventory = hasPermission(PERMISSIONS.INVENTORY_RERESTORE);
  const canDeleteInventory = hasPermission(PERMISSIONS.INVENTORY_DELETE);
  const [activeTab, setActiveTab] = useState<SnapshotTab>('deaths');
  const [entries, setEntries] = useState<DeathSnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<DeathSnapshotItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        activeTab === 'deaths'
          ? await api.getPlayerDeaths(steamId, showRestored)
          : await api.getPlayerInventorySnapshots(steamId, showRestored);
      setEntries(data);
      setExpandedId(null);
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [steamId, showRestored, activeTab]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const toggleItems = async (entryId: string) => {
    if (expandedId === entryId) {
      setExpandedId(null);
      setItems([]);
      return;
    }

    setExpandedId(entryId);
    setItemsLoading(true);
    try {
      const rows =
        activeTab === 'deaths'
          ? await api.getDeathItems(steamId, entryId)
          : await api.getInventorySnapshotItems(steamId, entryId);
      setItems(rows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const restoreEntry = async (entry: DeathSnapshotSummary, force = false) => {
    if (entry.wasRestored && !force) return;
    const label = activeTab === 'deaths' ? 'death' : 'inventory snapshot';
    const action = force ? 'Re-restore' : 'Restore';
    if (
      !window.confirm(
        `${action} ${entry.rootItemCount} items from this ${label} to the online player? Current gear will be dropped.`
      )
    ) {
      return;
    }

    setBusyId(entry.entryId);
    setMessage(null);
    try {
      await api.sendDashboardCommand({
        type: activeTab === 'deaths' ? 'restoredeath' : 'restoreinventory',
        steamId,
        deathEntryId: entry.entryId,
        forceRestore: force || undefined,
      });
      setMessage(
        force
          ? 'Re-restore queued — player must be online. Gear will replace current inventory.'
          : 'Restore queued — player must be online. Gear will replace current inventory.'
      );
      await loadEntries();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const deleteEntry = async (entry: DeathSnapshotSummary) => {
    const label = activeTab === 'deaths' ? 'death snapshot' : 'inventory snapshot';
    if (!window.confirm(`Delete this ${label} permanently?`)) return;

    setBusyId(entry.entryId);
    setMessage(null);
    try {
      await api.sendDashboardCommand({
        type: activeTab === 'deaths' ? 'deletedeath' : 'deleteinventory',
        steamId,
        deathEntryId: entry.entryId,
      });
      setMessage('Delete queued for server.');
      if (expandedId === entry.entryId) {
        setExpandedId(null);
        setItems([]);
      }
      await loadEntries();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading gear snapshots...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text">
          <Skull size={16} className="text-event-combat" />
          <span className="font-semibold">Gear restore</span>
        </div>

        <div className="flex rounded-sm border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('deaths')}
            className={`px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'deaths'
                ? 'bg-accent-soft text-accent-bright'
                : 'text-muted hover:text-text hover:bg-grey-btn/40'
            }`}
          >
            <Skull size={12} />
            Deaths
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 flex items-center gap-1.5 border-l border-border ${
              activeTab === 'inventory'
                ? 'bg-accent-soft text-accent-bright'
                : 'text-muted hover:text-text hover:bg-grey-btn/40'
            }`}
          >
            <Archive size={12} />
            Inventory snapshots
          </button>
        </div>

        {(activeTab === 'deaths' ? canViewRestoredDeaths : canViewRestoredInventory) && (
        <label className="ml-auto flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRestored}
            onChange={(e) => setShowRestored(e.target.checked)}
            className="rounded-sm border-border accent-accent"
          />
          Show restored (includes re-restore for failed restores)
        </label>
        )}
      </div>

      <p className="text-xs text-muted">
        {activeTab === 'deaths' ? (
          <>
            Full inventory captured on death (includes nearby ground drops). Use inventory snapshots as a
            backup if death capture missed something.
          </>
        ) : (
          <>
            Full restorable gear backups taken periodically while alive (default every 5 minutes). Same
            nested format as death snapshots — attachments, cargo, ammo, and hands item included.
          </>
        )}{' '}
        Restore requires the player to be online; current gear is dropped first.
      </p>

      {message && (
        <div className="p-3 rounded border border-accent/30 bg-accent-soft text-xs text-accent-bright font-mono">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded border border-event-combat/40 bg-event-combat/10 text-sm text-event-combat">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted border border-border rounded bg-panel/40">
          {activeTab === 'deaths'
            ? 'No death snapshots yet. Snapshots are created when this player dies.'
            : 'No inventory snapshots yet. Snapshots are created periodically while online (requires mod repack).'}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const expanded = expandedId === entry.entryId;
            const busy = busyId === entry.entryId;

            return (
              <div key={entry.entryId} className="border border-border rounded bg-panel overflow-hidden">
                <div className="flex flex-wrap items-start gap-3 p-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-semibold text-text">
                      {entry.deathTimeText ?? entry.entryId}
                    </div>
                    <div className="text-xs text-muted mt-1 font-mono">
                      {entry.rootItemCount} root items · {formatPosition(entry.deathPosition)}
                    </div>
                    {entry.wasRestored && (
                      <div className="text-[10px] uppercase tracking-wide text-event-session mt-1 font-semibold">
                        Restored
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleItems(entry.entryId)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-sm text-muted hover:text-text"
                    >
                      <Package size={12} />
                      {expanded ? 'Hide items' : 'View items'}
                    </button>
                    {!entry.wasRestored ? (
                      (activeTab === 'deaths' ? canRestoreDeaths : canRestoreInventory) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void restoreEntry(entry, false)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-accent/40 rounded-sm text-accent-bright hover:bg-accent-soft disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Restore
                      </button>
                      )
                    ) : (
                      (activeTab === 'deaths' ? canRerestoreDeaths : canRerestoreInventory) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void restoreEntry(entry, true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-event-session/40 rounded-sm text-event-session hover:bg-event-session/10 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Re-restore
                      </button>
                      )
                    )}
                    {(activeTab === 'deaths' ? canDeleteDeaths : canDeleteInventory) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteEntry(entry)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-event-combat/40 rounded-sm text-event-combat hover:bg-event-combat/10 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                    )}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-deep/40 px-3 py-2 max-h-64 overflow-y-auto">
                    {itemsLoading ? (
                      <div className="flex items-center text-xs text-muted py-2">
                        <Loader2 size={14} className="animate-spin mr-2" />
                        Loading items...
                      </div>
                    ) : items.length === 0 ? (
                      <div className="text-xs text-muted py-2">No items in snapshot.</div>
                    ) : (
                      <ul className="space-y-1 font-mono text-xs">
                        {items.map((item, i) => (
                          <li key={`${item.itemTypeName}-${i}`} className="text-text">
                            <span style={{ paddingLeft: `${item.depth * 12}px` }} className="text-muted">
                              {item.depth > 0 ? '└ ' : ''}
                            </span>
                            {item.itemTypeName}
                            {item.ammoCount != null && (
                              <span className="text-event-combat ml-1">[{item.ammoCount} rnd]</span>
                            )}
                            {item.quantity != null && item.ammoCount == null && (
                              <span className="text-muted ml-1">×{Math.round(item.quantity)}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
