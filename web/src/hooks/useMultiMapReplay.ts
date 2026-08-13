import { useState, useEffect, useCallback, useMemo } from 'react';
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

function filterSessionEvents(
  events: PlayerEvent[],
  sessionStartMs: number,
  sessionId?: string
): PlayerEvent[] {
  return events.filter((e) => {
    const t = eventTimeMs(e);
    if (t < sessionStartMs) return false;
    if (sessionId && e.sessionId && e.sessionId !== sessionId) return false;
    return true;
  });
}

export function useMultiMapReplay(steamIds: string[]) {
  const [eventsByPlayer, setEventsByPlayer] = useState<Record<string, TimedPlayerEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowId, setWindowId] = useState<TimeWindowId>('10h');
  const [scrubMs, setScrubMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  const steamIdsKey = [...steamIds].sort().join(',');

  const loadEvents = useCallback(async () => {
    if (steamIds.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const from = new Date(Date.now() - MAP_FETCH_WINDOW_MS).toISOString();
      const rows = await Promise.all(
        steamIds.map(async (id) => {
          const data = await api.getMapEvents(id, from, undefined, MAP_FETCH_LIMIT, true);
          return [id, withTimestampMs(data)] as const;
        })
      );
      const next: Record<string, TimedPlayerEvent[]> = {};
      let maxEnd = 0;
      for (const [id, data] of rows) {
        next[id] = data;
        if (data.length > 0) {
          maxEnd = Math.max(maxEnd, eventTimeMs(data[data.length - 1]));
        }
      }
      setEventsByPlayer(next);
      if (maxEnd > 0) setScrubMs(maxEnd);
    } catch (err) {
      setError(String(err));
      setEventsByPlayer({});
    } finally {
      setLoading(false);
    }
  }, [steamIdsKey]);

  useEffect(() => {
    loadEvents();
    setPlaying(false);
  }, [loadEvents]);

  const mergedEvents = useMemo(() => {
    return Object.values(eventsByPlayer)
      .flat()
      .sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  }, [eventsByPlayer]);

  const rangeEnd =
    mergedEvents.length > 0 ? eventTimeMs(mergedEvents[mergedEvents.length - 1]) : Date.now();
  const fixedWindowMs = timeWindowMs(windowId);

  const rangeStart = useMemo(() => {
    if (fixedWindowMs != null) return rangeEnd - fixedWindowMs;
    const starts = steamIds.map((id) => findSessionStart(eventsByPlayer[id] ?? [], rangeEnd));
    return starts.length > 0 ? Math.min(...starts) : rangeEnd - 60 * 60 * 1000;
  }, [fixedWindowMs, rangeEnd, steamIdsKey, eventsByPlayer, windowId]);

  const replayEventsByPlayer = useMemo(() => {
    if (windowId !== 'session') return eventsByPlayer;
    const next: Record<string, PlayerEvent[]> = {};
    for (const id of steamIds) {
      const events = eventsByPlayer[id] ?? [];
      const sessionStartMs = findSessionStart(events, rangeEnd);
      const sessionId = findSessionId(events, rangeEnd);
      next[id] = filterSessionEvents(events, sessionStartMs, sessionId);
    }
    return next;
  }, [eventsByPlayer, windowId, rangeEnd, steamIdsKey]);

  const replayEvents = useMemo(() => {
    return Object.values(replayEventsByPlayer)
      .flat()
      .sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  }, [replayEventsByPlayer]);

  useEffect(() => {
    if (scrubMs > rangeEnd) setScrubMs(rangeEnd);
    if (scrubMs < rangeStart) setScrubMs(rangeStart);
  }, [rangeStart, rangeEnd, scrubMs, windowId]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setScrubMs((prev) => {
        const next = prev + PLAYBACK_TICK_MS * playbackSpeed;
        if (next >= rangeEnd) {
          setPlaying(false);
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

  const totalEvents = replayEvents.length;

  return {
    eventsByPlayer: replayEventsByPlayer,
    mergedEvents: replayEvents,
    totalEvents,
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
    cyclePlaybackSpeed,
    reload: loadEvents,
  };
}
