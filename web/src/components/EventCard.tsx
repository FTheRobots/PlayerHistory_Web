import { useState, memo } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import type { PlayerEvent } from '../types';
import { getCategoryStyle, getEventIcon, formatTimestamp, formatPosition, xamMapLink } from '../utils/eventHelpers';
import { extractItemPidFromEvent, eventLabelHasTrackableItem } from '../utils/itemHelpers';
import type { ContainerQuery } from '../utils/containerHelpers';
import type { PlayerColorStyle } from '../utils/playerColors';
import { EventLabel } from './EventLabel';
import { ItemLink } from './ItemLink';

interface EventCardProps {
  event: PlayerEvent;
  expanded?: boolean;
  playerBadge?: {
    name?: string;
    steamId: string;
    color: PlayerColorStyle;
  };
  onTrackItem?: (pid: string) => void;
  onViewContainer?: (query: ContainerQuery) => void;
}

export const EventCard = memo(function EventCard({
  event,
  expanded: defaultExpanded = false,
  playerBadge,
  onTrackItem,
  onViewContainer,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = getEventIcon(event.event);
  const categoryStyle = getCategoryStyle(event.category);
  const mapLink = xamMapLink(event.position);

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors hover:border-surface-border/80 ${categoryStyle.split(' ').slice(1).join(' ')} border`}>
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-0.5 p-1.5 rounded-md ${categoryStyle.split(' ')[0]} bg-surface-overlay`}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
            {playerBadge && (
              <span
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${playerBadge.color.badge}`}
                title={playerBadge.steamId}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${playerBadge.color.dot}`} />
                {playerBadge.name ?? playerBadge.steamId.slice(-8)}
              </span>
            )}
            {event.category && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${categoryStyle}`}>
                {event.category}
              </span>
            )}
          </div>
          <div className="font-medium text-sm mt-0.5">
            <EventLabel event={event} onTrackItem={onTrackItem} onViewContainer={onViewContainer} />
          </div>
          {onTrackItem && extractItemPidFromEvent(event) && !eventLabelHasTrackableItem(event) && (
            <div className="mt-1.5">
              <ItemLink event={event} onTrack={onTrackItem} compact />
            </div>
          )}
          {event.position && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 font-mono">
              <MapPin size={12} />
              {formatPosition(event.position)}
              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline ml-1 inline-flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={10} />
                  map
                </a>
              )}
            </div>
          )}
        </div>

        <div className="text-gray-500 mt-1">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && event.metadata && Object.keys(event.metadata).length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-surface-border/50">
          <dl className="grid grid-cols-1 gap-1 mt-2">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <dt className="text-gray-500 font-medium min-w-[100px]">{key}</dt>
                <dd className="text-gray-300 font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
          {event.sessionId && (
            <div className="text-xs text-gray-600 mt-2 font-mono">Session: {event.sessionId}</div>
          )}
        </div>
      )}
    </div>
  );
});
