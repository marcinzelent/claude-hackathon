import { describe, expect, it } from "vitest";
import { createLumaClient, LumaError, type LumaResponse } from "../src/luma/client";

// Fictional Luma responses only. Keys are paths (with query) on api.luma.com.
type Routes = Record<string, LumaResponse | (() => LumaResponse)>;

function fakeLuma(routes: Routes) {
  const calls: string[] = [];
  const transport = async (url: string) => {
    const path = url.replace("https://api.luma.com", "");
    calls.push(path);
    const route = routes[path];
    if (!route) return { status: 404, body: '{"message":"Not found."}' };
    return typeof route === "function" ? route() : route;
  };
  return { transport, calls };
}

const ok = (body: unknown): LumaResponse => ({ status: 200, body: JSON.stringify(body) });
const unauthorized: LumaResponse = { status: 401, body: '{"message":"Not signed in."}' };

const user = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  api_id: `gst-${id}`,
  user: { api_id: `usr-${id}`, name, ...extra },
});

const EVENTS = "/home/get-events?period=future&pagination_limit=50";
const RESOLVE = "/url?url=demo-night";
const GUESTS = "/event/get-guest-list?event_api_id=evt-Demo1&pagination_limit=100";
const resolved = ok({ kind: "event", data: { event: { api_id: "evt-Demo1" } } });

describe("isSignedIn", () => {
  it("is true when Luma answers with the user's events", async () => {
    const { transport } = fakeLuma({ [EVENTS]: ok({ entries: [], has_more: false }) });
    expect(await createLumaClient(transport).isSignedIn()).toBe(true);
  });

  it("is false when Luma says not signed in", async () => {
    const { transport } = fakeLuma({ [EVENTS]: unauthorized });
    expect(await createLumaClient(transport).isSignedIn()).toBe(false);
  });

  it("treats a 403 on the events endpoint as signed out", async () => {
    const { transport } = fakeLuma({ [EVENTS]: { status: 403, body: "{}" } });
    expect(await createLumaClient(transport).isSignedIn()).toBe(false);
  });

  it("reports an unreachable Luma instead of pretending to be signed out", async () => {
    const transport = async () => {
      throw new Error("network down");
    };
    await expect(createLumaClient(transport).isSignedIn()).rejects.toMatchObject({ kind: "unreachable" });
  });
});

