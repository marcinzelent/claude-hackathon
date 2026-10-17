# Spec: Luma connection (Expo app)

Status: ready-for-agent · Branch: `soeren/luma-connection`

## Problem Statement

A job seeker who has registered for a networking event on Luma wants to know who else is going, so RoomRadar can tell them who to meet and how to start the conversation. Today the app can't reliably get that guest list: the live Luma loader points at API hosts and a sign-in check that no longer exist, so it fails, and the user has to fall back to copying names by hand or using the sample event. The user also has to find and paste the event link themselves, even though Luma already knows which events they're registered for.

## Solution

On first launch, the user connects their own Luma account inside the Expo app by signing in on Luma's own page. From then on the app acts on their behalf from the phone: it shows the user's upcoming Luma events where the guest list is visible to them, the user taps one, and the app loads the full guest list as a JSON array of guests (name plus every profile link the guest has connected on Luma: LinkedIn, X, Instagram, TikTok, YouTube, website). That list goes straight into the existing Claude ranking and can also be exported as a JSON file. Pasting an event link still works, including personal ticket links that work without signing in. The Luma session never leaves the phone. Users who don't want to connect Luma, and users on web, can still try the sample event or paste a guest list.

## User Stories

1. As a first-time user, I want to see a "Connect Luma" screen when I open the app, so that I understand the app works with my own Luma events.
2. As a first-time user, I want to sign in on Luma's own sign-in page inside the app, so that I never hand my Luma credentials to RoomRadar.
3. As a first-time user, I want to sign in with the same methods Luma offers (email code, Google, passkey), so that I can use the account I registered for events with.
4. As a first-time user, I want a "Try the sample event" option on the connect screen, so that I can see what the app does before connecting anything.
5. As a user who just signed in, I want the app to confirm that Luma is connected, so that I know the sign-in worked.
6. As a user whose sign-in didn't complete, I want a clear message and a way to retry, so that I'm not stuck on a blank screen.
7. As a returning user, I want the app to remember that I'm connected, so that I don't have to sign in to Luma every time I open the app.
8. As a returning user whose Luma session expired, I want to be sent back to the sign-in screen with an explanation, so that I can reconnect quickly.
9. As a connected user, I want to see my upcoming Luma events, so that I can pick the event I'm preparing for without searching for a link.
10. As a connected user, I want to see each event's name and date, so that I can tell events apart.
11. As a connected user, I want only events whose guest list I'm allowed to see to be listed, so that I don't pick an event that will fail.
12. As a connected user with no upcoming events with visible guest lists, I want a friendly empty state that offers pasting a link or trying the sample event, so that I still have a way forward.
13. As a connected user, I want to tap an event and have its guest list load, so that one tap gets me from event to ranking.
14. As a user loading a big event, I want to see progress ("Loaded 120 guests…"), so that I know the app is working.
15. As a user loading a big event, I want every page of the guest list loaded, so that nobody is missing from the ranking.
16. As a user, I want each guest's name, so that I know who they are.
17. As a user, I want each guest's connected LinkedIn profile as a full URL, so that I can look them up before or after meeting.
18. As a user, I want each guest's X, Instagram, TikTok and YouTube profiles and website as full URLs when they've connected them, so that I have every public profile they chose to share.
19. As a user, I want guests without any connected profiles to still appear with their name, so that the list is complete.
20. As a user, I want each guest's Luma profile link, so that I can open their page on Luma.
21. As a user, I want each guest's short bio when they have one, so that Claude can rank them better.
22. As a user, I want myself left out of the guest list I'm ranked against, so that I'm not told to network with myself.
23. As a user, I want the loaded guest list to go straight into the Claude ranking, so that I get recommendations without extra steps.
24. As a user, I want to export the guest list as a JSON array, so that I can use it in other tools such as Claude.ai.
25. As a user, I want to paste an event link instead of picking from my events, so that I can load an event that isn't in the list.
26. As a user, I want to paste my personal ticket link (the one with `tk=` from my confirmation email), so that I can load the guest list even without connecting Luma.
27. As a user who pasted a public event link without being connected, I want to be told to connect Luma or use my personal ticket link, so that I know how to fix it.
28. As a user who pasted a link to an event whose host hid the guest list, I want a clear message saying the host hid it, so that I don't think the app is broken.
29. As a user who pasted something that isn't a Luma link, I want a clear message showing what a valid link looks like, so that I can correct it.
30. As a user whose network drops while loading, I want a friendly error and a retry option, so that I don't lose my place.
31. As a user when Luma doesn't answer in time, I want the loading to stop with a message, so that the app doesn't hang forever.
32. As a user, I want to disconnect Luma from inside the app, so that I stay in control of my account.
33. As a privacy-conscious user, I want my Luma session to stay on my phone and never reach RoomRadar's server, so that nobody else can act as me on Luma.
34. As a privacy-conscious user, I want guest lists to live only in memory, so that nothing about other guests is stored after I close the app.
35. As a user on web, I want the connect screen to explain that connecting Luma needs the phone app, and to offer the sample event and paste options, so that the web version is still useful.
36. As a user on web, I want my personal ticket link to work, so that I can load a real guest list without the phone app.
37. As a demo presenter, I want the sample event to keep working without a Luma account, so that the demo never depends on a live login.
38. As a teammate, I want the Luma endpoint knowledge in one place, so that I can fix it quickly if Luma changes its internal API.
39. As a teammate, I want the Luma logic covered by automated tests that use fictional data, so that I can change it without breaking loading and without committing real guest data.
40. As a domain expert testing the app, I want the error messages in plain language, so that non-technical job seekers understand what to do.

