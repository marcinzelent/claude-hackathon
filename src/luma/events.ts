import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiBase } from "../rank/client";
import type { EventPick, LumaEvent, Profile } from "../types";

// Events the user added by link. Only public event details are saved on the device.
const LINKED_KEY = "roomradar.linkedEvents";

export async function loadLinkedEvents(): Promise<LumaEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(LINKED_KEY);
    return raw ? (JSON.parse(raw) as LumaEvent[]) : [];
  } catch {
    return [];
  }
}

export async function saveLinkedEvents(events: LumaEvent[]): Promise<void> {
  await AsyncStorage.setItem(LINKED_KEY, JSON.stringify(events)).catch(() => {});
}

export async function lookupEvent(link: string): Promise<LumaEvent> {
  const res = await fetch(`${apiBase()}/api/luma-event?link=${encodeURIComponent(link)}`);
  const data = (await res.json().catch(() => ({}))) as { event?: LumaEvent; error?: string };
  if (!res.ok || !data.event) throw new Error(data.error ?? `Lookup failed (HTTP ${res.status}).`);
  return data.event;
}

export type Discovery = { city: string; events: LumaEvent[]; picks: EventPick[] };

/** Public events in the user's city, with Claude's picks for their goal. */
export async function discoverEvents(profile: Profile): Promise<Discovery> {
  const res = await fetch(`${apiBase()}/api/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Discovery> & { error?: string };
  if (!res.ok || !data.picks || !data.events) throw new Error(data.error ?? `Event suggestions failed (HTTP ${res.status}).`);
  return { city: data.city ?? "", events: data.events, picks: data.picks };
}
