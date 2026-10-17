// Records the real app clicking through RoomRadar at phone size, for the demo video.
//
//   1. In the project root, start the app:   npx expo start   (with your keys in .env)
//   2. In video/:                            npm run record             (sample event)
//                                     or     npm run record -- --team   (team demo event, needs the organizer's OK)
//
// Writes public/clips/app.webm and public/clips/marks.json, which the video picks up automatically.

import { chromium } from "playwright";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:8081";
const TEAM = process.argv.includes("--team");
const OUT = path.resolve("public/clips");
const TMP = path.resolve("out/recording-tmp");

// A fictional job seeker, so the video shows no real person's data.
const GOAL = "My first job as an ML engineer";
const BACKGROUND = "4 years as a data analyst at a logistics company, just finished an AI bootcamp";

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({
    viewport: { width: 430, height: 930 },
    recordVideo: { dir: TMP, size: { width: 430, height: 930 } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const marks = {};

  // Fresh start: clear saved profile so onboarding shows.
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForURL(/onboarding/, { timeout: 30000 });
  await pause(800);

  // Step 1: profile
  marks.profile = { start: now() };
  await pause(1500);
  await page.getByPlaceholder("e.g. My first job as an ML engineer").pressSequentially(GOAL, { delay: 70 });
  await pause(800);
  await page.getByPlaceholder(/data analyst/).pressSequentially(BACKGROUND, { delay: 45 });
  await pause(3500);
  await page.getByText("Continue").click();
  marks.profile.end = now();

  // Step 2: events. Skip the wait while Claude picks events.
  await page.getByText("Just trying it out?").waitFor({ timeout: 30000 });
  await page
    .getByText(/Claude is reading/)
    .waitFor({ state: "detached", timeout: 90000 })
    .catch(() => console.warn("Event picks took too long; recording continues."));
  marks.events = { start: now() };
  await pause(3500);
  await page.mouse.wheel(0, 350);
  await pause(3500);
  await page.mouse.wheel(0, 350);
  await pause(3500);
  await page.mouse.wheel(0, 350);
  await pause(2000);
  if (TEAM) {
    await page.getByText("Find who to meet").click();
  } else {
    await page.getByText("Try with a sample event").click();
  }
  marks.events.end = now();

  // Step 3: results. Skip the wait while Claude ranks.
  await page.getByText("Say hi").first().waitFor({ timeout: 180000 });
  await pause(500);
  marks.results = { start: now() };
  await pause(4000);
  for (let i = 0; i < 9; i++) {
    await page.mouse.wheel(0, 300);
    await pause(2600);
  }
  marks.results.end = now();

  await context.close();
  await browser.close();

  const [file] = (await readdir(TMP)).filter((f) => f.endsWith(".webm"));
  await rename(path.join(TMP, file), path.join(OUT, "app.webm"));
  await writeFile(path.join(OUT, "marks.json"), JSON.stringify(marks, null, 2));
  await rm(TMP, { recursive: true, force: true });
  console.log("Saved public/clips/app.webm and marks.json:", marks);
}

main().catch((e) => {
  console.error("Recording failed:", e.message.split("\n")[0]);
  if (/Executable doesn't exist/.test(e.message)) console.error("Run `npx playwright install chromium` once, then try again.");
  else console.error(`Is the app running at ${APP_URL}? Start it with \`npx expo start\` in the project root.`);
  process.exit(1);
});
