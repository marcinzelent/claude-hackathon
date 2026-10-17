import { describe, expect, it } from "vitest";
import { proxyLumaRequest } from "../src/luma/proxy";

// Fictional responses only. The fake records which Luma URLs the proxy called.
function fakeFetch(status = 200, body = '{"ok":true}') {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body, { status });
  };
  return { fetchFn, calls };
}

const GUESTS_WITH_TK = "/event/get-guest-list?event_api_id=evt-Demo1&pagination_limit=100&ticket_key=Tk123";

describe("proxyLumaRequest", () => {
  it("forwards an event lookup to Luma and relays status and body", async () => {
    const { fetchFn, calls } = fakeFetch(200, '{"kind":"event"}');
    const res = await proxyLumaRequest("/url?url=demo-night", fetchFn);
    expect(res).toEqual({ status: 200, body: '{"kind":"event"}' });
    expect(calls.map((c) => c.url)).toEqual(["https://api.luma.com/url?url=demo-night"]);
  });

  it("forwards a guest list request that carries a ticket key", async () => {
    const { fetchFn, calls } = fakeFetch();
    await proxyLumaRequest(GUESTS_WITH_TK, fetchFn);
    expect(calls[0].url).toBe("https://api.luma.com" + GUESTS_WITH_TK);
  });

  it("relays Luma's error status", async () => {
    const { fetchFn } = fakeFetch(401, '{"message":"Not signed in."}');
    expect((await proxyLumaRequest(GUESTS_WITH_TK, fetchFn)).status).toBe(401);
  });

  it("never sends cookies or credentials to Luma", async () => {
    const { fetchFn, calls } = fakeFetch();
    await proxyLumaRequest(GUESTS_WITH_TK, fetchFn);
    expect(calls[0].init?.credentials).toBe("omit");
    expect(JSON.stringify(calls[0].init?.headers ?? {})).not.toMatch(/cookie|authorization/i);
  });

  it("answers 401 for a guest list without a ticket key, without calling Luma", async () => {
    const { fetchFn, calls } = fakeFetch();
    const res = await proxyLumaRequest("/event/get-guest-list?event_api_id=evt-Demo1", fetchFn);
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("refuses any other Luma path, without calling Luma", async () => {
    const { fetchFn, calls } = fakeFetch();
    for (const path of ["/home/get-events?period=future", "/user/get-self", "https://evil.example/url?url=x", "//evil.example/url", ""]) {
      expect((await proxyLumaRequest(path, fetchFn)).status).toBe(400);
    }
    expect(calls).toEqual([]);
  });

  it("reports Luma being unreachable as 502", async () => {
    const down = async () => {
      throw new Error("network down");
    };
    expect((await proxyLumaRequest("/url?url=demo-night", down)).status).toBe(502);
  });
});
