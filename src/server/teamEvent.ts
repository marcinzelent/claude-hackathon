import { readFile } from "node:fs/promises";
import path from "node:path";

// The team's own demo event: teammates who agreed to be guests, "ingested from Luma"
// and enriched once with their LinkedIn profiles by `npm run enrich`.
// The file is git-ignored; raw LinkedIn data stays on the server and only goes to Claude.

export const TEAM_EVENT_PATH = path.join(process.cwd(), "data", "team-event.json");

export type TeamEventFile = {
  event: { name: string };
  /** Luma guest-list shape, so the app reads it like a real Luma import. */
  entries: { api_id: string; user: Record<string, unknown> }[];
  /** Compact LinkedIn profile per guest id, for Claude's ranking only. */
  linkedin: Record<string, string>;
};

export async function readTeamEvent(): Promise<TeamEventFile | null> {
  try {
    return JSON.parse(await readFile(TEAM_EVENT_PATH, "utf8")) as TeamEventFile;
  } catch {
    return null;
  }
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

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Best-effort name and headline from a scraped profile, whatever the actor calls the fields. */
export function nameAndHeadline(item: unknown, fallbackSlug: string): { name: string; headline?: string } {
  const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const name =
    str([o.firstName, o.lastName].filter((x) => typeof x === "string").join(" ")) ??
    str(o.fullName) ??
    str(o.name) ??
    fallbackSlug;
  return { name, headline: str(o.headline) ?? str(o.occupation) ?? str(o.title) };
}
