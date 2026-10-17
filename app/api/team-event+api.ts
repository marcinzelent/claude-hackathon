import { parseGuestPage } from "../../src/luma/normalize";
import { TEAM_EVENT_NAME, enrichTeamEvent, teamEventEntries, teamUrls } from "../../src/server/teamEvent";

// The team's demo event (teammates' LinkedIn links from TEAM_EVENT_LINKEDIN_URLS in .env).
// GET  -> the guest list, read like a Luma import (no LinkedIn fetch).
// POST -> fetches teammates' LinkedIn profiles through Apify (cached), then the guest list.
// Never returns raw LinkedIn profiles; /api/rank adds those for Claude only.

// Teammates aren't real Luma users, so drop the made-up Luma profile link.
const toGuests = (entries: unknown[]) =>
  parseGuestPage({ entries }).guests.map(({ lumaUrl: _unused, ...g }) => g);

const notConfigured = () =>
  Response.json({ error: "No team event. Add TEAM_EVENT_LINKEDIN_URLS to .env." }, { status: 404 });

export async function GET(): Promise<Response> {
  const urls = teamUrls();
  if (urls.length === 0) return notConfigured();
  const { entries, cached } = await teamEventEntries(urls);
  return Response.json({ name: TEAM_EVENT_NAME, guests: toGuests(entries), enriched: cached });
}

export async function POST(): Promise<Response> {
  const urls = teamUrls();
  if (urls.length === 0) return notConfigured();
  const { entries, failed } = await enrichTeamEvent(urls);
  if (failed.length === urls.length) {
    return Response.json({ error: `Couldn't fetch any LinkedIn profiles: ${failed[0].error}` }, { status: 502 });
  }
  return Response.json({ name: TEAM_EVENT_NAME, guests: toGuests(entries), failed });
}
