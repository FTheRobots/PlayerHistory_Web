import { useCallback, useEffect, useState } from 'react';
import { Cloud, Loader2, PlugZap, Save } from 'lucide-react';
import { api } from '../api/client';
import type { CFToolsConfigPublic } from '../types';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../auth/permissions';

const EMPTY_FORM = {
  enabled: false,
  applicationId: '',
  applicationSecret: '',
  serverApiId: '',
  banlistId: '',
};

export function CFToolsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CFTOOLS_MANAGE);
  const [config, setConfig] = useState<CFToolsConfigPublic | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCFToolsConfig();
      setConfig(data);
      setForm({
        enabled: data.enabled,
        applicationId: data.applicationId,
        applicationSecret: '',
        serverApiId: data.serverApiId,
        banlistId: data.banlistId,
      });
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

  const save = async () => {
    if (!canManage) return;
    setSaving(true);
    setSavedNotice(null);
    setTestResult(null);
    try {
      const saved = await api.saveCFToolsConfig({
        enabled: form.enabled,
        applicationId: form.applicationId.trim(),
        applicationSecret: form.applicationSecret.trim() || undefined,
        serverApiId: form.serverApiId.trim(),
        banlistId: form.banlistId.trim(),
      });
      setConfig(saved);
      setForm((prev) => ({ ...prev, applicationSecret: '' }));
      setSavedNotice('Configuration saved.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testCFToolsConnection();
      if (result.ok) {
        const parts = ['Connection successful.'];
        if (result.serverName) parts.push(`Server: ${result.serverName}.`);
        if (result.grantCount != null) parts.push(`Granted banlists: ${result.grantCount}.`);
        if (result.onlineSessionCount != null) {
          parts.push(`Online sessions (GSM): ${result.onlineSessionCount}.`);
        }
        setTestResult(parts.join(' '));
      } else {
        setTestResult(result.error ?? 'Connection failed.');
      }
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading CFTools settings...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Cloud size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-text">CFTools integration</h2>
        </div>

        <p className="text-sm text-muted">
          Connect to the{' '}
          <a
            href="https://developer.cftools.cloud/documentation/data-api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright hover:underline"
          >
            CFTools Data API
          </a>{' '}
          to show player profiles, ban status across granted banlists, and server stats on the dashboard. Your application must be
          granted access by the server owner via the Grant URL in the CFTools developer portal.
        </p>

        {error && (
          <div className="px-3 py-2 rounded border border-event-combat/40 bg-event-combat/10 text-sm text-event-combat">
            {error}
          </div>
        )}

        {savedNotice && (
          <div className="px-3 py-2 rounded border border-accent/40 bg-accent-soft text-sm text-accent-bright">
            {savedNotice}
          </div>
        )}

        {testResult && (
          <div className="px-3 py-2 rounded border border-border bg-panel text-sm text-text font-mono">
            {testResult}
          </div>
        )}

        <div className="bg-panel border border-border rounded-lg p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              disabled={!canManage}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-border"
            />
            Enable CFTools integration
          </label>

          <div className="grid gap-3">
            <label className="block text-sm">
              <span className="text-muted text-xs uppercase tracking-wide">Application ID</span>
              <input
                type="text"
                value={form.applicationId}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-border bg-input text-text font-mono text-sm"
                placeholder="Your CFTools application ID"
              />
            </label>

            <label className="block text-sm">
              <span className="text-muted text-xs uppercase tracking-wide">Application secret</span>
              <input
                type="password"
                value={form.applicationSecret}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, applicationSecret: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-border bg-input text-text font-mono text-sm"
                placeholder={config?.hasSecret ? 'Leave blank to keep existing secret' : 'Application secret'}
              />
            </label>

            <label className="block text-sm">
              <span className="text-muted text-xs uppercase tracking-wide">Server API ID</span>
              <input
                type="text"
                value={form.serverApiId}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, serverApiId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-border bg-input text-text font-mono text-sm"
                placeholder="CFTools Cloud server API ID"
              />
            </label>

            <label className="block text-sm">
              <span className="text-muted text-xs uppercase tracking-wide">
                Banlist ID <span className="normal-case text-dim">(optional)</span>
              </span>
              <input
                type="text"
                value={form.banlistId}
                disabled={!canManage}
                onChange={(e) => setForm((f) => ({ ...f, banlistId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-border bg-input text-text font-mono text-sm"
                placeholder="Only needed for issuing bans via API"
              />
              <span className="block mt-1 text-xs text-dim">
                Ban checks use every banlist your app is granted access to, not just this ID.
              </span>
            </label>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-accent text-accent-bright hover:bg-accent-soft disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
              <button
                type="button"
                onClick={() => void testConnection()}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-border text-muted hover:text-text disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                Test connection
              </button>
            </div>
          )}
        </div>

        {config?.updatedAt && (
          <p className="text-xs text-dim">Last updated: {config.updatedAt}</p>
        )}
      </div>
    </div>
  );
}
