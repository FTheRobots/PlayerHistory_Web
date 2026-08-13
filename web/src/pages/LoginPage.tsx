import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRememberMe, getRememberedUsername, setRememberMe } from '../auth/storage';
import { VersionInfo } from '../components/VersionInfo';

export function LoginPage() {
  const { login, setupOwner, needsSetup, serverHealth, serverUrl, changeServer } = useAuth();
  const [username, setUsername] = useState(() => getRememberedUsername());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMeState] = useState(() => getRememberMe());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsSetup) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await setupOwner(username.trim(), password);
      } else {
        await login(username.trim(), password, rememberMe);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md border border-border rounded-lg bg-panel p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-accent-bright" size={28} />
          <div>
            <h1 className="text-lg font-semibold text-text">Player History</h1>
            <p className="text-xs text-muted">Sign in</p>
          </div>
        </div>

        <div className="mb-6 p-3 rounded bg-input border border-border">
          <p className="text-xs text-muted mb-1">Connected to</p>
          <p className="text-sm font-medium text-text truncate">{serverHealth?.name ?? 'Player History Server'}</p>
          {serverUrl && (
            <p className="text-[11px] text-muted font-mono truncate mt-0.5" title={serverUrl}>
              {serverUrl}
            </p>
          )}
          <button type="button" onClick={() => void changeServer()} className="mt-2 text-xs text-accent hover:underline">
            Switch server…
          </button>
          <div className="mt-3 pt-3 border-t border-border">
            <VersionInfo serverHealth={serverHealth} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-sm font-medium text-text">
            {needsSetup ? 'First-run owner setup' : 'Sign in'}
          </h2>
          {needsSetup && (
            <p className="text-xs text-muted">
              No users exist yet. Create the owner account to secure this server.
            </p>
          )}

          <div>
            <label className="block text-sm text-muted mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded bg-input border border-border text-text text-sm"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-input border border-border text-text text-sm"
              required
              minLength={8}
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
            />
          </div>

          {needsSetup && (
            <div>
              <label className="block text-sm text-muted mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-input border border-border text-text text-sm"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          )}

          {!needsSetup && (
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  setRememberMeState(e.target.checked);
                  setRememberMe(e.target.checked);
                }}
                className="rounded border-border bg-input accent-accent w-4 h-4"
              />
              Remember me on this device
            </label>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded bg-accent text-bg font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {needsSetup ? 'Create owner account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
