import L from 'leaflet';
import type { MapEventCluster } from './mapReplay';

const DOM_CLICK = '__phClusterClick';

type ClickableEl = HTMLElement & {
  [DOM_CLICK]?: (e: Event) => void;
};

/** Open the action panel from a marker or its permanent label bubble. */
export function bindClusterSelect(
  marker: L.CircleMarker,
  cluster: MapEventCluster,
  onSelect: (cluster: MapEventCluster) => void
): void {
  const handleLeaflet = (e: L.LeafletMouseEvent) => {
    L.DomEvent.stop(e);
    onSelect(cluster);
  };
  const handleDom = (e: Event) => {
    L.DomEvent.stop(e);
    onSelect(cluster);
  };

  marker.off('click');
  marker.on('click', handleLeaflet);

  const wireTooltip = () => {
    const tooltip = marker.getTooltip();
    if (!tooltip) return;
    tooltip.off('click');
    tooltip.on('click', handleLeaflet);
    const el = tooltip.getElement() as ClickableEl | undefined;
    if (!el) return;
    if (el[DOM_CLICK]) L.DomEvent.off(el, 'click', el[DOM_CLICK]);
    el[DOM_CLICK] = handleDom;
    L.DomEvent.on(el, 'click', handleDom);
    el.title =
      cluster.events.length > 1
        ? `${cluster.events.length} events · click to inspect`
        : 'Click to inspect';
  };

  marker.off('tooltipopen');
  marker.on('tooltipopen', wireTooltip);
  wireTooltip();
}
