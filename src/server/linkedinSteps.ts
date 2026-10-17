import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { JUDGE_SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, judgeUserPrompt, searchUserPrompt } from "../../prompts/findLinkedin";
import { fetchLinkedinProfile } from "./apify";
import { MODEL } from "./claude";
import type { FinderSteps } from "./findLinkedin";

// Server-only: the real steps behind findLinkedin. Claude's web search finds candidates,
// Apify loads them (cached for an hour), and Claude compares each one with the Luma profile.
// NOT VERIFIED live: built for the demo event, where every guest is a teammate who agreed.

/** Enough of a profile for the name and job comparison; the rest is cut off. */
const MAX_PROFILE_CHARS = 8_000;
const SEARCHES_PER_GUEST = 3;

const VerdictSchema = z.object({ match: z.boolean(), reason: z.string() });

/** linkedin.com/in/ links in Claude's answer text. Links that only appear in the search results were rejected by Claude. */
export function linkedinLinksIn(content: unknown[]): string[] {
  const text = content
    .filter((b): b is { type: "text"; text: string } => (b as { type?: string })?.type === "text")
    .map((b) => b.text)
    .join("\n");
  return [...new Set(text.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^\s"'<>)\],]+/gi) ?? [])];
}

export function linkedinSteps(client: Anthropic): FinderSteps {
  return {
    search: async (guest) => {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SEARCH_SYSTEM_PROMPT,
        tools: [
          { type: "web_search_20260318", name: "web_search", max_uses: SEARCHES_PER_GUEST, allowed_domains: ["linkedin.com"] },
        ],
        messages: [
          {
            role: "user",
            content: searchUserPrompt({ name: guest.name, bio: guest.bio, username: guest.username, links: Object.keys(guest.links) }),
          },
        ],
      });
      return linkedinLinksIn(response.content);
    },

    fetchProfile: fetchLinkedinProfile,

    judge: async (guest, profile) => {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 512,
        output_config: { format: zodOutputFormat(VerdictSchema) },
        system: JUDGE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: judgeUserPrompt(guest, JSON.stringify(profile).slice(0, MAX_PROFILE_CHARS)) }],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        return { match: false, reason: "Claude couldn't compare this profile." };
      }
      return response.parsed_output;
    },
  };
}
