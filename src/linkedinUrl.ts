/** Returns the canonical https://www.linkedin.com/in/<slug> URL, or null if it isn't a LinkedIn profile link. */
export function parseLinkedinProfileUrl(input: string): string | null {
  const m = input.trim().match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]+)\/?(?:[?#].*)?$/i);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}
