import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Crosshair, Flame, Map as MapIcon, Package, Tag } from 'lucide-react';
import { mapBounds, mapPanBounds, mapDisplayMode, mapConfigKey, HEATMAP_TIME_WINDOWS, type TimeWindowId } from '../../config/mapConfig';
import { MAP_TOOLTIP_INSET_PX } from '../../config/mapReplayConfig';
import { positionToMapLatLng, mapLatLngToPosition } from '../../utils/gameCoords';
import { categoryColor } from '../../utils/mapReplay';
import type { HeatmapMode, OnlinePlayerDetail, DashboardMapConfig } from '../../types';
import { useMapConfig } from '../../hooks/useMapConfig';
import { useMapTileLayer } from '../../hooks/useMapTileLayer';
import { useSyncMapTileLayer } from '../../hooks/useSyncMapTileLayer';
import { MapTileLayerToggle } from '../MapTileLayerToggle';
import { createXamTileLayer } from '../../utils/mapTileLayer';
import { useDashboardAdminCommand } from '../../hooks/useDashboardAdminCommand';
import { useHeatmap } from '../../hooks/useHeatmap';
import { buildLastActionHtml } from '../../utils/itemHelpers';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../auth/permissions';

const HEATMAP_MODES: Array<{ id: HeatmapMode; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'deaths', label: 'Deaths' },
  { id: 'combat', label: 'Combat' },
  { id: 'activity', label: 'Activity' },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addGridOverlay(map: L.Map, mode: ReturnType<typeof mapDisplayMode>, mapSize: number): L.LayerGroup {
  const group = L.layerGroup();
  const divisions = 16;

  if (mode === 'tiles') {
    for (let i = 0; i <= divisions; i++) {
      const t = (i / divisions) * 256;
      group.addLayer(
        L.polyline(
          [
            [-256 + t, 0],
            [-256 + t, 256],
          ],
          { color: '#3a4252', weight: 1, opacity: 0.45 }
        )
      );
      group.addLayer(
        L.polyline(
          [
            [-256, t],
            [0, t],
          ],
          { color: '#3a4252', weight: 1, opacity: 0.45 }
        )
      );
    }
  } else {
    const step = mapSize / divisions;
    for (let i = 0; i <= divisions; i++) {
      const c = i * step;
      group.addLayer(
        L.polyline(
          [
            [c, 0],
            [c, mapSize],
          ],
          { color: '#3a4252', weight: 1, opacity: 0.45 }
        )
      );
      group.addLayer(
        L.polyline(
          [
            [0, c],
            [mapSize, c],
          ],
          { color: '#3a4252', weight: 1, opacity: 0.45 }
        )
      );
    }
  }

  group.addTo(map);
  return group;
}

interface GlobalMapPanelProps {
  players: OnlinePlayerDetail[];
  onSelectPlayer: (steamId: string) => void;
  onTrackItem?: (pid: string) => void;
  serverMap?: DashboardMapConfig | null;
}

function buildPopupHtml(player: OnlinePlayerDetail, actions: Set<string>): string {
  const lastActionHtml = player.lastAction
    ? buildLastActionHtml(player.lastAction, player.lastActionItemPid, player.lastActionItemName)
    : '';

  const buttons: string[] = [
    `<button type="button" data-action="timeline" data-steam="${player.steamId}" class="gm-btn">Timeline</button>`,
  ];
  if (actions.has('heal')) buttons.push(`<button type="button" data-action="heal" data-steam="${player.steamId}" class="gm-btn">Heal</button>`);
  if (actions.has('kill')) buttons.push(`<button type="button" data-action="kill" data-steam="${player.steamId}" class="gm-btn">Kill</button>`);
  if (actions.has('teleport')) buttons.push(`<button type="button" data-action="teleport" data-steam="${player.steamId}" class="gm-btn">Teleport</button>`);
  if (actions.has('spawn')) buttons.push(`<button type="button" data-action="spawn" data-steam="${player.steamId}" class="gm-btn">Spawn</button>`);
  if (actions.has('message')) buttons.push(`<button type="button" data-action="message" data-steam="${player.steamId}" class="gm-btn">Message</button>`);
  if (actions.has('kick')) buttons.push(`<button type="button" data-action="kick" data-steam="${player.steamId}" class="gm-btn">Kick</button>`);
  if (actions.has('ban')) buttons.push(`<button type="button" data-action="ban" data-steam="${player.steamId}" class="gm-btn">Ban</button>`);

  return `
    <div style="font-family:Consolas,monospace;font-size:12px;min-width:160px">
      <b style="color:#4ade80">${escapeHtml(player.characterName ?? player.steamId)}</b><br/>
      <span style="color:#9aa3b2">${escapeHtml(player.steamId)}</span><br/>
      ${lastActionHtml ? `<span style="color:#e8b84a;margin-top:4px;display:block">${lastActionHtml}</span>` : ''}
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
        ${buttons.join('')}
      </div>
    </div>`;
}

