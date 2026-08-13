import { useState } from 'react';
import { Trash2, Loader2, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';

interface DeletePlayerDialogProps {
  steamId: string;
  name?: string;
  onDeleted: () => void;
}

export function DeletePlayerDialog({ steamId, name, onDeleted }: DeletePlayerDialogProps) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPermission(PERMISSIONS.PLAYERS_DELETE_DATA)) return null;

  const label = name ?? steamId;
  const canConfirm = confirmText === steamId;

  const handleDelete = async () => {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePlayer(steamId, deleteFiles);
      setOpen(false);
      setConfirmText('');
      onDeleted();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-900/50 rounded text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors"
      >
        <Trash2 size={14} />
        Delete player
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            className="w-full max-w-md bg-surface-raised border border-surface-border rounded-lg shadow-xl"
            role="dialog"
            aria-labelledby="delete-player-title"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <h2 id="delete-player-title" className="text-sm font-semibold text-red-400">
                Delete player data
              </h2>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-4 text-sm">
              <p className="text-gray-300">
                Permanently remove all indexed events for{' '}
                <span className="font-medium text-white">{label}</span>.
              </p>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteFiles}
                  onChange={(e) => setDeleteFiles(e.target.checked)}
                  className="mt-0.5 accent-accent"
                />
                <span className="text-gray-400">
                  Also delete log files on disk{' '}
                  <code className="text-xs text-gray-500">…/PlayerHistory/{steamId}/</code>
                </span>
              </label>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Type <span className="font-mono text-gray-400">{steamId}</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={steamId}
                  className="w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-red-500"
                  autoComplete="off"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/50 rounded p-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || busy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