describe("listMyEvents", () => {
  const event = (id: string, name: string, startAt: string, extra: Record<string, unknown> = {}) => ({
    api_id: `ev-${id}`,
    event: { api_id: `evt-${id}`, name, url: `slug-${id}`, start_at: startAt, show_guest_list: true, ...extra },
  });
  const now = () => new Date("2026-10-17T12:00:00Z");

  it("returns upcoming events with a visible guest list, soonest first", async () => {
    const { transport } = fakeLuma({
      [EVENTS]: ok({
        entries: [
          event("B", "Later meetup", "2026-10-20T18:00:00Z"),
          event("H", "Hidden list", "2026-10-18T18:00:00Z", { show_guest_list: false }),
          event("P", "Already over", "2026-10-10T18:00:00Z", { end_at: "2026-10-10T21:00:00Z" }),
          event("A", "Tonight", "2026-10-17T18:00:00Z", { timezone: "Europe/Berlin" }),
        ],
        has_more: false,
      }),
    });

    const events = await createLumaClient(transport, now).listMyEvents();

    expect(events).toEqual([
      { apiId: "evt-A", name: "Tonight", slug: "slug-A", startAt: "2026-10-17T18:00:00Z", timezone: "Europe/Berlin" },
      { apiId: "evt-B", name: "Later meetup", slug: "slug-B", startAt: "2026-10-20T18:00:00Z", timezone: undefined },
    ]);
  });

  it("keeps an event that started but hasn't ended yet", async () => {
    const { transport } = fakeLuma({
      [EVENTS]: ok({
        entries: [event("N", "Happening now", "2026-10-17T10:00:00Z", { end_at: "2026-10-17T16:00:00Z" })],
      }),
    });
    expect((await createLumaClient(transport, now).listMyEvents()).map((e) => e.name)).toEqual(["Happening now"]);
  });

  it("follows pagination", async () => {
    const { transport } = fakeLuma({
      [EVENTS]: ok({ entries: [event("A", "One", "2026-10-18T18:00:00Z")], has_more: true, next_cursor: "c2" }),
      [`${EVENTS}&pagination_cursor=c2`]: ok({ entries: [event("B", "Two", "2026-10-19T18:00:00Z")] }),
    });
    expect((await createLumaClient(transport, now).listMyEvents()).map((e) => e.name)).toEqual(["One", "Two"]);
  });

  it("reuses the page the sign-in check just fetched, once", async () => {
    const { transport, calls } = fakeLuma({
      [EVENTS]: ok({ entries: [event("A", "One", "2026-10-18T18:00:00Z")], has_more: false }),
    });
    const client = createLumaClient(transport, now);

    expect(await client.isSignedIn()).toBe(true);
    expect((await client.listMyEvents()).map((e) => e.name)).toEqual(["One"]);
    expect(calls).toEqual([EVENTS]);

    await client.listMyEvents();
    expect(calls).toEqual([EVENTS, EVENTS]);
  });

  it("fetches again when the sign-in check's page is older than 30 seconds", async () => {
    const { transport, calls } = fakeLuma({ [EVENTS]: ok({ entries: [], has_more: false }) });
    let t = new Date("2026-10-17T12:00:00Z").getTime();
    const client = createLumaClient(transport, () => new Date(t));

    await client.isSignedIn();
    t += 31_000;
    await client.listMyEvents();

    expect(calls).toEqual([EVENTS, EVENTS]);
  });

  it("keeps following pagination after reusing the cached first page", async () => {
    const { transport, calls } = fakeLuma({
      [EVENTS]: ok({ entries: [event("A", "One", "2026-10-18T18:00:00Z")], has_more: true, next_cursor: "c2" }),
      [`${EVENTS}&pagination_cursor=c2`]: ok({ entries: [event("B", "Two", "2026-10-19T18:00:00Z")] }),
    });
    const client = createLumaClient(transport, now);
    await client.isSignedIn();
    expect((await client.listMyEvents()).map((e) => e.name)).toEqual(["One", "Two"]);
    expect(calls).toEqual([EVENTS, `${EVENTS}&pagination_cursor=c2`]);
  });

  it("asks the user to connect Luma when signed out", async () => {
    const { transport } = fakeLuma({ [EVENTS]: unauthorized });
    await expect(createLumaClient(transport).listMyEvents()).rejects.toMatchObject({ kind: "not-signed-in" });
  });
});

