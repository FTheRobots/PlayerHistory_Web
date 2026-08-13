import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';
import { mapBounds, mapPanBounds, mapDisplayMode, mapConfigKey, xamMapBaseUrl } from '../config/mapConfig';
import { MAP_EVENT, MAP_EVENT_SELECTED, MAP_PLAYER, MAP_TRAIL, MAP_CHIP_LABEL_MAX, MAP_TOOLTIP_INSET_PX } from '../config/mapReplayConfig';
import { positionToMapLatLng, trailToMapLatLngs } from '../utils/gameCoords';
import {
  categoryColor,
  clusterChipHtml,
  clusterMapLabelEvents,
  clusterMarkerRadius,
  eventLabelKey,
  eventsUpToTime,
  filterEventsBySignalMode,
  findPositionAtTime,
  isClusterAggregate,
  layoutClusterTooltips,
  mapEventsFingerprint,
  sortClusterEventsForTimeline,
  trailUpToTime,
  type MapEventCluster,
} from '../utils/mapReplay';
import { bindClusterSelect } from '../utils/mapReplayLeaflet';
import {
  formatTimestamp,
  isMapLabelEvent,
} from '../utils/eventHelpers';
import {
  defaultMapReplayCategoryFilter,
  filterEventsByMapCategory,
  type MapReplayFilterCategory,
} from '../utils/mapCategoryFilter';
import { useMapReplay } from '../hooks/useMapReplay';
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
import type { PlayerEvent } from '../types';

interface MapReplayPanelProps {
  steamId: string;
  onTrackItem?: (pid: string) => void;
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

export function MapReplayPanel({ steamId, onTrackItem }: MapReplayPanelProps) {
  const mapCfg = useMapConfig();
  const mapMode = mapDisplayMode(mapCfg);
  const mapKey = mapConfigKey(mapCfg);
  const { layer: tileLayer, setLayer: setTileLayer } = useMapTileLayer();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trailOutlineRef = useRef<L.Polyline | null>(null);
  const trailLayerRef = useRef<L.Polyline | null>(null);
  const playerMarkerRef = useRef<L.CircleMarker | null>(null);
  const eventLayerRef = useRef<L.LayerGroup | null>(null);
  const clusterMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const lastRebuildAtRef = useRef(0);
  const lastRebuildKeyRef = useRef('');
  const lastStructuralKeyRef = useRef('');
  const lastPlayerPopupTsRef = useRef('');
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
    setSelectedEventKey(eventLabelKey(cluster.latest));
    setFeedScope('here');
    setActionPanelOpen(true);
  };
  const [categoryFilter, setCategoryFilter] = useState<Set<MapReplayFilterCategory>>(
    () => defaultMapReplayCategoryFilter()
  );
  useSyncMapTileLayer(mapRef, tileLayerRef, mapCfg, mapMode, tileLayer, mapKey);

  const {
    events,
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
  } = useMapReplay(steamId);

  const filteredEvents = useMemo(
    () => filterEventsByMapCategory(events, categoryFilter),
    [events, categoryFilter]
  );

  const signalEvents = useMemo(
    () => filterEventsBySignalMode(filteredEvents, signalMode),
    [filteredEvents, signalMode]
  );

  const visibleEvents = useMemo(
    () => eventsUpToTime(signalEvents, scrubMs, rangeStart),
    [signalEvents, scrubMs, rangeStart]
  );

