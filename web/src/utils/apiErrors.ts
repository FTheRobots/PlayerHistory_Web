const CONNECTION_LOST = 'Server connection lost... attempting to reconnect';

export function formatApiError(err: unknown): string {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
      return CONNECTION_LOST;
    }
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network error')) {
      return CONNECTION_LOST;
    }
    if (msg.startsWith('api error:')) {
      return err.message;
    }
    return err.message;
  }

  return 'Something went wrong. Please try again.';
}

export function isConnectionError(err: unknown): boolean {
  return formatApiError(err) === CONNECTION_LOST;
}
