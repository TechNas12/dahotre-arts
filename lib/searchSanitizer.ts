/**
 * Shared search term sanitizers for PostgREST queries.
 */

/**
 * Sanitizes search strings for PostgREST .or() filters.
 * Removes filter separators and escapes quotes/backslashes.
 */
export function sanitizeForOrFilter(term: string): string {
  if (!term) return "";
  const trimmed = term.trim();
  if (!trimmed) return "";
  
  // Remove PostgREST filter separators
  const noSeparators = trimmed.replace(/[,.()]/g, "");
  if (!noSeparators) return "";

  // Escape backslashes, quotes, percent signs and underscores
  return noSeparators
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Sanitizes search strings for PostgREST .ilike() / .like() filters.
 * Escapes wildcards to prevent broad matching, but preserves separators.
 */
export function sanitizeForIlike(term: string): string {
  if (!term) return "";
  const trimmed = term.trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
