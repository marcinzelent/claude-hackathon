import { apiBase } from "../api";
import type { Guest, Match, Profile } from "../types";

export async function rankGuests(profile: Profile, guests: Guest[]): Promise<Match[]> {
  const res = await fetch(`${apiBase()}/api/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, guests }),
  });
  const data = (await res.json().catch(() => ({}))) as { matches?: Match[]; error?: string };
  if (!res.ok || !data.matches) throw new Error(data.error ?? `Ranking failed (HTTP ${res.status}).`);
  return data.matches;
}
