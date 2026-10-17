# RoomRadar

**One line:** Helps job seekers who want to work in AI find out who to talk to at an AI meetup, why, and what to ask them.

## The problem
- **Audience:** job seekers trying to break into AI, for example career changers, bootcamp grads and junior engineers in Berlin.
- **Their problem with AI today:** the AI industry hires through networks. Meetups are full of the right people, but newcomers don't know who's who, what to ask, or how to start the conversation.
- **What the demo lets them do:** paste a Luma event link, and Claude ranks the guest list for *their* goal. For each person it says why they're worth meeting, gives a conversation opener, and names one thing about AI work they could learn from them.

## What it does
1. **Connect Luma** (phone app): on first launch you sign in on Luma's own page inside the app. Or tap **Try the sample event** to skip.
2. You type the job you want and a line about your background.
3. You pick the guests:
   - **Your Luma events:** once connected, home lists your upcoming events whose guest list you're allowed to see. Tap one.
   - **Event link:** paste any Luma event link you're registered for. Your **personal ticket link** (the one with `?tk=` from your confirmation email) works even without connecting Luma.
   - **Sample event:** a fake Berlin AI meetup, used for the demo.
   - **Paste:** names copied from Luma's guest list, or Luma's guest-list JSON.
4. Claude ranks everyone from 0 to 100. Each card shows *why*, *say hi* (an opener) and *learn from them*, plus the person's public profiles (LinkedIn, X, Instagram, TikTok, YouTube, website).
5. You can export the guest list, with Claude's ranking, as a JSON array.
6. **Disconnect Luma** at the bottom of home signs you out of Luma inside the app.

## How Claude is used
- **Model:** `claude-opus-5-5` through the Anthropic TypeScript SDK, with structured outputs (a Zod schema) so the app always gets valid JSON back. Server-side refusal fallbacks are switched on (`fallbacks: "default"`).
- **What Claude reads:** your goal and background, plus each guest's name, short bio and *which* links they listed. It doesn't get the link URLs.
- **What Claude produces:** a score, a one-line reason, a conversation opener and a learning tip for every guest. It's told never to invent employers or titles, and to say so plainly when a profile is thin.
- **Where:** the call runs in a server route (`app/api/rank+api.ts`), so the API key never reaches the phone. The prompt lives in `prompts/rank.ts`.

## Privacy by design
- Your Luma sign-in stays on your phone. A hidden WebView makes the requests from inside Luma's own page, so the app never reads, stores or uploads your Luma session.
- Guest data only lives in memory and is gone when you close the app. Nothing is saved on a server.
- It only shows guests that you could already see on Luma yourself.
- Your personal ticket key (`?tk=`) works like a password for that guest list: it's only sent to Luma, never logged or sent to our server.
- The demo and video use **fake sample guests** (`data/sample-guests.json`), not real people.

## How to run it
```bash
cp .env.example .env    # paste your ANTHROPIC_API_KEY into .env (git-ignored, never commit it)
npm install
npx expo start          # press w for web, or scan the QR code with Expo Go on your phone
```
- **Web:** the sample event and paste mode work. Live Luma loading needs the phone app: Luma's API blocks requests from other websites, so the web version can't load guest lists.
- **Phone:** install **Expo Go** and scan the QR code. Your phone and laptop must be on the same Wi-Fi, because the app calls the ranking route on the laptop's dev server. If that doesn't work, set `EXPO_PUBLIC_API_URL=http://<laptop-ip>:8081` in `.env`.
- **Checks:** `npm run typecheck` and `npm test`.

**Heads-up about Luma:** Luma has no public API for guest lists (its official MCP server only shows guest lists to event hosts), so `src/luma/config.ts` uses the undocumented internal endpoints that luma.com itself calls on `api.luma.com`. They were verified on 2026-10-17 but may change without notice; this is not an official Luma integration. The sign-out routes used by "Disconnect Luma" are not verified yet; if they don't work, the app lets you sign out by hand on Luma's page. If live loading fails:
1. Open the event on luma.com, open DevTools and go to the Network tab.
2. Click "N Going".
3. Copy the real request URL into `src/luma/config.ts`. The tests in `tests/client.test.ts` show which behavior broke.

Paste mode always works as a fallback. The full design is in [docs/specs/luma-connection.md](docs/specs/luma-connection.md).

## Project layout
| Path | What it is |
|---|---|
| `app/connect.tsx` | First screen: connect Luma or try the sample event |
| `app/index.tsx` | Home screen: your goal, your Luma events, event link, sample and paste options, disconnect |
| `app/results.tsx` | Ranked guest cards and JSON export |
| `app/login.tsx` | Luma sign-in (and manual sign-out) inside the app |
| `app/api/rank+api.ts` | Server route that calls Claude |
| `prompts/rank.ts` | The Claude prompt (tweak it here) |
| `src/luma/` | Luma client (all endpoint logic, tested), hidden-WebView bridge, endpoint config, parsing |
| `data/sample-guests.json` | Fake guests for the demo |
| `tests/` | Unit tests for the Luma client, parsing, dates and session state (Vitest) |

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
- [AsyncStorage](https://github.com/react-native-async-storage/async-storage)
- [Zod](https://zod.dev) and [Vitest](https://vitest.dev)
- [Luma](https://luma.com) (event data, through the user's own signed-in session)
