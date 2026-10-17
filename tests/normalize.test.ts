import { describe, expect, it } from "vitest";
import {
  citySlug,
  findEventApiId,
  mergeEvents,
  parseDiscoverPlace,
  normalizeEvent,
  normalizeGuest,
  parseEventLookup,
  parseEventPage,
  parseEventSlug,
  parseGuestPage,
  parsePastedGuests,
  toJsonl,
} from "../src/luma/normalize";
import { parseLinkedinProfileUrl } from "../src/linkedinUrl";

describe("parseEventSlug", () => {
  it("accepts full links, lu.ma links and bare slugs", () => {
    expect(parseEventSlug("https://luma.com/nebius-berlin-vip")).toBe("nebius-berlin-vip");
    expect(parseEventSlug("lu.ma/abc123?tk=x")).toBe("abc123");
    expect(parseEventSlug("  my-event/ ")).toBe("my-event");
  });
  it("rejects junk", () => {
    expect(parseEventSlug("")).toBeNull();
    expect(parseEventSlug("https://example.com/a/b")).toBeNull();
  });
});

describe("findEventApiId", () => {
  it("finds the id wherever it is nested", () => {
    expect(findEventApiId({ kind: "event", data: { event: { api_id: "evt-AbC123" } } })).toBe("evt-AbC123");
    expect(findEventApiId({ data: { x: ["usr-1", "evt-9"] } })).toBe("evt-9");
    expect(findEventApiId({ data: {} })).toBeNull();
  });
});

describe("normalizeGuest", () => {
  it("reads a nested user with social handles", () => {
    const g = normalizeGuest({
      api_id: "gst-1",
      user: {
        api_id: "usr-1",
        name: "Ada Example",
        username: "ada",
        bio_short: "ML engineer",
        linkedin_handle: "/in/ada-example",
        twitter_handle: "@ada",
        website: "https://ada.example",
      },
    });
    expect(g).toEqual({
      id: "usr-1",
      name: "Ada Example",
      username: "ada",
      bio: "ML engineer",
      avatarUrl: undefined,
      lumaUrl: "https://luma.com/user/ada",
      links: {
        linkedin: "https://www.linkedin.com/in/ada-example",
        twitter: "https://x.com/ada",
        website: "https://ada.example",
      },
    });
  });
  it("builds a name from first/last and skips empty entries", () => {
    expect(normalizeGuest({ guest: { api_id: "u2", first_name: "Bo", last_name: "Lee" } })?.name).toBe("Bo Lee");
    expect(normalizeGuest({ user: {} })).toBeNull();
    expect(normalizeGuest("nope")).toBeNull();
  });
});

describe("parseGuestPage", () => {
  it("returns guests and the next cursor only when there is more", () => {
    const page = { entries: [{ user: { api_id: "u1", name: "A" } }], has_more: true, next_cursor: "c2" };
    expect(parseGuestPage(page)).toEqual({ guests: [expect.objectContaining({ id: "u1" })], nextCursor: "c2" });
    expect(parseGuestPage({ ...page, has_more: false }).nextCursor).toBeUndefined();
  });
});

describe("parsePastedGuests", () => {
  it("handles names copied from the Luma guest modal", () => {
    const text = "Profile picture for Ada\nAda\nProfile picture for Bo Lee\nBo Lee\n";
    expect(parsePastedGuests(text).map((g) => g.name)).toEqual(["Ada", "Bo Lee"]);
  });
  it("handles JSONL and JSON pages", () => {
    const jsonl = toJsonl([{ user: { api_id: "u1", name: "A" } }, { user: { api_id: "u2", name: "B" } }]);
    expect(parsePastedGuests(jsonl)).toHaveLength(2);
    expect(parsePastedGuests(JSON.stringify({ entries: [{ user: { api_id: "u1", name: "A" } }] }))).toHaveLength(1);
  });
});

