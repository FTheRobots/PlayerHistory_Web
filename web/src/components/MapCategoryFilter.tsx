import { useMemo, type ReactNode } from 'react';
import { getCategoryStyle } from '../utils/eventHelpers';
import {
  MAP_REPLAY_FILTER_CATEGORIES,
  type MapReplayFilterCategory,
  allMapReplayCategoriesVisible,
  toggleMapReplayCategory,
} from '../utils/mapCategoryFilter';

interface MapCategoryFilterProps {
  visible: Set<MapReplayFilterCategory>;
  onChange: (next: Set<MapReplayFilterCategory>) => void;
  /** Extra controls aligned to the right (e.g. labels checkbox). */
  trailing?: ReactNode;
}

export function MapCategoryFilter({ visible, onChange, trailing }: MapCategoryFilterProps) {
  const allOn = useMemo(() => allMapReplayCategoriesVisible(visible), [visible]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted font-semibold mr-0.5">Show</span>
      {MAP_REPLAY_FILTER_CATEGORIES.map((cat) => {
        const on = visible.has(cat);
        return (
          <label
            key={cat}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-sm border font-medium cursor-pointer select-none transition-opacity ${getCategoryStyle(cat)} ${
              on ? '' : 'opacity-35'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(toggleMapReplayCategory(visible, cat))}
              className="rounded-sm border-border bg-input accent-accent w-3.5 h-3.5 cursor-pointer"
            />
            {cat}
          </label>
        );
      })}
      {!allOn && (
        <button
          type="button"
          onClick={() => onChange(new Set(MAP_REPLAY_FILTER_CATEGORIES))}
          className="text-[11px] text-muted hover:text-accent-bright underline underline-offset-2"
        >
          Show all
        </button>
      )}
      {trailing}
    </div>
  );
}
