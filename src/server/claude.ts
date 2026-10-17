import Anthropic from "@anthropic-ai/sdk";

// Server-only: one Anthropic client and the error answers every Claude route shares.

let client: Anthropic | null = null;

export const fail = (status: number, error: string) => Response.json({ error }, { status });

export const MISSING_KEY = "Add ANTHROPIC_API_KEY to .env and restart the server.";

/** The shared client, or null when ANTHROPIC_API_KEY isn't set. */
export function claudeClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

/** Turns an SDK error into a friendly HTTP answer; `fallback` is shown for anything unexpected. */
export function claudeFailure(error: unknown, fallback: string): Response {
  if (error instanceof Anthropic.AuthenticationError) return fail(500, "The server's ANTHROPIC_API_KEY is invalid.");
  if (error instanceof Anthropic.RateLimitError) return fail(429, "Claude is busy right now. Try again in a minute.");
  console.error(fallback, error);
  return fail(500, fallback);
}
