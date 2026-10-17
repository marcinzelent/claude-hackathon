# RoomRadar: build spec

Who to meet at tonight's AI meetup, why, how to say hi, and what to learn from them.
The app already runs (Expo, commit `ba42073`). This file is the **contract** for the remaining work, so the team can work in parallel without editing the same files.
Background and reasoning: [docs/designs/event-wingman.md](designs/event-wingman.md) (written before RoomRadar existed: the stack below replaces its Python/HTML plan).

**Deadline 16:00. Feature freeze 15:00 (video). Submit by 15:45.**

## 1. The demo in one paragraph
A job seeker trying to break into AI opens RoomRadar, types the job they want and a line about their background, and taps **Try with a sample event** (or loads a Luma event they're registered for, or pastes a guest list). Claude reads every guest and returns a ranked list. Each card shows a score, *why* this person matters for their goal, *say hi* (an opener) and *learn from them* (one thing about AI work to ask). A **Do it yourself** screen shows how to do the same with Claude.ai at any event.

## 2. Must ship vs. stretch
**Must ship:** sample event → ranked cards in under ~20 s → yourself excluded → Do it yourself screen → README → video.

**Cut in this order when behind** (cut from the top first):
1. `web_search` stretch
2. Apify LinkedIn enrichment stretch
3. Web PWA install (manifest + service worker)
4. Live Luma loading in the video (use the sample event; mention Luma in the voice-over)

## 3. Stack and how to run
- Expo SDK 58 + Expo Router, React Native (iOS/Android via Expo Go, and web), TypeScript, Zod, Vitest.
- Claude call runs in the server route `app/api/rank+api.ts` (key never reaches the phone).
- Run: `cp .env.example .env` (add `ANTHROPIC_API_KEY`), `npm install`, `npx expo start`, press `w` for web or scan the QR code with Expo Go.
- Checks before every push: `npm run typecheck && npm test`.

## 4. File ownership (one owner per file)

| File / folder | Owner issue |
|---|---|
| `app/api/rank+api.ts`, `src/rank/client.ts`, `src/types.ts` | API (#2) |
| `prompts/rank.ts` | Prompt (#4) |
| `data/sample-guests.json` | Sample data (#3) |
| `app/index.tsx`, `app/results.tsx`, `src/store.tsx`, `src/ui.tsx` | UI (#5) |
| `app/diy.tsx` | Do it yourself (#6). Needs one button in `results.tsx`: ask the UI owner |
| `src/luma/*`, `app/login.tsx`, `tests/normalize.test.ts` | Luma phone test (#1) |
| `app/+html.tsx`, `public/manifest.json`, `public/sw.js`, `public/icons/` | Web PWA (#8) |
| `src/enrich/*`, `app/api/enrich+api.ts` | Apify stretch (#7) |
| `README.md` | README + submission (#10) |

If you need a change in someone else's file, ask them or comment on their issue.

## 5. Data shapes (`src/types.ts`)
```ts
type Guest = { id: string; name: string; username?: string; bio?: string; avatarUrl?: string; lumaUrl?: string;
               links: { linkedin?: string; twitter?: string; instagram?: string; website?: string } };
type Profile = { goal: string; background: string; myName?: string };   // myName: NEW, for self-exclusion
type Match = { id: string; score: number /* 0-100 */; why: string; opener: string; learn: string };
```
`data/sample-guests.json` is an array of `Guest`, **fictional people only**.

## 6. API contract

### `POST /api/rank`
Request: `{ "profile": Profile, "guests": Guest[] }`
Response: `{ "matches": Match[] }`, or HTTP 4xx/5xx with `{ "error": "<friendly message>" }`.

Changes to make (#2):
- **Self-exclusion:** if `profile.myName` is set, drop guests whose name matches it (case- and whitespace-insensitive) before calling Claude.
- **Speed:** target under ~20 s for the 14 sample guests. If it's slower, ask Claude for full `why/opener/learn` only for the top 5 and a score + short `why` for the rest, or lower `effort`. Measure, then decide.
- Claude sees each guest's name, bio and *which* links they have, never the link URLs. Keep it that way.

### `POST /api/enrich` (stretch, #7)
Request: `{ "guests": Guest[] }`. Response: `{ "guests": Guest[] }` with `bio` extended by a LinkedIn headline/about from Apify.
Only runs when `APIFY_TOKEN` is set, only for guests with a `links.linkedin`, and only intended for the team's own consenting Luma event.

## 7. UI behavior (#5)
- Home: add an optional **"Your name on the guest list"** field (saved in the profile) so you aren't ranked against yourself.
- Results: a **Copy** button on each opener; low scores (< 40) collapsed under "Show everyone else"; a **Do it yourself** button that opens `app/diy.tsx`.
- Sample event results show "Sample" in the header (already in the event name; keep it visible).
- Mobile first, already done. Keep tap targets large.
- Guests and matches stay in memory only (privacy by design, see README). Don't persist them.

## 8. Do it yourself screen (#6, the AI-education part, Impact = 40 points)
`app/diy.tsx`:
1. One-line intro: "Use this at any event, with your own Claude."
2. A copyable prompt template with `[MY GOAL]`, `[MY BACKGROUND]`, `[GUEST LIST]` and a **Copy** button. It mirrors `prompts/rank.ts` (same instructions, placeholders instead of data).
3. Three steps to get a guest list by hand: the Luma "N Going" list, the speaker list, asking the organizer.
4. **Open Claude.ai** button → https://claude.ai/new

## 9. Privacy and rules
- Demo and video use the fake sample guests. Live Luma loading only shows guests the signed-in user can already see.
- Apify stretch: only the team's own Luma event, where all guests are teammates who agreed. LinkedIn's terms prohibit scraping; note this in the README if the stretch ships.
- No API keys in code or commits (`.env` is git-ignored).
- No AI-attribution lines in commits, PRs or docs.

## 10. Demo-day timeline
| Time | What |
|---|---|
| now–13:00 | Everyone pulls and runs the app on sample data. #1 creates the Luma event. |
| 13:00–13:45 | Lunch |
| 13:45–14:30 | #2 self-exclusion + speed, #4 prompt tuning, #5 UI tweaks, #6 DIY screen, #3 sample data polish, #1 phone test |
| 14:30–14:45 | Stretch only if must-ship is done: #8, #7, #9 |
| 14:45–15:00 | #11 domain expert test pass; fix blockers only |
| 15:00 | Feature freeze, record video |
| 15:15–15:45 | README, make repo public, submit form |
