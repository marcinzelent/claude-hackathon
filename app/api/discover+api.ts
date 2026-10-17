import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EVENTS_SYSTEM_PROMPT, eventsUserPrompt } from "../../prompts/events";
import { citySlug } from "../../src/luma/normalize";
import { MINUTE, cacheKey, serverCache } from "../../src/server/cache";
import { MISSING_KEY, MODEL, claudeClient, claudeFailure, fail } from "../../src/server/claude";
import { cityEvents } from "../../src/server/luma";
import type { EventPick, Profile } from "../../src/types";

// POST { profile } -> { city, events, picks }: public Luma events in the user's city,
// with Claude's picks for their job goal. No sign-in involved; answers stay in server memory for a few minutes.

const MAX_PICKS = 8;

const PicksSchema = z.object({
  picks: z.array(z.object({ id: z.string(), score: z.number(), why: z.string() })),
});

// The same goal in the same city gets the same picks for 10 minutes.
const pickCache = serverCache<EventPick[] | null>("eventPicks", 10 * MINUTE);

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

  const slim = events.map((e) => ({ id: e.id, name: e.name, host: e.hostName, date: e.startAt, guests: e.guestCount }));

  const key = cacheKey(slug, profile.goal.trim(), profile.background.trim());
  const ask = async (): Promise<EventPick[] | null> => {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(PicksSchema) },
      system: EVENTS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: eventsUserPrompt(profile, slim) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;

    const known = new Set(events.map((e) => e.id));
    return response.parsed_output.picks
      .filter((p) => known.has(p.id))
      .map((p) => ({ ...p, score: Math.max(0, Math.min(100, Math.round(p.score))) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PICKS);
  };

  try {
    const picks = await pickCache.get(key, ask, (v) => v !== null);
    if (!picks) return fail(502, "Claude could not pick events right now. Try again.");
    return Response.json({ city, events, picks });
  } catch (error) {
    return claudeFailure(error, "Couldn't pick events. Try again.");
  }
}
