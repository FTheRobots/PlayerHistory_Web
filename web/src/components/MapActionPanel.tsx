import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlayerEvent } from '../types';
import { MAP_ACTION_PANEL_COUNT } from '../config/mapReplayConfig';
import { eventLabelKey, recentMapLabelEvents, sortClusterEventsForTimeline } from '../utils/mapReplay';
import {
  formatEventSubtitle,
  formatMapInspectorDetail,
  formatTimestamp,
  getCategoryStyle,
  getEventIcon,
} from '../utils/eventHelpers';
import type { ContainerQuery } from '../utils/containerHelpers';
import { EventLabel } from './EventLabel';

export type MapFeedScope = 'now' | 'here';

interface MapActionPanelProps {
  events: PlayerEvent[];
  scrubMs: number;
  rangeStart: number;
  onTrackItem?: (pid: string) => void;
  onViewContainer?: (query: ContainerQuery) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  focusEvents?: PlayerEvent[] | null;
  scope?: MapFeedScope;
  onScopeChange?: (scope: MapFeedScope) => void;
  selectedEventKey?: string | null;
  onSelectEvent?: (event: PlayerEvent) => void;
  eventKey?: (event: PlayerEvent) => string;
}

export function MapActionPanel({
  events,
  scrubMs,
  rangeStart,
  onTrackItem,
  onViewContainer,
  open: openProp,
  onOpenChange,
  focusEvents,
  scope = 'now',
  onScopeChange,
  selectedEventKey,
  onSelectEvent,
  eventKey = eventLabelKey,
}: MapActionPanelProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const listRef = useRef<HTMLDivElement>(null);

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const hasHere = Boolean(focusEvents && focusEvents.length > 0);
  const showingHere = scope === 'here' && hasHere;

  const actions = useMemo(() => {
    if (showingHere && focusEvents) {
      return sortClusterEventsForTimeline(focusEvents);
    }
    return recentMapLabelEvents(events, scrubMs, rangeStart, MAP_ACTION_PANEL_COUNT, true);
  }, [events, scrubMs, rangeStart, focusEvents, showingHere]);

  useEffect(() => {
    if (!selectedEventKey || !open) return;
    const node = listRef.current?.querySelector(`[data-event-key="${CSS.escape(selectedEventKey)}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [selectedEventKey, showingHere, open, actions.length]);

  return (
    <div
      className={`flex shrink-0 flex-col border-l border-border bg-panel transition-[width] duration-200 ${
        open ? 'w-80' : 'w-9'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center gap-1 border-b border-border px-1 py-2 text-xs text-muted hover:bg-deep hover:text-text"
        title={open ? 'Collapse inspector' : 'Expand inspector'}
        aria-expanded={open}
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {!open && (
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-wide">
            Events
          </span>
        )}
        {open && (
          <span className="font-semibold text-text">
            {showingHere ? `${actions.length} here` : 'Now'}
          </span>
        )}
      </button>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onScopeChange?.('now')}
              className={`rounded-sm px-2 py-0.5 text-[11px] font-medium ${
                !showingHere ? 'bg-accent/20 text-text' : 'text-muted hover:text-text'
              }`}
            >
              Now
            </button>
            <button
              type="button"
              disabled={!hasHere}
              onClick={() => hasHere && onScopeChange?.('here')}
              className={`rounded-sm px-2 py-0.5 text-[11px] font-medium disabled:opacity-35 ${
                showingHere ? 'bg-accent/20 text-text' : 'text-muted hover:text-text'
              }`}
            >
              Here
            </button>
          </div>
          <p className="text-[10px] text-dim">
            {showingHere
              ? 'This location · oldest → newest'
              : 'At scrub time · oldest → newest'}
          </p>
          {actions.length === 0 ? (
            <div className="rounded border border-border bg-deep px-2 py-3 text-xs text-muted">
              No events in this view yet.
            </div>
          ) : (
            <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1">
              {actions.map((event) => {
                const Icon = getEventIcon(event.event);
                const subtitle = formatMapInspectorDetail(event) ?? formatEventSubtitle(event);
                const key = eventKey(event);
                const selected = selectedEventKey === key;
                return (
                  <div
                    key={`${key}-${event.metadata?.item ?? ''}`}
                    data-event-key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectEvent?.(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectEvent?.(event);
                      }
                    }}
                    className={`flex cursor-pointer flex-col gap-1 rounded border p-2 text-left text-xs ${getCategoryStyle(event.category)} ${
                      selected ? 'ring-1 ring-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <Icon size={12} className="mt-0.5 shrink-0 opacity-80" />
                      <EventLabel
                        event={event}
                        onTrackItem={onTrackItem}
                        onViewContainer={onViewContainer}
                        className="line-clamp-2 font-medium leading-snug"
                      />
                    </div>
                    {subtitle && <div className="truncate text-[10px] opacity-80">{subtitle}</div>}
                    <div className="mt-auto truncate font-mono text-[10px] text-dim">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
