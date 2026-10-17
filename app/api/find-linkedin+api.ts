import { MINUTE, cacheKey, serverCache } from "../../src/server/cache";
import { MISSING_KEY, claudeClient, claudeFailure, fail } from "../../src/server/claude";
import { findLinkedin, findLinkedins } from "../../src/server/findLinkedin";
import { linkedinSteps } from "../../src/server/linkedinSteps";
import type { Guest, LinkedinGuess } from "../../src/types";

// POST { guests } -> { found: { [guestId]: { url, reason } }, checked }.
// For guests who didn't connect LinkedIn on Luma: web search, Apify, and Claude's check (src/server/findLinkedin.ts).
// Built for the demo event, where every guest is a teammate who agreed. Results stay in server memory for an hour.

const guessCache = serverCache<LinkedinGuess | null>("linkedin-guess-v4", 60 * MINUTE);

export async function POST(request: Request): Promise<Response> {
  const client = claudeClient();
  if (!client) return fail(500, MISSING_KEY);
  if (!process.env.APIFY_TOKEN) return fail(500, "Add APIFY_TOKEN to .env and restart the server.");

  const body = (await request.json().catch(() => ({}))) as { guests?: unknown };
  if (!Array.isArray(body.guests)) return fail(400, "Load a guest list first.");

  const steps = { ...linkedinSteps(client), log: (line: string) => console.info("find-linkedin:", line) };
  try {
    // The same guest is searched at most once an hour, whichever request asks.
    const result = await findLinkedins(body.guests as Guest[], (guest) =>
      guessCache.get(cacheKey(guest.name, guest.bio, guest.username), () => findLinkedin(guest, steps)),
    );
    return Response.json(result);
  } catch (error) {
    return claudeFailure(error, "Finding LinkedIn profiles failed. Try again.");
  }
}
