import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Guest, Match, Profile } from "./types";

// On web the API route is same-origin. On a phone (Expo Go) it lives on the
// dev server that served the app, unless EXPO_PUBLIC_API_URL says otherwise.
export function apiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  if (Platform.OS === "web") return "";
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : "";
}

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

export type ImportedProfile = Profile & { tip: string | null };

/** Sends a picked PDF to the server; Claude reads it and returns goal + background. */
export async function importCv(file: { uri: string; name: string; mimeType?: string; file?: File }): Promise<ImportedProfile> {
  const form = new FormData();
  if (file.file) {
    form.append("file", file.file); // web gives us a real File
  } else {
    // React Native's FormData accepts { uri, name, type } for files on disk.
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/pdf" } as unknown as Blob);
  }
  const res = await fetch(`${apiBase()}/api/profile`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as Partial<ImportedProfile> & { error?: string };
  if (!res.ok || !data.goal) throw new Error(data.error ?? `Import failed (HTTP ${res.status}).`);
  return { goal: data.goal, background: data.background ?? "", tip: data.tip ?? null };
}

/** Imports the user's own LinkedIn profile by link (server fetches it via Apify, Claude summarises it). */
export async function importLinkedin(url: string): Promise<ImportedProfile> {
  const res = await fetch(`${apiBase()}/api/linkedin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ImportedProfile> & { error?: string };
  if (!res.ok || !data.goal) throw new Error(data.error ?? `Import failed (HTTP ${res.status}).`);
  return { goal: data.goal, background: data.background ?? "", tip: data.tip ?? null };
}

export type TeamEvent = {
  name: string;
  guests: Guest[];
  enriched?: number; // how many profiles are already cached
  failed?: { url: string; error: string }[];
};

/** The team's demo event guest list, or null if this server has none configured. */
export async function fetchTeamEvent(): Promise<TeamEvent | null> {
  try {
    const res = await fetch(`${apiBase()}/api/team-event`);
    if (!res.ok) return null;
    return (await res.json()) as TeamEvent;
  } catch {
    return null;
  }
}

/** Fetches teammates' LinkedIn profiles through Apify (server-side, cached) and returns the enriched list. */
export async function enrichTeamEvent(): Promise<TeamEvent> {
  const res = await fetch(`${apiBase()}/api/team-event`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as Partial<TeamEvent> & { error?: string };
  if (!res.ok || !data.guests) throw new Error(data.error ?? `LinkedIn fetch failed (HTTP ${res.status}).`);
  return data as TeamEvent;
}
