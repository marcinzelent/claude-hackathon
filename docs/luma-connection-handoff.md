# Luma connection: handoff to the next feature

The Luma connection is a **background step**, not a screen of its own. It gets the guest list of an event the user is registered for, with every guest's connected profiles, and hands it to the next step, which already exists on `main`: Claude ranks the guests on the event's People screen. What the user sees next belongs to that step.

## What's a test screen
- The ticket-link field, the "Import guest list" button and the Guest list screen (`app/guests.tsx`) are **test and demo screens**. They show that the import works and let you copy the JSON.
- In the real flow the user doesn't press "Import". On `main` they tap **Find who to meet** on an event, the import runs, and the People screen comes up.
- The connect screen (`app/connect.tsx`) and the Luma sign-in (`app/login.tsx`) stay user-facing: the user has to sign in once.

## How to call it
All Luma logic is behind one client (`src/luma/client.ts`). On the phone and the web, get it from `useLuma()` (`src/luma/LumaBridge.tsx`):

| Call | Returns | Notes |
|---|---|---|
| `isSignedIn()` | `boolean` | Phone only. Web always has to use a ticket link. |
| `listMyEvents()` | `LumaEvent[]` | Upcoming events you're registered for whose guest list you may see, sorted by start. Phone only. |
| `fetchGuests(linkOrSlug)` | `Guest[]` | An event link, slug, or personal ticket link (`?tk=…`). The ticket link works on the web too. |

Errors come back as `LumaError` with a `kind` (`invalid-link`, `not-signed-in`, `not-found`, `hidden`, `unreachable`) and a plain-language `message` you can show as is.

## What you get (the contract)
A list of `Guest` objects from `src/types.ts`, in memory (no file, no export). One guest looks like this:

```json
[
  {
    "id": "usr-…",
    "name": "Alex Example",
    "username": "alexexample",
    "bio": "ML engineer at a fictional startup",
    "avatarUrl": "https://…",
    "lumaUrl": "https://luma.com/user/alexexample",
    "links": {
      "linkedin": "https://www.linkedin.com/in/alexexample",
      "twitter": "https://x.com/alexexample",
      "instagram": "https://www.instagram.com/alexexample",
      "tiktok": "https://www.tiktok.com/@alexexample",
      "youtube": "https://www.youtube.com/@alexexample",
      "website": "https://example.com"
    }
  }
]
```

Every field except `id`, `name` and `links` can be missing, and `links` only holds the profiles a guest connected on Luma. `links.linkedin` is the input for the LinkedIn feature (Apify).

## The next step is already on `main`
`luma-guests` is the same feature as this one, built on top of `main`. On `main` the flow after the import already exists:

1. **Events** (`app/events.tsx`): Claude suggests events that fit the user's goal.
2. **Event details** (`app/event/[slug]/index.tsx`): the user taps **Find who to meet**. That calls `luma.fetchGuests(...)`, which is this import, then `setGuests(event.name, guests)`.
3. **People** (`app/event/[slug]/people.tsx`, which reuses `app/results.tsx`): Claude ranks the guests for the user's goal, with headshots, why, opener and what to learn.

So the import screen on this branch isn't needed on `main`; the guest list goes straight into step 3.

What `main` doesn't have yet, and this branch adds:
- **Guest lists on the web:** `main` tells web users to use the phone app. This branch's ticket-link relay (`app/api/luma+api.ts`, `src/luma/proxy.ts`) lets `fetchGuests` take a `?tk=` link on the web too.
- **All connected socials:** TikTok and YouTube on top of LinkedIn, X, Instagram and website.

## Gaps to close so it plugs into `main` seamlessly
1. **Types:** `main`'s `GuestLinks` has no `tiktok`/`youtube`; add them (and their labels in `app/results.tsx`). `main`'s `LumaEvent` uses `id`, this branch uses `apiId`; keep `main`'s. The ranking route sends `Object.keys(links)`, so new link types reach Claude without other changes.
2. **Web entry point for the ticket link:** `main`'s event page calls `luma.fetchGuests(event.id)`, and its bridge refuses on the web. Port this branch's web transport and relay, and give the event page a ticket-link field on the web (Luma only gives guests a `?tk=` link, so the app can't know it).
3. **LinkedIn for guests who didn't connect it:** built on this branch, not verified live (no Apify run yet). Only for the demo event, where every guest is a teammate who agreed; it's not meant to go live as is.
   - **How:** `POST /api/find-linkedin` with the guest list. For up to 10 guests with a first and last name but no LinkedIn link, Claude's web search suggests up to 2 `linkedin.com/in/` links, Apify loads each one (`src/server/apify.ts`, copied unchanged from `main`), the name must match, and Claude checks something else agrees (company, job, city, website). A hit comes back as `guest.linkedinGuess = { url, reason }` and shows as "Possible LinkedIn" on the guest card.
   - **Code:** logic and limits in `src/server/findLinkedin.ts` (tested with fakes in `tests/findLinkedin.test.ts`), real Claude and Apify steps in `src/server/linkedinSteps.ts`, prompts in `prompts/findLinkedin.ts`. Needs `APIFY_TOKEN` in `.env`.
   - **Into the ranking on `main`:** the matched profile is already in Apify's one-hour cache, so `app/api/rank+api.ts` can add it to `linkedin[g.id]` the way it does for the team event (`fetchLinkedinProfile(g.linkedinGuess.url)`).
   - **Before it could go live:** a name search can still pick the wrong person, and looking up guests who only shared their name needs consent under GDPR. `main` deliberately doesn't do this for real events.

## What to know before merging
- **LinkedIn of other guests isn't scraped on `main`.** `app/api/linkedin+api.ts` only looks up the user's *own* profile. Other guests are ranked from their Luma name, bio and which links they listed. The only exception is our team event, where teammates agreed to have their LinkedIn fetched.
- **Automatic import:** nothing fetches guest lists by itself; the user taps **Find who to meet**. Background fetching while the app is closed isn't possible in Expo Go.
- **Leaving yourself out:** Luma doesn't return the signed-in user's own ID. `main` filters the user out by their LinkedIn link.
- **Overlapping files:** this branch and `main` both changed `src/luma/LumaBridge.tsx`, `config.ts`, `normalize.ts`, `app/index.tsx`, `app/login.tsx` and `app/results.tsx`. Port the three pieces above onto `main` rather than merging the branch as is.
