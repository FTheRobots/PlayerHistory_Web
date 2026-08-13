/** Compare semver strings. Returns negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length, 3);

  for (let i = 0; i < len; i++) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isSemverLessThan(a: string, b: string): boolean {
  return compareSemver(a, b) < 0;
}

export function formatVersionLabel(version: string | undefined): string {
  if (!version?.trim()) return 'unknown';
  return version.trim().replace(/^v/i, '');
}
