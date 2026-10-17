import { readTeamEvent } from "../../src/server/teamEvent";

// GET ?id=team-<slug> -> a teammate's LinkedIn photo, served from our own origin.
// Browsers with tracking protection or ad blockers block media.licdn.com, so the app
// never loads it directly. Only photos already in the team event cache can be fetched.

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  const entry = (await readTeamEvent())?.entries.find((e) => e.api_id === id);
  const url = entry?.user.avatar_url;
  if (typeof url !== "string" || !url.startsWith("https://media.licdn.com/")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return new Response("Photo unavailable", { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
}
