import type { Guest, GuestLinks, LumaEvent } from "../types";

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** Pulls the event slug out of anything the user pastes: a full URL, lu.ma link or bare slug. */
export function parseEventSlug(input: string): string | null {
  return parseEventLink(input)?.slug ?? null;
}

/**
 * Like parseEventSlug, but also keeps the personal ticket key (`tk`) from a
 * ticket link, which unlocks the guest list without a Luma sign-in.
 */
export function parseEventLink(input: string): { slug: string; ticketKey?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const [beforeHash] = trimmed.split("#");
  const [path, query = ""] = beforeHash.split("?");
  const withoutSlash = path.replace(/\/+$/, "");
  const match = withoutSlash.match(/^(?:https?:\/\/)?(?:www\.)?(?:luma\.com|lu\.ma)\/(.+)$/i);
  const slug = match ? match[1] : withoutSlash;
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
  const ticketKey = str(new URLSearchParams(query).get("tk"));
  return ticketKey ? { slug, ticketKey } : { slug };
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

// YouTube handles are "@name"; older ones are paths like "channel/UC…".
function youtubeUrl(handle: string | undefined): string | undefined {
  if (!handle || /^https?:\/\//i.test(handle)) return handle;
  const path = handle.replace(/^\/+/, "");
  return "https://www.youtube.com/" + (path.includes("/") ? path : "@" + path.replace(/^@/, ""));
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
    tiktok: handleUrl("https://www.tiktok.com/@", str(u.tiktok_handle)),
    youtube: youtubeUrl(str(u.youtube_handle)),
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

/** Reads one page of "your upcoming events", keeping only events whose guest list you can see. */
export function parseEventsPage(payload: unknown): { events: (LumaEvent & { endAt?: string })[]; nextCursor?: string } {
  if (!isObj(payload) || !Array.isArray(payload.entries)) return { events: [] };
  const events = payload.entries.flatMap((entry) => {
    const e = isObj(entry) && isObj(entry.event) ? entry.event : null;
    if (!e || e.show_guest_list !== true) return [];
    const apiId = str(e.api_id);
    const name = str(e.name);
    const slug = str(e.url);
    const startAt = str(e.start_at);
    if (!apiId || !name || !slug || !startAt) return [];
    return [{ apiId, name, slug, startAt, timezone: str(e.timezone), endAt: str(e.end_at) }];
  });
  const nextCursor = payload.has_more ? str(payload.next_cursor) : undefined;
  return { events, nextCursor };
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
