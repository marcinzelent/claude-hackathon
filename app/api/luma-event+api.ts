import { LUMA_API_BASES, lumaPaths } from "../../src/luma/config";
import { parseEventLookup, parseEventSlug } from "../../src/luma/normalize";

// Looks up one event's public details (name, date, cover) from its link.
// Uses Luma's public endpoint, no sign-in, so it also works on web.

export async function GET(request: Request): Promise<Response> {
  const slug = parseEventSlug(new URL(request.url).searchParams.get("link") ?? "");
  if (!slug) {
    return Response.json({ error: "Paste a Luma event link, like luma.com/my-event." }, { status: 400 });
  }

  for (const base of LUMA_API_BASES) {
    try {
      const res = await fetch(base + lumaPaths.resolveSlug(slug), { signal: AbortSignal.timeout(10000) });
      if (res.status === 404) break;
      if (!res.ok) continue;
      const event = parseEventLookup(await res.json());
      if (event) return Response.json({ event });
      break;
    } catch {
      // try the next host
    }
  }
  return Response.json({ error: "Couldn't find that event on Luma." }, { status: 404 });
}
