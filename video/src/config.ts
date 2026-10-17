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
