import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LumaEvent } from "../types";

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
