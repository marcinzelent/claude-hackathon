// Optional: pre-fetch the team event before a demo, so the first tap in the app is instant.
//
//   npm run enrich
//
// Uses TEAM_EVENT_LINKEDIN_URLS and APIFY_TOKEN from .env and fills the git-ignored
// data/team-event.json cache. The app does the same when you tap "Team demo event".

import { enrichTeamEvent, teamUrls } from "../src/server/teamEvent";

async function main() {
  const urls = teamUrls();
  if (urls.length === 0) {
    console.error("Add TEAM_EVENT_LINKEDIN_URLS=<links, comma separated> to .env first.");
    process.exit(1);
  }
  console.log(`Fetching ${urls.length} profiles from Apify (up to ~2 minutes)…`);
  const { entries, failed } = await enrichTeamEvent(urls);
  for (const e of entries) console.log(`• ${e.user.name}${e.user.bio_short ? ` — ${e.user.bio_short}` : ""}`);
  for (const f of failed) console.error(`✗ ${f.url}: ${f.error}`);
  process.exit(failed.length === urls.length ? 1 : 0);
}

main();
