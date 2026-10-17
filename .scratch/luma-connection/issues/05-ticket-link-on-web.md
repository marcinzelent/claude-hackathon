# 05: Ticket link on web

**What to build:** On web, pasting a personal ticket link (with `tk=`) loads that event's guest list without any Luma sign-in. If Luma blocks the request from the browser (CORS), the paste field shows a clear message pointing to the phone app or paste mode.

**Blocked by:** None (can start immediately)

**Status:** won't do. Luma's API blocks browser requests from other origins (CORS). This was checked on 2026-10-17 from the local web app: both `/url` and `/event/get-guest-list?ticket_key=…` fail with "Failed to fetch". Following the spec, web keeps the sample event and paste mode only, and no server proxy is added, so ticket keys never reach our server. The web connect screen copy now says this, and the event-link field stays hidden on web.

- [x] A blocked browser request doesn't produce a confusing promise: web copy no longer mentions ticket links
- [x] Ticket keys are never logged or sent to RoomRadar's server
- [x] Typecheck and tests pass
- [ ] ~~On web, a ticket link loads the guest list~~ (not possible: CORS)
