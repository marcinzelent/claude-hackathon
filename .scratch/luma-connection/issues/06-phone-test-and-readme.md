# 06: Phone test and README

**What to build:** A manual pass through the whole flow on a phone with Expo Go against the team's own Luma event (connect, pick event, load guests, rank, export, disconnect), recorded as a checklist with results. The README describes the new connect-first flow, where to find the personal ticket link, and that the Luma integration uses Luma's undocumented internal API.

**Blocked by:** 01, 02, 03, 04

**Status:** README done. Phone test waiting for a person with a phone (needs Expo Go and a Luma account registered for an event with a visible guest list).

- [ ] Connect → events → guests → ranking → export → disconnect works on a real phone
- [ ] Results recorded as a checklist (pass/fail, notes)
- [x] README explains the flow, the ticket link, privacy (session stays on the phone) and the internal-API caveat
- [x] No real guest data committed

## Phone test checklist

Setup: `npm install`, `.env` with `ANTHROPIC_API_KEY`, `npx expo start`, scan the QR code with Expo Go (phone and laptop on the same Wi-Fi).

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | Open the app (fresh install, not signed in) | Connect screen with "Connect Luma" and "Try the sample event" | |
| 2 | Tap "Connect Luma", sign in on Luma's page | "Checking…", then "✓ Luma is connected.", then home | |
| 3 | Close and reopen the app | Lands on home directly (no connect screen) | |
| 4 | Enter goal + background | Events list shows your upcoming events with name and date | |
| 5 | Tap an event | "Loaded N guests…", then results with Claude's ranking | |
| 6 | Check a guest card | Profile links (LinkedIn etc.) open correctly | |
| 7 | Tap "Export as JSON" | Share sheet with a JSON array of guests | |
| 8 | Back on home, paste your personal ticket link (`?tk=`) | Guest list loads | |
| 9 | Paste a link to an event with a hidden guest list | "The host may have hidden the guest list" style message | |
| 10 | Tap "Disconnect Luma" | Returns to the connect screen. If it says "Couldn't disconnect automatically", note it: the sign-out routes are unverified | |
| 11 | If 10 failed: "Open Luma" → sign out in Luma's menu → Done | Returns to the connect screen | |
| 12 | Connect again, then sign out on luma.com in another way (or wait for expiry), reopen app | Connect screen says "Your Luma session expired…" | |
| 13 | "Try the sample event" from the connect screen | Home with the sample event button working | |
