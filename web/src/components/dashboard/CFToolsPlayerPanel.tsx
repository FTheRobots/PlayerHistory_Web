import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { CFToolsPlayerProfile } from '../../types';
import { cftoolsProfileLink, formatTimestamp } from '../../utils/eventHelpers';

function StatBlock({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt className="text-dim text-xs uppercase tracking-wide">{label}</dt>
      <dd className="font-mono text-sm text-text">{value}</dd>
    </div>
  );
}

function renderStats(stats: Record<string, unknown> | null) {
  if (!stats) return <p className="text-sm text-muted">No server statistics available for this player.</p>;

  const dayz = (stats.statistics as Record<string, unknown> | undefined)?.dayz as
    | Record<string, unknown>
    | undefined;
  const kills = stats.kills ?? dayz?.kills;
  const deaths = stats.deaths ?? dayz?.deaths;

  return (
    <dl className="grid grid-cols-2 gap-3">
      <StatBlock label="Playtime (seconds)" value={typeof stats.playtime === 'number' ? stats.playtime : undefined} />
      <StatBlock label="Sessions" value={typeof stats.sessions === 'number' ? stats.sessions : undefined} />
      <StatBlock label="Kills" value={typeof kills === 'number' ? kills : undefined} />
      <StatBlock label="Deaths" value={typeof deaths === 'number' ? deaths : undefined} />
      <StatBlock
        label="K/D ratio"
        value={typeof stats.kdratio === 'number' ? stats.kdratio.toFixed(2) : undefined}
      />
      <StatBlock label="First seen" value={typeof stats.firstSeen === 'string' ? formatTimestamp(stats.firstSeen) : undefined} />
      <StatBlock label="Last seen" value={typeof stats.lastSeen === 'string' ? formatTimestamp(stats.lastSeen) : undefined} />
    </dl>
  );
}

export function CFToolsPlayerPanel({ steamId }: { steamId: string }) {
  const [profile, setProfile] = useState<CFToolsPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCFToolsPlayer(steamId);
      setProfile(data);
      setError(data.error ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted text-sm py-6 justify-center">
        <Loader2 size={16} className="animate-spin" />
        Loading CFTools profile...
      </div>
    );
  }

  if (!profile?.configured) {
    return (
      <p className="text-sm text-muted py-4">
        CFTools integration is not configured. An admin can set it up under Administration → CFTools.
      </p>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 rounded border border-event-combat/40 bg-event-combat/10 text-sm text-event-combat">
        {error}
      </div>
    );
  }

  const lookup = profile.lookup;

  return (
    <div className="space-y-4">
      {profile.activeBan && (
        <div className="flex items-start gap-2 px-3 py-2 rounded border border-event-combat/50 bg-event-combat/10">
          <AlertTriangle size={16} className="text-event-combat shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-event-combat">Active CFTools ban</p>
            <p className="text-sm text-text mt-0.5">{profile.activeBan.reason}</p>
            {(profile.activeBan.banlistName || profile.activeBan.banlistCount) && (
              <p className="text-xs text-muted mt-1">
                {profile.activeBan.banlistCount && profile.activeBan.banlistCount > 1
                  ? `${profile.activeBan.banlistCount} banlists`
                  : profile.activeBan.banlistName ?? profile.activeBan.banlistId ?? 'CFTools banlist'}
              </p>
            )}
            <p className="text-xs text-muted font-mono mt-1">
              {profile.activeBan.expiresAt
                ? `Expires ${formatTimestamp(profile.activeBan.expiresAt)}`
                : 'Permanent ban'}
            </p>
          </div>
        </div>
      )}

      <section>
        <h4 className="text-xs uppercase tracking-wide text-muted mb-2">Account</h4>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <StatBlock label="CFTools ID" value={lookup?.cftoolsId} />
          <StatBlock label="Steam ID" value={lookup?.steamId ?? steamId} />
          <StatBlock label="IP address" value={lookup?.ipAddress} />
          <StatBlock label="Country" value={lookup?.country} />
          <StatBlock label="BattlEye GUID" value={lookup?.battleyeGuid} />
          <StatBlock label="Bohemia UID" value={lookup?.bohemiaUid} />
        </dl>
        {lookup?.cftoolsId && (
          <a
            href={cftoolsProfileLink(lookup.cftoolsId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs rounded-sm border border-border text-muted hover:text-accent-bright hover:border-accent"
          >
            <ExternalLink size={12} />
            Open CFTools profile
          </a>
        )}
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-wide text-muted mb-2">Server statistics</h4>
        {renderStats(profile.stats)}
      </section>

      <section>
        <h4 className="text-xs uppercase tracking-wide text-muted mb-2">
          Ban history across CFTools ({profile.bans.length})
        </h4>
        {profile.bans.length === 0 ? (
          <p className="text-sm text-muted">No bans found on any granted CFTools banlist.</p>
        ) : (
          <ul className="space-y-2">
            {profile.bans.map((ban) => (
              <li key={`${ban.banlistId ?? 'list'}-${ban.id}`} className="px-3 py-2 rounded border border-border bg-input/40 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-text">{ban.reason}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wide shrink-0 ${
                      ban.status === 'Ban.ACTIVE' || ban.status === 'ACTIVE'
                        ? 'text-event-combat'
                        : 'text-muted'
                    }`}
                  >
                    {ban.status?.replace('Ban.', '') ?? 'unknown'}
                  </span>
                </div>
                {(ban.banlistName || ban.banlistId) && (
                  <p className="text-xs text-muted mt-1">
                    Banlist: {ban.banlistName ?? ban.banlistId}
                  </p>
                )}
                <p className="text-xs text-muted font-mono mt-1">
                  {ban.created ? formatTimestamp(ban.created) : '—'}
                  {' · '}
                  {ban.expiration === 'Permanent' || !ban.expiration
                    ? ban.expiration === 'Permanent'
                      ? 'Permanent'
                      : 'No expiry'
                    : `Expires ${formatTimestamp(ban.expiration)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(profile.whitelist || profile.queuePriority) && (
        <section>
          <h4 className="text-xs uppercase tracking-wide text-muted mb-2">Access</h4>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            {profile.whitelist && (
              <StatBlock label="Whitelist" value={JSON.stringify(profile.whitelist)} />
            )}
            {profile.queuePriority && (
              <StatBlock label="Queue priority" value={JSON.stringify(profile.queuePriority)} />
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
