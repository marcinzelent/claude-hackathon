import { parseGuestPage } from "../../src/luma/normalize";
import { readTeamEvent } from "../../src/server/teamEvent";

// GET -> the team's demo event as guests (names, headlines, links), read like a Luma import.
// Never returns the raw LinkedIn profiles; those are only added for Claude in /api/rank.
export async function GET(): Promise<Response> {
  const file = await readTeamEvent();
  if (!file) return Response.json({ error: "No team event yet. Run npm run enrich first." }, { status: 404 });
  const { guests } = parseGuestPage({ entries: file.entries });
  return Response.json({ name: file.event.name, guests });
}
