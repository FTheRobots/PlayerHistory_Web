import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import { mapBounds, mapPanBounds, mapDisplayMode, mapConfigKey } from '../config/mapConfig';
import { MAP_EVENT, MAP_EVENT_SELECTED, MAP_CHIP_LABEL_MAX, MAP_TOOLTIP_INSET_PX } from '../config/mapReplayConfig';
import { positionToMapLatLng, trailToMapLatLngs } from '../utils/gameCoords';
import {
  categoryColor,
  clusterChipHtml,
  clusterMapLabelEvents,
  clusterMarkerRadius,
  eventLabelKey,
  eventTimeMs,
  eventsUpToTime,
  filterEventsBySignalMode,
  findPositionAtTime,
  isClusterAggregate,
  layoutClusterTooltips,
  mapEventPriority,
  mapEventsFingerprint,
  MAP_SIGNIFICANCE_THRESHOLD,
  sortClusterEventsForTimeline,
  trailUpToTime,
  type MapEventCluster,
} from '../utils/mapReplay';
import { bindClusterSelect } from '../utils/mapReplayLeaflet';
import {
  formatEventLabel,
  formatPosition,
  formatTimestamp,
  isMapLabelEvent,
} from '../utils/eventHelpers';
import {
  defaultMapReplayCategoryFilter,
  filterEventsByMapCategory,
  type MapReplayFilterCategory,
} from '../utils/mapCategoryFilter';
import { useMultiMapReplay } from '../hooks/useMultiMapReplay';
import { useMapConfig } from '../hooks/useMapConfig';
import { useMapTileLayer } from '../hooks/useMapTileLayer';
import { useMapSignalMode } from '../hooks/useMapSignalMode';
import { useSyncMapTileLayer } from '../hooks/useSyncMapTileLayer';
import { MapTileLayerToggle } from './MapTileLayerToggle';
import { createXamTileLayer } from '../utils/mapTileLayer';
import { TimeScrubber } from './TimeScrubber';
import { MapActionPanel, type MapFeedScope } from './MapActionPanel';
import { MapCategoryFilter } from './MapCategoryFilter';
import { MapSignalModeControl } from './MapSignalModeControl';
import type { PlayerEvent, PlayerProfile } from '../types';
import { buildPlayerColorMap, type PlayerColorStyle } from '../utils/playerColors';
import { api } from '../api/client';

interface CompareMapReplayPanelProps {
  steamIds: string[];
  onTrackItem?: (pid: string) => void;
}

