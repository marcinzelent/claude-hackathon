import { LUMA_API_BASE, MAX_EVENT_PAGES, MAX_GUEST_PAGES, lumaPaths } from "./config";
import { findEventApiId, parseEventLink, parseEventsPage, parseGuestPage } from "./normalize";
import type { Guest, LumaEvent } from "../types";

/*
 * Everything the app knows about Luma's API lives here. The client never talks
 * to the network itself: it gets a transport. On the phone that's the hidden
 * WebView on luma.com (so requests carry the user's own Luma cookies); in tests
 * it's a fake.
 */

export type LumaResponse = { status: number; body: string };
export type LumaTransport = (url: string) => Promise<LumaResponse>;

export type LumaErrorKind = "invalid-link" | "not-signed-in" | "not-found" | "hidden" | "unreachable";

const messages: Record<LumaErrorKind, string> = {
  "invalid-link": "Paste a Luma event link, like luma.com/my-event.",
  "not-signed-in": "Connect your Luma account first, or paste the personal ticket link from your confirmation email.",
  "not-found": "Could not find that event on Luma.",
  hidden: "No guests visible. The host may have hidden the guest list.",
  unreachable: "Could not reach Luma. Check your connection and try again.",
};

export class LumaError extends Error {
  constructor(
    readonly kind: LumaErrorKind,
    message = messages[kind],
  ) {
    super(message);
  }
}

export type LumaClient = {
  isSignedIn: () => Promise<boolean>;
  listMyEvents: () => Promise<LumaEvent[]>;
  fetchGuests: (linkOrSlug: string, onProgress?: (count: number) => void) => Promise<Guest[]>;
};

export function createLumaClient(transport: LumaTransport, now: () => Date = () => new Date()): LumaClient {
  const getJson = async (path: string): Promise<unknown> => {
    let res: LumaResponse;
    try {
      res = await transport(LUMA_API_BASE + path);
    } catch (e) {
      if (e instanceof LumaError) throw e;
      throw new LumaError("unreachable");
    }
    if (res.status === 401 || res.status === 403) throw new LumaError("not-signed-in");
    if (res.status === 404) throw new LumaError("not-found");
    if (res.status < 200 || res.status >= 300) throw new LumaError("unreachable");
    try {
      return JSON.parse(res.body);
    } catch {
      throw new LumaError("unreachable");
    }
  };

  return {
    isSignedIn: async () => {
      try {
        await getJson(lumaPaths.myEvents());
        return true;
      } catch (e) {
        if (e instanceof LumaError && e.kind === "not-signed-in") return false;
        throw e;
      }
    },

    listMyEvents: async () => {
      const events: (LumaEvent & { endAt?: string })[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_EVENT_PAGES; page++) {
        const { events: batch, nextCursor } = parseEventsPage(await getJson(lumaPaths.myEvents(cursor)));
        events.push(...batch);
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      const t = now().getTime();
      return events
        .filter((e) => Date.parse(e.endAt ?? e.startAt) >= t)
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
        .map(({ endAt: _endAt, ...event }) => event);
    },

    fetchGuests: async (linkOrSlug, onProgress) => {
      const link = parseEventLink(linkOrSlug);
      if (!link) throw new LumaError("invalid-link");
      const eventId = findEventApiId(await getJson(lumaPaths.resolveSlug(link.slug)));
      if (!eventId) throw new LumaError("not-found");

      const guests: Guest[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_GUEST_PAGES; page++) {
        const payload = await getJson(lumaPaths.guestList(eventId, { cursor, ticketKey: link.ticketKey }));
        const { guests: batch, nextCursor } = parseGuestPage(payload);
        guests.push(...batch);
        onProgress?.(guests.length);
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      if (guests.length === 0) throw new LumaError("hidden");
      return guests;
    },
  };
}
