// Prompts for finding a guest's LinkedIn profile by name. Tweak them here, not in app code.

export const SEARCH_SYSTEM_PROMPT = `You find the LinkedIn profile of one guest at a tech meetup.
Search the web for their LinkedIn profile using their name together with what their event profile says
(job, company, city, website). Only consider linkedin.com/in/ profile links.
Reply with up to 2 links, one per line, the most likely first, and nothing else.
If nothing fits, reply NONE. Never make up a link.`;

export function searchUserPrompt(guest: { name: string; bio?: string; username?: string; links: string[] }): string {
  return [
    `Name: ${guest.name}`,
    guest.bio ? `Bio on the event page: ${guest.bio}` : "No bio on the event page.",
    guest.username ? `Event-platform username: ${guest.username}` : "",
    guest.links.length ? `Other profiles they linked (handles often match the LinkedIn link): ${guest.links.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const JUDGE_SYSTEM_PROMPT = `You check whether a LinkedIn profile belongs to a guest at a tech meetup.
You get the guest's event profile (name, bio, other links) and one LinkedIn profile with the same name.
Many people share a name, so say match only when something besides the name agrees: the same company,
job, city, website or social handle. If the event profile has nothing to compare, it is not a match.
reason: one short sentence naming what agrees or what is missing. Never invent facts.`;

export function judgeUserPrompt(
  guest: { name: string; bio?: string; links: Record<string, string | undefined> },
  profile: string,
): string {
  return [
    `<guest>\n${JSON.stringify({ name: guest.name, bio: guest.bio, links: guest.links })}\n</guest>`,
    `<linkedin_profile>\n${profile}\n</linkedin_profile>`,
  ].join("\n\n");
}
