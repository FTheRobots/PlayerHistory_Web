import type { TimelineFilters } from '../types';

interface FilterBarProps {
  filters: TimelineFilters;
  onChange: (filters: TimelineFilters) => void;
  categories: string[];
  eventTypes: string[];
}

export function FilterBar({ filters, onChange, categories, eventTypes }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 p-4 bg-surface-raised border border-surface-border rounded-lg">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-gray-500 mb-1">Search</label>
        <input
          type="text"
          placeholder="Search events, metadata..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1">Category</label>
        <select
          value={filters.category ?? ''}
          onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px]">
        <label className="block text-xs text-gray-500 mb-1">Event type</label>
        <select
          value={filters.event ?? ''}
          onChange={(e) => onChange({ ...filters, event: e.target.value || undefined })}
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        >
          <option value="">All events</option>
          {eventTypes.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      <div className="min-w-[180px]">
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input
          type="datetime-local"
          value={filters.from?.slice(0, 16) ?? ''}
          onChange={(e) => onChange({ ...filters, from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <div className="min-w-[180px]">
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input
          type="datetime-local"
          value={filters.to?.slice(0, 16) ?? ''}
          onChange={(e) => onChange({ ...filters, to: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
          className="w-full bg-surface border border-surface-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {(filters.search || filters.category || filters.event || filters.from || filters.to) && (
        <div className="flex items-end">
          <button
            onClick={() => onChange({})}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-surface-border rounded hover:border-gray-500 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
