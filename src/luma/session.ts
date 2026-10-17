import type { LumaStatus } from "./LumaBridge";

export type LumaState = { status: LumaStatus; sessionExpired: boolean };

/**
 * What a Luma sign-in check means for the app.
 * A check that flips connected -> signed-out is an expired session, unless the
 * user disconnected on purpose. Offline says nothing new, so the flag stays.
 */
export function nextLumaState(
  prev: LumaState,
  result: Exclude<LumaStatus, "checking">,
  reason: "check" | "disconnect",
): LumaState {
  if (result === "connected" || result === "unavailable") return { status: result, sessionExpired: false };
  if (result === "offline") return { status: result, sessionExpired: prev.sessionExpired };
  if (reason === "disconnect") return { status: result, sessionExpired: false };
  return { status: result, sessionExpired: prev.status === "connected" || prev.sessionExpired };
}
