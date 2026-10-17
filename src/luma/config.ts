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
  guestList: (eventApiId: string, cursor?: string) =>
    `/event/get-guest-list?event_api_id=${encodeURIComponent(eventApiId)}` +
    `&pagination_limit=100` +
    (cursor ? `&pagination_cursor=${encodeURIComponent(cursor)}` : ""),
  self: () => `/user/get-self`,
};

export const MAX_GUEST_PAGES = 20;
