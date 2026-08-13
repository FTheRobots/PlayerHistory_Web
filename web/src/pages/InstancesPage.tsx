import { useState } from 'react';
import { Loader2, Plus, Server, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { canManageInstances } from '../utils/instanceAccess';

export function InstancesPage() {
  const { instances, activeInstance, refreshInstances, hasPermission, switchInstance } = useAuth();
  const canManage = canManageInstances(hasPermission);

  const [name, setName] = useState('');
  const [playerHistoryPath, setPlayerHistoryPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await api.createInstance({
        name: name.trim() || 'DayZ server',
        playerHistoryPath: playerHistoryPath.trim(),
      });
      setName('');
      setPlayerHistoryPath('');
      await refreshInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add instance');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateInstance(id, { name: editName.trim(), playerHistoryPath: editPath.trim() });
      setEditingId(null);
      await refreshInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save instance');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!confirm('Remove this DayZ instance and its indexed data from this server?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteInstance(id);
      await refreshInstances();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete instance');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 overflow-auto h-full">
      <p className="text-sm text-muted mb-6 max-w-2xl">
        DayZ server instances registered on this Player History backend. Each instance points at a
        separate <code className="text-accent">profiles/PlayerHistory</code> folder. All instances share
        one login and one API server.
      </p>

      {canManage && (
        <form onSubmit={handleAdd} className="mb-8 p-4 rounded border border-border bg-panel/40 max-w-xl space-y-3">
          <h2 className="text-sm font-medium text-text flex items-center gap-2">
            <Plus size={16} />
            Add DayZ instance
          </h2>
          <div>
            <label className="block text-xs text-muted mb-1">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chernarus main"
              className="w-full px-3 py-2 rounded bg-input border border-border text-sm text-text"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">PlayerHistory path on game server</label>
            <input
              value={playerHistoryPath}
              onChange={(e) => setPlayerHistoryPath(e.target.value)}
              placeholder="D:\DayZServer\profiles\PlayerHistory"
              className="w-full px-3 py-2 rounded bg-input border border-border text-sm text-text"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy || !playerHistoryPath.trim()}
            className="px-4 py-2 rounded bg-accent text-bg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Add instance
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="space-y-3 max-w-2xl">
        <h2 className="text-sm font-medium text-text">Registered instances</h2>
        {instances.length === 0 && (
          <p className="text-sm text-muted">No instances returned from the server.</p>
        )}
        {instances.map((instance) => (
          <div
            key={instance.id}
            className={`p-4 rounded border ${
              instance.id === activeInstance?.id ? 'border-accent bg-accent/5' : 'border-border bg-panel/30'
            }`}
          >
            {editingId === instance.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-input border border-border text-sm text-text"
                />
                <input
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-input border border-border text-sm text-text"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit(instance.id)}
                    className="px-3 py-1.5 rounded bg-accent text-bg text-xs"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded border border-border text-xs text-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Server size={18} className="text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text">{instance.name}</div>
                  <div className="text-xs text-muted truncate">{instance.playerHistoryPath}</div>
                  {instance.id === activeInstance?.id && (
                    <span className="text-xs text-accent-bright">Active view</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {instance.id !== activeInstance?.id && (
                    <button
                      type="button"
                      onClick={() => switchInstance(instance.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      View
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(instance.id);
                          setEditName(instance.name);
                          setEditPath(instance.playerHistoryPath);
                        }}
                        className="text-xs text-muted hover:text-text"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(instance.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
