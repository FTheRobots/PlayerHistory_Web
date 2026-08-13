import { useCallback, useEffect, useState } from 'react';
import { getApiBase } from '../auth/storage';

const POLL_MS = 5000;

export function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/health`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOnline(true);
      setError(null);
    } catch (err) {
      setOnline(false);
      setError(err instanceof Error ? err.message : 'Connection lost');
    }
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => window.clearInterval(id);
  }, [check]);

  return {
    online,
    loading: online === null,
    error,
    recheck: check,
  };
}
