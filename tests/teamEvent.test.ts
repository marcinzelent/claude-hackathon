import { describe, expect, it } from "vitest";
import { compactLinkedin, nameAndHeadline } from "../src/server/teamEvent";

const item = {
  id: "ACoAAB",
  firstName: "Ada",
  lastName: "Example",
  headline: "ML Engineer at Example GmbH",
  photo: "https://media.licdn.com/x.jpg",
  linkedinUrl: "https://www.linkedin.com/in/ada",
  email: "ada@example.com",
  about: "I build recommendation systems.",
  experience: Array.from({ length: 10 }, (_, i) => ({ position: `Role ${i}`, companyName: `Co ${i}`, companyLogo: "x.png" })),
  skills: [],
};

describe("compactLinkedin", () => {
  it("keeps the useful facts and drops images, links, ids and contact details", () => {
    const out = JSON.parse(compactLinkedin(item));
    expect(out).toMatchObject({ firstName: "Ada", headline: "ML Engineer at Example GmbH", about: "I build recommendation systems." });
    expect(out.photo).toBeUndefined();
    expect(out.linkedinUrl).toBeUndefined();
    expect(out.email).toBeUndefined();
    expect(out.id).toBeUndefined();
    expect(out.skills).toBeUndefined();
    expect(out.experience).toHaveLength(6);
    expect(out.experience[0]).toEqual({ position: "Role 0", companyName: "Co 0" });
  });
  it("stays under the size cap", () => {
    expect(compactLinkedin({ about: "x".repeat(50_000), list: Array(100).fill({ a: "y".repeat(500) }) }).length).toBeLessThanOrEqual(6000);
  });
});

describe("nameAndHeadline", () => {
  it("handles different field names and falls back to the URL slug", () => {
    expect(nameAndHeadline(item, "ada")).toEqual({ name: "Ada Example", headline: "ML Engineer at Example GmbH" });
    expect(nameAndHeadline({ fullName: "Bo Lee", occupation: "Founder" }, "bo")).toEqual({ name: "Bo Lee", headline: "Founder" });
    expect(nameAndHeadline({}, "some-slug")).toEqual({ name: "some-slug", headline: undefined });
  });
});