function compareEventKey(event: PlayerEvent): string {
  return `${event.steamid}|${eventLabelKey(event)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPlayerPopup(
  event: PlayerEvent,
  playerName: string,
  color: PlayerColorStyle
): string {
  return `<div style="font-family:Consolas,monospace;font-size:13px;min-width:180px;color:#f0f2f5">
    <div style="font-weight:700;margin-bottom:4px;color:${color.mapFill}">${escapeHtml(playerName)}</div>
    <div style="font-weight:600;margin-bottom:4px;color:${categoryColor(event.category)}">${escapeHtml(formatEventLabel(event))}</div>
    <div style="color:#6b7382;font-size:11px">${formatTimestamp(event.timestamp)}</div>
    ${event.position ? `<div style="color:#9aa3b2;font-size:11px;margin-top:4px">${formatPosition(event.position)}</div>` : ''}
  </div>`;
}

function isLatLngInViewport(map: L.Map, latLng: L.LatLngExpression, marginPx = 96): boolean {
  const point = map.latLngToContainerPoint(latLng);
  const size = map.getSize();
  return (
    point.x >= marginPx &&
    point.y >= marginPx &&
    point.x <= size.x - marginPx &&
    point.y <= size.y - marginPx
  );
}

function addGridOverlay(map: L.Map, mapSize: number): L.LayerGroup {
  const group = L.layerGroup();
  const step = mapSize / 15;
  for (let i = 0; i <= 15; i++) {
    const c = i * step;
    group.addLayer(
      L.polyline(
        [
          [c, 0],
          [c, mapSize],
        ],
        { color: '#3a4252', weight: 1, opacity: 0.35 }
      )
    );
    group.addLayer(
      L.polyline(
        [
          [0, c],
          [mapSize, c],
        ],
        { color: '#3a4252', weight: 1, opacity: 0.35 }
      )
    );
  }
  group.addTo(map);
  return group;
}

export function CompareMapReplayPanel({ steamIds, onTrackItem }: CompareMapReplayPanelProps) {
  const mapCfg = useMapConfig();
  const mapMode = mapDisplayMode(mapCfg);
  const mapKey = mapConfigKey(mapCfg);
  const { layer: tileLayer, setLayer: setTileLayer } = useMapTileLayer();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trailLayersRef = useRef<L.LayerGroup | null>(null);
  const playerLayerRef = useRef<L.LayerGroup | null>(null);
  const eventLayerRef = useRef<L.LayerGroup | null>(null);
  const trailOutlineByPlayerRef = useRef<Map<string, L.Polyline>>(new Map());
  const trailByPlayerRef = useRef<Map<string, L.Polyline>>(new Map());
  const playerMarkerByPlayerRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const lastRebuildAtRef = useRef(0);
  const lastRebuildKeyRef = useRef('');
  const lastStructuralKeyRef = useRef('');
  const lastPlayerPopupTsRef = useRef<Map<string, string>>(new Map());
  const eventRebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventToClusterRef = useRef<Map<string, string>>(new Map());
  const selectedClusterKeyRef = useRef<string | null>(null);
  const [mapViewEpoch, setMapViewEpoch] = useState(0);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const { signalMode, setSignalMode } = useMapSignalMode();
  const [actionPanelOpen, setActionPanelOpen] = useState(true);
  const [feedScope, setFeedScope] = useState<MapFeedScope>('now');
  const [focusEvents, setFocusEvents] = useState<PlayerEvent[] | null>(null);
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  selectedClusterKeyRef.current = selectedClusterKey;
  const onSelectClusterRef = useRef<(cluster: MapEventCluster) => void>(() => {});
  onSelectClusterRef.current = (cluster) => {
    setFocusEvents(sortClusterEventsForTimeline(cluster.events));
    setSelectedClusterKey(cluster.key);
    setSelectedEventKey(compareEventKey(cluster.latest));
    setFeedScope('here');
    setActionPanelOpen(true);
  };
  const [categoryFilter, setCategoryFilter] = useState<Set<MapReplayFilterCategory>>(
    () => defaultMapReplayCategoryFilter()
  );
  useSyncMapTileLayer(mapRef, tileLayerRef, mapCfg, mapMode, tileLayer, mapKey);
  const [profiles, setProfiles] = useState<Map<string, PlayerProfile>>(new Map());

  const colorMap = useMemo(() => buildPlayerColorMap(steamIds), [steamIds.join(',')]);

  const {
    eventsByPlayer,
    mergedEvents,
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
  } = useMultiMapReplay(steamIds);

  const filteredEventsByPlayer = useMemo(() => {
    const next: Record<string, PlayerEvent[]> = {};
    for (const id of steamIds) {
      next[id] = filterEventsByMapCategory(eventsByPlayer[id] ?? [], categoryFilter);
    }
    return next;
  }, [eventsByPlayer, categoryFilter, steamIds.join(',')]);

  const filteredMergedEvents = useMemo(
    () => filterEventsByMapCategory(mergedEvents, categoryFilter),
    [mergedEvents, categoryFilter]
  );

  useEffect(() => {
    Promise.all(
      steamIds.map((id) =>
        api.getPlayer(id).then((p) => [id, p] as const).catch(() => [id, null] as const)
      )
    ).then((rows) => {
      const next = new Map<string, PlayerProfile>();
      for (const [id, profile] of rows) {
        if (profile) next.set(id, profile);
      }
      setProfiles(next);
    });
  }, [steamIds.join(',')]);

  const signalEventsByPlayer = useMemo(() => {
    const next: Record<string, PlayerEvent[]> = {};
    for (const id of steamIds) {
      next[id] = filterEventsBySignalMode(filteredEventsByPlayer[id] ?? [], signalMode);
    }
    return next;
  }, [filteredEventsByPlayer, signalMode, steamIds.join(',')]);

  const signalMergedEvents = useMemo(
    () => filterEventsBySignalMode(filteredMergedEvents, signalMode),
    [filteredMergedEvents, signalMode]
  );

  const visibleEvents = useMemo(() => {
    const all: PlayerEvent[] = [];
    for (const id of steamIds) {
      all.push(...eventsUpToTime(signalEventsByPlayer[id] ?? [], scrubMs, rangeStart));
    }
    return all.sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  }, [signalEventsByPlayer, scrubMs, rangeStart, steamIds.join(',')]);

  useEffect(() => {
    if (loading || mapRef.current || !mapContainerRef.current) return;

    const { mapSize, imageUrl, maxNativeZoom } = mapCfg;
    const mode = mapMode;
    const bounds = mapBounds(mode, mapSize);
    const panBounds = mapPanBounds(mode, mapSize);

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: maxNativeZoom + 2,
      zoomControl: true,
      attributionControl: mode === 'tiles',
      maxBoundsViscosity: 0.45,
    });

    if (mode === 'tiles') {
      tileLayerRef.current = createXamTileLayer(map, mapCfg, mode, tileLayer);
    } else if (imageUrl) {
      L.imageOverlay(imageUrl, bounds, { opacity: 0.95 }).addTo(map);
    } else {
      addGridOverlay(map, mapSize);
    }

    map.fitBounds(bounds);
    map.setMaxBounds(panBounds);
    trailLayersRef.current = L.layerGroup().addTo(map);
    playerLayerRef.current = L.layerGroup().addTo(map);
    eventLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds);
    });

    return () => {
      if (eventRebuildTimerRef.current != null) {
        clearTimeout(eventRebuildTimerRef.current);
        eventRebuildTimerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      trailLayersRef.current = null;
      playerLayerRef.current = null;
      eventLayerRef.current = null;
      trailOutlineByPlayerRef.current.clear();
      trailByPlayerRef.current.clear();
      playerMarkerByPlayerRef.current.clear();
      clusterMarkersRef.current.clear();
      lastPlayerPopupTsRef.current.clear();
      lastRebuildKeyRef.current = '';
      lastStructuralKeyRef.current = '';
    };
  }, [loading, mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    // Pan must not recluster — only zoom/size changes bump mapViewEpoch.
    const bumpViewEpoch = () => {
      map.invalidateSize();
      setMapViewEpoch((n) => n + 1);
    };

    map.on('zoomend resize', bumpViewEpoch);
    const observer = new ResizeObserver(() => requestAnimationFrame(bumpViewEpoch));
    observer.observe(container);

    return () => {
      map.off('zoomend resize', bumpViewEpoch);
      observer.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || totalEvents === 0) return;

    const { mapSize, maxNativeZoom } = mapCfg;
    const mode = mapMode;
    const zoom = map.getZoom();

    const livePositions: L.LatLngExpression[] = [];
    const showTrail = categoryFilter.has('Position');
    const activeTrailIds = new Set<string>();
    const activePlayerIds = new Set<string>();

    if (showTrail) {
      for (const steamId of steamIds) {
        const playerEvents = eventsByPlayer[steamId] ?? [];
        const colors = colorMap.get(steamId)?.color;
        if (!colors) continue;

        const trail = trailUpToTime(playerEvents, scrubMs, rangeStart);
        const trailLatLngs = trailToMapLatLngs(trail, mapSize, mode);
        const hasTrail = trailLatLngs.length > 1;

        if (hasTrail) {
          activeTrailIds.add(steamId);
          const existingOutline = trailOutlineByPlayerRef.current.get(steamId);
          const existingTrail = trailByPlayerRef.current.get(steamId);

          if (existingOutline) {
            existingOutline.setLatLngs(trailLatLngs);
          } else {
            const outline = L.polyline(trailLatLngs, {
              color: colors.mapStroke,
              weight: 10,
              opacity: 0.45,
              lineCap: 'round',
              lineJoin: 'round',
            });
            trailLayersRef.current?.addLayer(outline);
            trailOutlineByPlayerRef.current.set(steamId, outline);
          }

          if (existingTrail) {
            existingTrail.setLatLngs(trailLatLngs);
          } else {
            const line = L.polyline(trailLatLngs, {
              color: colors.mapFill,
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            });
            trailLayersRef.current?.addLayer(line);
            trailByPlayerRef.current.set(steamId, line);
          }
        }

        const playerEvent = findPositionAtTime(playerEvents, scrubMs);
        if (playerEvent?.position) {
          activePlayerIds.add(steamId);
          const latLng = positionToMapLatLng(playerEvent.position, mapSize, mode);
          livePositions.push(latLng);
          const name =
            profiles.get(steamId)?.characterName ?? playerEvent.playerName ?? steamId.slice(-8);
          const popupHtml = buildPlayerPopup(playerEvent, name, colors);
          const existingMarker = playerMarkerByPlayerRef.current.get(steamId);
          if (existingMarker) {
            existingMarker.setLatLng(latLng);
            if (lastPlayerPopupTsRef.current.get(steamId) !== playerEvent.timestamp) {
              existingMarker.setPopupContent(popupHtml);
              lastPlayerPopupTsRef.current.set(steamId, playerEvent.timestamp);
            }
          } else {
            const marker = L.circleMarker(latLng, {
              radius: 12,
              color: colors.mapStroke,
              weight: 3,
              fillColor: colors.mapFill,
              fillOpacity: 1,
            }).bindPopup(popupHtml);
            playerLayerRef.current?.addLayer(marker);
            playerMarkerByPlayerRef.current.set(steamId, marker);
            lastPlayerPopupTsRef.current.set(steamId, playerEvent.timestamp);
          }
        }
      }

      if (playing && livePositions.length > 0) {
        if (livePositions.length === 1) {
          const latLng = livePositions[0];
          if (!isLatLngInViewport(map, latLng)) map.panTo(latLng, { animate: true, duration: 0.25 });
        } else {
          const bounds = L.latLngBounds(livePositions);
          if (!map.getBounds().contains(bounds)) {
            map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: map.getZoom() });
          }
        }
      }
    }

    for (const [id, layer] of trailOutlineByPlayerRef.current) {
      if (!showTrail || !activeTrailIds.has(id)) {
        trailLayersRef.current?.removeLayer(layer);
        trailOutlineByPlayerRef.current.delete(id);
      }
    }
    for (const [id, layer] of trailByPlayerRef.current) {
      if (!showTrail || !activeTrailIds.has(id)) {
        trailLayersRef.current?.removeLayer(layer);
        trailByPlayerRef.current.delete(id);
      }
    }
    for (const [id, marker] of playerMarkerByPlayerRef.current) {
      if (!showTrail || !activePlayerIds.has(id)) {
        playerLayerRef.current?.removeLayer(marker);
        playerMarkerByPlayerRef.current.delete(id);
        lastPlayerPopupTsRef.current.delete(id);
      }
    }

    const playerPositions = new Set<string>();
    for (const steamId of steamIds) {
      const pe = findPositionAtTime(eventsByPlayer[steamId] ?? [], scrubMs);
      if (pe) playerPositions.add(`${pe.timestamp}|${pe.event}|${steamId}`);
    }

    const mapEvents = visibleEvents.filter(
      (event) =>
        isMapLabelEvent(event) && !playerPositions.has(`${event.timestamp}|${event.event}|${event.steamid}`)
    );

    const categoryKey = Array.from(categoryFilter).sort().join(',');
    const structuralKey = `${mapViewEpoch}|${labelsVisible}|${signalMode}|${categoryKey}|${rangeStart}|${signalMergedEvents.length}|${totalEvents}|${steamIds.join(',')}`;
    const scrubFp = mapEventsFingerprint(mapEvents, zoom);
    const rebuildKey = `${structuralKey}|${scrubFp}`;
    const structuralChanged = structuralKey !== lastStructuralKeyRef.current;
    const needsRebuild = rebuildKey !== lastRebuildKeyRef.current;

    const rebuildEventMarkers = () => {
      if (!mapRef.current) return;

      const clusters = clusterMapLabelEvents(mapEvents, zoom, mapSize, maxNativeZoom);
      const tooltipLayouts = labelsVisible
        ? layoutClusterTooltips(map, clusters, mapSize, MAP_CHIP_LABEL_MAX, mode)
        : new Map<string, { direction: L.Direction; offset: [number, number]; showLabel: boolean }>();

      const nextKeys = new Set<string>();
      const nextEventMap = new Map<string, string>();
      const selectedKey = selectedClusterKeyRef.current;

      for (const cluster of clusters) {
        nextKeys.add(cluster.key);
        for (const event of cluster.events) {
          nextEventMap.set(compareEventKey(event), cluster.key);
        }
        const latLng = positionToMapLatLng(cluster.latest.position!, mapSize, mode);
        const playerColor = colorMap.get(cluster.latest.steamid)?.color;
        const priority = mapEventPriority(cluster.latest);
        const fill =
          priority >= MAP_SIGNIFICANCE_THRESHOLD
            ? categoryColor(cluster.latest.category)
            : (playerColor?.mapFill ?? categoryColor(cluster.latest.category));
        const aggregate = isClusterAggregate(cluster);
        const layout = tooltipLayouts.get(cluster.key);
        const radius = clusterMarkerRadius(cluster.events.length);
        const selected = cluster.key === selectedKey;
        const weight = selected
          ? MAP_EVENT_SELECTED.weight
          : aggregate
            ? MAP_EVENT.weight + 1
            : MAP_EVENT.weight;
        const fillOpacity = aggregate ? 0.88 : 0.95;
        const stroke = selected
          ? MAP_EVENT_SELECTED.stroke
          : (playerColor?.mapStroke ?? MAP_EVENT.stroke);
        const tooltipHtml = clusterChipHtml(cluster);
        const showPermanentLabel =
          labelsVisible && layout?.showLabel === true && tooltipHtml.length > 0;
        const tooltipOpts: L.TooltipOptions = {
          permanent: showPermanentLabel,
          sticky: !showPermanentLabel,
          interactive: true,
          direction: layout?.direction ?? 'top',
          offset: layout?.offset ?? [0, aggregate ? -12 : -10],
          className: `map-event-tooltip map-event-tooltip-clickable${selected ? ' map-event-tooltip-selected' : ''}`,
        };

        const existing = clusterMarkersRef.current.get(cluster.key);
        if (existing) {
          existing.setLatLng(latLng);
          existing.setStyle({
            radius,
            color: stroke,
            weight,
            fillColor: fill,
            fillOpacity,
          });
          existing.unbindPopup();
          existing.unbindTooltip();
          existing.bindTooltip(tooltipHtml, tooltipOpts);
          bindClusterSelect(existing, cluster, (next) => onSelectClusterRef.current(next));
        } else {
          const marker = L.circleMarker(latLng, {
            radius,
            color: stroke,
            weight,
            fillColor: fill,
            fillOpacity,
          });
          marker.bindTooltip(tooltipHtml, tooltipOpts);
          bindClusterSelect(marker, cluster, (next) => onSelectClusterRef.current(next));
          eventLayerRef.current?.addLayer(marker);
          clusterMarkersRef.current.set(cluster.key, marker);
        }
      }

      eventToClusterRef.current = nextEventMap;

      for (const [key, marker] of clusterMarkersRef.current) {
        if (!nextKeys.has(key)) {
          eventLayerRef.current?.removeLayer(marker);
          clusterMarkersRef.current.delete(key);
        }
      }

      lastRebuildAtRef.current = performance.now();
      lastRebuildKeyRef.current = rebuildKey;
      lastStructuralKeyRef.current = structuralKey;
    };

    if (!needsRebuild) return;

    if (eventRebuildTimerRef.current != null) {
      clearTimeout(eventRebuildTimerRef.current);
      eventRebuildTimerRef.current = null;
    }

    const now = performance.now();
    if (playing && !structuralChanged) {
      const elapsed = now - lastRebuildAtRef.current;
      if (elapsed < 250) {
        eventRebuildTimerRef.current = setTimeout(() => {
          eventRebuildTimerRef.current = null;
          rebuildEventMarkers();
        }, 250 - elapsed);
        return;
      }
      rebuildEventMarkers();
      return;
    }

    if (!playing && !structuralChanged) {
      eventRebuildTimerRef.current = setTimeout(() => {
        eventRebuildTimerRef.current = null;
        rebuildEventMarkers();
      }, 50);
      return;
    }

    rebuildEventMarkers();
  }, [
    eventsByPlayer,
    scrubMs,
    rangeStart,
    visibleEvents,
    playing,
    mapViewEpoch,
    labelsVisible,
    signalMode,
    categoryFilter,
    mapCfg.mapSize,
    mapMode,
    steamIds.join(','),
    totalEvents,
    colorMap,
    profiles,
    signalMergedEvents.length,
  ]);

  useEffect(() => {
    return () => {
      if (eventRebuildTimerRef.current != null) {
        clearTimeout(eventRebuildTimerRef.current);
        eventRebuildTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    for (const [key, marker] of clusterMarkersRef.current) {
      const selected = key === selectedClusterKey;
      marker.setStyle({
        color: selected ? MAP_EVENT_SELECTED.stroke : MAP_EVENT.stroke,
        weight: selected ? MAP_EVENT_SELECTED.weight : MAP_EVENT.weight,
      });
    }
  }, [selectedClusterKey]);

  const selectEventOnMap = (event: PlayerEvent) => {
    const key = compareEventKey(event);
    setSelectedEventKey(key);
    const clusterKey = eventToClusterRef.current.get(key);
    if (clusterKey) setSelectedClusterKey(clusterKey);
    const map = mapRef.current;
    if (map && event.position) {
      map.panTo(positionToMapLatLng(event.position, mapCfg.mapSize, mapMode), {
        animate: true,
        duration: 0.25,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        <Loader2 className="animate-spin mr-2 text-accent" size={20} />
        Loading map events for {steamIds.length} players...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/15 border border-danger/40 rounded text-sm text-event-combat">{error}</div>
    );
  }

  if (totalEvents === 0) {
    return (
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="flex items-start gap-2 text-xs text-muted bg-panel border border-border rounded p-3">
          <MapPin size={14} className="shrink-0 mt-0.5 text-accent" />
          <div>No positioned events for these players in the selected window.</div>
        </div>
        <div className="flex min-h-[400px] flex-1 overflow-hidden rounded border border-border bg-deep">
          <div
            className="relative z-0 min-w-0 flex-1 overflow-hidden isolate"
            style={{ padding: MAP_TOOLTIP_INSET_PX }}
          >
            <div ref={mapContainerRef} className="absolute z-0" style={{ inset: MAP_TOOLTIP_INSET_PX }} />
          </div>
          <MapActionPanel
            events={signalMergedEvents}
            scrubMs={scrubMs}
            rangeStart={rangeStart}
            onTrackItem={onTrackItem}
            open={actionPanelOpen}
            onOpenChange={setActionPanelOpen}
            focusEvents={focusEvents}
            scope={feedScope}
            onScopeChange={setFeedScope}
            selectedEventKey={selectedEventKey}
            onSelectEvent={selectEventOnMap}
            eventKey={compareEventKey}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-wrap gap-2">
        {steamIds.map((id) => {
          const entry = colorMap.get(id);
          const name = profiles.get(id)?.characterName ?? id.slice(-8);
          return (
            <span
              key={id}
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${entry?.color.badge ?? ''}`}
            >
              <span className={`w-2 h-2 rounded-full ${entry?.color.dot ?? 'bg-gray-400'}`} />
              {name}
            </span>
          );
        })}
      </div>

      <TimeScrubber
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        scrubMs={scrubMs}
        onScrub={(ms) => {
          setPlaying(false);
          setScrubMs(ms);
        }}
        windowId={windowId}
        onWindowChange={setWindowId}
        playing={playing}
        onPlayingChange={setPlaying}
        playbackSpeed={playbackSpeed}
        onPlaybackSpeedCycle={cyclePlaybackSpeed}
        eventCount={visibleEvents.length}
        events={filteredMergedEvents}
      />

      <MapCategoryFilter
        visible={categoryFilter}
        onChange={setCategoryFilter}
        trailing={
          <>
            <MapSignalModeControl
              labelsVisible={labelsVisible}
              onLabelsVisibleChange={setLabelsVisible}
              signalMode={signalMode}
              onSignalModeChange={setSignalMode}
            />
            <MapTileLayerToggle layer={tileLayer} onLayerChange={setTileLayer} mapMode={mapMode} />
          </>
        }
      />

      <div className="flex min-h-[400px] flex-1 overflow-hidden rounded border border-border bg-deep shadow-panel">
        <div
          className="relative z-0 min-w-0 flex-1 overflow-hidden isolate"
          style={{ padding: MAP_TOOLTIP_INSET_PX }}
        >
          <div ref={mapContainerRef} className="absolute z-0" style={{ inset: MAP_TOOLTIP_INSET_PX }} />
        </div>
        <MapActionPanel
          events={signalMergedEvents}
          scrubMs={scrubMs}
          rangeStart={rangeStart}
          onTrackItem={onTrackItem}
          open={actionPanelOpen}
          onOpenChange={setActionPanelOpen}
          focusEvents={focusEvents}
          scope={feedScope}
          onScopeChange={setFeedScope}
          selectedEventKey={selectedEventKey}
          onSelectEvent={selectEventOnMap}
          eventKey={compareEventKey}
        />
      </div>
    </div>
  );
}
