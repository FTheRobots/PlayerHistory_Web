import type { MapDisplayMode } from '../config/mapConfig';
import type { MapTileLayer } from '../utils/mapTileLayer';

interface MapTileLayerToggleProps {
  layer: MapTileLayer;
  onLayerChange: (layer: MapTileLayer) => void;
  mapMode: MapDisplayMode;
  className?: string;
}

export function MapTileLayerToggle({
  layer,
  onLayerChange,
  mapMode,
  className = '',
}: MapTileLayerToggleProps) {
  if (mapMode !== 'tiles') return null;

  return (
    <label className={`flex items-center gap-2 text-xs text-muted cursor-pointer select-none ${className}`}>
      <span className={layer === 'topographic' ? 'text-text' : ''}>Topo</span>
      <input
        type="checkbox"
        checked={layer === 'satellite'}
        onChange={(e) => onLayerChange(e.target.checked ? 'satellite' : 'topographic')}
        className="rounded-sm border-border accent-accent"
        title="Toggle satellite / topographic map tiles (dayz.xam.nu)"
      />
      <span className={layer === 'satellite' ? 'text-text' : ''}>Satellite</span>
    </label>
  );
}
