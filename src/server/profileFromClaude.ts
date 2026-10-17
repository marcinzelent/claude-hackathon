import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CV_IMPORT_SYSTEM_PROMPT } from "../../prompts/cvImport";
import { MINUTE, cacheKey, serverCache } from "./cache";
import { MISSING_KEY, MODEL, claudeClient, claudeFailure, fail } from "./claude";

// Server-only: shared by /api/profile (CV PDF) and /api/linkedin (LinkedIn profile data).

const ProfileSchema = z.object({
  goal: z.string(),
  background: z.string(),
  tip: z.string().nullable(),
});

type ImportedProfile = z.infer<typeof ProfileSchema>;

// The same CV or profile gets the same answer for an hour instead of a new Claude call.
const importCache = serverCache<ImportedProfile | null>("profileImport", 60 * MINUTE);

/** Asks Claude to turn a CV or profile into { goal, background, tip }, as an HTTP response. */
export async function profileFromClaude(
  content: Anthropic.Beta.BetaContentBlockParam[],
  sourceName: string,
): Promise<Response> {
  const client = claudeClient();
  if (!client) return fail(500, MISSING_KEY);

  try {
    const parsed = await importCache.get(cacheKey(content), () => askClaude(client, content), (v) => v !== null);
    if (!parsed) return fail(502, `Couldn't read that ${sourceName}. Type your goal and background instead.`);
    return Response.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) return fail(400, `Claude couldn't read that ${sourceName}.`);
    return claudeFailure(error, "Import failed. Try again.");
  }
}

/** Claude's answer, or null when it refused or returned nothing usable. */
async function askClaude(client: Anthropic, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<ImportedProfile | null> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(ProfileSchema) },
    system: CV_IMPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });
  return response.stop_reason === "refusal" ? null : (response.parsed_output ?? null);
}
