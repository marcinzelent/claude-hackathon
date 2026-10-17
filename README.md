# RoomRadar

**One line:** Helps job seekers who want to work in AI find out who to talk to at an AI meetup, why, and what to ask them.

## The problem
- **Audience:** job seekers trying to break into AI, for example career changers, bootcamp grads and junior engineers in Berlin.
- **Their problem with AI today:** the AI industry hires through networks. Meetups are full of the right people, but newcomers don't know who's who, what to ask, or how to start the conversation.
- **What the demo lets them do:** paste a Luma event link, and Claude ranks the guest list for *their* goal. For each person it says why they're worth meeting, gives a conversation opener, and names one thing about AI work they could learn from them.

## What it does
1. You paste your own LinkedIn link (fetched once through Apify) or upload your CV / LinkedIn PDF, and Claude fills in the job you should look for and your background. You can also type them.
2. You pick an event:
   - **Picked for you:** Claude reads the upcoming public Luma events in your city and suggests the ones that help with your job search, each with a short reason.
   - **Your Luma events (mobile app):** sign in to Luma once inside the app to see the events you're going to, or add any event by its link.
   - **Sample event:** a fake Berlin AI meetup, used for the demo.
   - **Paste:** names copied from Luma's guest list, or Luma's guest-list JSON.
3. Claude ranks everyone from 0 to 100. Each card shows *why*, *say hi* (an opener) and *learn from them*, plus the person's public links.
4. You can export the ranked list as JSONL.

## How Claude is used
- **Model:** `claude-opus-5-5` through the Anthropic TypeScript SDK, with structured outputs (a Zod schema) so the app always gets valid JSON back. Server-side refusal fallbacks are switched on (`fallbacks: "default"`).
- **What Claude reads:** your goal and background, plus each guest's name, short bio and *which* links they listed. It doesn't get the link URLs.
- **Event suggestions** (`app/api/discover+api.ts`, prompt in `prompts/events.ts`): Claude reads the names and hosts of your city's public Luma events and picks up to 8 that fit your goal.
- **CV import** (`app/api/profile+api.ts`, prompt in `prompts/cvImport.ts`): Claude reads the uploaded PDF and suggests your target role and a short background, leaving out contact details. The PDF isn't stored.
- **What Claude produces:** a score, a one-line reason, a conversation opener and a learning tip for every guest. It's told never to invent employers or titles, and to say so plainly when a profile is thin.
- **Where:** the call runs in a server route (`app/api/rank+api.ts`), so the API key never reaches the phone. The prompt lives in `prompts/rank.ts`.

## Privacy by design
- Your Luma sign-in stays on your phone. A hidden WebView makes the requests from inside Luma's own page, so the app never reads, stores or uploads your Luma session.
- LinkedIn import only fetches **your own** profile, from the link you paste. The app never looks up other guests on LinkedIn.
- Guest data only lives in memory and is gone when you close the app. Nothing is saved on a server.
- It only shows guests that you could already see on Luma yourself.
- The demo and video use **fake sample guests** (`data/sample-guests.json`), not real people.

## How to run it
```bash
cp .env.example .env    # paste your ANTHROPIC_API_KEY (and optionally APIFY_TOKEN) into .env; never commit it
npm install
npx expo start          # press w for web, or scan the QR code with Expo Go on your phone
```
- **Web:** the sample event and paste mode work. Live Luma loading needs the phone app.
- **Phone:** install **Expo Go** and scan the QR code. Your phone and laptop must be on the same Wi-Fi, because the app calls the ranking route on the laptop's dev server. If that doesn't work, set `EXPO_PUBLIC_API_URL=http://<laptop-ip>:8081` in `.env`.
- **Checks:** `npm run typecheck` and `npm test`.

**Heads-up about Luma:** Luma has no public guest API for guests, so `src/luma/config.ts` uses the internal endpoints luma.com itself calls. They weren't verified while building and may change. If live loading fails:
1. Open the event on luma.com, open DevTools and go to the Network tab.
2. Click "N Going".
3. Copy the real request URL into `src/luma/config.ts`.

Paste mode always works as a fallback.

## Team demo event (real, consenting teammates)
For the demo, our own teammates act as event guests, as if imported from Luma. All of them agreed to have their public LinkedIn profiles used. The flow in the app:
1. **Onboarding:** paste your LinkedIn link and tap *Import from LinkedIn*. Claude fills in your goal and background, and the app remembers your link.
2. **Your events → Team demo event → Find who to meet.** The server fetches the teammates' LinkedIn profiles through Apify, then Claude scores them using their full experience. You're left out automatically if your link is on the list.

Teammates' links are in `src/server/teamEvent.ts`; `TEAM_EVENT_LINKEDIN_URLS` in `.env` can override them. The first tap fetches the profiles, which takes up to a minute. They're then cached in the git-ignored `data/team-event.json` (never commit it), so later taps are instant and cost no extra Apify credit. No extra commands are needed. LinkedIn's terms prohibit scraping, so this only runs on teammates who agreed, never on profiles a user types in.

## Project layout
| Path | What it is |
|---|---|
| `app/onboarding.tsx` | First run: import your LinkedIn or CV, your goal, background and city |
| `app/events.tsx` | Picked-for-you events, your Luma events, add by link, sample and paste options |
| `app/results.tsx` | Ranked guest cards and JSONL export |
| `app/login.tsx` | Luma sign-in inside the app |
| `app/api/rank+api.ts` | Server route that calls Claude to rank guests |
| `app/api/profile+api.ts` | Server route where Claude reads your CV PDF |
| `app/api/linkedin+api.ts`, `src/server/apify.ts` | Server route that fetches your own LinkedIn profile via Apify for Claude |
| `app/api/discover+api.ts`, `app/api/luma-event+api.ts`, `src/server/luma.ts` | Server routes for public Luma events: suggestions for your city, and lookup by link |
| `src/api.ts` | The app's calls to those server routes |
| `prompts/` | The Claude prompts (tweak them here) |
| `src/luma/` | Luma bridge (hidden WebView), endpoint config and response parsing |
| `data/sample-guests.json` | Fake guests for the demo |
| `tests/` | Unit tests for parsing (Vitest) |

**Live link (if any):** <link>

## Screenshots / demo
<Drop screenshots here, or link your 2-minute demo video.>

## Team
Teams of 5 (at least 1 builder, 1 product or design, 1 domain expert; plus founder or anyone). Link each name to a GitHub or LinkedIn profile.

| Name | Role / background |
|---|---|
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) | |

## Credits
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) and Claude
- [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev) and [react-native-web](https://necolas.github.io/react-native-web/)
- [react-native-webview](https://github.com/react-native-webview/react-native-webview)
- [expo-document-picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Apify](https://apify.com) actor [harvestapi/linkedin-profile-scraper](https://apify.com/harvestapi/linkedin-profile-scraper) (your own profile only)
- [Remotion](https://www.remotion.dev) and [Playwright](https://playwright.dev) for the demo video (`video/`)
- [AsyncStorage](https://github.com/react-native-async-storage/async-storage)
- [Zod](https://zod.dev) and [Vitest](https://vitest.dev)
- [Luma](https://luma.com) (event data, through the user's own signed-in session)