function buildMarkerLabelHtml(player: OnlinePlayerDetail, showLatest: boolean): string {
  const name = escapeHtml(player.characterName ?? player.steamId);
  const parts = [`<div class="map-event-tooltip-line map-player-name">${name}</div>`];
  if (showLatest && player.lastAction) {
    parts.push('<div class="map-event-tooltip-divider"></div>');
    parts.push(
      `<div class="map-event-tooltip-line">${buildLastActionHtml(
        player.lastAction,
        player.lastActionItemPid,
        player.lastActionItemName
      )}</div>`
    );
  }
  return parts.join('');
}

function syncMarkerLabel(
  marker: L.CircleMarker,
  player: OnlinePlayerDetail,
  showLatest: boolean
): void {
  const tooltipHtml = buildMarkerLabelHtml(player, showLatest);
  const hasItemLink = showLatest && Boolean(player.lastActionItemPid && player.lastActionItemName);
  const tooltip = marker.getTooltip();
  if (tooltip) {
    tooltip.setContent(tooltipHtml);
  } else {
    marker.bindTooltip(tooltipHtml, {
      permanent: true,
      direction: 'top',
      offset: [0, -12],
      className: 'map-event-tooltip map-event-tooltip-stack',
      interactive: hasItemLink,
    });
  }
}

type PromptAction = 'message' | 'kick' | 'ban';

interface PendingPrompt {
  type: PromptAction;
  steamId: string;
  playerName: string;
}

/** Leaflet popup buttons often receive Text nodes as click targets — walk up to the button. */
function clickEventElement(target: EventTarget | null): Element | null {
  let node: Node | null = target as Node | null;
  while (node) {
    if (node instanceof Element) return node;
    node = node.parentNode;
  }
  return null;
}

function findPopupButton(target: EventTarget | null): HTMLButtonElement | null {
  const el = clickEventElement(target);
  return el?.closest('.gm-btn') as HTMLButtonElement | null ?? null;
}

