import { Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canViewInstances } from '../utils/instanceAccess';

/** Shows which DayZ instance the current page data belongs to. */
export function InstanceScopeBanner() {
  const { activeInstance, hasPermission } = useAuth();
  if (!canViewInstances(hasPermission) || !activeInstance) return null;

  return (
    <p className="text-xs text-muted flex items-center gap-1.5">
      <Server size={12} className="text-accent shrink-0" />
      <span>
        Instance: <span className="text-accent font-medium">{activeInstance.name}</span>
      </span>
    </p>
  );
}
