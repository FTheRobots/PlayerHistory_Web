/** Normalize user-entered server URL (IP:port, domain, with or without /api). */
export function normalizeServerUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';

  url = url.replace(/\/+$/, '');
  url = url.replace(/\/api\/?$/i, '');

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Server URL must use http or https');
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    throw new Error('Invalid server URL');
  }
}
