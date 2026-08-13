import {
  MAP_SIGNAL_MODES,
  MAP_SIGNAL_MODE_LABELS,
  type MapSignalMode,
} from '../config/mapReplayConfig';

interface MapSignalModeControlProps {
  labelsVisible: boolean;
  onLabelsVisibleChange: (visible: boolean) => void;
  signalMode: MapSignalMode;
  onSignalModeChange: (mode: MapSignalMode) => void;
}

export function MapSignalModeControl({
  labelsVisible,
  onLabelsVisibleChange,
  signalMode,
  onSignalModeChange,
}: MapSignalModeControlProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted select-none">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={labelsVisible}
          onChange={(e) => onLabelsVisibleChange(e.target.checked)}
          className="rounded-sm border-border bg-input accent-accent w-3.5 h-3.5 cursor-pointer"
        />
        <span className={labelsVisible ? 'text-text' : ''}>Labels</span>
      </label>
      <div className="inline-flex rounded-sm border border-border overflow-hidden">
        {MAP_SIGNAL_MODES.map((mode) => {
          const active = signalMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSignalModeChange(mode)}
              className={`px-2 py-0.5 font-medium ${
                active ? 'bg-accent/20 text-text' : 'bg-input text-muted hover:text-text'
              }`}
              title={
                mode === 'quiet'
                  ? 'Deaths, kills, and damage'
                  : mode === 'forensic'
                    ? 'Quiet plus inventory and vehicles'
                    : 'All map events'
              }
            >
              {MAP_SIGNAL_MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
