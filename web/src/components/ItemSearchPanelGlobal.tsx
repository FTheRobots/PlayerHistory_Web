import { useSearchParams } from 'react-router-dom';
import { ItemSearchPanel } from '../components/ItemSearchPanel';

const PID_PATTERN = /^\d+-\d+-\d+-\d+$/;

interface ItemSearchPanelGlobalProps {
  onTrack: (pid: string) => void;
}

/** Global item search with PID auto-detect and URL deep links (?q= or ?pid=). */
export function ItemSearchPanelGlobal({ onTrack }: ItemSearchPanelGlobalProps) {
  const [params] = useSearchParams();
  const initialQuery = params.get('pid') ?? params.get('q') ?? '';

  return (
    <ItemSearchPanel
      onTrack={onTrack}
      initialQuery={initialQuery}
      autoTrackPid={PID_PATTERN.test(initialQuery.trim())}
    />
  );
}
