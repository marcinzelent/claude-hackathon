# Luma connection: handoff to the next feature

The Luma connection is a **background step**, not a screen of its own. It gets the guest list of an event the user is registered for, with every guest's connected profiles, and hands it to the next feature (LinkedIn and web research, then ranking). What the user sees next belongs to that feature.

## What's a test screen
- The ticket-link field, the "Import guest list" button and the Guest list screen (`app/guests.tsx`) are **test and demo screens**. They show that the import works and let you copy the JSON.
- In the real flow the user doesn't press "Import". When they pick an event (or the app opens and finds new events), the import runs on its own and the next feature's screen comes up.
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

## What's not built yet
- **Automatic import:** nothing fetches guest lists by itself yet. The next feature should call `listMyEvents()` when the app opens and `fetchGuests(event.slug)` for each new event. Background fetching while the app is closed isn't possible in Expo Go.
- **Handover to LinkedIn:** the guest list isn't passed to the Apify LinkedIn feature on `main` yet. The teammate branch `luma-guests` already matches Luma guests to LinkedIn data, so that's the natural place to join them.
- **Leaving yourself out:** Luma doesn't return the signed-in user's own ID, so the user is still in the list. `luma-guests` filters them out by their LinkedIn link.
