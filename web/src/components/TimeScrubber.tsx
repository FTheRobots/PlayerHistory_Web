import { useMemo } from 'react';
import { Play, Pause, Gauge, ChevronLeft, ChevronRight } from 'lucide-react';
import { TIME_WINDOWS, type TimeWindowId } from '../config/mapConfig';
import { formatPlaybackSpeed, type PlaybackSpeed } from '../config/mapReplayConfig';
import {
  buildTimelineMarks,
  categoryColor,
  collectSnapEventTimes,
  findNextEventTime,
  findPreviousEventTime,
  formatScrubTime,
  timelineMarkTitle,
} from '../utils/mapReplay';
import type { PlayerEvent } from '../types';

interface TimeScrubberProps {
  rangeStart: number;
  rangeEnd: number;
  scrubMs: number;
  onScrub: (ms: number) => void;
  windowId: TimeWindowId;
  onWindowChange: (id: TimeWindowId) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  playbackSpeed: PlaybackSpeed;
  onPlaybackSpeedCycle: () => void;
  eventCount: number;
  events: PlayerEvent[];
}

export function TimeScrubber({
  rangeStart,
  rangeEnd,
  scrubMs,
  onScrub,
  windowId,
  onWindowChange,
  playing,
  onPlayingChange,
  playbackSpeed,
  onPlaybackSpeedCycle,
  eventCount,
  events,
}: TimeScrubberProps) {
  const span = rangeEnd - rangeStart;

  const marks = useMemo(
    () => buildTimelineMarks(events, rangeStart, rangeEnd),
    [events, rangeStart, rangeEnd]
  );

  const snapTimes = useMemo(
    () => collectSnapEventTimes(events, rangeStart, rangeEnd),
    [events, rangeStart, rangeEnd]
  );

  const previousEventMs = findPreviousEventTime(snapTimes, scrubMs);
  const nextEventMs = findNextEventTime(snapTimes, scrubMs);

  const controlBtn =
    'p-1.5 rounded-sm border border-border text-muted hover:text-accent-bright hover:border-accent bg-grey-btn hover:bg-grey-btn-hover transition-colors disabled:opacity-35 disabled:pointer-events-none disabled:hover:text-muted disabled:hover:border-border';

  return (
    <div className="bg-panel border border-border rounded p-4 space-y-3 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold mr-1">Window</span>
        {TIME_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onWindowChange(w.id)}
            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors font-medium ${
              windowId === w.id
                ? 'border-accent text-accent-bright bg-accent-soft'
                : 'border-border text-muted hover:border-border-soft hover:text-text'
            }`}
          >
            {w.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPlayingChange(!playing)}
            className={controlBtn}
            title={playing ? 'Pause replay' : 'Play replay'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            onClick={() => previousEventMs != null && onScrub(previousEventMs)}
            disabled={previousEventMs == null}
            className={controlBtn}
            title="Previous event"
            aria-label="Previous event"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => nextEventMs != null && onScrub(nextEventMs)}
            disabled={nextEventMs == null}
            className={controlBtn}
            title="Next event"
            aria-label="Next event"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onPlaybackSpeedCycle}
            className="flex items-center gap-1 px-2 py-1 rounded-sm border border-border text-xs font-semibold text-muted hover:text-accent-bright hover:border-accent bg-grey-btn hover:bg-grey-btn-hover transition-colors min-w-[3.25rem] justify-center"
            title="Playback speed (click to cycle)"
          >
            <Gauge size={14} className="shrink-0 opacity-70" />
            {formatPlaybackSpeed(playbackSpeed)}
          </button>
          <span className="text-xs text-dim font-mono pl-1">{eventCount} on map</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted font-mono w-36 shrink-0">
          {formatScrubTime(new Date(rangeStart).toISOString())}
        </span>

        <div className="relative flex-1 h-7 flex items-center">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-border/80 pointer-events-none" />

          {span > 0 && (
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 pointer-events-none"
              aria-hidden
            >
              {marks.map((mark) => {
                const pct = ((mark.ms - rangeStart) / span) * 100;
                const color = categoryColor(mark.category);
                const height = mark.count > 3 ? 12 : mark.count > 1 ? 10 : 8;
                return (
                  <span
                    key={`${mark.ms}-${mark.count}-${mark.category ?? ''}`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${pct}%`,
                      width: mark.count > 1 ? 3 : 2,
                      height,
                      backgroundColor: color,
                      opacity: mark.count > 1 ? 0.95 : 0.85,
                      boxShadow: `0 0 4px ${color}55`,
                    }}
                    title={timelineMarkTitle(mark)}
                  />
                );
              })}
            </div>
          )}

          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-bright border-2 border-text shadow pointer-events-none z-20"
            style={{
              left: span > 0 ? `calc(${((scrubMs - rangeStart) / span) * 100}% - 6px)` : '0',
            }}
          />

          <input
            type="range"
            min={rangeStart}
            max={rangeEnd}
            step={1000}
            value={scrubMs}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="timeline-scrub-input relative w-full z-10 cursor-pointer"
          />
        </div>

        <span className="text-xs text-muted font-mono w-36 shrink-0 text-right">
          {formatScrubTime(new Date(rangeEnd).toISOString())}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3 text-center">
        <span className="text-sm font-mono text-accent-bright tracking-wide">
          {formatScrubTime(new Date(scrubMs).toISOString())}
        </span>
        {marks.length > 0 && (
          <span className="text-[10px] text-dim uppercase tracking-wide">
            {marks.length} event marks · gaps = no activity
          </span>
        )}
      </div>
    </div>
  );
}
