# 05: Ticket link on web

**What to build:** On web, pasting a personal ticket link (with `tk=`) loads that event's guest list without any Luma sign-in. If Luma blocks the request from the browser (CORS), the paste field shows a clear message pointing to the phone app or paste mode.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] On web, the event-link field is shown and accepts ticket links
- [ ] A ticket link loads the guest list and opens the ranking
- [ ] A public link without `tk` explains that web needs the personal ticket link
- [ ] A blocked browser request shows a clear message instead of a generic error
- [ ] Ticket keys are never logged or sent to RoomRadar's server
- [ ] Typecheck and tests pass
