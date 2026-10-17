# RoomRadar demo video (Remotion)

A 1:55, 16:9 (1920×1080) video: the problem, three app steps on a phone, how Claude is used, privacy, team.
The app scenes play a real screen recording of the app; until you make one they show a placeholder.

## Make the final video (about 10 minutes)
1. In the project root, start the app with your keys in `.env`:
   ```bash
   npx expo start
   ```
2. In another terminal:
   ```bash
   cd video
   npm install
   npx playwright install chromium     # once
   npm run record                      # clicks through the app with a fictional job seeker + the sample event
   npm run render                      # writes out/roomradar.mp4
   ```
   `npm run record -- --team` uses the Team demo event instead. That shows real teammates' data, so only use it
   if an organizer said that's OK.
3. Watch `out/roomradar.mp4`. To tweak, run `npm run studio` for a live preview in the browser.

## Where to change things
- Team names, repo link, scene lengths: `src/config.ts`
- Text of each scene: `src/scenes/*.tsx`
- What the recording clicks: `record.mjs`

The recording (`public/clips/`) and the rendered video (`out/`) are git-ignored.
