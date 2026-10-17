import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseLinkedinProfileUrl } from "../linkedinUrl";
import { fetchLinkedinProfile } from "./apify";

// The team's own demo event: teammates who agreed to be guests, "ingested from Luma".
// Teammates agreed to have their public LinkedIn profiles used for this demo.
// Profiles are fetched through Apify on first use and cached in data/team-event.json
// (git-ignored). Raw LinkedIn data stays on the server and only goes to Claude.

export const TEAM_EVENT_NAME = "Team demo event";
export const TEAM_EVENT_PATH = path.join(process.cwd(), "data", "team-event.json");

type LumaEntry = { api_id: string; user: Record<string, unknown> };

/** Bump when the cached shape changes, so old caches are fetched again. */
const CACHE_VERSION = 2;

export type TeamEventFile = {
  version?: number;
  event: { name: string };
  /** Luma guest-list shape, so the app reads it like a real Luma import. */
  entries: LumaEntry[];
  /** Compact LinkedIn profile per guest id, for Claude's ranking only. */
  linkedin: Record<string, string>;
};

/** The teammates on the demo guest list (all agreed). TEAM_EVENT_LINKEDIN_URLS in .env overrides it. */
const TEAM_LINKEDIN_URLS = [
  "https://www.linkedin.com/in/marcinzelent/",
  "https://linkedin.com/in/robin-kryszak",
  "https://www.linkedin.com/in/soeren-daehn/",
  "https://www.linkedin.com/in/aigam-shamali",
  "https://www.linkedin.com/in/navid-ghayazi/",
];

/** Teammates' LinkedIn links, canonicalised; .env can override with a comma or space separated list. */
export function teamUrls(): string[] {
  const raw: string = process.env.TEAM_EVENT_LINKEDIN_URLS || TEAM_LINKEDIN_URLS.join(",");
  const urls = raw
    .split(/[\s,]+/)
    .map((u) => parseLinkedinProfileUrl(u))
    .filter((u): u is string => u !== null);
  return [...new Set(urls)];
}

const slugOf = (url: string) => decodeURIComponent(url.split("/in/")[1]);
export const guestIdFor = (url: string) => `team-${slugOf(url)}`;

/** "robin-kryszak" -> "Robin Kryszak"; used until the real name comes back from Apify. */
const nameFromSlug = (slug: string) =>
  slug
    .split("-")
    .filter((p) => !/\d/.test(p))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || slug;

function stubEntry(url: string): LumaEntry {
  const slug = slugOf(url);
  const id = guestIdFor(url);
  return { api_id: id, user: { api_id: id, name: nameFromSlug(slug), linkedin_handle: `/in/${slug}` } };
}

export async function readTeamEvent(): Promise<TeamEventFile | null> {
  try {
    const file = JSON.parse(await readFile(TEAM_EVENT_PATH, "utf8")) as TeamEventFile;
    return file.version === CACHE_VERSION ? file : null;
  } catch {
    return null;
  }
}

/** The configured teammates, with real names wherever a profile is already cached. */
export async function teamEventEntries(urls = teamUrls()): Promise<{ entries: LumaEntry[]; cached: number }> {
  const cache = await readTeamEvent();
  const byId = new Map((cache?.entries ?? []).map((e) => [e.api_id, e]));
  const entries = urls.map((url) => byId.get(guestIdFor(url)) ?? stubEntry(url));
  const cached = urls.filter((url) => cache?.linkedin[guestIdFor(url)]).length;
  return { entries, cached };
}

