# Event Wingman: build spec

Who to meet at tonight's networking event, and what to say to them.
Design and reasoning: [docs/designs/event-wingman.md](designs/event-wingman.md). This file is the **contract** the team builds against, so people can work in parallel without waiting on each other.

**Deadline 16:00. Feature freeze 15:00 (video). Submit by 15:45.**

## 1. The demo in one paragraph
A job seeker opens the app on their phone, sees tonight's event, picks "I am <name>" (or "not on the list"), pastes their LinkedIn About + Experience and one line like "I want to meet people hiring junior product managers". They tap **Find my people**. Claude returns the 3 best people to talk to, each with a fit score, why, an icebreaker and a follow-up question. A **Do it yourself** panel gives them a copyable prompt to do the same in Claude.ai at any event. A **Paste attendees** tab lets them paste names and headlines from any event page instead of using the pre-loaded event.

## 2. Must ship vs. stretch
**Must ship:** profile in → ranked cards from Claude → Do it yourself panel → README → video.

**Cut in this order when behind** (cut from the top first):
1. `web_search` stretch (#stretch)
2. PWA install + offline
3. Met ✓ check marks
4. Apify enrichment (use hand-pasted teammate bios in `data/profiles.json` instead)
5. Luma import (hand-write `data/event.json`)

## 3. Stack and how to run
- Backend: Python 3.11+, FastAPI, `anthropic` SDK, `python-dotenv`, `httpx`. One file: `server.py`.
- Frontend: plain HTML/CSS/JS in `public/`, no build step, no framework.
- Run: `pip install -r requirements.txt && uvicorn server:app --reload`, open http://localhost:8000
- Secrets in `.env` only (git-ignored): `ANTHROPIC_API_KEY` (required), `APIFY_TOKEN` (only for `scripts/enrich.py`).

## 4. File ownership (one owner per file, avoid editing others' files)

| File / folder | Owner issue | Notes |
|---|---|---|
| `server.py`, `requirements.txt`, `.env.example` | Backend API | |
| `prompts/match.md` | Matching prompt | Loaded by `server.py` at request time, so edits apply without restarting |
| `data/sample_event.json` | Sample data | Committed. **Fake people only.** |
| `public/index.html`, `public/app.js`, `public/style.css` | Frontend | |
| `public/mock/*.json` | Frontend | Fake API responses for building before the backend is ready |
| `public/diy.js` | Do it yourself panel | Renders into `<section id="diy">` in `index.html` |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` | PWA | Needs a 2-line snippet in `index.html`: ask the Frontend owner |
| `scripts/import_luma.py`, `scripts/enrich.py` | Data pipeline | |
| `data/event.json`, `data/profiles.json` | Data pipeline | **Git-ignored**, real teammates' data. Never commit. |
| `README.md` | README + submission | |

## 5. Data files

### `data/sample_event.json` (committed, fake)
Used whenever `data/event.json` or `data/profiles.json` is missing. 8–10 **fictional** Berlin attendees with varied roles (recruiter, startup founder, engineering manager, career-changer, UX lead, VC analyst...). Profiles go directly inside each guest entry.
```json
{
  "event": { "name": "Berlin Tech Careers Night", "date": "2026-10-17T18:30:00+02:00", "venue": "Factory Görlitzer Park", "url": "https://lu.ma/example" },
  "guests": [
    {
      "id": "g1",
      "name": "Lena Hoffmann",
      "headline": "Talent Partner at Fernweh Mobility (fictional)",
      "about": "I hire product and data people for a 120-person mobility startup...",
      "experience": [ { "title": "Talent Partner", "company": "Fernweh Mobility", "years": "2023–now" } ]
    }
  ]
}
```

### `data/event.json` (git-ignored, real, written by `scripts/import_luma.py`)
```json
{
  "event": { "name": "...", "date": "...", "venue": "...", "url": "https://lu.ma/..." },
  "guests": [ { "id": "g1", "name": "...", "linkedin_url": "https://www.linkedin.com/in/..." } ]
}
```

### `data/profiles.json` (git-ignored, real, written by `scripts/enrich.py`, or by hand if Apify fails)
Keyed by guest id. Same profile fields as the sample.
```json
{ "g1": { "headline": "...", "about": "...", "experience": [ { "title": "...", "company": "...", "years": "..." } ] } }
```

**Server rule:** if both `event.json` and `profiles.json` exist, merge them (guest + its profile); otherwise use `sample_event.json` and set `"sample": true` in responses.

## 6. API contract
All responses are JSON. On failure: HTTP 4xx/5xx with `{ "error": "<friendly message for the user>" }`.

### `GET /api/event`
Never returns `about`, `experience` or `linkedin_url` (no raw profile data leaves the server).
```json
{
  "event": { "name": "...", "date": "...", "venue": "...", "url": "..." },
  "guests": [ { "id": "g1", "name": "Lena Hoffmann", "headline": "Talent Partner at ..." } ],
  "sample": true
}
```

### `POST /api/match`
Request:
```json
{
  "me_guest_id": "g3",
  "my_profile": "pasted LinkedIn About + Experience text",
  "goal": "I want to meet people hiring junior product managers",
  "attendees_text": null
}
```
- `me_guest_id`: the user's own guest id, or `null` for "not on the list". The server **removes this guest from the candidates** before calling Claude.
- `attendees_text`: if non-empty, ignore the loaded event and match against this pasted text (the **Paste attendees** tab).
- `my_profile` and `goal` are required (400 with a friendly error if empty).

Response:
```json
{
  "matches": [
    {
      "guest_id": "g1",
      "name": "Lena Hoffmann",
      "fit": 9,
      "why": "She hires product people at a mobility startup, and you spent 3 years in logistics.",
      "icebreaker": "You're hiring for product at Fernweh. What do you look for in someone coming from operations?",
      "follow_up": "Which teams are growing next quarter?"
    }
  ],
  "tip": null,
  "sample": true
}
```
- `matches`: sorted by `fit` (1–10, how well this person serves the user's goal), length `min(3, number of candidates)`.
- `guest_id` is `null` for matches from `attendees_text`.
- `tip`: one sentence when the user's profile is thin (for example "Add your last two roles for sharper matches"), else `null`.
- Claude must cite only facts from the supplied text and write "not enough info" rather than invent facts.
- Model: one constant `MODEL` at the top of `server.py`. Check the current model id on docs.claude.com. Use structured JSON output.

## 7. Frontend behavior
- **Screens (one page):** event card (with a "Sample data" badge when `sample` is true) → "Me" form (I am… dropdown from `/api/event`, profile textarea, goal input, tabs: *This event* / *Paste attendees*) → **Find my people** button → result cards → Do it yourself panel.
- **Loading:** button disabled + "Claude is reading the room…" while waiting (up to ~20 s).
- **Errors:** show the server's `error` text in a friendly box; keep the previous results visible.
- **Last result:** save the last `/api/match` response in `localStorage` and render it on load, so it works offline. (The service worker can't cache POST responses.)
- **Met ✓:** a toggle per card, stored in `localStorage` keyed by name. Visual only.
- **Mock mode:** `?mock=1` in the URL makes `app.js` read `public/mock/event.json` and `public/mock/match.json` instead of calling the API.
- Mobile first: works at 360 px wide; big tap targets.
- Every `localStorage` access is wrapped in try/catch.

## 8. Do it yourself panel (the AI-education part, worth Impact points)
`public/diy.js` renders into `<section id="diy">`:
1. A copyable prompt template with the placeholders `[MY PROFILE]`, `[WHAT I WANT TONIGHT]`, `[ATTENDEE NOTES]`, plus a **Copy** button.
2. Three short steps on collecting attendee notes by hand: the event page guest list, the speaker list, asking the organizer.
3. An **Open Claude.ai** link (https://claude.ai/new).

The template text must stay in sync with `prompts/match.md` (same instructions, placeholders instead of data).

## 9. Privacy and rules
- `data/event.json` and `data/profiles.json` are git-ignored. Add them to `.gitignore` in the first backend commit.
- Apify only scrapes URLs listed in `data/event.json` (consenting teammates). The app never scrapes a URL typed in by a user.
- Ask an organizer if consenting teammates' own profiles are OK; write the answer in the README. If they say no, demo on sample data.
- No API keys in code or commits. No AI-attribution lines needed anywhere.

## 10. Demo-day timeline
| Time | What |
|---|---|
| now–13:00 | Luma event + Apify test + organizer question; backend skeleton on sample data; frontend on mock data; sample data + first prompt draft |
| 13:00–13:45 | Lunch. Something must already run. |
| 13:45–14:15 | Wire frontend to real API; DIY panel; prompt tuning with the domain expert; run `enrich.py` |
| 14:15–14:45 | Real guests, Paste attendees tab, then cut-list items only if ahead |
| 14:45–15:00 | Domain expert tests every screen; fix demo blockers only |
| 15:00 | Feature freeze, record video |
| 15:15–15:45 | README, make repo public, submit form |
