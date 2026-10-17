import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EVENTS_SYSTEM_PROMPT, eventsUserPrompt } from "../../prompts/events";
import { citySlug } from "../../src/luma/normalize";
import { MISSING_KEY, claudeClient, claudeFailure, fail } from "../../src/server/claude";
import { cityEvents } from "../../src/server/luma";
import type { EventPick, Profile } from "../../src/types";

// POST { profile } -> { city, events, picks }: public Luma events in the user's city,
// with Claude's picks for their job goal. No sign-in involved; nothing is stored.

const MAX_PICKS = 8;
const CACHE_MS = 10 * 60 * 1000;

const PicksSchema = z.object({
  picks: z.array(z.object({ id: z.string(), score: z.number(), why: z.string() })),
});

const pickCache = new Map<string, { at: number; picks: EventPick[] }>();

export async function POST(request: Request): Promise<Response> {
  const client = claudeClient();
  if (!client) return fail(500, MISSING_KEY);

  const { profile } = (await request.json().catch(() => ({}))) as { profile?: Profile };
  if (!profile?.goal) return fail(400, "Tell us your goal first.");

  const city = profile.city?.trim() || "Berlin";
  const slug = citySlug(city);
  const events = await cityEvents(slug);
  if (!events) return fail(404, `Luma has no event list for "${city}". Try a bigger city nearby.`);
  if (events.length === 0) return Response.json({ city, events, picks: [] });

  const pickKey = JSON.stringify([slug, profile.goal.trim(), profile.background.trim()]);
  const cached = pickCache.get(pickKey);
  if (cached && Date.now() - cached.at < CACHE_MS) return Response.json({ city, events, picks: cached.picks });

  const slim = events.map((e) => ({ id: e.id, name: e.name, host: e.hostName, date: e.startAt, guests: e.guestCount }));

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
      return fail(502, "Claude could not pick events right now. Try again.");
    }

    const known = new Set(events.map((e) => e.id));
    const picks: EventPick[] = response.parsed_output.picks
      .filter((p) => known.has(p.id))
      .map((p) => ({ ...p, score: Math.max(0, Math.min(100, Math.round(p.score))) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PICKS);
    pickCache.set(pickKey, { at: Date.now(), picks });
    return Response.json({ city, events, picks });
  } catch (error) {
    return claudeFailure(error, "Couldn't pick events. Try again.");
  }
}
