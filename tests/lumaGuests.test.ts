import { describe, expect, it } from "vitest";
import { lumaPaths } from "../src/luma/config";
import { findTicketKey } from "../src/luma/normalize";
import { sameLinkedin } from "../src/linkedinUrl";

describe("findTicketKey", () => {
  it("finds the guest's ticket key wherever Luma nests it", () => {
    expect(findTicketKey({ event: { api_id: "evt-1" }, guest_data: { ticket_key: "tk_123" } })).toBe("tk_123");
    expect(findTicketKey({ data: [{ ticket_key: "" }, { x: { ticket_key: "abc" } }] })).toBe("abc");
    expect(findTicketKey({ event: {} })).toBeNull();
    expect(findTicketKey(null)).toBeNull();
  });
});

describe("guestListVariants", () => {
  it("tries the ticket version first and drops duplicates without a ticket", () => {
    const withTicket = lumaPaths.guestListVariants("evt-1", "tk", "c2");
    expect(withTicket[0]).toBe("/event/get-guest-list?event_api_id=evt-1&ticket_key=tk&pagination_limit=100&pagination_cursor=c2");
    expect(withTicket).toHaveLength(3);
    expect(lumaPaths.guestListVariants("evt-1", null)).toHaveLength(2);
  });
});

describe("sameLinkedin", () => {
  it("matches the same profile written differently", () => {
    expect(sameLinkedin("https://www.linkedin.com/in/Ada-X/", "linkedin.com/in/ada-x")).toBe(true);
    expect(sameLinkedin("linkedin.com/in/ada", "linkedin.com/in/bo")).toBe(false);
    expect(sameLinkedin(undefined, "linkedin.com/in/ada")).toBe(false);
    expect(sameLinkedin(undefined, undefined)).toBe(false);
  });
});

describe("parseLinkedinProfileUrl case", () => {
  it("lowercases the slug so lookups match", async () => {
    const { parseLinkedinProfileUrl } = await import("../src/linkedinUrl");
    expect(parseLinkedinProfileUrl("https://www.linkedin.com/in/Fake-Alpha/")).toBe("https://www.linkedin.com/in/fake-alpha");
  });
});
