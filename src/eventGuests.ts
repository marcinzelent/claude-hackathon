import { enrichTeamEvent } from "./api";
import { addLinkedinGuesses } from "./linkedinGuess";
import { LumaError, type LumaApi } from "./luma/LumaBridge";
import { FEATURED_EVENT } from "./luma/featured";
import type { Guest, LumaEvent, Profile } from "./types";

/** Thrown when a Luma guest list needs the user to sign in first. */
export class NeedsLumaLogin extends Error {}

// Loads who is going to one event. Used by the event page's button and when the people page is opened directly.
// Our own event's guests are the teammates: their LinkedIn profiles come through Apify (cached on the server).
// On the web, a Luma guest list needs the user's personal ticket key (from their ?tk= ticket link) instead of a sign-in.
export async function loadEventGuests(
  event: LumaEvent,
  profile: Profile,
  luma: LumaApi,
  onStatus: (status: string) => void,
  ticketKey?: string,
): Promise<{ guests: Guest[]; warning?: string }> {
  if (event.slug === FEATURED_EVENT.slug) {
    onStatus("Fetching LinkedIn profiles through Apify, then Claude scores them. The first time takes up to a minute…");
    const team = await enrichTeamEvent();
    const others = team.guests.filter((g) => !profile.linkedinUrl || g.links.linkedin !== profile.linkedinUrl);
    const warning = team.failed?.length ? `Couldn't fetch ${team.failed.length} profile(s); ranking the rest.` : undefined;
    return { guests: others, warning };
  }
  if (!luma.available && !ticketKey) {
    throw new LumaError("On the web, paste your Luma ticket link (from your confirmation email) to see who's going.");
  }
  if (!ticketKey && !(await luma.isSignedIn())) throw new NeedsLumaLogin("Sign in to Luma to see who's going.");
  const guests = await luma.fetchGuests(event.id, (n) => onStatus(`Loaded ${n} guests…`), ticketKey);
  return { guests: await withLinkedinGuesses(guests, onStatus) };
}

// Demo event only: guests with a full name but no LinkedIn link get a "possible LinkedIn" found by search
// (web search, Apify, Claude's check), so the ranking can read their profile too. Failing quietly keeps the list.
async function withLinkedinGuesses(guests: Guest[], onStatus: (status: string) => void): Promise<Guest[]> {
  if (!guests.some((g) => !g.links.linkedin)) return guests;
  onStatus("Looking for LinkedIn profiles of guests who didn't link one…");
  try {
    return (await addLinkedinGuesses(guests)).guests;
  } catch {
    return guests;
  }
}
