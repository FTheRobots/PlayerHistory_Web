import { Search } from 'lucide-react';
import { ItemSearchPanelGlobal } from '../components/ItemSearchPanelGlobal';
import { InstanceScopeBanner } from '../components/InstanceScopeBanner';

interface ItemSearchPageProps {
  onTrackItem: (pid: string) => void;
}

export function ItemSearchPage({ onTrackItem }: ItemSearchPageProps) {
  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold text-text flex items-center gap-2">
          <Search size={18} className="text-accent" />
          Item search
        </h1>
        <p className="text-xs text-muted mt-1">
          Search tracked items by name, classname, or full PID for the selected instance.
        </p>
        <div className="mt-2">
          <InstanceScopeBanner />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <ItemSearchPanelGlobal onTrack={onTrackItem} />
      </div>
    </div>
  );
}