## Implementation Decisions

**Luma's internal web API (verified 2026-10-17 against a real event in a signed-in browser):**
- API host: `api.luma.com`. The previously configured hosts (`api2.luma.com`, `api.lu.ma`) are dropped.
- Sign-in check: the "upcoming events" endpoint (`/home/get-events?period=future`) returns 200 with a session and 401 without one. The old `/user/get-self` endpoint returns 404 and is removed.
- Your events: the same endpoint returns entries containing an `event` with `api_id`, `name`, `url` (the slug), `start_at`, `timezone` and `show_guest_list`, plus pagination (`has_more`, `next_cursor`).
- Link to event ID: `/url?url=<slug>` (works without sign-in).
- Guest list: `/event/get-guest-list?event_api_id=<id>&pagination_limit=100[&pagination_cursor=…]` returns `entries[].user` and pagination. It works with a session, or without one when `ticket_key=<tk>` from the personal ticket link is added. Without either it returns 401.
- Guest user fields available: `api_id`, `name`, `first_name`, `last_name`, `username`, `bio_short`, `avatar_url`, `linkedin_handle` (form `/in/<handle>`), `twitter_handle`, `instagram_handle`, `tiktok_handle`, `youtube_handle`, `website`, `is_verified`.
- These are Luma's undocumented internal endpoints. Luma's official MCP server was evaluated and rejected: it only returns guest lists for events the user hosts or manages, and needs an interactive OAuth client.

**Architecture:**
- **Luma client module (new, the single test seam):** a pure module created with an injected transport `getJson(path) → { status, body }`. It holds all Luma knowledge: endpoints, pagination, sign-in detection, event filtering, error mapping. It has no React or WebView dependency. Interface:
  - `isSignedIn(): Promise<boolean>`
  - `listMyEvents(): Promise<LumaEvent[]>`: upcoming events with `show_guest_list` true, sorted by start time
  - `fetchGuests(linkOrSlug, onProgress?): Promise<Guest[]>`: accepts a full link, a link with `tk`, or a bare slug; resolves to an event ID; follows all pages up to a safety cap; passes `ticket_key` when the link has one
  - Typed errors with user-facing messages: not signed in, guest list hidden or empty, event not found, Luma unreachable or timed out, invalid link
- **Luma bridge (existing, slimmed down):** the hidden WebView sitting on `luma.com` stays the transport on the phone. It only executes requests with the user's cookies and hands responses to the client. It no longer contains endpoint logic.
- **Endpoint config (existing):** updated to the verified host and paths above, still the one place to edit if Luma changes.
- **Normalizer (existing):** extended so `GuestLinks` also carries `tiktok` and `youtube`, built as full URLs from Luma handles, alongside the existing LinkedIn/X/Instagram/website handling. Link parsing keeps the `tk` value instead of discarding the query string.
- **Data shapes:**
  ```ts
  type GuestLinks = { linkedin?: string; twitter?: string; instagram?: string;
                      tiktok?: string; youtube?: string; website?: string };   // tiktok, youtube: new
  type LumaEvent = { apiId: string; name: string; slug: string; startAt: string; timezone?: string };  // new
  ```
  `Guest` is otherwise unchanged. The JSON output is a plain `Guest[]` array.
