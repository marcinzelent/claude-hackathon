// Builds the team's demo event from LinkedIn profiles of teammates who agreed.
//
//   npm run enrich -- https://www.linkedin.com/in/a https://www.linkedin.com/in/b
//
// Needs APIFY_TOKEN in .env. Writes data/team-event.json (git-ignored, never commit it).

import { writeFile } from "node:fs/promises";
import { parseLinkedinProfileUrl } from "../src/linkedinUrl";
import { fetchLinkedinProfile } from "../src/server/apify";
import { TEAM_EVENT_PATH, compactLinkedin, nameAndHeadline, type TeamEventFile } from "../src/server/teamEvent";

async function main() {
  const urls = process.argv.slice(2).map((raw) => ({ raw, url: parseLinkedinProfileUrl(raw) }));
  const bad = urls.filter((u) => !u.url);
  if (urls.length === 0 || bad.length) {
    console.error(bad.length ? `Not LinkedIn profile links: ${bad.map((b) => b.raw).join(", ")}` : "Pass LinkedIn profile links.");
    process.exit(1);
  }

  console.log(`Fetching ${urls.length} profiles from Apify (up to ~2 minutes)…`);
  const results = await Promise.allSettled(urls.map(({ url }) => fetchLinkedinProfile(url!)));

  const file: TeamEventFile = { event: { name: "Team demo event" }, entries: [], linkedin: {} };
  results.forEach((result, i) => {
    const url = urls[i].url!;
    const slug = decodeURIComponent(url.split("/in/")[1]);
    if (result.status === "rejected") {
      console.error(`✗ ${url}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
      return;
    }
    const id = `team-${slug}`;
    const { name, headline } = nameAndHeadline(result.value, slug);
    // Same shape as a Luma guest-list entry, so the app treats it like a Luma import.
    file.entries.push({ api_id: id, user: { api_id: id, name, bio_short: headline, linkedin_handle: `/in/${slug}` } });
    file.linkedin[id] = compactLinkedin(result.value);
    console.log(`✓ ${name}${headline ? ` — ${headline}` : ""}`);
  });

  if (file.entries.length === 0) {
    console.error("No profiles fetched, nothing written. Check APIFY_TOKEN and the actor input in src/server/apify.ts.");
    process.exit(1);
  }
  await writeFile(TEAM_EVENT_PATH, JSON.stringify(file, null, 2));
  console.log(`Wrote ${file.entries.length} guests to data/team-event.json (git-ignored).`);
}

main();
