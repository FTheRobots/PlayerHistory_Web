import type { PlayerEvent } from '../types';
import { formatEventLabel } from '../utils/eventHelpers';
import { getEventLabelSegments, type ContainerQuery } from '../utils/containerHelpers';

interface EventLabelProps {
  event: PlayerEvent;
  onTrackItem?: (pid: string) => void;
  onViewContainer?: (query: ContainerQuery) => void;
  className?: string;
}

const linkClass =
  'font-medium hover:underline underline-offset-2';
const itemLinkClass = `${linkClass} text-event-inventory hover:text-green-bright decoration-event-inventory/50 hover:decoration-event-inventory`;
const containerLinkClass = `${linkClass} text-accent-bright hover:text-accent decoration-accent/50 hover:decoration-accent`;

export function EventLabel({ event, onTrackItem, onViewContainer, className = '' }: EventLabelProps) {
  const segments = getEventLabelSegments(event);

  if (!segments) {
    return <span className={className}>{formatEventLabel(event)}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <span key={index}>{segment.text}</span>;
        }

        if (segment.kind === 'item') {
          if (onTrackItem) {
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrackItem(segment.pid);
                }}
                className={itemLinkClass}
                title="View full item history"
              >
                {segment.name}
              </button>
            );
          }
          return <span key={index}>{segment.name}</span>;
        }

        if (onViewContainer) {
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewContainer(segment.query);
              }}
              className={containerLinkClass}
              title={`View items stored at ${segment.label}`}
            >
              {segment.label}
            </button>
          );
        }

        return <span key={index}>{segment.label}</span>;
      })}
    </span>
  );
}
