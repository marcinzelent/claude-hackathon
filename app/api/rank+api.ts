import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { RANK_SYSTEM_PROMPT, rankUserPrompt } from "../../prompts/rank";
import type { Guest, Profile } from "../../src/types";

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
    }),
  ),
});

let client: Anthropic | null = null;

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

  // Only the public profile fields Claude needs; nothing is stored.
  const slim = guests.slice(0, MAX_GUESTS).map((g) => ({
    id: g.id,
    name: g.name,
    bio: g.bio,
    links: Object.keys(g.links ?? {}),
  }));

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(MatchesSchema) },
      system: RANK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: rankUserPrompt(profile, slim) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Claude could not rank this list. Try again." }, { status: 502 });
    }
    const matches = response.parsed_output.matches.map((m) => ({
      ...m,
      score: Math.max(0, Math.min(100, Math.round(m.score))),
    }));
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
