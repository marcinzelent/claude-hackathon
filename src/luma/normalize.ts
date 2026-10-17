import type { Guest, GuestLinks, LumaEvent } from "../types";

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Pulls the event slug out of anything the user pastes: a full URL, lu.ma link or bare slug. */
export function parseEventSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withoutQuery = trimmed.split(/[?#]/)[0].replace(/\/+$/, "");
  const match = withoutQuery.match(/^(?:https?:\/\/)?(?:www\.)?(?:luma\.com|lu\.ma)\/(.+)$/i);
  const slug = match ? match[1] : withoutQuery;
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
  return slug;
}

/** Finds the first "evt-..." id anywhere in a Luma response, whatever its shape. */
export function findEventApiId(payload: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (v: unknown): string | null => {
    if (typeof v === "string") return /^evt-[A-Za-z0-9]+$/.test(v) ? v : null;
    if (!v || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    if (isObj(v) && typeof v.api_id === "string" && v.api_id.startsWith("evt-")) return v.api_id;
    for (const child of Object.values(v as Json)) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };
  return walk(payload);
}

function handleUrl(base: string, handle: string | undefined): string | undefined {
  if (!handle) return undefined;
  if (/^https?:\/\//i.test(handle)) return handle;
  return base + handle.replace(/^@/, "").replace(/^\/+/, "");
}

/** Converts one guest-list entry (user nested under user/guest, or flat) into a Guest. */
export function normalizeGuest(entry: unknown): Guest | null {
  if (!isObj(entry)) return null;
  const u = isObj(entry.user) ? entry.user : isObj(entry.guest) ? entry.guest : entry;

  const name =
    str(u.name) ??
    str([u.first_name, u.last_name].filter((p) => typeof p === "string").join(" ")) ??
    str(u.username);
  const id = str(u.api_id) ?? str(entry.api_id) ?? str(u.username) ?? name;
  if (!id || !name) return null;

  const linkedinHandle = str(u.linkedin_handle);
  const links: GuestLinks = {
    linkedin: linkedinHandle
      ? handleUrl("https://www.linkedin.com/", linkedinHandle.startsWith("/") ? linkedinHandle : `in/${linkedinHandle}`)
      : undefined,
    twitter: handleUrl("https://x.com/", str(u.twitter_handle)),
    instagram: handleUrl("https://instagram.com/", str(u.instagram_handle)),
    website: str(u.website),
  };

  const username = str(u.username);
  return {
    id,
    name,
    username,
    bio: str(u.bio_short) ?? str(u.bio),
    avatarUrl: str(u.avatar_url),
    lumaUrl: username ? `https://luma.com/user/${username}` : str(u.api_id) ? `https://luma.com/user/${u.api_id}` : undefined,
    links: Object.fromEntries(Object.entries(links).filter(([, v]) => v)) as GuestLinks,
  };
}

/** Reads one page of a guest-list response. */
export function parseGuestPage(payload: unknown): { guests: Guest[]; nextCursor?: string } {
  if (!isObj(payload)) return { guests: [] };
  const list = Array.isArray(payload.entries)
    ? payload.entries
    : Array.isArray(payload.guests)
      ? payload.guests
      : [];
  const guests = list.map(normalizeGuest).filter((g): g is Guest => g !== null);
  const nextCursor = payload.has_more ? str(payload.next_cursor) : undefined;
  return { guests, nextCursor };
}

/** Converts an event object (or a wrapper holding one under `event`) into a LumaEvent. */
export function normalizeEvent(entry: unknown, guestCount?: unknown): LumaEvent | null {
  if (!isObj(entry)) return null;
  const e = isObj(entry.event) ? entry.event : entry;
  const id = str(e.api_id);
  const name = str(e.name);
  if (!id?.startsWith("evt-") || !name) return null;
  const count = typeof guestCount === "number" ? guestCount : entry.guest_count;
  const geo = isObj(e.geo_address_info) ? e.geo_address_info : {};
  const calendar = isObj(entry.calendar) ? entry.calendar : {};
  const event: LumaEvent = {
    id,
    slug: str(e.url) ?? id,
    name,
    startAt: str(e.start_at),
    endAt: str(e.end_at),
    city: str(geo.city),
    hostName: str(calendar.name),
    coverUrl: str(e.cover_url),
    guestCount: typeof count === "number" ? count : undefined,
    address: str(geo.full_address) ?? str(geo.address),
  };
  // Drop empty optional fields so merged events don't overwrite real values with undefined.
  return Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined)) as LumaEvent;
}

/** Reads one page of the signed-in user's events (/home/get-events). */
export function parseEventPage(payload: unknown): { events: LumaEvent[]; nextCursor?: string } {
  if (!isObj(payload)) return { events: [] };
  const list = Array.isArray(payload.entries) ? payload.entries : Array.isArray(payload.events) ? payload.events : [];
  const events = list.map((entry) => normalizeEvent(entry)).filter((e): e is LumaEvent => e !== null);
  const nextCursor = payload.has_more ? str(payload.next_cursor) : undefined;
  return { events, nextCursor };
}

/** Reads the public /url?url=<slug> response for one event. */
export function parseEventLookup(payload: unknown): LumaEvent | null {
  if (!isObj(payload) || payload.kind !== "event" || !isObj(payload.data)) return null;
  const event = normalizeEvent(payload.data, payload.data.guest_count);
  if (!event) return null;
  const hosts = (Array.isArray(payload.data.hosts) ? payload.data.hosts : [])
    .map((h) => (isObj(h) ? str(h.name) : undefined))
    .filter((n): n is string => !!n);
  const description = str(mirrorToText(payload.data.description_mirror));
  return { ...event, ...(hosts.length && { hosts }), ...(description && { description }) };
}

/** Flattens Luma's rich-text description (a ProseMirror doc) into plain text with blank lines between blocks. */
export function mirrorToText(node: unknown): string {
  const walk = (n: unknown): string => {
    if (!isObj(n)) return "";
    if (n.type === "text") return typeof n.text === "string" ? n.text : "";
    if (n.type === "hard_break") return "\n";
    const inner = (Array.isArray(n.content) ? n.content : []).map(walk).join("");
    if (n.type === "list_item") return `• ${inner.trim()}\n`;
    if (n.type === "paragraph" || n.type === "heading") return `${inner}\n\n`;
    return n.type === "bullet_list" || n.type === "ordered_list" ? `${inner}\n` : inner;
  };
  return walk(node).replace(/\n{3,}/g, "\n\n").trim();
}

/** Reads the discover-place id ("discplace-...") from a /url?url=<city> response. */
export function parseDiscoverPlace(payload: unknown): string | null {
  if (!isObj(payload) || payload.kind !== "discover-place" || !isObj(payload.data)) return null;
  const place = isObj(payload.data.place) ? payload.data.place : {};
  return str(place.api_id) ?? null;
}

/** Turns a city name into Luma's discover slug: "Berlin" -> "berlin", "New York" -> "new-york". */
export const citySlug = (city: string) =>
  city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Merges event lists, dropping duplicates and sorting by start time (soonest first). */
export function mergeEvents(...lists: LumaEvent[][]): LumaEvent[] {
  const byId = new Map<string, LumaEvent>();
  for (const e of lists.flat()) byId.set(e.id, { ...byId.get(e.id), ...e });
  return [...byId.values()].sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));
}

/**
 * Fallback when Luma is unreachable: accepts pasted JSON (a page, an array,
 * or JSONL) or plain text with one name per line.
 */
export function parsePastedGuests(text: string): Guest[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(normalizeGuest).filter((g): g is Guest => g !== null);
    return parseGuestPage(parsed).guests;
  } catch {
    // not a single JSON document
  }
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.every((l) => l.startsWith("{"))) {
    return lines
      .map((l) => {
        try {
          return normalizeGuest(JSON.parse(l));
        } catch {
          return null;
        }
      })
      .filter((g): g is Guest => g !== null);
  }
  const names = lines.filter((l) => !/^profile picture for/i.test(l));
  return [...new Set(names)].map((name) => ({ id: name, name, links: {} }));
}

export const toJsonl = (rows: unknown[]) => rows.map((r) => JSON.stringify(r)).join("\n");
