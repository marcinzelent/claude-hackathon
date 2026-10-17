/**
 * Returns the canonical https://www.linkedin.com/in/<slug> URL, or null if it isn't a LinkedIn profile link.
 * LinkedIn profile links ignore case, so the slug is lowercased.
 */
export function parseLinkedinProfileUrl(input: string): string | null {
  const m = input.trim().match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]+)\/?(?:[?#].*)?$/i);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return null;
  }
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}

/** True when two LinkedIn profile links point to the same person, however they're written. */
export function sameLinkedin(a: string | undefined, b: string | undefined): boolean {
  const x = a ? parseLinkedinProfileUrl(a) : null;
  const y = b ? parseLinkedinProfileUrl(b) : null;
  return x !== null && x === y;
}