/** Fetches every teammate not cached yet through Apify, then updates the cache. */
export async function enrichTeamEvent(
  urls = teamUrls(),
): Promise<{ entries: LumaEntry[]; failed: { url: string; error: string }[] }> {
  const cache: TeamEventFile = (await readTeamEvent()) ?? {
    version: CACHE_VERSION,
    event: { name: TEAM_EVENT_NAME },
    entries: [],
    linkedin: {},
  };
  const missing = urls.filter((url) => !cache.linkedin[guestIdFor(url)]);
  const results = await Promise.allSettled(missing.map((url) => fetchLinkedinProfile(url)));

  const failed: { url: string; error: string }[] = [];
  results.forEach((result, i) => {
    const url = missing[i];
    if (result.status === "rejected") {
      failed.push({ url, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
      return;
    }
    const id = guestIdFor(url);
    const { name, headline } = nameAndHeadline(result.value, nameFromSlug(slugOf(url)));
    cache.entries = cache.entries.filter((e) => e.api_id !== id);
    cache.entries.push({
      api_id: id,
      user: { api_id: id, name, bio_short: headline, avatar_url: photoUrl(result.value), linkedin_handle: `/in/${slugOf(url)}` },
    });
    cache.linkedin[id] = compactLinkedin(result.value);
  });

  if (results.some((r) => r.status === "fulfilled")) {
    await writeFile(TEAM_EVENT_PATH, JSON.stringify(cache, null, 2));
  }
  return { entries: (await teamEventEntries(urls)).entries, failed };
}

const NOISY_KEY = /photo|picture|image|logo|banner|avatar|url|urn|tracking|^id$|Id$|_id$|token|email|phone|address|birth/i;
const MAX_ARRAY = 6;
const MAX_STRING = 600;
const MAX_JSON = 6000;

/** Strips images, links, ids and contact details from a scraped profile and keeps it short. */
export function compactLinkedin(item: unknown): string {
  const clean = (v: unknown, depth: number): unknown => {
    if (typeof v === "string") return v.trim() ? v.trim().slice(0, MAX_STRING) : undefined;
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) {
      const items = v.slice(0, MAX_ARRAY).map((x) => clean(x, depth + 1)).filter((x) => x !== undefined);
      return items.length ? items : undefined;
    }
    if (v && typeof v === "object" && depth < 5) {
      const entries = Object.entries(v)
        .filter(([k]) => !NOISY_KEY.test(k))
        .map(([k, x]) => [k, clean(x, depth + 1)] as const)
        .filter(([, x]) => x !== undefined);
      return entries.length ? Object.fromEntries(entries) : undefined;
    }
    return undefined;
  };
  return JSON.stringify(clean(item, 0) ?? {}).slice(0, MAX_JSON);
}

const PHOTO_KEY = /photo|picture|avatar|image/i;
const isHttp = (v: unknown): v is string => typeof v === "string" && /^https:\/\//.test(v);

/** The profile photo URL, whatever the actor calls it: a string, { url }, or a list of sizes. */
export function photoUrl(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const pick = (v: unknown, depth: number): string | undefined => {
    if (isHttp(v)) return v;
    if (depth > 2 || !v || typeof v !== "object") return undefined;
    if (Array.isArray(v)) {
      // Lists of sizes: prefer one around 200-400px, else the first that works.
      const sized = v.find((x) => x && typeof x === "object" && Number((x as { width?: unknown }).width) >= 200);
      return pick(sized ?? v[0], depth + 1) ?? v.map((x) => pick(x, depth + 1)).find(Boolean);
    }
    const o = v as Record<string, unknown>;
    return pick(o.url, depth + 1) ?? Object.values(o).map((x) => pick(x, depth + 1)).find(Boolean);
  };
  for (const [key, value] of Object.entries(item)) {
    if (PHOTO_KEY.test(key) && !/background|banner|cover/i.test(key)) {
      const url = pick(value, 0);
      if (url) return url;
    }
  }
  return undefined;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Best-effort name and headline from a scraped profile, whatever the actor calls the fields. */
export function nameAndHeadline(item: unknown, fallbackName: string): { name: string; headline?: string } {
  const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const name =
    str([o.firstName, o.lastName].filter((x) => typeof x === "string").join(" ")) ??
    str(o.fullName) ??
    str(o.name) ??
    fallbackName;
  return { name, headline: str(o.headline) ?? str(o.occupation) ?? str(o.title) };
}
