import { lumaPaths } from "../../src/luma/config";
import { parseEventLookup, parseEventSlug } from "../../src/luma/normalize";
import { fail } from "../../src/server/claude";
import { lumaJson } from "../../src/server/luma";

// GET ?link=<luma event link> -> { event }: one event's public details (name, date, cover).
// Uses Luma's public endpoint, no sign-in, so it also works on web.

export async function GET(request: Request): Promise<Response> {
  const slug = parseEventSlug(new URL(request.url).searchParams.get("link") ?? "");
  if (!slug) return fail(400, "Paste a Luma event link, like luma.com/my-event.");

  const event = parseEventLookup(await lumaJson(lumaPaths.resolveSlug(slug)));
  if (!event) return fail(404, "Couldn't find that event on Luma.");
  return Response.json({ event });
}
