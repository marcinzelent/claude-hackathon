import { enrichTeamEvent } from "./api";
import { LumaError, type LumaApi } from "./luma/LumaBridge";
import { FEATURED_EVENT } from "./luma/featured";
import type { Guest, LumaEvent, Profile } from "./types";

/** Thrown when a Luma guest list needs the user to sign in first. */
export class NeedsLumaLogin extends Error {}

// Loads who is going to one event. Used by the event page's button and when the people page is opened directly.
// Our own event's guests are the teammates: their LinkedIn profiles come through Apify (cached on the server).
export async function loadEventGuests(
  event: LumaEvent,
  profile: Profile,
  luma: LumaApi,
  onStatus: (status: string) => void,
): Promise<{ guests: Guest[]; warning?: string }> {
  if (event.slug === FEATURED_EVENT.slug) {
    onStatus("Fetching LinkedIn profiles through Apify, then Claude scores them. The first time takes up to a minute…");
    const team = await enrichTeamEvent();
    const others = team.guests.filter((g) => !profile.linkedinUrl || g.links.linkedin !== profile.linkedinUrl);
    const warning = team.failed?.length ? `Couldn't fetch ${team.failed.length} profile(s); ranking the rest.` : undefined;
    return { guests: others, warning };
  }
  if (!luma.available) {
    throw new LumaError("Loading a guest list needs the phone app (Expo Go). On web, use the sample event or paste the list.");
  }
  if (!(await luma.isSignedIn())) throw new NeedsLumaLogin("Sign in to Luma to see who's going.");
  const guests = await luma.fetchGuests(event.id, (n) => onStatus(`Loaded ${n} guests…`));
  return { guests };
}
