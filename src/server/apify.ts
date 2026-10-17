// Server-only. Fetches ONE LinkedIn profile through the Apify actor
// harvestapi/linkedin-profile-scraper (paid per profile, no LinkedIn login needed).
//
// NOT VERIFIED from this repo (Apify was unreachable while building). If runs fail,
// open the actor on apify.com -> Input tab -> "JSON" view and make buildInput()
// match what it shows for one profile URL.
export const APIFY_ACTOR_ID = "harvestapi~linkedin-profile-scraper";

export const buildInput = (profileUrl: string) => ({ queries: [profileUrl] });

const RUN_TIMEOUT_SECONDS = 120;

export class ApifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Runs the actor synchronously and returns the first dataset item. */
export async function fetchLinkedinProfile(profileUrl: string): Promise<unknown> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new ApifyError("Add APIFY_TOKEN to .env and restart the server.", 500);

  const url =
    `${process.env.APIFY_BASE_URL || "https://api.apify.com"}/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items` +
    `?timeout=${RUN_TIMEOUT_SECONDS}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildInput(profileUrl)),
      signal: AbortSignal.timeout((RUN_TIMEOUT_SECONDS + 15) * 1000),
    });
  } catch {
    throw new ApifyError("Couldn't reach Apify. Try again, or upload your LinkedIn PDF instead.", 502);
  }

  if (res.status === 401 || res.status === 403) throw new ApifyError("The server's APIFY_TOKEN is invalid.", 500);
  if (res.status === 402) throw new ApifyError("The Apify account is out of credit.", 502);
  if (res.status === 408) throw new ApifyError("LinkedIn import took too long. Try the PDF upload instead.", 504);
  if (!res.ok) {
    console.error("apify run failed", res.status, (await res.text().catch(() => "")).slice(0, 500));
    throw new ApifyError("LinkedIn import failed. Try the PDF upload instead.", 502);
  }

  const items = (await res.json().catch(() => null)) as unknown;
  const first = Array.isArray(items) ? items[0] : null;
  if (!first) throw new ApifyError("Couldn't find that LinkedIn profile. Check the link, or upload the PDF.", 404);
  return first;
}
