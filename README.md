# RoomRadar

**One line:** Helps job seekers who want to work in AI find out who to talk to at an AI meetup, why, and what to ask them.

## The problem
- **Audience:** job seekers trying to break into AI, for example career changers, bootcamp grads and junior engineers in Berlin.
- **Their problem with AI today:** the AI industry hires through networks. Meetups are full of the right people, but newcomers don't know who's who, what to ask, or how to start the conversation.
- **What the demo lets them do:** paste a Luma event link, and Claude ranks the guest list for *their* goal. For each person it says why they're worth meeting, gives a conversation opener, and names one thing about AI work they could learn from them.

## What it does
1. You upload your CV or LinkedIn PDF (on linkedin.com: your profile → Resources/More → Save to PDF), and Claude fills in the job you should look for and your background. You can also type them.
2. You load the guests:
   - **From Luma (mobile app):** sign in to Luma once inside the app, then paste an event link you're registered for.
   - **Sample event:** a fake Berlin AI meetup, used for the demo.
   - **Paste:** names copied from Luma's guest list, or Luma's guest-list JSON.
3. Claude ranks everyone from 0 to 100. Each card shows *why*, *say hi* (an opener) and *learn from them*, plus the person's public links.
4. You can export the ranked list as JSONL.

## How Claude is used
- **Model:** `claude-opus-5-5` through the Anthropic TypeScript SDK, with structured outputs (a Zod schema) so the app always gets valid JSON back. Server-side refusal fallbacks are switched on (`fallbacks: "default"`).
- **What Claude reads:** your goal and background, plus each guest's name, short bio and *which* links they listed. It doesn't get the link URLs.
- **CV import** (`app/api/profile+api.ts`, prompt in `prompts/cvImport.ts`): Claude reads the uploaded PDF and suggests your target role and a short background, leaving out contact details. The PDF isn't stored.
- **What Claude produces:** a score, a one-line reason, a conversation opener and a learning tip for every guest. It's told never to invent employers or titles, and to say so plainly when a profile is thin.
- **Where:** the call runs in a server route (`app/api/rank+api.ts`), so the API key never reaches the phone. The prompt lives in `prompts/rank.ts`.

## Privacy by design
- Your Luma sign-in stays on your phone. A hidden WebView makes the requests from inside Luma's own page, so the app never reads, stores or uploads your Luma session.
- Guest data only lives in memory and is gone when you close the app. Nothing is saved on a server.
- It only shows guests that you could already see on Luma yourself.
- The demo and video use **fake sample guests** (`data/sample-guests.json`), not real people.

## How to run it
```bash
cp .env.example .env    # paste your ANTHROPIC_API_KEY into .env (git-ignored, never commit it)
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

## Project layout
| Path | What it is |
|---|---|
| `app/index.tsx` | Home screen: your goal, event link, sample and paste options |
| `app/results.tsx` | Ranked guest cards and JSONL export |
| `app/login.tsx` | Luma sign-in inside the app |
| `app/api/rank+api.ts` | Server route that calls Claude to rank guests |
| `app/api/profile+api.ts` | Server route where Claude reads your CV PDF |
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
- [AsyncStorage](https://github.com/react-native-async-storage/async-storage)
- [Zod](https://zod.dev) and [Vitest](https://vitest.dev)
- [Luma](https://luma.com) (event data, through the user's own signed-in session)
