// Luma has no public API for guests, so these are the internal endpoints that
// luma.com itself calls. They are NOT verified from this repo. If loading fails,
// open an event on luma.com, open DevTools -> Network, click "N Going" and copy
// the real host/path/params into here.
export const LUMA_WEB_ORIGIN = "https://luma.com";
export const LUMA_SIGNIN_URL = "https://luma.com/signin";

// Tried in order until one answers.
export const LUMA_API_BASES = ["https://api2.luma.com", "https://api.lu.ma"];

export const lumaPaths = {
  resolveSlug: (slug: string) => `/url?url=${encodeURIComponent(slug)}`,
  // Event details as the signed-in user sees them; holds your ticket_key when you're registered.
  event: (eventApiId: string) => `/event/get?event_api_id=${encodeURIComponent(eventApiId)}`,
  /**
   * Guest-list requests to try, most likely first. luma.com passes the guest's ticket_key when the
   * list is only visible to registered guests. The first variant that answers is remembered.
   */
  guestListVariants: (eventApiId: string, ticketKey: string | null, cursor?: string) => {
    const id = `event_api_id=${encodeURIComponent(eventApiId)}`;
    const tk = ticketKey ? `&ticket_key=${encodeURIComponent(ticketKey)}` : "";
    const page = `&pagination_limit=100` + (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : "");
    return [
      `/event/get-guest-list?${id}${tk}${page}`,
      `/event/get-guest-list?${id}${page}`,
      `/event/get-guests?${id}${tk}${page}`,
    ].filter((v, i, all) => all.indexOf(v) === i);
  },
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
