import { useCallback, useState } from 'react';
import { api } from '../api/client';
import type { DashboardCommandRequest } from '../types';

export function useDashboardAdminCommand(onSuccess?: () => void | Promise<void>) {
  const [notice, setNotice] = useState<string | null>(null);

  const runAdminCommand = useCallback(
    async (request: DashboardCommandRequest) => {
      setNotice(null);
      try {
        await api.sendDashboardCommand(request);
        setNotice(`${request.type} command queued — applies within a few seconds`);
        await onSuccess?.();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : String(err));
      }
    },
    [onSuccess]
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return { notice, runAdminCommand, clearNotice };
}
