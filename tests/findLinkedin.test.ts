import { describe, expect, it } from "vitest";
import {
  MAX_CANDIDATES,
  MAX_LOOKUPS,
  findLinkedin,
  findLinkedins,
  namesMatch,
  needsLookup,
  profileName,
  type FinderSteps,
} from "../src/server/findLinkedin";
import { linkedinLinksIn } from "../src/server/linkedinSteps";
import type { Guest } from "../src/types";

// Fictional guests and profiles only.
const guest = (over: Partial<Guest> = {}): Guest => ({
  id: "g1",
  name: "Jana Beispiel",
  bio: "ML engineer at Acme AI, Berlin",
  links: {},
  ...over,
});

const profiles: Record<string, unknown> = {
  "https://www.linkedin.com/in/jana-beispiel": { firstName: "Jana", lastName: "Beispiel", headline: "ML at Acme AI" },
  "https://www.linkedin.com/in/jana-beispiel-2": { firstName: "Jana", lastName: "Beispiel", headline: "Baker in Hamburg" },
  "https://www.linkedin.com/in/someone-else": { fullName: "Max Muster" },
};

function fakeSteps(candidates: string[], confirm = (p: unknown) => JSON.stringify(p).includes("Acme")) {
  const fetched: string[] = [];
  const steps: FinderSteps = {
    search: async () => candidates,
    fetchProfile: async (url) => {
      fetched.push(url);
      if (!(url in profiles)) throw new Error("not found");
      return profiles[url];
    },
    judge: async (_g, p) => (confirm(p) ? { match: true, reason: "Both mention Acme AI" } : { match: false, reason: "Different job" }),
  };
  return { steps, fetched };
}

describe("needsLookup", () => {
  it("skips guests who connected LinkedIn or have only one name", () => {
    expect(needsLookup(guest())).toBe(true);
    expect(needsLookup(guest({ links: { linkedin: "https://www.linkedin.com/in/x" } }))).toBe(false);
    expect(needsLookup(guest({ name: "Jana" }))).toBe(false);
  });
});

describe("namesMatch", () => {
  it("needs first and last name, ignoring case, accents and umlaut spellings", () => {
    expect(namesMatch("Jana Beispiel", "jana m. beispiel")).toBe(true);
    expect(namesMatch("Sören Beispiel", "Soeren Beispiel")).toBe(true);
    expect(namesMatch("José Beispiel", "Jose Beispiel")).toBe(true);
    expect(namesMatch("Jana Beispiel", "Jana Muster")).toBe(false);
    expect(namesMatch("Jana Beispiel", undefined)).toBe(false);
  });
});

describe("profileName", () => {
  it("reads first and last name, full name or name", () => {
    expect(profileName({ firstName: "Jana", lastName: "Beispiel" })).toBe("Jana Beispiel");
    expect(profileName({ fullName: "Max Muster" })).toBe("Max Muster");
    expect(profileName({ name: "Kim Test" })).toBe("Kim Test");
    expect(profileName(null)).toBeUndefined();
  });
});

describe("findLinkedin", () => {
  it("returns the candidate the judge confirms, as a canonical link with the reason", async () => {
    const { steps } = fakeSteps(["linkedin.com/in/jana-beispiel-2", "https://de.linkedin.com/in/jana-beispiel/"]);
    expect(await findLinkedin(guest(), steps)).toEqual({
      url: "https://www.linkedin.com/in/jana-beispiel",
      reason: "Both mention Acme AI",
    });
  });

  it("never asks the judge about a profile with a different name", async () => {
    const { steps } = fakeSteps(["https://www.linkedin.com/in/someone-else"], () => true);
    expect(await findLinkedin(guest(), steps)).toBeNull();
  });

  it("finds nothing when the judge rejects every candidate", async () => {
    const { steps } = fakeSteps(["https://www.linkedin.com/in/jana-beispiel-2"]);
    expect(await findLinkedin(guest(), steps)).toBeNull();
  });

  it("ignores non-LinkedIn links, skips profiles that fail to load and checks at most MAX_CANDIDATES", async () => {
    const { steps, fetched } = fakeSteps([
      "https://example.com/jana",
      "https://www.linkedin.com/in/missing",
      "https://www.linkedin.com/in/jana-beispiel-2",
      "https://www.linkedin.com/in/jana-beispiel",
    ]);
    expect(await findLinkedin(guest(), steps)).toBeNull();
    expect(fetched).toHaveLength(MAX_CANDIDATES);
  });
});

describe("findLinkedins", () => {
  it("looks up only guests who need it, at most MAX_LOOKUPS, keyed by guest id", async () => {
    const searched: string[] = [];
    const { steps } = fakeSteps([]);
    steps.search = async (g) => {
      searched.push(g.id);
      return g.id === "g0" ? ["https://www.linkedin.com/in/jana-beispiel"] : [];
    };
    const many = Array.from({ length: MAX_LOOKUPS + 5 }, (_, i) => guest({ id: `g${i}` }));
    const linked = guest({ id: "linked", links: { linkedin: "https://www.linkedin.com/in/x" } });

    const { found, checked } = await findLinkedins([linked, ...many], (g) => findLinkedin(g, steps));
    expect(checked).toBe(MAX_LOOKUPS);
    expect(searched).toHaveLength(MAX_LOOKUPS);
    expect(searched).not.toContain("linked");
    expect(Object.keys(found)).toEqual(["g0"]);
  });

  it("treats a failing lookup as nothing found", async () => {
    const { steps } = fakeSteps([]);
    steps.search = async () => {
      throw new Error("search down");
    };
    expect(await findLinkedins([guest()], (g) => findLinkedin(g, steps))).toEqual({ found: {}, checked: 1 });
  });
});

describe("linkedinLinksIn", () => {
  it("takes profile links from Claude's answer before its citations", () => {
    const content = [
      { type: "web_search_tool_result", content: [{ url: "https://de.linkedin.com/in/from-citation" }] },
      { type: "text", text: "https://www.linkedin.com/in/jana-beispiel\nlinkedin.com/in/jana-beispiel-2" },
    ];
    expect(linkedinLinksIn(content)).toEqual([
      "https://www.linkedin.com/in/jana-beispiel",
      "linkedin.com/in/jana-beispiel-2",
      "https://de.linkedin.com/in/from-citation",
    ]);
  });

  it("returns nothing for NONE", () => {
    expect(linkedinLinksIn([{ type: "text", text: "NONE" }])).toEqual([]);
  });
});
