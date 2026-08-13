import { CLIENT_CODENAME, CLIENT_VERSION } from '../version';
import { compareSemver, formatVersionLabel } from '../utils/semver';
import type { ServerHealthInfo } from '../auth/storage';

interface VersionInfoProps {
  serverHealth?: ServerHealthInfo | null;
  compact?: boolean;
  className?: string;
}

export function isClientOutdated(serverHealth: ServerHealthInfo | null | undefined): boolean {
  if (!serverHealth?.minClientVersion) return false;
  return compareSemver(CLIENT_VERSION, serverHealth.minClientVersion) < 0;
}

function releaseTitle(version: string | undefined, codename: string | undefined): string {
  const v = formatVersionLabel(version);
  return codename?.trim() ? `${v} “${codename.trim()}”` : v;
}

export function VersionInfo({ serverHealth, compact = false, className = '' }: VersionInfoProps) {
  const client = releaseTitle(CLIENT_VERSION, CLIENT_CODENAME);
  const server = releaseTitle(serverHealth?.version, serverHealth?.codename);
  const outdated = isClientOutdated(serverHealth);

  if (compact) {
    return (
      <span
        className={`text-[11px] text-muted font-mono ${className}`}
        title={CLIENT_CODENAME ? `PlayerHistory ${CLIENT_CODENAME}` : 'Admin client / server version'}
      >
        v{formatVersionLabel(CLIENT_VERSION)}
        {CLIENT_CODENAME ? ` · ${CLIENT_CODENAME}` : ''}
        {serverHealth?.version ? ` · srv ${formatVersionLabel(serverHealth.version)}` : ''}
      </span>
    );
  }

  return (
    <div className={`text-xs text-muted space-y-1 ${className}`}>
      <div>
        Admin client: <span className="font-mono text-text">v{client}</span>
      </div>
      {serverHealth?.version && (
        <div>
          Server: <span className="font-mono text-text">v{server}</span>
          {serverHealth.apiVersion != null && (
            <span className="text-muted"> · API {serverHealth.apiVersion}</span>
          )}
        </div>
      )}
      {outdated && (
        <p className="text-event-session text-[11px]">
          This client is older than the server requires (min v{formatVersionLabel(serverHealth?.minClientVersion)}).
          Update the admin app.
        </p>
      )}
    </div>
  );
}

export function VersionMismatchBanner({ serverHealth }: { serverHealth: ServerHealthInfo | null | undefined }) {
  if (!isClientOutdated(serverHealth)) return null;

  return (
    <div className="shrink-0 px-4 py-2 text-xs border-b border-event-session/40 bg-event-session/10 text-event-session">
      Admin client v{formatVersionLabel(CLIENT_VERSION)} is below the server minimum (v
      {formatVersionLabel(serverHealth?.minClientVersion)}). Some features may not work — update the admin app.
    </div>
  );
}