describe("events", () => {
  const evt = { api_id: "evt-T3Uts4RWMmuJtgU", name: "Event Wingman Presentation", url: "noyhvgai", start_at: "2026-10-17T18:00:00.000Z", cover_url: "https://images.lumacdn.com/x" };

  it("reads the public /url lookup (shape probed from api2.luma.com)", () => {
    const payload = { kind: "event", data: { api_id: evt.api_id, event: evt, guest_count: 0 } };
    expect(parseEventLookup(payload)).toEqual({
      id: "evt-T3Uts4RWMmuJtgU",
      slug: "noyhvgai",
      name: "Event Wingman Presentation",
      startAt: "2026-10-17T18:00:00.000Z",
      coverUrl: "https://images.lumacdn.com/x",
      guestCount: 0,
    });
    expect(parseEventLookup({ kind: "calendar", data: {} })).toBeNull();
  });

  it("reads a page of your events, wrapped or flat", () => {
    const page = { entries: [{ api_id: "x", event: evt, guest_count: 3 }, { event: { api_id: "cal-1", name: "Not an event" } }], has_more: true, next_cursor: "c" };
    const { events, nextCursor } = parseEventPage(page);
    expect(events.map((e) => [e.id, e.guestCount])).toEqual([["evt-T3Uts4RWMmuJtgU", 3]]);
    expect(nextCursor).toBe("c");
    expect(normalizeEvent(evt)?.slug).toBe("noyhvgai");
  });

  it("merges without duplicates, soonest first", () => {
    const a = { id: "evt-a", slug: "a", name: "A", startAt: "2026-10-18T10:00:00Z" };
    const b = { id: "evt-b", slug: "b", name: "B", startAt: "2026-10-17T10:00:00Z" };
    expect(mergeEvents([a], [b, { ...a, guestCount: 5 }]).map((e) => [e.id, e.guestCount])).toEqual([
      ["evt-b", undefined],
      ["evt-a", 5],
    ]);
  });
});

describe("discover", () => {
  it("reads the city place id from /url?url=berlin (shape probed from api2.luma.com)", () => {
    expect(parseDiscoverPlace({ kind: "discover-place", data: { place: { api_id: "discplace-gCfX0s3E9Hgo3rG", slug: "berlin" } } })).toBe(
      "discplace-gCfX0s3E9Hgo3rG",
    );
    expect(parseDiscoverPlace({ kind: "event", data: {} })).toBeNull();
  });

  it("keeps host calendar and city from discover entries", () => {
    const entry = {
      api_id: "evt-5u8yK2SYWvklHg0",
      calendar: { name: "{Tech: Europe}" },
      guest_count: 460,
      event: { api_id: "evt-5u8yK2SYWvklHg0", name: "Nebius Build Week Hackathon", url: "big-gtc-hack", start_at: "2026-10-18T07:30:00.000Z", end_at: "2026-10-18T18:00:00.000Z", geo_address_info: { city: "Berlin" } },
    };
    expect(parseEventPage({ entries: [entry] }).events[0]).toMatchObject({
      slug: "big-gtc-hack",
      hostName: "{Tech: Europe}",
      city: "Berlin",
      guestCount: 460,
      endAt: "2026-10-18T18:00:00.000Z",
    });
  });

  it("turns city names into Luma slugs", () => {
    expect(citySlug(" Berlin ")).toBe("berlin");
    expect(citySlug("New York")).toBe("new-york");
    expect(citySlug("München")).toBe("munchen");
  });
});

describe("parseLinkedinProfileUrl", () => {
  it("canonicalises profile links", () => {
    expect(parseLinkedinProfileUrl("linkedin.com/in/ada-example")).toBe("https://www.linkedin.com/in/ada-example");
    expect(parseLinkedinProfileUrl("https://de.linkedin.com/in/ada-example/?trk=x")).toBe("https://www.linkedin.com/in/ada-example");
  });
  it("rejects anything that isn't a profile", () => {
    expect(parseLinkedinProfileUrl("https://www.linkedin.com/company/acme")).toBeNull();
    expect(parseLinkedinProfileUrl("https://evil.com/linkedin.com/in/x")).toBeNull();
    expect(parseLinkedinProfileUrl("")).toBeNull();
  });
});
