import { LUMA_API_BASES, lumaPaths } from "../luma/config";
import { parseDiscoverPlace, parseEventPage } from "../luma/normalize";
import type { LumaEvent } from "../types";
import { MINUTE, serverCache } from "./cache";

// Server-only: Luma's PUBLIC endpoints (no sign-in). Anything that needs the user's
// Luma session goes through the phone's hidden WebView instead (src/luma/LumaBridge.tsx).

const MAX_DISCOVER_PAGES = 2;
// Every public Luma answer is reused for 5 minutes; a city's event list for 10.
const lumaCache = serverCache<unknown>("luma", 5 * MINUTE);
const cityCache = serverCache<LumaEvent[] | null>("lumaCity", 10 * MINUTE);

/** GETs a public Luma path, trying each API host; null when none answers with 2xx JSON. */
export function lumaJson(path: string): Promise<unknown> {
  return lumaCache.get(path, () => fetchLumaJson(path), (v) => v !== null);
}

async function fetchLumaJson(path: string): Promise<unknown> {
  for (const base of LUMA_API_BASES) {
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.json();
    } catch {
      // try the next host
    }
  }
  return null;
}

/** Upcoming public events for a city slug ("berlin"), or null if Luma has no such city. */
export function cityEvents(slug: string): Promise<LumaEvent[] | null> {
  return cityCache.get(slug, () => fetchCityEvents(slug), (v) => v !== null);
}

async function fetchCityEvents(slug: string): Promise<LumaEvent[] | null> {
  const placeId = parseDiscoverPlace(await lumaJson(lumaPaths.resolveSlug(slug)));
  if (!placeId) return null;

  const events: LumaEvent[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_DISCOVER_PAGES; page++) {
    const { events: batch, nextCursor } = parseEventPage(await lumaJson(lumaPaths.discover(placeId, cursor)));
    events.push(...batch);
    if (!nextCursor || batch.length === 0) break;
    cursor = nextCursor;
  }
  // Only events that haven't ended yet.
  const now = new Date().toISOString();
  return events.filter((e) => (e.endAt ?? e.startAt ?? now) >= now);
}
