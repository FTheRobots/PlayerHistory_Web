import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface UserRow {
  id: number;
  username: string;
  role: string;
  permissionGrants: string[];
  permissionDenies: string[];
}

interface RoleOption {
  slug: string;
  name: string;
}

function pickDefaultRole(roleList: RoleOption[]): string {
  return roleList.find((r) => r.slug !== 'owner')?.slug ?? roleList[0]?.slug ?? '';
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: '',
    permissionGrants: [] as string[],
    permissionDenies: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, roleList, permInfo] = await Promise.all([
        api.listUsers(),
        api.listRoles(),
        api.getPermissionCatalog(),
      ]);
      setUsers(userList);
      const roleOptions = roleList.map((r) => ({ slug: r.slug, name: r.name }));
      setRoles(roleOptions);
      setForm((f) => ({ ...f, role: f.role || pickDefaultRole(roleOptions) }));
      setAllPermissions(permInfo.permissions);
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

  const createUser = async () => {
    try {
      await api.createUser(form);
      setShowCreate(false);
      setForm({
        username: '',
        password: '',
        role: pickDefaultRole(roles),
        permissionGrants: [],
        permissionDenies: [],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateRole = async (id: number, role: string) => {
    try {
      await api.updateUser(id, { role });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteUser = async (id: number, username: string) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      await api.deleteUser(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleOverride = async (
    user: UserRow,
    kind: 'grant' | 'deny',
    permission: string
  ) => {
    const grants = new Set(user.permissionGrants);
    const denies = new Set(user.permissionDenies);
    if (kind === 'grant') {
      if (grants.has(permission)) grants.delete(permission);
      else {
        grants.add(permission);
        denies.delete(permission);
      }
    } else {
      if (denies.has(permission)) denies.delete(permission);
      else {
        denies.add(permission);
        grants.delete(permission);
      }
    }
    try {
      await api.updateUser(user.id, {
        permissionGrants: [...grants],
        permissionDenies: [...denies],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Assign users to roles defined under the Roles tab.</p>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setForm((f) => ({ ...f, role: pickDefaultRole(roles) }));
            }}
            disabled={roles.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-bg text-sm disabled:opacity-50"
          >
            <Plus size={14} /> Add user
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {roles.length === 0 && (
          <p className="text-sm text-muted">Create a role under the Roles tab before adding users.</p>
        )}

        {showCreate && roles.length > 0 && (
          <div className="border border-border rounded-lg p-4 bg-panel space-y-3">
            <h2 className="text-sm font-medium">New user</h2>
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 rounded bg-input border border-border text-sm"
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 rounded bg-input border border-border text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 rounded bg-input border border-border text-sm"
            >
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={createUser} className="px-3 py-1.5 rounded bg-accent text-bg text-sm">
                Create
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

        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="border border-border rounded-lg p-4 bg-panel">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium text-text">{user.username}</span>
                  <span className="ml-2 text-xs text-muted">{roles.find((r) => r.slug === user.role)?.name ?? user.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => void updateRole(user.id, e.target.value)}
                    disabled={user.id === currentUser?.id}
                    title={user.id === currentUser?.id ? 'Cannot change your own role' : undefined}
                    className="px-2 py-1 rounded bg-input border border-border text-xs disabled:opacity-50"
                  >
                    {roles.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void deleteUser(user.id, user.username)}
                    className="p-1.5 rounded text-red-400 hover:bg-input"
                    title="Delete user"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-muted hover:text-text">Permission overrides</summary>
                <div className="mt-2 max-h-48 overflow-auto grid grid-cols-1 gap-1">
                  {allPermissions.map((p) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-muted">{p}</span>
                      <button
                        type="button"
                        onClick={() => void toggleOverride(user, 'grant', p)}
                        className={`px-1.5 py-0.5 rounded ${user.permissionGrants.includes(p) ? 'bg-green-900/50 text-green-300' : 'bg-input text-muted'}`}
                      >
                        grant
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleOverride(user, 'deny', p)}
                        className={`px-1.5 py-0.5 rounded ${user.permissionDenies.includes(p) ? 'bg-red-900/50 text-red-300' : 'bg-input text-muted'}`}
                      >
                        deny
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted">
          Per-user grant/deny overrides still apply on top of role permissions. Edit role templates under Roles.
        </p>
      </div>
    </div>
  );
}
