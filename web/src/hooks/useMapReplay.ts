import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../api/client';
import type { PlayerEvent } from '../types';
import { timeWindowMs, type TimeWindowId } from '../config/mapConfig';
import {
  PLAYBACK_SPEEDS,
  PLAYBACK_TICK_MS,
  type PlaybackSpeed,
} from '../config/mapReplayConfig';
import {
  eventTimeMs,
  findSessionId,
  findSessionStart,
  withTimestampMs,
  type TimedPlayerEvent,
} from '../utils/mapReplay';

const MAP_FETCH_LIMIT = 8000;
const MAP_FETCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function useMapReplay(steamId: string) {
  const [events, setEvents] = useState<TimedPlayerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowId, setWindowId] = useState<TimeWindowId>('10h');
  const [scrubMs, setScrubMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const prevScrubRef = useRef(0);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date(Date.now() - MAP_FETCH_WINDOW_MS).toISOString();
      const data = await api.getMapEvents(steamId, from, undefined, MAP_FETCH_LIMIT, true);
      const indexed = withTimestampMs(data);
      setEvents(indexed);
      if (indexed.length > 0) {
        const last = eventTimeMs(indexed[indexed.length - 1]);
        setScrubMs(last);
        prevScrubRef.current = last;
      }
    } catch (err) {
      setError(String(err));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [steamId]);

  useEffect(() => {
    loadEvents();
    setPlaying(false);
  }, [loadEvents]);

  const rangeEnd =
    events.length > 0 ? eventTimeMs(events[events.length - 1]) : Date.now();
  const fixedWindowMs = timeWindowMs(windowId);
  const sessionStartMs =
    fixedWindowMs != null ? rangeEnd - fixedWindowMs : findSessionStart(events, rangeEnd);
  const sessionId = fixedWindowMs == null ? findSessionId(events, rangeEnd) : undefined;
  const rangeStart = sessionStartMs;

  /** When "This session" is selected, keep events from connect → now (includes deaths/respawns). */
  const sessionEvents = useMemo(() => {
    return events.filter((e) => {
      const t = eventTimeMs(e);
      if (t < sessionStartMs) return false;
      if (sessionId && e.sessionId && e.sessionId !== sessionId) return false;
      return true;
    });
  }, [events, sessionStartMs, sessionId]);

  const replayEvents: PlayerEvent[] = windowId === 'session' ? sessionEvents : events;

  // Window changes only clamp scrub — 7d fetch already covers all fixed windows.
  useEffect(() => {
    if (scrubMs > rangeEnd) setScrubMs(rangeEnd);
    if (scrubMs < rangeStart) setScrubMs(rangeStart);
  }, [rangeStart, rangeEnd, scrubMs, windowId]);

  useEffect(() => {
    if (!playing) prevScrubRef.current = scrubMs;
  }, [playing, scrubMs]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setScrubMs((prev) => {
        const next = prev + PLAYBACK_TICK_MS * playbackSpeed;
        if (next >= rangeEnd) {
          setPlaying(false);
          prevScrubRef.current = rangeEnd;
          return rangeEnd;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, rangeEnd, playbackSpeed]);

  const cyclePlaybackSpeed = useCallback(() => {
    setPlaybackSpeed((s) => {
      const idx = PLAYBACK_SPEEDS.indexOf(s);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  return {
    events: replayEvents,
    loading,
    error,
    windowId,
    setWindowId,
    scrubMs,
    setScrubMs,
    rangeStart,
    rangeEnd,
    playing,
    setPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    cyclePlaybackSpeed,
    prevScrubRef,
    reload: loadEvents,
  };
}