- **Screens and flow:**
  - A connect screen is shown on first launch when Luma isn't connected. It offers "Connect Luma" (opens Luma's sign-in page in an in-app WebView) and "Try the sample event".
  - After sign-in, the app verifies with `isSignedIn()` before treating Luma as connected.
  - The home screen shows the user's events list, plus the paste-a-link field, the sample event and paste-a-guest-list options.
  - Tapping an event loads its guests and goes to the existing results/ranking screen.
  - A disconnect option clears Luma's cookies in the WebView.
  - A "connected" flag may be remembered locally, but the real check is always `isSignedIn()`.
- **Export:** the existing JSONL export switches to a JSON array of `Guest`.
- **Self-exclusion:** the signed-in user is removed from the loaded guest list by Luma user ID when known (otherwise by name, per the existing `myName` plan in the build spec).
- **Web:** no Luma sign-in (browsers block cross-site cookies). The connect screen explains this. Ticket links are loaded through the same client with a plain `fetch` transport. If Luma's CORS blocks this in the browser, the web keeps the sample and paste modes only. No server-side session handling is added.
- **Privacy:** the Luma session lives only in the phone's WebView cookie store. Ticket keys are never logged or sent to RoomRadar's server. Guest data stays in memory, as today.

## Testing Decisions

- **What makes a good test here:** tests exercise the Luma client only through its public interface (`isSignedIn`, `listMyEvents`, `fetchGuests`) with a fake transport that returns fictional Luma responses keyed by path. They assert on the returned guests, events and errors, not on internal calls or request order beyond what the behavior requires.
- **Behaviors to cover at the seam:**
  - Signed in (200) vs signed out (401) detection
  - Event list: filters out hidden guest lists and past events, sorted by date
  - Guest loading: slug → event ID → multiple pages concatenated, with progress reported
  - Ticket links: `tk` passed as `ticket_key`
  - Errors: 401 without session or `tk` → not-signed-in error; empty or hidden list → hidden error; unknown slug → not-found error; transport failure or timeout → unreachable error; invalid input → invalid-link error
  - Page safety cap respected
- **Normalizer tests (existing, extended):** TikTok/YouTube handles become full URLs; LinkedIn `/in/<handle>` becomes a full URL; guests without links keep their name; `tk` survives link parsing.
- **Prior art:** the existing Vitest normalizer tests, which already use fictional Luma payloads.
- **Not unit-tested:** the WebView bridge and the screens. They get a manual test on a phone with Expo Go against the team's own Luma event.
- **Data rule:** all fixtures are fictional. No real guest data is committed.
- Checks before every push: typecheck and tests.

## Out of Scope

- Luma's official MCP server and its OAuth flow (host-only guest lists).
- Signing in to Luma on web/PWA, or storing Luma sessions on a server.
- Apify LinkedIn enrichment and web research about guests (separate stretch item).
- Past events, events the user hosts as a host-only view, and waitlist or pending guests as a separate category.
- Writing anything to Luma (RSVPs, messages, approvals).
- Persisting guest lists between app sessions.
- Changes to the Claude ranking prompt or ranking logic beyond receiving the richer `Guest` links.

## Further Notes

- Luma's endpoints are undocumented and may change without notice. When loading breaks: open an event on luma.com in a signed-in browser, watch the network requests for the guest list, and update the endpoint config. The client tests will show which behavior broke.
- Using a user's own session to read guest lists they can already see is the design choice that keeps this within what the user is allowed to see. Still, scraping Luma's internal API is not an official integration, which the README should mention.
- The personal ticket link (`tk`) acts like a password for that guest list. Treat it like one: don't log it, don't store it, don't send it to the server.
- File ownership: per the build spec, the Luma bridge and login screen belong to the "Luma phone test" issue (#1). Tell that owner before merging this branch.
