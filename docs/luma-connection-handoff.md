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
`Guest` from `src/types.ts`; `toGuestJson()` in `src/luma/normalize.ts` turns a list into this JSON:

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
- **Guest list as JSON:** `toGuestJson()` plus copy and download.

## What to know before merging
- **LinkedIn of other guests isn't scraped on `main`.** `app/api/linkedin+api.ts` only looks up the user's *own* profile. Other guests are ranked from their Luma name, bio and which links they listed. The only exception is our team event, where teammates agreed to have their LinkedIn fetched.
- **Automatic import:** nothing fetches guest lists by itself; the user taps **Find who to meet**. Background fetching while the app is closed isn't possible in Expo Go.
- **Leaving yourself out:** Luma doesn't return the signed-in user's own ID. `main` filters the user out by their LinkedIn link.
- **Overlapping files:** this branch and `main` both changed `src/luma/LumaBridge.tsx`, `config.ts`, `normalize.ts`, `app/index.tsx`, `app/login.tsx` and `app/results.tsx`. Port the three pieces above onto `main` rather than merging the branch as is.
