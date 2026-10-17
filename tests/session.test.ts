import { describe, expect, it } from "vitest";
import { nextLumaState } from "../src/luma/session";

const connected = { status: "connected", sessionExpired: false } as const;

describe("nextLumaState", () => {
  it("marks the session expired when a check flips connected to signed-out", () => {
    expect(nextLumaState(connected, "signed-out", "check")).toEqual({ status: "signed-out", sessionExpired: true });
  });

  it("does not mark it expired when the user disconnected on purpose", () => {
    expect(nextLumaState(connected, "signed-out", "disconnect")).toEqual({
      status: "signed-out",
      sessionExpired: false,
    });
  });

  it("clears the expired flag once connected again", () => {
    const prev = { status: "signed-out", sessionExpired: true } as const;
    expect(nextLumaState(prev, "connected", "check")).toEqual({ status: "connected", sessionExpired: false });
  });

  it("keeps the previous expired flag when Luma is offline", () => {
    const expired = { status: "signed-out", sessionExpired: true } as const;
    expect(nextLumaState(expired, "offline", "check")).toEqual({ status: "offline", sessionExpired: true });
    expect(nextLumaState(connected, "offline", "check")).toEqual({ status: "offline", sessionExpired: false });
  });

  it("stays signed-out without expiry on a first check at startup", () => {
    const start = { status: "checking", sessionExpired: false } as const;
    expect(nextLumaState(start, "signed-out", "check")).toEqual({ status: "signed-out", sessionExpired: false });
  });

  it("is never expired where Luma is unavailable (web)", () => {
    const prev = { status: "unavailable", sessionExpired: false } as const;
    expect(nextLumaState(prev, "unavailable", "check")).toEqual({ status: "unavailable", sessionExpired: false });
  });
});
