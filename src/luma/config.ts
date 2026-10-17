// Luma has no public API for guests, so these are the internal endpoints that
// luma.com itself calls. Verified 2026-10-17 in a signed-in browser. If loading
// breaks, open an event on luma.com, open DevTools -> Network, click "N Going"
// and copy the real host/path/params into here.
export const LUMA_WEB_ORIGIN = "https://luma.com";
export const LUMA_SIGNIN_URL = "https://luma.com/signin";
export const LUMA_API_BASE = "https://api.luma.com";

export const lumaPaths = {
  resolveSlug: (slug: string) => `/url?url=${encodeURIComponent(slug)}`,
  guestList: (eventApiId: string, opts: { cursor?: string; ticketKey?: string } = {}) =>
    `/event/get-guest-list?event_api_id=${encodeURIComponent(eventApiId)}` +
    `&pagination_limit=100` +
    (opts.ticketKey ? `&ticket_key=${encodeURIComponent(opts.ticketKey)}` : "") +
    (opts.cursor ? `&pagination_cursor=${encodeURIComponent(opts.cursor)}` : ""),
  // Your upcoming events. Also the sign-in check: 200 with a session, 401 without.
  myEvents: (cursor?: string) =>
    `/home/get-events?period=future&pagination_limit=50` +
    (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : ""),
};

export const MAX_GUEST_PAGES = 20;
export const MAX_EVENT_PAGES = 5;

// UNVERIFIED sign-out routes, found in Luma's web bundle but never tried on a real session.
// Needs the phone test: if "Disconnect Luma" doesn't sign you out, check these first.
export const LUMA_SIGNOUT_API_PATH = "/auth/sign-out"; // probably POST on LUMA_API_BASE
export const LUMA_SIGNOUT_URL = "https://luma.com/signout";
// Fallback when automatic sign-out fails: the user signs out by hand from Luma's home page.
export const LUMA_HOME_URL = "https://luma.com/home";
