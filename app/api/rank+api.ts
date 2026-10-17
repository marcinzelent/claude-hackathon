import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { RANK_SYSTEM_PROMPT, rankUserPrompt } from "../../prompts/rank";
import { MINUTE, cacheKey, serverCache } from "../../src/server/cache";
import { fetchLinkedinProfile } from "../../src/server/apify";
import { MODEL } from "../../src/server/claude";
import { compactLinkedin, readTeamEvent } from "../../src/server/teamEvent";
import type { Guest, Match, Profile } from "../../src/types";

// Runs on the Expo dev/server, never on the phone, so the API key stays in .env.

const MAX_GUESTS = 150;

const MatchesSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      why: z.string(),
      opener: z.string(),
      learn: z.string(),
      terms: z.array(z.object({ term: z.string(), meaning: z.string() })),
    }),
  ),
});

let client: Anthropic | null = null;

// Opening the same event again with the same profile reuses the ranking for an hour.
const rankCache = serverCache<Match[] | null>("rank", 60 * MINUTE);

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Add ANTHROPIC_API_KEY to .env and restart the server." }, { status: 500 });
  }
  client ??= new Anthropic();

  let body: { profile?: Profile; guests?: Guest[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { profile, guests } = body;
  if (!profile?.goal || !Array.isArray(guests) || guests.length === 0) {
    return Response.json({ error: "Tell us your goal and load some guests first." }, { status: 400 });
  }

  // Only the public profile fields Claude needs; the ranking stays in server memory for an hour, never on disk.
  // Teammates in the demo event also get their (consented) LinkedIn profile, kept server-side.
  // A guest whose LinkedIn was found by search (demo event only) is already in Apify's one-hour cache after that search,
  // so reading it here costs nothing; a miss is skipped rather than failing the ranking.
  const linkedin = { ...((await readTeamEvent())?.linkedin ?? {}) };
  await Promise.all(
    guests.slice(0, MAX_GUESTS).map(async (g) => {
      if (!g.linkedinGuess?.url || linkedin[g.id]) return;
      try {
        linkedin[g.id] = compactLinkedin(await fetchLinkedinProfile(g.linkedinGuess.url));
      } catch {
        // No profile for this guest; Claude ranks them from their Luma details.
      }
    }),
  );
  const slim = guests.slice(0, MAX_GUESTS).map((g) => ({
    id: g.id,
    name: g.name,
    bio: g.bio,
    links: Object.keys(g.links ?? {}),
    ...(linkedin[g.id] ? { linkedin: linkedin[g.id] } : {}),
  }));

  const ask = async (anthropic: Anthropic): Promise<Match[] | null> => {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(MatchesSchema) },
      system: RANK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: rankUserPrompt(profile, slim) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    return response.parsed_output.matches.map((m) => ({
      ...m,
      score: Math.max(0, Math.min(100, Math.round(m.score))),
    }));
  };

  try {
    const anthropic = client;
    const key = cacheKey(RANK_SYSTEM_PROMPT, profile.goal.trim(), profile.background?.trim(), slim);
    const matches = await rankCache.get(key, () => ask(anthropic), (v) => v !== null);
    if (!matches) return Response.json({ error: "Claude could not rank this list. Try again." }, { status: 502 });
    return Response.json({ matches });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "The server's ANTHROPIC_API_KEY is missing or invalid." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Claude is busy right now. Try again in a minute." }, { status: 429 });
    }
    console.error("rank failed", error);
    return Response.json({ error: "Ranking failed. Try again." }, { status: 500 });
  }
}