export function GlobalMapPanel({ players, onSelectPlayer, onTrackItem, serverMap }: GlobalMapPanelProps) {
  const { hasPermission } = useAuth();
  const mapCfg = useMapConfig(serverMap);
  const mapMode = mapDisplayMode(mapCfg);
  const mapKey = mapConfigKey(mapCfg);
  const { layer: tileLayer, setLayer: setTileLayer } = useMapTileLayer();
  const allowedActions = useRef(new Set<string>());
  allowedActions.current = new Set([
    ...(hasPermission(PERMISSIONS.ADMIN_HEAL) ? ['heal'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_KILL) ? ['kill'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_TELEPORT) ? ['teleport'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_SPAWN) ? ['spawn'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_MESSAGE) ? ['message'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_KICK) ? ['kick'] : []),
    ...(hasPermission(PERMISSIONS.ADMIN_BAN) ? ['ban'] : []),
  ]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  useSyncMapTileLayer(mapRef, tileLayerRef, mapCfg, mapMode, tileLayer, mapKey);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const openPopupSteamIdRef = useRef<string | null>(null);
  const playersRef = useRef(players);
  const onSelectPlayerRef = useRef(onSelectPlayer);
  const onTrackItemRef = useRef(onTrackItem);

  const [showLatest, setShowLatest] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('all');
  const [heatmapWindow, setHeatmapWindow] = useState<TimeWindowId>('1h');
  const showLatestRef = useRef(showLatest);
  const { data: heatmapData, loading: heatmapLoading, error: heatmapError } = useHeatmap(
    showHeatmap,
    heatmapMode,
    heatmapWindow
  );
  const [teleportTarget, setTeleportTarget] = useState<OnlinePlayerDetail | null>(null);
  const teleportTargetRef = useRef<OnlinePlayerDetail | null>(null);
  const [pendingTeleport, setPendingTeleport] = useState<{ x: number; y: number; z: number } | null>(null);
  const [spawnTarget, setSpawnTarget] = useState<OnlinePlayerDetail | null>(null);
  const [spawnClass, setSpawnClass] = useState('Apple');
  const [teleportHint, setTeleportHint] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [promptText, setPromptText] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const { notice: adminNotice, runAdminCommand } = useDashboardAdminCommand();
  const runAdminCommandRef = useRef(runAdminCommand);

  playersRef.current = players;
  onSelectPlayerRef.current = onSelectPlayer;
  onTrackItemRef.current = onTrackItem;
  showLatestRef.current = showLatest;
  teleportTargetRef.current = teleportTarget;
  runAdminCommandRef.current = runAdminCommand;

  const handlePopupAction = useCallback(
    (steamId: string, action: string | undefined) => {
      if (!steamId || !action) return;

      const map = mapRef.current;
      const player = playersRef.current.find((p) => p.steamId === steamId);
      const playerName = player?.characterName ?? steamId;

      const closePopup = () => {
        map?.closePopup();
        openPopupSteamIdRef.current = null;
      };

      if (action === 'timeline') {
        onSelectPlayerRef.current(steamId);
        closePopup();
        return;
      }

      if (action === 'heal') {
        closePopup();
        void runAdminCommandRef.current({ type: 'heal', steamId });
        return;
      }

      if (action === 'kill') {
        closePopup();
        void runAdminCommandRef.current({ type: 'kill', steamId });
        return;
      }

      if (action === 'message') {
        closePopup();
        setPromptText('');
        setPendingPrompt({ type: 'message', steamId, playerName });
        return;
      }

      if (action === 'kick') {
        closePopup();
        setPromptText('');
        setPendingPrompt({ type: 'kick', steamId, playerName });
        return;
      }

      if (action === 'ban') {
        closePopup();
        setPromptText('');
        setBanDuration('');
        setPendingPrompt({ type: 'ban', steamId, playerName });
        return;
      }

      if (action === 'teleport') {
        if (!player) return;
        setTeleportTarget(player);
        setTeleportHint(`Click the map to teleport ${playerName}`);
        closePopup();
        return;
      }

      if (action === 'spawn') {
        if (!player) return;
        setSpawnTarget(player);
        closePopup();
      }
    },
    []
  );

  const handlePopupActionRef = useRef(handlePopupAction);
  handlePopupActionRef.current = handlePopupAction;

  const submitPendingPrompt = useCallback(() => {
    if (!pendingPrompt) return;
    const trimmed = promptText.trim();

    if (pendingPrompt.type === 'message') {
      if (!trimmed) return;
      void runAdminCommand({ type: 'message', steamId: pendingPrompt.steamId, message: trimmed });
    } else if (pendingPrompt.type === 'kick') {
      void runAdminCommand({
        type: 'kick',
        steamId: pendingPrompt.steamId,
        message: trimmed || undefined,
      });
    } else if (pendingPrompt.type === 'ban') {
      const durationTrimmed = banDuration.trim();
      let banDurationMinutes = 0;
      if (durationTrimmed) {
        const parsed = Number.parseInt(durationTrimmed, 10);
        if (Number.isNaN(parsed) || parsed < 0) return;
        banDurationMinutes = parsed;
      }
      void runAdminCommand({
        type: 'ban',
        steamId: pendingPrompt.steamId,
        message: trimmed || undefined,
        banDurationMinutes,
      });
    }

    setPendingPrompt(null);
    setPromptText('');
    setBanDuration('');
  }, [pendingPrompt, promptText, banDuration, runAdminCommand]);

  const wireItemLinks = useCallback((root: ParentNode | null) => {
    root?.querySelectorAll<HTMLButtonElement>('.map-item-link').forEach((btn) => {
      L.DomEvent.disableClickPropagation(btn);
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const pid = btn.dataset.itemPid;
        if (pid) onTrackItemRef.current?.(pid);
      };
    });
  }, []);

  const preparePopupButtons = useCallback((root: ParentNode | null) => {
    root?.querySelectorAll<HTMLButtonElement>('.gm-btn').forEach((btn) => {
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.disableScrollPropagation(btn);
    });
    wireItemLinks(root);
  }, [wireItemLinks]);

  const schedulePreparePopup = useCallback(
    (root: ParentNode | null) => {
      requestAnimationFrame(() => preparePopupButtons(root));
    },
    [preparePopupButtons]
  );

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

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
      addGridOverlay(map, mode, mapSize);
    }

    map.fitBounds(bounds);
    map.setMaxBounds(panBounds);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const container = map.getContainer();
    const onPopupButtonClick = (ev: MouseEvent) => {
      const btn = findPopupButton(ev.target);
      if (!btn || !container.contains(btn)) return;
      L.DomEvent.stop(ev);
      handlePopupActionRef.current(btn.dataset.steam ?? '', btn.dataset.action);
    };
    container.addEventListener('click', onPopupButtonClick, true);

    map.on('click', (e) => {
      const target = teleportTargetRef.current;
      if (!target) return;
      const [x, , z] = mapLatLngToPosition(e.latlng.lat, e.latlng.lng, mapSize, mode);
      setPendingTeleport({ x, y: 0, z });
    });

    requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds);
    });

    return () => {
      container.removeEventListener('click', onPopupButtonClick, true);
      if (heatLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, [mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const { mapSize } = mapCfg;
    const mode = mapMode;
    const seen = new Set<string>();

    for (const [steamId, marker] of markersRef.current.entries()) {
      if (marker.isPopupOpen()) {
        openPopupSteamIdRef.current = steamId;
        break;
      }
    }

    const openSteamId = openPopupSteamIdRef.current;

    for (const player of players) {
      if (!player.position) continue;

      seen.add(player.steamId);
      const latLng = positionToMapLatLng(player.position, mapSize, mode);
      const color = player.lastActionCategory ? categoryColor(player.lastActionCategory) : '#4ade80';
      const popupHtml = buildPopupHtml(player, allowedActions.current);

      let marker = markersRef.current.get(player.steamId);
      if (marker) {
        marker.setLatLng(latLng);
        marker.setStyle({ fillColor: color });
        marker.setPopupContent(popupHtml);
        syncMarkerLabel(marker, player, showLatest);

        if (marker.isPopupOpen()) {
          marker.closeTooltip();
          schedulePreparePopup(marker.getPopup()?.getElement() ?? null);
        }
      } else {
        const createdMarker = L.circleMarker(latLng, {
          radius: 10,
          color: '#ffffff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
        });
        createdMarker.bindPopup(popupHtml, { closeOnClick: false, autoClose: true });
        const steamId = player.steamId;
        createdMarker.on('popupopen', (ev) => {
          openPopupSteamIdRef.current = steamId;
          createdMarker.closeTooltip();
          schedulePreparePopup(ev.popup.getElement() ?? null);
        });
        createdMarker.on('popupclose', () => {
          if (openPopupSteamIdRef.current === steamId) {
            openPopupSteamIdRef.current = null;
          }
          createdMarker.openTooltip();
        });

        syncMarkerLabel(createdMarker, player, showLatest);

        layer.addLayer(createdMarker);
        markersRef.current.set(player.steamId, createdMarker);
      }
    }

    for (const [steamId, marker] of markersRef.current.entries()) {
      if (!seen.has(steamId)) {
        layer.removeLayer(marker);
        markersRef.current.delete(steamId);
        if (openPopupSteamIdRef.current === steamId) {
          openPopupSteamIdRef.current = null;
        }
      }
    }

    if (openSteamId) {
      const openMarker = markersRef.current.get(openSteamId);
      if (openMarker && !openMarker.isPopupOpen()) {
        openMarker.openPopup();
      }
    }

    wireItemLinks(map.getContainer());
  }, [players, showLatest, schedulePreparePopup, wireItemLinks, mapCfg.mapSize, mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || !heatmapData?.points.length) return;

    const { mapSize, maxNativeZoom } = mapCfg;
    const mode = mapMode;
    const heatPoints: Array<[number, number, number]> = heatmapData.points.map((point) => {
      const latLng = positionToMapLatLng([point.x, 0, point.z], mapSize, mode);
      const lat = Array.isArray(latLng) ? latLng[0] : latLng.lat;
      const lng = Array.isArray(latLng) ? latLng[1] : latLng.lng;
      return [lat, lng, 0.35];
    });

    const heat = L.heatLayer(heatPoints, {
      radius: 22,
      blur: 18,
      maxZoom: maxNativeZoom + 2,
      minOpacity: 0.35,
      gradient: {
        0.1: '#1e3a5f',
        0.35: '#2563eb',
        0.55: '#22c55e',
        0.75: '#eab308',
        1.0: '#ef4444',
      },
    });
    heat.addTo(map);
    heatLayerRef.current = heat;
  }, [showHeatmap, heatmapData, mapCfg.mapSize, mapMode, mapCfg.maxNativeZoom]);

  return (
    <div className="bg-panel border border-border rounded overflow-hidden shadow-panel flex flex-col h-full min-h-[480px]">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <MapIcon size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
          Global map
          <span className="normal-case font-normal text-muted ml-2">{mapCfg.displayName}</span>
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <MapTileLayerToggle layer={tileLayer} onLayerChange={setTileLayer} mapMode={mapMode} />
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded-sm border-border accent-accent"
            />
            <Flame size={14} className={showHeatmap ? 'text-event-combat' : undefined} />
            Heatmap
          </label>
          {showHeatmap && (
            <>
              <select
                value={heatmapMode}
                onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
                className="text-xs bg-surface border border-border rounded-sm px-2 py-1 text-text"
              >
                {HEATMAP_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <select
                value={heatmapWindow}
                onChange={(e) => setHeatmapWindow(e.target.value as TimeWindowId)}
                className="text-xs bg-surface border border-border rounded-sm px-2 py-1 text-text"
              >
                {HEATMAP_TIME_WINDOWS.map((window) => (
                  <option key={window.id} value={window.id}>
                    {window.label}
                  </option>
                ))}
              </select>
              {heatmapLoading && <span className="text-xs text-dim">Loading…</span>}
              {!heatmapLoading && heatmapData && (
                <span className="text-xs text-dim font-mono">
                  {heatmapData.total.toLocaleString()} pts
                  {heatmapData.truncated ? '+' : ''}
                </span>
              )}
            </>
          )}
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLatest}
              onChange={(e) => setShowLatest(e.target.checked)}
              className="rounded-sm border-border accent-accent"
            />
            <Tag size={14} />
            Show latest action
          </label>
          {teleportTarget && (
            <button
              type="button"
              onClick={() => {
                setTeleportTarget(null);
                setPendingTeleport(null);
                setTeleportHint(null);
              }}
              className="text-xs px-2 py-1 rounded-sm border border-event-combat/40 text-event-combat"
            >
              Cancel teleport
            </button>
          )}
        </div>
      </div>

      {(adminNotice || teleportHint || (showHeatmap && heatmapError)) && (
        <div className="px-4 py-2 text-xs text-accent-bright bg-accent-soft border-b border-border font-mono">
          {adminNotice ?? teleportHint ?? heatmapError}
        </div>
      )}

      <div
        className="relative flex-1 min-h-0 overflow-hidden isolate"
        style={{ padding: MAP_TOOLTIP_INSET_PX }}
      >
        <div ref={mapContainerRef} className="absolute z-0" style={{ inset: MAP_TOOLTIP_INSET_PX }} />
        {teleportTarget && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-panel border border-accent text-xs text-accent-bright">
            <Crosshair size={14} />
            Teleport {teleportTarget.characterName ?? teleportTarget.steamId} — click destination
          </div>
        )}
      </div>

      {pendingTeleport && teleportTarget && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/55 p-4">
          <div className="bg-panel border border-border rounded-lg p-4 max-w-sm w-full shadow-panel">
            <h3 className="font-semibold text-text mb-2">Confirm teleport</h3>
            <p className="text-sm text-muted mb-4">
              Move <span className="text-green-bright">{teleportTarget.characterName}</span> to{' '}
              <span className="font-mono">
                {pendingTeleport.x.toFixed(0)} / {pendingTeleport.z.toFixed(0)}
              </span>
              ?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingTeleport(null)}
                className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void runAdminCommand({ type: 'teleport', steamId: teleportTarget.steamId, ...pendingTeleport });
                  setPendingTeleport(null);
                  setTeleportTarget(null);
                  setTeleportHint(null);
                }}
                className="px-3 py-1.5 text-xs border border-accent rounded-sm text-accent-bright"
              >
                Teleport
              </button>
            </div>
          </div>
        </div>
      )}

      {spawnTarget && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/55 p-4">
          <div className="bg-panel border border-border rounded-lg p-4 max-w-sm w-full shadow-panel">
            <h3 className="font-semibold text-text mb-2 flex items-center gap-2">
              <Package size={16} />
              Spawn item at {spawnTarget.characterName}
            </h3>
            <input
              value={spawnClass}
              onChange={(e) => setSpawnClass(e.target.value)}
              className="w-full mt-2 px-3 py-2 text-sm bg-input border border-border rounded-sm font-mono"
              placeholder="Classname e.g. M4A1"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setSpawnTarget(null)}
                className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void runAdminCommand({
                    type: 'spawn',
                    steamId: spawnTarget.steamId,
                    classname: spawnClass,
                    quantity: 1,
                  });
                  setSpawnTarget(null);
                }}
                className="px-3 py-1.5 text-xs border border-event-inventory/40 rounded-sm text-event-inventory"
              >
                Spawn
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPrompt && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/55 p-4">
          <div className="bg-panel border border-border rounded-lg p-4 max-w-sm w-full shadow-panel">
            <h3 className="font-semibold text-text mb-2">
              {pendingPrompt.type === 'message' && `Message ${pendingPrompt.playerName}`}
              {pendingPrompt.type === 'kick' && `Kick ${pendingPrompt.playerName}`}
              {pendingPrompt.type === 'ban' && `Ban ${pendingPrompt.playerName}`}
            </h3>
            <label className="block text-xs text-muted mb-1">
              {pendingPrompt.type === 'message'
                ? 'Message'
                : pendingPrompt.type === 'kick'
                  ? 'Reason (optional)'
                  : 'Reason (optional)'}
            </label>
            <input
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pendingPrompt.type !== 'ban') submitPendingPrompt();
              }}
              className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm"
              placeholder={
                pendingPrompt.type === 'message' ? 'Type your message…' : 'Reason shown to the player…'
              }
              autoFocus
            />
            {pendingPrompt.type === 'ban' && (
              <>
                <label className="block text-xs text-muted mt-3 mb-1">Duration in minutes (empty = permanent)</label>
                <input
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-sm font-mono"
                  placeholder="e.g. 60"
                />
              </>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setPendingPrompt(null);
                  setPromptText('');
                  setBanDuration('');
                }}
                className="px-3 py-1.5 text-xs border border-border rounded-sm text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPendingPrompt}
                disabled={pendingPrompt.type === 'message' && !promptText.trim()}
                className="px-3 py-1.5 text-xs border border-accent rounded-sm text-accent-bright disabled:opacity-40"
              >
                {pendingPrompt.type === 'message'
                  ? 'Send'
                  : pendingPrompt.type === 'kick'
                    ? 'Kick'
                    : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
