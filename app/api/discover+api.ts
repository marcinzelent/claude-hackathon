import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EVENTS_SYSTEM_PROMPT, eventsUserPrompt } from "../../prompts/events";
import { LUMA_API_BASES, lumaPaths } from "../../src/luma/config";
import { citySlug, parseDiscoverPlace, parseEventPage } from "../../src/luma/normalize";
import type { EventPick, LumaEvent, Profile } from "../../src/types";

// Suggests public Luma events in the user's city that fit their job goal.
// Luma's discover list is public, so no sign-in is involved. Runs on the server, so the API key stays in .env.

const MAX_PAGES = 2;
const CACHE_MS = 10 * 60 * 1000;

const PicksSchema = z.object({
  picks: z.array(z.object({ id: z.string(), score: z.number(), why: z.string() })),
});

let client: Anthropic | null = null;
const eventCache = new Map<string, { at: number; events: LumaEvent[] }>();
const pickCache = new Map<string, { at: number; picks: EventPick[] }>();

async function lumaJson(path: string): Promise<unknown> {
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

async function cityEvents(slug: string): Promise<LumaEvent[] | null> {
  const cached = eventCache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.events;

  const placeId = parseDiscoverPlace(await lumaJson(lumaPaths.resolveSlug(slug)));
  if (!placeId) return null;

  const events: LumaEvent[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { events: batch, nextCursor } = parseEventPage(await lumaJson(lumaPaths.discover(placeId, cursor)));
    events.push(...batch);
    if (!nextCursor || batch.length === 0) break;
    cursor = nextCursor;
  }
  // Only events that haven't ended yet.
  const now = new Date().toISOString();
  const upcoming = events.filter((e) => (e.endAt ?? e.startAt ?? now) >= now);
  eventCache.set(slug, { at: Date.now(), events: upcoming });
  return upcoming;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Add ANTHROPIC_API_KEY to .env and restart the server." }, { status: 500 });
  }
  client ??= new Anthropic();

  let profile: Profile | undefined;
  try {
    ({ profile } = (await request.json()) as { profile?: Profile });
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!profile?.goal) {
    return Response.json({ error: "Tell us your goal first." }, { status: 400 });
  }

  const city = profile.city?.trim() || "Berlin";
  const slug = citySlug(city);
  const events = await cityEvents(slug);
  if (!events) {
    return Response.json({ error: `Luma has no event list for "${city}". Try a bigger city nearby.` }, { status: 404 });
  }
  if (events.length === 0) return Response.json({ city, events: [], picks: [] });

  const pickKey = JSON.stringify([slug, profile.goal.trim(), profile.background.trim()]);
  const cachedPicks = pickCache.get(pickKey);
  if (cachedPicks && Date.now() - cachedPicks.at < CACHE_MS) {
    return Response.json({ city, events, picks: cachedPicks.picks });
  }

  const slim = events.map((e) => ({
    id: e.id,
    name: e.name,
    host: e.hostName,
    date: e.startAt,
    guests: e.guestCount,
  }));

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(PicksSchema) },
      system: EVENTS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: eventsUserPrompt(profile, slim) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Claude could not pick events right now. Try again." }, { status: 502 });
    }
    const known = new Set(events.map((e) => e.id));
    const picks: EventPick[] = response.parsed_output.picks
      .filter((p) => known.has(p.id))
      .map((p) => ({ ...p, score: Math.max(0, Math.min(100, Math.round(p.score))) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    pickCache.set(pickKey, { at: Date.now(), picks });
    return Response.json({ city, events, picks });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "The server's ANTHROPIC_API_KEY is missing or invalid." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Claude is busy right now. Try again in a minute." }, { status: 429 });
    }
    console.error("discover failed", error);
    return Response.json({ error: "Couldn't pick events. Try again." }, { status: 500 });
  }
}
