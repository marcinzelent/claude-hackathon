import { describe, expect, it } from "vitest";
import {
  findEventApiId,
  normalizeGuest,
  parseEventLink,
  parseEventSlug,
  parseGuestPage,
  parsePastedGuests,
  toJsonl,
} from "../src/luma/normalize";

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

describe("parseEventLink", () => {
  it("keeps the personal ticket key from a ticket link", () => {
    expect(parseEventLink("https://luma.com/demo-night?tk=Tk123")).toEqual({ slug: "demo-night", ticketKey: "Tk123" });
    expect(parseEventLink("lu.ma/demo-night?utm=x&tk=Tk123#top")).toEqual({ slug: "demo-night", ticketKey: "Tk123" });
  });
  it("has no ticket key for public links", () => {
    expect(parseEventLink("luma.com/demo-night")).toEqual({ slug: "demo-night" });
    expect(parseEventLink("not a link")).toBeNull();
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
  it("turns TikTok and YouTube handles into full links", () => {
    const g = normalizeGuest({
      user: { api_id: "u3", name: "Cy", tiktok_handle: "@cy", youtube_handle: "cychannel" },
    });
    expect(g?.links).toEqual({ tiktok: "https://www.tiktok.com/@cy", youtube: "https://www.youtube.com/@cychannel" });
    expect(normalizeGuest({ user: { api_id: "u4", name: "Di", youtube_handle: "channel/UC123" } })?.links.youtube).toBe(
      "https://www.youtube.com/channel/UC123",
    );
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
