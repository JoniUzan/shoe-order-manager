/**
 * The values offered under a free-text field (a block's Color, Material and
 * Sole) from what the User typed on earlier orders.
 */

/** How many values a field offers. */
export const MAX_SUGGESTIONS = 20;

/** "  Gumi " and "gumi" are the same value. */
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * Distinct values, most recently used first. `values` arrive newest first; the
 * first spelling seen wins, blanks are skipped.
 */
export function recentDistinct(
  values: readonly (string | null | undefined)[],
  limit = MAX_SUGGESTIONS,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw?.trim().replace(/\s+/g, " ");
    if (!value) continue;
    const key = normalize(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length === limit) break;
  }
  return out;
}

export interface SuggestionMatch {
  value: string;
  /** Where the typed text starts in `value`, for bolding; -1 when nothing is typed. */
  start: number;
  length: number;
}

/**
 * The suggestions containing what's typed, in their original order. An exact
 * match is left out: there is nothing left to suggest.
 */
export function matchSuggestions(
  options: readonly string[],
  typed: string,
): SuggestionMatch[] {
  const query = normalize(typed);
  if (!query) return options.map((value) => ({ value, start: -1, length: 0 }));
  const out: SuggestionMatch[] = [];
  for (const value of options) {
    const lower = value.toLocaleLowerCase();
    if (lower === query) continue;
    const start = lower.indexOf(query);
    if (start >= 0) out.push({ value, start, length: query.length });
  }
  return out;
}
