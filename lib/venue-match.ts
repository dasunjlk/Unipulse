export type LocationLite = { id: string; name: string; code: string };

export type VenueMatch = { location: LocationLite; score: number } | null;

/** Lowercase, replace non-alphanumerics with space, collapse whitespace. */
export function normalizeVenueText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenOverlapBonus(aNorm: string, bNorm: string): number {
  const ta = new Set(aNorm.split(" ").filter(Boolean));
  const tb = new Set(bNorm.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  const denom = Math.max(ta.size, tb.size);
  return Math.min(0.15, (inter / denom) * 0.15);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) row[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function similarity(raw: string, candidate: string): number {
  const n1 = normalizeVenueText(raw);
  const n2 = normalizeVenueText(candidate);
  if (!n1 || !n2) return 0;
  const maxLen = Math.max(n1.length, n2.length);
  const lev = levenshtein(n1, n2);
  const base = 1 - lev / maxLen;
  const bonus = tokenOverlapBonus(n1, n2);
  return Math.min(1, base + bonus);
}

/**
 * Picks the campus location whose name or code is closest to the extracted venue string.
 * Returns null if nothing meets minScore (forces manual picker).
 */
export function findClosestLocation(
  rawVenue: string | undefined | null,
  locations: LocationLite[],
  minScore = 0.45,
): VenueMatch {
  const venue = normalizeVenueText(String(rawVenue ?? ""));
  if (!venue || locations.length === 0) return null;

  let best: { location: LocationLite; score: number } | null = null;
  for (const loc of locations) {
    const score = Math.max(similarity(venue, loc.name), similarity(venue, loc.code));
    if (!best || score > best.score) {
      best = { location: loc, score };
    }
  }

  if (!best || best.score < minScore) return null;
  return best;
}
