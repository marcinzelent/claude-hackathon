import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CV_IMPORT_SYSTEM_PROMPT } from "../../prompts/cvImport";
import { MISSING_KEY, claudeClient, claudeFailure, fail } from "./claude";

// Server-only: shared by /api/profile (CV PDF) and /api/linkedin (LinkedIn profile data).

const ProfileSchema = z.object({
  goal: z.string(),
  background: z.string(),
  tip: z.string().nullable(),
});

/** Asks Claude to turn a CV or profile into { goal, background, tip }, as an HTTP response. */
export async function profileFromClaude(
  content: Anthropic.Beta.BetaContentBlockParam[],
  sourceName: string,
): Promise<Response> {
  const client = claudeClient();
  if (!client) return fail(500, MISSING_KEY);

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(ProfileSchema) },
      system: CV_IMPORT_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fail(502, `Couldn't read that ${sourceName}. Type your goal and background instead.`);
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) return fail(400, `Claude couldn't read that ${sourceName}.`);
    return claudeFailure(error, "Import failed. Try again.");
  }
}
