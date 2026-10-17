# 02: Your events after login

**What to build:** Once Luma is connected, home shows the user's upcoming Luma events whose guest list they're allowed to see, each with name and date. Tapping an event loads the whole guest list with visible progress and then runs the Claude ranking. If there are no such events, a friendly empty state offers pasting a link or trying the sample event. Pasting an event link (public or personal ticket link) keeps working.

**Blocked by:** 01 (Connect Luma at startup)

**Status:** done (branch ticket/02-your-events)

- [x] Home lists upcoming events with a visible guest list, soonest first, with name and date
- [x] Tapping an event loads all guest-list pages with progress ("Loaded N guests…") and opens the ranking
- [x] Empty state offers paste-a-link and the sample event
- [x] Errors (hidden list, not signed in, unreachable) show the client's plain-language messages
- [ ] Pasting a public or ticket link still works (code path untouched; needs on-phone check)
- [x] Typecheck and tests pass

_Note: list, tap, empty state and errors verified by typecheck and review only; on-phone check pending._
