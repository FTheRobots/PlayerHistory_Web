import { Package } from 'lucide-react';
import type { PlayerEvent } from '../types';
import { parseItemFromMeta } from '../utils/eventHelpers';
import { extractItemPidFromEvent, formatItemPidShort } from '../utils/itemHelpers';

interface ItemLinkProps {
  event: PlayerEvent;
  onTrack: (pid: string) => void;
  className?: string;
  compact?: boolean;
}

export function ItemLink({ event, onTrack, className = '', compact = false }: ItemLinkProps) {
  const pid = extractItemPidFromEvent(event);
  if (!pid) return null;

  const item = parseItemFromMeta(event.metadata?.item);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTrack(pid);
      }}
      className={`inline-flex items-center gap-1 text-xs font-medium text-event-inventory hover:text-green-bright border border-event-inventory/40 bg-event-inventory/10 hover:bg-event-inventory/20 rounded-sm px-2 py-0.5 transition-colors ${className}`}
      title={`Track item ${pid}`}
    >
      <Package size={12} className="shrink-0" />
      {compact ? (
        <span>Track</span>
      ) : (
        <span>
          Track {item.name}
          <span className="text-dim font-mono ml-1">· {formatItemPidShort(pid)}</span>
        </span>
      )}
    </button>
  );
}
