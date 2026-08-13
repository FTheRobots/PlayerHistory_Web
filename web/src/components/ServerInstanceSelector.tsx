import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canManageInstances, canViewInstances } from '../utils/instanceAccess';

export function ServerInstanceSelector() {
  const { instances, activeInstance, switchInstance, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!canViewInstances(hasPermission) || instances.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border bg-panel text-xs text-text hover:border-accent max-w-[220px]"
        title="Switch DayZ instance"
      >
        <Server size={14} className="text-accent shrink-0" />
        <span className="truncate font-medium">{activeInstance?.name ?? 'Instance'}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[260px] rounded border border-border bg-panel shadow-lg py-1">
          {instances.map((instance) => (
            <button
              key={instance.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (instance.id !== activeInstance?.id) {
                  switchInstance(instance.id);
                }
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-input ${
                instance.id === activeInstance?.id ? 'text-accent-bright' : 'text-text'
              }`}
            >
              <div className="font-medium">{instance.name}</div>
              <div className="text-muted truncate">{instance.playerHistoryPath}</div>
            </button>
          ))}
          {canManageInstances(hasPermission) && (
            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-accent hover:bg-input"
                onClick={() => {
                  setOpen(false);
                  navigate('/admin/instances');
                }}
              >
                Manage instances…
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
