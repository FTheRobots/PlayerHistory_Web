import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { api } from '../api/client';
import { permissionLabel } from '../utils/permissionLabels';

export interface RoleRow {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Array<{ label: string; permissions: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleList, permInfo] = await Promise.all([api.listRoles(), api.getPermissionCatalog()]);
      setRoles(roleList);
      setPermissionGroups(permInfo.groups);
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

  const startEdit = (role: RoleRow) => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditPermissions([...role.permissions]);
    setShowCreate(false);
  };

  const togglePermission = (list: string[], setList: (v: string[]) => void, permission: string) => {
    const next = new Set(list);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    setList([...next]);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    setBusy(true);
    try {
      await api.updateRole(editingId, { name: editName, permissions: editPermissions });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const createRole = async () => {
    setBusy(true);
    try {
      await api.createRole({
        name: createName,
        slug: createSlug || undefined,
        permissions: createPermissions,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateSlug('');
      setCreatePermissions([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async (role: RoleRow) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setBusy(true);
    try {
      await api.deleteRole(role.id);
      if (editingId === role.id) setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const PermissionEditor = ({
    selected,
    onChange,
  }: {
    selected: string[];
    onChange: (perms: string[]) => void;
  }) => (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {permissionGroups.map((group) => (
        <div key={group.label}>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{group.label}</h4>
          <div className="space-y-1">
            {group.permissions.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 text-xs cursor-pointer hover:text-text text-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(permission)}
                  onChange={() => togglePermission(selected, onChange, permission)}
                  className="rounded border-border accent-accent"
                />
                <span>{permissionLabel(permission)}</span>
                <span className="text-dim font-mono text-[10px] ml-auto">{permission}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Create roles and choose exactly which permissions each role grants.</p>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-bg text-sm"
          >
            <Plus size={14} /> Add role
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {showCreate && (
          <div className="border border-border rounded-lg p-4 bg-panel space-y-4">
            <h2 className="text-sm font-medium text-text">New role</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                placeholder="Display name (e.g. Support)"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="px-3 py-2 rounded bg-input border border-border text-sm"
              />
              <input
                placeholder="Slug (optional, e.g. support)"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                className="px-3 py-2 rounded bg-input border border-border text-sm font-mono"
              />
            </div>
            <PermissionEditor selected={createPermissions} onChange={setCreatePermissions} />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !createName.trim()}
                onClick={() => void createRole()}
                className="px-3 py-1.5 rounded bg-accent text-bg text-sm disabled:opacity-50"
              >
                Create role
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded border border-border text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="border border-border rounded-lg p-4 bg-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-text">{role.name}</div>
                  <div className="text-xs text-muted font-mono mt-0.5">
                    {role.slug}
                    {role.isSystem && (
                      <span className="ml-2 uppercase text-accent-bright/80">built-in</span>
                    )}
                  </div>
                  <div className="text-xs text-dim mt-1">
                    {role.permissions.length} permissions · {role.userCount} user
                    {role.userCount === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(role)}
                    className="p-1.5 rounded text-muted hover:text-accent"
                    title="Edit role"
                  >
                    <Pencil size={14} />
                  </button>
                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={() => void deleteRole(role)}
                      disabled={busy || role.userCount > 0}
                      title={role.userCount > 0 ? 'Reassign users before deleting' : 'Delete role'}
                      className="p-1.5 rounded text-red-400 hover:bg-input disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {editingId === role.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-input border border-border text-sm"
                  />
                  <PermissionEditor selected={editPermissions} onChange={setEditPermissions} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveEdit()}
                      className="px-3 py-1.5 rounded bg-accent text-bg text-sm disabled:opacity-50"
                    >
                      Save role
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded border border-border text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
