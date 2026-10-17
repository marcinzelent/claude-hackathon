// Copies your screen recording into public/clips/ so the final video can play it, and makes the sounds.
//
//   npm run final                         looks for out/RoomRadar_final.mp4 (in video/ or the project root)
//   npm run final -- ~/Desktop/rec.mp4    or use any file

import { copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const DEST = path.resolve("public/clips/RoomRadar_final.mp4");
const candidates = [process.argv[2], "out/RoomRadar_final.mp4", "../out/RoomRadar_final.mp4", "public/clips/RoomRadar_final.mp4"];
const src = candidates.find((f) => f && existsSync(f));

if (!src) {
  console.error("Can't find your recording. Put it at video/out/RoomRadar_final.mp4, or run: npm run final -- /path/to/your.mp4");
  process.exit(1);
}
await mkdir(path.dirname(DEST), { recursive: true });
if (path.resolve(src) !== DEST) await copyFile(src, DEST);
console.log(`Using ${src} (${Math.round((await stat(DEST)).size / 1e6)} MB)`);

if (!existsSync("public/sfx/music.wav")) execFileSync("node", ["make-sounds.mjs"], { stdio: "inherit" });
