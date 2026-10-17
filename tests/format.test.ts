import { describe, expect, it } from "vitest";
import { formatEventDate } from "../src/luma/format";

describe("formatEventDate", () => {
  it("shows weekday, day, month and 24h time in the given timezone", () => {
    // 16:00 UTC is 18:00 in Berlin (summer time)
    expect(formatEventDate("2026-10-17T16:00:00.000Z", "Europe/Berlin")).toBe("Sat 17 Oct, 18:00");
  });

  it("uses the event's timezone, not UTC", () => {
    expect(formatEventDate("2026-10-17T16:00:00.000Z", "America/Los_Angeles")).toBe("Sat 17 Oct, 09:00");
  });

  it("can roll over to the next day in the target timezone", () => {
    expect(formatEventDate("2026-10-17T23:30:00.000Z", "Asia/Tokyo")).toBe("Sun 18 Oct, 08:30");
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatEventDate("2026-01-05T07:05:00.000Z", "UTC")).toBe("Mon 5 Jan, 07:05");
  });

  it("falls back to the device timezone when none or an invalid one is given", () => {
    expect(formatEventDate("2026-10-17T16:00:00.000Z")).toMatch(/^\w{3} \d{1,2} \w{3}, \d{2}:\d{2}$/);
    expect(formatEventDate("2026-10-17T16:00:00.000Z", "Not/AZone")).toMatch(/^\w{3} \d{1,2} \w{3}, \d{2}:\d{2}$/);
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatEventDate("nonsense", "UTC")).toBe("");
  });
});
