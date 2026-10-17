import { apiBase } from "./api";
import type { Guest, LinkedinGuess } from "./types";

/** Asks the server to find LinkedIn profiles for guests who didn't connect one; returns the guests with any matches added. */
export async function addLinkedinGuesses(guests: Guest[]): Promise<{ guests: Guest[]; found: number }> {
  const res = await fetch(`${apiBase()}/api/find-linkedin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guests }),
  });
  const data = (await res.json().catch(() => ({}))) as { found?: Record<string, LinkedinGuess>; error?: string };
  if (!res.ok || !data.found) throw new Error(data.error ?? `LinkedIn search failed (HTTP ${res.status}).`);
  const found = data.found;
  return {
    guests: guests.map((g) => (found[g.id] ? { ...g, linkedinGuess: found[g.id] } : g)),
    found: Object.keys(found).length,
  };
}
