# 05: Ticket link on web

**What to build:** On web, pasting a personal ticket link (with `tk=`) loads that event's guest list without any Luma sign-in. If Luma blocks the request from the browser (CORS), the paste field shows a clear message pointing to the phone app or paste mode.

**Blocked by:** None (can start immediately)

**Status:** done, via a server relay. Luma's API blocks browser requests from other origins (CORS, checked 2026-10-17), so the web version calls our own narrow route `/api/luma`. That route only allows the event lookup and the guest list, and the guest list only with a `ticket_key`. It sends no cookies and doesn't log or store anything. Verified live on 2026-10-17: a real ticket link imported 3 guests on the web. Decision change: the spec originally ruled out sending ticket keys to our server; the team needs the import to run on the web for anyone who clones the repo, so the relay was accepted with these limits.

- [x] On web, the event-link field is shown and accepts ticket links
- [x] A ticket link loads the guest list and opens the guest list screen
- [x] A public link without `tk` explains that web needs the personal ticket link
- [x] A blocked request shows a clear message (proxy answers 401/400/502, mapped to the client's plain-language errors)
- [x] Ticket keys are never logged or stored; they're only relayed to Luma
- [x] Typecheck and tests pass (`tests/proxy.test.ts`)
