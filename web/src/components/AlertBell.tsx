import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAlerts, type BellAlert } from '../hooks/useAlerts';
import { formatTimestamp } from '../utils/eventHelpers';

function alertLabel(alert: BellAlert): string {
  if (alert.kind === 'watchlist') return alert.eventType;
  return 'Query watch';
}

export function AlertBell() {
  const {
    enabled,
    watchlistEnabled,
    queryWatchEnabled,
    alerts,
    unreadCount,
    latestToast,
    markRead,
    markAllRead,
    dismissToast,
  } = useAlerts();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <>
      {latestToast && (
        <div className="fixed top-16 right-4 z-[1700] max-w-sm w-full border border-accent/50 bg-panel shadow-panel rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Bell size={16} className="text-accent-bright shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-accent-bright">{alertLabel(latestToast)}</div>
              <div className="text-sm text-text mt-0.5">{latestToast.message}</div>
            </div>
            <button type="button" onClick={dismissToast} className="text-muted hover:text-text">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative p-1.5 text-muted hover:text-text rounded"
          title="Alerts"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-event-combat text-[10px] text-white flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <button type="button" className="fixed inset-0 z-[1400]" aria-label="Close alerts" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-[1500] w-80 max-h-96 overflow-auto border border-border bg-panel rounded-lg shadow-panel">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium text-text">Alerts</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs text-accent-bright hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-border/60">
                {alerts.map((alert) => (
                  <button
                    key={`${alert.kind}-${alert.id}`}
                    type="button"
                    onClick={() => void markRead(alert)}
                    className={`w-full text-left px-3 py-2 hover:bg-panel/60 ${alert.read ? 'opacity-60' : ''}`}
                  >
                    <div className="text-xs text-accent-bright uppercase">{alertLabel(alert)}</div>
                    <div className="text-sm text-text">{alert.message}</div>
                    <div className="text-[10px] text-muted mt-1">{formatTimestamp(alert.createdAt)}</div>
                  </button>
                ))}
                {alerts.length === 0 && (
                  <div className="px-3 py-6 text-sm text-muted text-center">No alerts yet.</div>
                )}
              </div>
              {(watchlistEnabled || queryWatchEnabled) && (
                <div className="px-3 py-2 border-t border-border text-center space-x-3">
                  {watchlistEnabled && (
                    <NavLink
                      to="/admin/watchlist"
                      className="text-xs text-accent-bright hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Manage watchlist
                    </NavLink>
                  )}
                  {queryWatchEnabled && (
                    <NavLink
                      to="/search"
                      className="text-xs text-accent-bright hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Saved queries
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
