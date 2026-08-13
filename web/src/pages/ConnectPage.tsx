import { useState, useEffect, useRef } from 'react';
import { Activity, Loader2, Server, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getServerUrl } from '../auth/storage';
import { formatServerLabel } from '../auth/savedServers';

export function ConnectPage() {
  const {
    connectToServer,
    serverUrl: activeServerUrl,
    loading: authLoading,
    skipConnectPageAutoConnect,
    savedServers,
    removeSavedServer,
  } = useAuth();
  const rememberedUrl = activeServerUrl || getServerUrl();
  const [serverUrl, setServerUrlInput] = useState('');
  const [connectingUrl, setConnectingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoConnectAttempted = useRef(false);

  useEffect(() => {
    if (
      authLoading ||
      skipConnectPageAutoConnect ||
      autoConnectAttempted.current ||
      !rememberedUrl?.trim() ||
      savedServers.length === 0
    ) {
      return;
    }
    autoConnectAttempted.current = true;
    setConnectingUrl(rememberedUrl.trim());
    void connectToServer(rememberedUrl.trim())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Cannot connect to server');
      })
      .finally(() => setConnectingUrl(null));
  }, [authLoading, rememberedUrl, connectToServer, skipConnectPageAutoConnect, savedServers.length]);

  const handleConnectSaved = async (url: string) => {
    setConnectingUrl(url);
    setError(null);
    try {
      await connectToServer(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to server');
    } finally {
      setConnectingUrl(null);
    }
  };

  const handleConnectNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = serverUrl.trim();
    if (!next) return;
    setConnectingUrl(next);
    setError(null);
    try {
      await connectToServer(next);
      setServerUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot connect to server');
    } finally {
      setConnectingUrl(null);
    }
  };

  const busy = connectingUrl != null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-lg border border-border rounded-lg bg-panel p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-accent-bright" size={28} />
          <div>
            <h1 className="text-lg font-semibold text-text">Player History</h1>
            <p className="text-xs text-muted">
              {skipConnectPageAutoConnect ? 'Switch server' : 'Connect to server'}
            </p>
          </div>
        </div>

        {savedServers.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Saved servers</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {savedServers.map((entry) => {
                const isConnecting = connectingUrl === entry.url;
                return (
                  <div
                    key={entry.url}
                    className="flex items-stretch gap-2 rounded border border-border bg-input"
                  >
                    <button
                      type="button"
                      onClick={() => void handleConnectSaved(entry.url)}
                      disabled={busy}
                      className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left hover:bg-deep disabled:opacity-60"
                    >
                      <Server size={16} className="mt-0.5 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">
                          {formatServerLabel(entry)}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-muted">{entry.url}</span>
                      </span>
                      {isConnecting && <Loader2 size={14} className="mt-1 shrink-0 animate-spin text-accent" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedServer(entry.url)}
                      disabled={busy}
                      className="px-3 text-muted hover:text-event-combat hover:bg-deep disabled:opacity-60"
                      title="Remove saved server"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleConnectNew} className="space-y-3 border-t border-border pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {savedServers.length > 0 ? 'Add server' : 'Server address'}
          </h2>
          <p className="text-xs text-muted">
            Enter a Player History API address. It will be saved on this device for quick switching.
          </p>

          <div>
            <label className="block text-sm text-muted mb-1">Server API address</label>
            <input
              type="text"
              inputMode="url"
              value={serverUrl}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="203.0.113.10:3847 or https://dayz.example.com"
              className="w-full px-3 py-2 rounded bg-input border border-border text-text text-sm"
              required
              autoFocus={skipConnectPageAutoConnect || savedServers.length === 0}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !serverUrl.trim()}
            className="w-full py-2.5 rounded bg-accent text-bg font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy && connectingUrl === serverUrl.trim() && <Loader2 size={16} className="animate-spin" />}
            {savedServers.length > 0 ? 'Add & connect' : 'Save & connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
