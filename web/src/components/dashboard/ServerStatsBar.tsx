import { Activity, Cpu, Skull, PawPrint, Users, Zap, Bot } from 'lucide-react';
import type { DashboardServerStats } from '../../types';

interface ServerStatsBarProps {
  stats: DashboardServerStats;
  live?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-accent-bright',
  offline = false,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  accent?: string;
  offline?: boolean;
}) {
  return (
    <div className={`bg-panel border rounded p-3 shadow-panel min-w-[120px] ${offline ? 'border-border/60 opacity-80' : 'border-border'}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
        <Icon size={12} className={offline ? 'text-dim' : accent} />
        {label}
      </div>
      <div
        className={`text-xl font-semibold font-mono tracking-wide ${
          offline ? 'text-event-combat text-base' : accent
        }`}
      >
        {offline ? 'OFFLINE' : value}
      </div>
    </div>
  );
}

export function ServerStatsBar({ stats, live = true }: ServerStatsBarProps) {
  const fmt = (n?: number) => (n == null ? '—' : n.toLocaleString());
  const fmtFps = (n?: number) => {
    if (n == null || n <= 0) return '—';
    return Math.round(n).toLocaleString();
  };
  const offline = !live;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wide">Server overview</h2>
        <span className={`text-[11px] font-mono ${offline ? 'text-event-combat' : 'text-dim'}`}>
          {offline
            ? 'Server offline'
            : `${stats.snapshotAvailable ? 'Live snapshot' : 'Index only'} · updated ${new Date(stats.timestamp).toLocaleTimeString()}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatCard label="Server FPS" value={fmtFps(stats.serverFps)} icon={Activity} offline={offline} />
        <StatCard label="Online" value={stats.playerCount} icon={Users} accent="text-green-bright" offline={offline} />
        <StatCard label="Zombies" value={fmt(stats.zombieCount)} icon={Skull} accent="text-event-zombie" offline={offline} />
        <StatCard label="Animals" value={fmt(stats.animalCount)} icon={PawPrint} accent="text-event-animal" offline={offline} />
        <StatCard label="Human AI" value={fmt(stats.aiCount)} icon={Bot} accent="text-event-action" offline={offline} />
        <StatCard label="Total players" value={stats.totalPlayers} icon={Users} offline={offline} />
        <StatCard label="Events / 1h" value={stats.eventsLastHour} icon={Zap} offline={offline} />
        <StatCard label="Events / 24h" value={stats.eventsLast24h} icon={Cpu} offline={offline} />
      </div>
    </div>
  );
}