describe("fetchGuests", () => {
  it("loads every page of the guest list from an event link and reports progress", async () => {
    const { transport } = fakeLuma({
      [RESOLVE]: resolved,
      [GUESTS]: ok({
        entries: [user("1", "Ada Example", { linkedin_handle: "/in/ada-example" })],
        has_more: true,
        next_cursor: "p2",
      }),
      [`${GUESTS}&pagination_cursor=p2`]: ok({
        entries: [user("2", "Bo Lee", { tiktok_handle: "bolee" }), user("3", "Cy Noprofile")],
        has_more: false,
      }),
    });
    const progress: number[] = [];

    const guests = await createLumaClient(transport).fetchGuests("https://luma.com/demo-night", (n) => progress.push(n));

    expect(guests.map((g) => g.name)).toEqual(["Ada Example", "Bo Lee", "Cy Noprofile"]);
    expect(guests[0].links.linkedin).toBe("https://www.linkedin.com/in/ada-example");
    expect(guests[1].links.tiktok).toBe("https://www.tiktok.com/@bolee");
    expect(guests[2].links).toEqual({});
    expect(progress).toEqual([1, 3]);
  });

  it("uses the ticket key from a personal ticket link, so no sign-in is needed", async () => {
    const { transport, calls } = fakeLuma({
      [RESOLVE]: resolved,
      [GUESTS]: unauthorized,
      [`${GUESTS}&ticket_key=Tk123`]: ok({ entries: [user("1", "Ada Example")], has_more: false }),
    });

    const guests = await createLumaClient(transport).fetchGuests("lu.ma/demo-night?tk=Tk123");

    expect(guests.map((g) => g.name)).toEqual(["Ada Example"]);
    expect(calls).toContain(`${GUESTS}&ticket_key=Tk123`);
  });

  it("asks the user to connect Luma when the list needs a sign-in", async () => {
    const { transport } = fakeLuma({ [RESOLVE]: resolved, [GUESTS]: unauthorized });
    await expect(createLumaClient(transport).fetchGuests("demo-night")).rejects.toMatchObject({
      kind: "not-signed-in",
    });
  });

  it("says the list is hidden when Luma answers 403 (forbidden, not signed out)", async () => {
    const { transport } = fakeLuma({ [RESOLVE]: resolved, [GUESTS]: { status: 403, body: "{}" } });
    const error = await createLumaClient(transport)
      .fetchGuests("demo-night")
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "hidden" });
    expect((error as LumaError).message).toMatch(/hidden/);
  });

  it("says the host hid the list when Luma returns no guests", async () => {
    const { transport } = fakeLuma({ [RESOLVE]: resolved, [GUESTS]: ok({ entries: [], has_more: false }) });
    await expect(createLumaClient(transport).fetchGuests("demo-night")).rejects.toMatchObject({ kind: "hidden" });
  });

  it("says the event wasn't found for an unknown link", async () => {
    const { transport } = fakeLuma({});
    await expect(createLumaClient(transport).fetchGuests("no-such-event")).rejects.toMatchObject({
      kind: "not-found",
    });
  });

  it("says the event wasn't found when Luma's answer has no event id", async () => {
    const { transport } = fakeLuma({ [RESOLVE]: ok({ kind: "calendar", data: {} }) });
    await expect(createLumaClient(transport).fetchGuests("demo-night")).rejects.toMatchObject({ kind: "not-found" });
  });

  it("rejects input that isn't a Luma link without calling Luma", async () => {
    const { transport, calls } = fakeLuma({});
    await expect(createLumaClient(transport).fetchGuests("https://example.com/a/b")).rejects.toMatchObject({
      kind: "invalid-link",
    });
    expect(calls).toEqual([]);
  });

  it("reports Luma as unreachable on network errors and server errors", async () => {
    const down = async () => {
      throw new Error("timeout");
    };
    await expect(createLumaClient(down).fetchGuests("demo-night")).rejects.toMatchObject({ kind: "unreachable" });

    const { transport } = fakeLuma({ [RESOLVE]: { status: 500, body: "oops" } });
    await expect(createLumaClient(transport).fetchGuests("demo-night")).rejects.toMatchObject({ kind: "unreachable" });
  });

  it("stops at the page safety cap", async () => {
    let page = 0;
    const transport = async (url: string) => {
      if (url.includes("/url?")) return resolved;
      page++;
      return ok({ entries: [user(String(page), `Guest ${page}`)], has_more: true, next_cursor: `p${page + 1}` });
    };
    const guests = await createLumaClient(transport).fetchGuests("demo-night");
    expect(guests).toHaveLength(20);
  });

  it("gives every error a plain-language message", async () => {
    const { transport } = fakeLuma({ [RESOLVE]: resolved, [GUESTS]: unauthorized });
    const error = await createLumaClient(transport)
      .fetchGuests("demo-night")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LumaError);
    expect((error as LumaError).message).toMatch(/Connect your Luma account/);
  });
});
