import { parseLinkedinProfileUrl } from "../linkedinUrl";
import type { Guest, LinkedinGuess } from "../types";

// Finds LinkedIn profiles for guests who didn't connect one on Luma:
// a web search suggests candidates, Apify loads each one, and only a profile whose name matches
// and that Claude confirms against the Luma bio counts. The result is always a "possible match".
// The steps are injected so this file has no Claude or Apify code and can be tested with fakes.

export type FinderSteps = {
  /** Candidate LinkedIn links for this guest, best first. */
  search: (guest: Guest) => Promise<string[]>;
  /** The LinkedIn profile behind a link (Apify). */
  fetchProfile: (url: string) => Promise<unknown>;
  /** Whether the profile is this guest, and why. */
  judge: (guest: Guest, profile: unknown) => Promise<{ match: boolean; reason: string }>;
};

/** Candidates checked per guest; each costs one Apify run. */
export const MAX_CANDIDATES = 2;
/** Guests looked up per request; each costs a web search and up to MAX_CANDIDATES Apify runs. */
export const MAX_LOOKUPS = 10;
const CONCURRENCY = 3;

/** Only guests without a LinkedIn link and with at least a first and last name are worth a search. */
export function needsLookup(guest: Guest): boolean {
  return !guest.links.linkedin && nameTokens(guest.name).length >= 2;
}

/** Lowercase name parts with umlauts spelled out and accents dropped, so "Sören" and "Soeren" agree. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/** True when the profile's name has the guest's first and last name. */
export function namesMatch(lumaName: string, profileName: string | undefined): boolean {
  if (!profileName) return false;
  const want = nameTokens(lumaName);
  const have = new Set(nameTokens(profileName));
  return want.length >= 2 && have.has(want[0]) && have.has(want[want.length - 1]);
}

/** The person's name from a scraped LinkedIn profile, whichever field the scraper used. */
export function profileName(profile: unknown): string | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const p = profile as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const joined = [str(p.firstName), str(p.lastName)].filter(Boolean).join(" ");
  return str(joined) ?? str(p.fullName) ?? str(p.name);
}

/** The first candidate that has the guest's name and that the judge confirms, or null. */
export async function findLinkedin(guest: Guest, steps: FinderSteps): Promise<LinkedinGuess | null> {
  const urls = [...new Set((await steps.search(guest)).map(parseLinkedinProfileUrl))]
    .filter((u): u is string => u !== null)
    .slice(0, MAX_CANDIDATES);

  for (const url of urls) {
    let profile: unknown;
    try {
      profile = await steps.fetchProfile(url);
    } catch {
      continue;
    }
    if (!namesMatch(guest.name, profileName(profile))) continue;
    const verdict = await steps.judge(guest, profile);
    if (verdict.match) return { url, reason: verdict.reason };
  }
  return null;
}

/** Runs `lookup` (usually a cached findLinkedin) for up to MAX_LOOKUPS guests, a few at a time. A failed lookup finds nothing. */
export async function findLinkedins(
  guests: Guest[],
  lookup: (guest: Guest) => Promise<LinkedinGuess | null>,
): Promise<{ found: Record<string, LinkedinGuess>; checked: number }> {
  const todo = guests.filter(needsLookup).slice(0, MAX_LOOKUPS);
  const found: Record<string, LinkedinGuess> = {};
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const guest = todo[next++];
      const guess = await lookup(guest).catch(() => null);
      if (guess) found[guest.id] = guess;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  return { found, checked: todo.length };
}
