import { LUMA_API_BASE } from "./config";

/*
 * Server-side relay for the web version. Browsers block luma.com's API from
 * other sites (CORS), but a server isn't a browser. The relay is deliberately
 * narrow: only the event lookup and the guest list, and the guest list only
 * with a personal ticket key (?tk=), which unlocks it without any Luma login.
 * No cookies, no logging, nothing stored.
 */

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function proxyLumaRequest(path: string, fetchFn: FetchFn = fetch): Promise<{ status: number; body: string }> {
  if (!/^\/(url|event\/get-guest-list)\?/.test(path)) {
    return { status: 400, body: JSON.stringify({ message: "Not an allowed Luma request." }) };
  }
  if (path.startsWith("/event/get-guest-list") && !/[?&]ticket_key=[^&]+/.test(path)) {
    return { status: 401, body: JSON.stringify({ message: "A personal ticket link is needed on the web." }) };
  }
  try {
    const res = await fetchFn(LUMA_API_BASE + path, { credentials: "omit", headers: { Accept: "application/json" } });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 502, body: JSON.stringify({ message: "Could not reach Luma." }) };
  }
}
