// Luma has no public API for guests, so these are the internal endpoints that
// luma.com itself calls. They are NOT verified from this repo. If loading fails,
// open an event on luma.com, open DevTools -> Network, click "N Going" and copy
// the real host/path/params into here.
export const LUMA_WEB_ORIGIN = "https://luma.com";
export const LUMA_SIGNIN_URL = "https://luma.com/signin";

// The host luma.com's own pages call (verified 2026-10-17 in a signed-in browser). Used by the web relay.
export const LUMA_API_BASE = "https://api.luma.com";
// Tried in order until one answers.
export const LUMA_API_BASES = [LUMA_API_BASE, "https://api2.luma.com", "https://api.lu.ma"];

export const lumaPaths = {
  resolveSlug: (slug: string) => `/url?url=${encodeURIComponent(slug)}`,
  // A personal ticket key (the `tk` in a guest's ticket link) unlocks the guest list without a sign-in.
  guestList: (eventApiId: string, cursor?: string, ticketKey?: string) =>
    `/event/get-guest-list?event_api_id=${encodeURIComponent(eventApiId)}` +
    `&pagination_limit=100` +
    (ticketKey ? `&ticket_key=${encodeURIComponent(ticketKey)}` : "") +
    (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : ""),
  // Public "Discover" list for a city (no sign-in). The place id comes from resolveSlug("berlin").
  discover: (placeApiId: string, cursor?: string) =>
    `/discover/get-paginated-events?discover_place_api_id=${encodeURIComponent(placeApiId)}&pagination_limit=50` +
    (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : ""),
  // The signed-in user's own events (attending and hosting). Answers 401 when signed out,
  // so it doubles as the sign-in check. (/user/get-self answered 404 when probed.)
  myEvents: (period: "future" | "past", cursor?: string) =>
    `/home/get-events?period=${period}&pagination_limit=50` +
    (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : ""),
};

export const MAX_GUEST_PAGES = 20;
