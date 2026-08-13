import { useState } from 'react';
import { AlertTriangle, ExternalLink, Info, User } from 'lucide-react';
import type { DashboardCommandRequest, OnlinePlayerDetail } from '../../types';
import { formatTimestamp, cftoolsProfileLink, steamProfileLink } from '../../utils/eventHelpers';
import { promptBanDetails, promptKickMessage, promptPrivateMessage } from '../../utils/adminActions';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../auth/permissions';
import { CFToolsPlayerPanel } from './CFToolsPlayerPanel';

interface OnlinePlayersTableProps {
  players: OnlinePlayerDetail[];
  cftoolsConfigured?: boolean;
  onSelectPlayer: (steamId: string) => void;
  onAdminCommand?: (request: DashboardCommandRequest) => void | Promise<void>;
  adminNotice?: string | null;
}

type DetailsTab = 'session' | 'cftools';

function PlayerDetailsModal({
  player,
  initialTab,
  cftoolsConfigured,
  onClose,
  onSelectPlayer,
  onAdminCommand,
  adminNotice,
}: {
  player: OnlinePlayerDetail;
  initialTab?: DetailsTab;
  cftoolsConfigured?: boolean;
  onClose: () => void;
  onSelectPlayer: (steamId: string) => void;
  onAdminCommand?: (request: DashboardCommandRequest) => void | Promise<void>;
  adminNotice?: string | null;
}) {
  const { hasPermission } = useAuth();
  const canHeal = hasPermission(PERMISSIONS.ADMIN_HEAL);
  const canKill = hasPermission(PERMISSIONS.ADMIN_KILL);
  const canMessage = hasPermission(PERMISSIONS.ADMIN_MESSAGE);
  const canKick = hasPermission(PERMISSIONS.ADMIN_KICK);
  const canBan = hasPermission(PERMISSIONS.ADMIN_BAN);
  const canViewCftools = hasPermission(PERMISSIONS.CFTOOLS_VIEW);
  const showCftoolsTab = Boolean(cftoolsConfigured && canViewCftools);
  const hasAnyAdmin = canHeal || canKill || canMessage || canKick || canBan;

  const [tab, setTab] = useState<DetailsTab>(
    initialTab === 'cftools' && showCftoolsTab ? 'cftools' : 'session'
  );

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-panel border border-border rounded-lg shadow-panel w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-lg text-text">{player.characterName ?? 'Unknown'}</h3>
            <p className="text-xs font-mono text-muted mt-0.5">{player.steamId}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-text text-sm">
            Close
          </button>
        </div>

        {showCftoolsTab && (
          <div className="flex gap-1 px-4 pt-3 border-b border-border">
            <button
              type="button"
              onClick={() => setTab('session')}
              className={`px-3 py-1.5 text-xs rounded-t border-b-2 transition-colors ${
                tab === 'session'
                  ? 'border-accent text-accent-bright'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              Session
            </button>
            <button
              type="button"
              onClick={() => setTab('cftools')}
              className={`px-3 py-1.5 text-xs rounded-t border-b-2 transition-colors inline-flex items-center gap-1 ${
                tab === 'cftools'
                  ? 'border-accent text-accent-bright'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              CFTools
              {player.cftoolsBan && <AlertTriangle size={12} className="text-event-combat" />}
            </button>
          </div>
        )}

        {tab === 'cftools' && showCftoolsTab ? (
          <div className="p-4">
            <CFToolsPlayerPanel steamId={player.steamId} />
          </div>
        ) : (
          <>
            <dl className="p-4 grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Time online</dt>
                <dd className="font-mono text-text">{player.timeOnline ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Session started</dt>
                <dd className="font-mono text-muted text-xs">
                  {player.sessionJoinTime ? formatTimestamp(player.sessionJoinTime) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">IP address</dt>
                <dd className="font-mono text-text">{player.ipAddress || 'Not available'}</dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Country</dt>
                <dd className="text-text">
                  {player.country ?? (player.ipAddress ? '—' : 'Requires IP')}
                </dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Last action</dt>
                <dd className="text-text">{player.lastAction ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Total events</dt>
                <dd className="font-mono">{player.totalEvents?.toLocaleString() ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">Sessions</dt>
                <dd className="font-mono">{player.totalSessions ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dim text-xs uppercase tracking-wide">First / last seen</dt>
                <dd className="font-mono text-xs text-muted">
                  {player.firstSeen ? formatTimestamp(player.firstSeen) : '—'}
                  {' · '}
                  {player.lastSeen ? formatTimestamp(player.lastSeen) : '—'}
                </dd>
              </div>
            </dl>

            {adminNotice && (
              <div className="mx-4 mb-2 px-3 py-2 rounded border border-accent/40 bg-accent-soft text-xs text-accent-bright font-mono">
                {adminNotice}
              </div>
            )}

            <div className="flex flex-wrap gap-2 p-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onSelectPlayer(player.steamId);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs rounded-sm border border-accent text-accent-bright hover:bg-accent-soft"
              >
                Open timeline
              </button>
              <a
                href={steamProfileLink(player.steamId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-border text-muted hover:text-text"
              >
                <ExternalLink size={12} />
                Steam
              </a>
              {onAdminCommand && hasAnyAdmin && (
                <>
                  {canHeal && (
                    <button
                      type="button"
                      onClick={() => void onAdminCommand?.({ type: 'heal', steamId: player.steamId })}
                      className="px-3 py-1.5 text-xs rounded-sm border border-event-inventory/40 text-event-inventory hover:bg-event-inventory/10"
                    >
                      Heal
                    </button>
                  )}
                  {canKill && (
                    <button
                      type="button"
                      onClick={() => void onAdminCommand?.({ type: 'kill', steamId: player.steamId })}
                      className="px-3 py-1.5 text-xs rounded-sm border border-event-combat/40 text-event-combat hover:bg-event-combat/10"
                    >
                      Kill
                    </button>
                  )}
                  {canMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        const message = promptPrivateMessage();
                        if (message) void onAdminCommand?.({ type: 'message', steamId: player.steamId, message });
                      }}
                      className="px-3 py-1.5 text-xs rounded-sm border border-border text-muted hover:text-text"
                    >
                      Message
                    </button>
                  )}
                  {canKick && (
                    <button
                      type="button"
                      onClick={() => {
                        const message = promptKickMessage();
                        if (message === undefined) return;
                        void onAdminCommand?.({ type: 'kick', steamId: player.steamId, message });
                      }}
                      className="px-3 py-1.5 text-xs rounded-sm border border-event-session/40 text-event-session hover:bg-event-session/10"
                    >
                      Kick
                    </button>
                  )}
                  {canBan && (
                    <button
                      type="button"
                      onClick={() => {
                        const ban = promptBanDetails();
                        if (!ban) return;
                        void onAdminCommand?.({
                          type: 'ban',
                          steamId: player.steamId,
                          message: ban.message,
                          banDurationMinutes: ban.banDurationMinutes,
                        });
                      }}
                      className="px-3 py-1.5 text-xs rounded-sm border border-event-combat/60 text-event-combat hover:bg-event-combat/10"
                    >
                      Ban
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function OnlinePlayersTable({
  players,
  cftoolsConfigured,
  onSelectPlayer,
  onAdminCommand,
  adminNotice,
}: OnlinePlayersTableProps) {
  const { hasPermission } = useAuth();
  const canViewCftools = hasPermission(PERMISSIONS.CFTOOLS_VIEW);
  const showCftoolsProfile = Boolean(cftoolsConfigured && canViewCftools);
  const [detailsPlayer, setDetailsPlayer] = useState<OnlinePlayerDetail | null>(null);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('session');

  const openDetails = (player: OnlinePlayerDetail, tab: DetailsTab = 'session') => {
    setDetailsPlayer(player);
    setDetailsTab(tab);
  };

  if (!players?.length) {
    return (
      <div className="bg-panel border border-border rounded p-8 text-center text-muted text-sm">
        <User size={32} className="mx-auto mb-3 opacity-30" />
        No players currently online
      </div>
    );
  }

  return (
    <>
      <div className="bg-panel border border-border rounded overflow-hidden shadow-panel">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
            Online players ({players.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-border">
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Steam ID</th>
                <th className="px-4 py-2 font-semibold">IP / Country</th>
                <th className="px-4 py-2 font-semibold">Online</th>
                <th className="px-4 py-2 font-semibold">Last action</th>
                <th className="px-4 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.steamId} className="border-b border-border/60 hover:bg-grey-btn/30">
                  <td className="px-4 py-2.5 font-medium">
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(player.steamId)}
                      className="text-green-bright hover:text-accent-bright hover:underline underline-offset-2 text-left"
                      title="Open player timeline"
                    >
                      {player.characterName ?? 'Unknown'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{player.steamId}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {player.ipAddress ?? '—'}
                    {player.country ? ` · ${player.country}` : ''}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{player.timeOnline ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-text max-w-[280px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{player.lastAction ?? '—'}</span>
                      {player.cftoolsBan && cftoolsConfigured && (
                        <button
                          type="button"
                          onClick={() => openDetails(player, 'cftools')}
                          className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded border border-event-combat/50 text-event-combat hover:bg-event-combat/10 max-w-[140px]"
                          title={player.cftoolsBan.reason}
                        >
                          <AlertTriangle size={11} />
                          <span className="truncate text-[10px] uppercase tracking-wide">CF Ban</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetails(player, 'session')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-border text-muted hover:text-accent-bright hover:border-accent"
                      >
                        <Info size={12} />
                        Details
                      </button>
                      {showCftoolsProfile &&
                        (player.cftoolsId ? (
                          <a
                            href={cftoolsProfileLink(player.cftoolsId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-border text-muted hover:text-accent-bright hover:border-accent"
                          >
                            <ExternalLink size={12} />
                            CFTools Profile
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDetails(player, 'cftools')}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-sm border border-border text-muted hover:text-accent-bright hover:border-accent"
                          >
                            <ExternalLink size={12} />
                            CFTools Profile
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailsPlayer && (
        <PlayerDetailsModal
          player={detailsPlayer}
          initialTab={detailsTab}
          cftoolsConfigured={cftoolsConfigured}
          onClose={() => setDetailsPlayer(null)}
          onSelectPlayer={onSelectPlayer}
          onAdminCommand={onAdminCommand}
          adminNotice={adminNotice}
        />
      )}
    </>
  );
}
