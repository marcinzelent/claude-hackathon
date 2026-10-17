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