  const playerEvent = useMemo(() => findPositionAtTime(events, scrubMs), [events, scrubMs]);

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
      trailOutlineRef.current = null;
      trailLayerRef.current = null;
      playerMarkerRef.current = null;
      eventLayerRef.current = null;
      clusterMarkersRef.current.clear();
      lastRebuildKeyRef.current = '';
      lastStructuralKeyRef.current = '';
      lastPlayerPopupTsRef.current = '';
    };
  }, [loading, mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    // Pan (moveend) must not bump mapViewEpoch — reclustering is zoom/size dependent only.
    const bumpViewEpoch = () => {
      map.invalidateSize();
      setMapViewEpoch((n) => n + 1);
    };

    map.on('zoomend resize', bumpViewEpoch);

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(bumpViewEpoch);
    });
    observer.observe(container);

    return () => {
      map.off('zoomend resize', bumpViewEpoch);
      observer.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || events.length === 0) return;

    const { mapSize, maxNativeZoom } = mapCfg;
    const mode = mapMode;
    const zoom = map.getZoom();

    const showTrail = categoryFilter.has('Position');

    if (showTrail) {
      const trail = trailUpToTime(events, scrubMs, rangeStart);
      const trailLatLngs = trailToMapLatLngs(trail, mapSize, mode);
      const hasTrail = trailLatLngs.length > 1;

      if (hasTrail) {
        if (trailOutlineRef.current) {
          trailOutlineRef.current.setLatLngs(trailLatLngs);
        } else {
          trailOutlineRef.current = L.polyline(trailLatLngs, {
            color: MAP_TRAIL.outline,
            weight: MAP_TRAIL.outlineWeight,
            opacity: 0.55,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }

        if (trailLayerRef.current) {
          trailLayerRef.current.setLatLngs(trailLatLngs);
        } else {
          trailLayerRef.current = L.polyline(trailLatLngs, {
            color: MAP_TRAIL.color,
            weight: MAP_TRAIL.weight,
            opacity: MAP_TRAIL.opacity,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }
      } else {
        trailOutlineRef.current?.remove();
        trailOutlineRef.current = null;
        trailLayerRef.current?.remove();
        trailLayerRef.current = null;
      }

      if (playerEvent?.position) {
        const latLng = positionToMapLatLng(playerEvent.position, mapSize, mode);
        const popupHtml = `<div style="font-family:Consolas,monospace;font-size:13px">
            <b style="color:#e8b84a">You are here</b><br/>
            <span style="color:#9aa3b2">${formatTimestamp(playerEvent.timestamp)}</span>
          </div>`;
        if (playerMarkerRef.current) {
          playerMarkerRef.current.setLatLng(latLng);
          if (lastPlayerPopupTsRef.current !== playerEvent.timestamp) {
            playerMarkerRef.current.setPopupContent(popupHtml);
            lastPlayerPopupTsRef.current = playerEvent.timestamp;
          }
        } else {
          playerMarkerRef.current = L.circleMarker(latLng, {
            radius: MAP_PLAYER.radius,
            color: MAP_PLAYER.stroke,
            weight: MAP_PLAYER.weight,
            fillColor: MAP_PLAYER.fill,
            fillOpacity: 1,
          })
            .bindPopup(popupHtml)
            .addTo(map);
          lastPlayerPopupTsRef.current = playerEvent.timestamp;
        }
        if (playing && !isLatLngInViewport(map, latLng)) {
          map.panTo(latLng, { animate: true, duration: 0.25 });
        }
      } else {
        playerMarkerRef.current?.remove();
        playerMarkerRef.current = null;
        lastPlayerPopupTsRef.current = '';
      }
    } else {
      trailOutlineRef.current?.remove();
      trailOutlineRef.current = null;
      trailLayerRef.current?.remove();
      trailLayerRef.current = null;
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
      lastPlayerPopupTsRef.current = '';
    }

    const mapEvents = visibleEvents.filter(
      (event) =>
        isMapLabelEvent(event) &&
        !(
          playerEvent &&
          event.timestamp === playerEvent.timestamp &&
          event.event === playerEvent.event
        )
    );

    const categoryKey = Array.from(categoryFilter).sort().join(',');
    const structuralKey = `${mapViewEpoch}|${labelsVisible}|${signalMode}|${categoryKey}|${rangeStart}|${signalEvents.length}|${events.length}`;
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
          nextEventMap.set(eventLabelKey(event), cluster.key);
        }
        const latLng = positionToMapLatLng(cluster.latest.position!, mapSize, mode);
        const color = categoryColor(cluster.latest.category);
        const aggregate = isClusterAggregate(cluster);
        const layout = tooltipLayouts.get(cluster.key);
        const radius = clusterMarkerRadius(cluster.events.length);
        const selected = cluster.key === selectedKey;
        const weight = selected
          ? MAP_EVENT_SELECTED.weight
          : aggregate
            ? MAP_EVENT.weight + 1
            : MAP_EVENT.weight;
        const stroke = selected ? MAP_EVENT_SELECTED.stroke : MAP_EVENT.stroke;
        const fillOpacity = aggregate ? 0.88 : 0.95;
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
            fillColor: color,
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
            fillColor: color,
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
    events,
    filteredEvents,
    signalEvents,
    scrubMs,
    rangeStart,
    visibleEvents,
    playerEvent,
    playing,
    mapViewEpoch,
    labelsVisible,
    signalMode,
    categoryFilter,
    mapCfg.mapSize,
    mapMode,
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
    const key = eventLabelKey(event);
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
        Loading map events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/15 border border-danger/40 rounded text-sm text-event-combat">{error}</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-4 h-full min-h-0">
        <div className="flex items-start gap-2 text-xs text-muted bg-panel border border-border rounded p-3">
          <MapPin size={14} className="shrink-0 mt-0.5 text-accent" />
          <div>No positioned events for this player — map shown for reference.</div>
        </div>
        <div className="flex min-h-[400px] flex-1 overflow-hidden rounded border border-border bg-deep">
          <div
            className="relative z-0 min-w-0 flex-1 overflow-hidden isolate"
            style={{ padding: MAP_TOOLTIP_INSET_PX }}
          >
            <div ref={mapContainerRef} className="absolute z-0" style={{ inset: MAP_TOOLTIP_INSET_PX }} />
          </div>
          <MapActionPanel
            events={signalEvents}
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
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-start gap-2 text-xs text-muted bg-panel border border-border rounded p-3">
        <MapPin size={14} className="shrink-0 mt-0.5 text-accent" />
        <div className="flex-1 min-w-0">
          {mapMode === 'tiles' ? (
            <>
              Map tiles:{' '}
              <a
                href={xamMapBaseUrl(mapCfg.xamMapSlug)}
                target="_blank"
                rel="noreferrer"
                className="text-accent-bright hover:underline"
              >
                dayz.xam.nu
              </a>{' '}
              · {mapCfg.displayName} · {tileLayer === 'satellite' ? 'satellite' : 'topographic'} · zoom{' '}
              {mapCfg.maxNativeZoom} ·{' '}
            </>
          ) : mapCfg.imageUrl ? (
            <>
              Map image: <code className="text-dim">{mapCfg.imageUrl}</code> ·{' '}
            </>
          ) : (
            <>Grid mode · set <code className="text-dim">VITE_MAP_TILES</code> ·{' '}</>
          )}
          world <code className="text-dim">{mapCfg.mapSize}</code>m · zoom in to split clusters · click a chip to inspect
        </div>
        <MapTileLayerToggle
          layer={tileLayer}
          onLayerChange={setTileLayer}
          mapMode={mapMode}
          className="shrink-0"
        />
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
        events={filteredEvents}
      />

      <MapCategoryFilter
        visible={categoryFilter}
        onChange={setCategoryFilter}
        trailing={
          <MapSignalModeControl
            labelsVisible={labelsVisible}
            onLabelsVisibleChange={setLabelsVisible}
            signalMode={signalMode}
            onSignalModeChange={setSignalMode}
          />
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
          events={signalEvents}
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
        />
      </div>
    </div>
  );
}
