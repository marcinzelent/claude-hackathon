import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Guest, Match, Profile } from "../types";

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
