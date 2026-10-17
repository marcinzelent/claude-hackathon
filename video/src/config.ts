// Edit these for the final video.
export const TEAM = ["Mate Steinforth", "Marcin Zelent", "Robin Kryszak", "Sören Daehn", "Aigam Shamali"];
export const REPO = "github.com/marcinzelent/claude-hackathon";
export const EVENT = "Claude Impact Lab Berlin · 2026";

export const FPS = 30;

// Scene lengths in seconds. Total must stay under 120.
export const SCENES = {
  hook: 9,
  problem: 10,
  intro: 7,
  profile: 17,
  events: 15,
  results: 27,
  claude: 13,
  privacy: 9,
  outro: 8,
} as const;

export const TOTAL_SECONDS = Object.values(SCENES).reduce((a, b) => a + b, 0);

export const colors = {
  bg: "#0E0D16",
  bg2: "#17152A",
  text: "#F4F2FF",
  muted: "#A29FBF",
  accent: "#7C6CFF",
  accentSoft: "#2A2550",
  good: "#3DD68C",
  warm: "#FFB86B",
  card: "#1D1A33",
  border: "#2E2A4D",
};

export const font =
  'Inter, "SF Pro Display", -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// --- The final cut (`npm run final`): your own screen recording plus music and sound effects.
export const FINAL = {
  // Put your recording here (npm run final copies it in from out/ for you).
  file: "clips/RoomRadar_final.mp4",
  // Keep the sound of the recording itself, e.g. if you talked over it. The music gets quieter under it.
  keepRecordingAudio: false,
  music: 0.32,
  sfx: 0.7,
  // Scene lengths in seconds around the demo. The demo gets whatever is left of maxSeconds,
  // and is sped up if your recording is longer than that.
  maxSeconds: 118,
  scenes: { hook: 8, problem: 9, intro: 6, claude: 11, privacy: 8, outro: 7 },
};

// Captions that pop up while your recording plays. `at` is seconds into YOUR recording,
// or a percentage of its length like "40%". Watch your recording once and set real times.
export const CUES: { at: number | string; kicker: string; text: string }[] = [
  { at: "0%", kicker: "Step 1", text: "Tell it what job you're after" },
  { at: "25%", kicker: "Step 2", text: "Pick tonight's AI meetup" },
  { at: "50%", kicker: "Step 3", text: "Claude ranks every guest for you" },
  { at: "72%", kicker: "Say hi", text: "A first line you can actually say" },
  { at: "88%", kicker: "Learn", text: "One thing to ask them about AI work" },
];
