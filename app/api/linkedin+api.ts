import { ApifyError, fetchLinkedinProfile } from "../../src/server/apify";
import { fail, profileFromClaude } from "../../src/server/profileFromClaude";
import { parseLinkedinProfileUrl } from "../../src/linkedinUrl";

// POST { url: "https://www.linkedin.com/in/..." } -> { goal, background, tip }.
// Only for the user's OWN profile: the app never looks up other guests on LinkedIn.
// The fetched profile goes to Claude and is then dropped; nothing is stored.

const MAX_PROFILE_CHARS = 60_000;

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? parseLinkedinProfileUrl(body.url) : null;
  if (!url) return fail(400, "Paste your LinkedIn profile link, like linkedin.com/in/your-name.");

  let profile: unknown;
  try {
    profile = await fetchLinkedinProfile(url);
  } catch (error) {
    if (error instanceof ApifyError) return fail(error.status, error.message);
    throw error;
  }

  const json = JSON.stringify(profile);
  if (json.length > MAX_PROFILE_CHARS) return fail(413, "That profile is too long to import. Try the PDF upload instead.");

  return profileFromClaude(
    [{ type: "text", text: `Here is my LinkedIn profile as JSON. Fill in my goal and background.\n\n<profile>\n${json}\n</profile>` }],
    "LinkedIn profile",
  );
}
