import { colors, EVENT, REPO, TEAM } from "../config";
import { Kicker, Rise, Scene, Wordmark } from "../ui";

const USES: [string, string][] = [
  ["Reads you", "Your CV or LinkedIn profile becomes a goal and a short background."],
  ["Finds the room", "Picks public Luma events in your city that fit your goal."],
  ["Reads the room", "Ranks every guest, explains why, and writes your opener."],
];

export function HowClaude() {
  return (
    <Scene style={{ padding: "0 140px", justifyContent: "center" }}>
      <Rise>
        <Kicker>How Claude is used</Kicker>
      </Rise>
      <div style={{ display: "flex", gap: 36, marginTop: 50 }}>
        {USES.map(([title, body], i) => (
          <Rise key={title} delay={20 + i * 30} style={{ flex: 1 }}>
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 28,
                padding: 44,
                height: 330,
              }}
            >
              <div style={{ fontSize: 26, color: colors.accent, fontWeight: 800 }}>0{i + 1}</div>
              <div style={{ fontSize: 50, fontWeight: 800, marginTop: 16 }}>{title}</div>
              <div style={{ fontSize: 32, color: colors.muted, marginTop: 20, lineHeight: 1.35 }}>{body}</div>
            </div>
          </Rise>
        ))}
      </div>
      <Rise delay={130}>
        <div style={{ fontSize: 28, color: colors.muted, marginTop: 50 }}>
          Claude Opus 5.5 · structured outputs · PDF reading · refusal fallbacks
        </div>
      </Rise>
    </Scene>
  );
}

const PRIVACY = [
  "Your Luma sign-in never leaves your phone.",
  "Guest lists and CVs are never saved.",
  "LinkedIn is only read for people who agreed.",
];

export function Privacy() {
  return (
    <Scene style={{ padding: "0 180px", justifyContent: "center" }}>
      <Rise>
        <Kicker>Private by design</Kicker>
      </Rise>
      {PRIVACY.map((line, i) => (
        <Rise key={line} delay={15 + i * 35}>
          <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 34 }}>
            <div style={{ fontSize: 44, color: colors.good }}>✓</div>
            <div style={{ fontSize: 54, fontWeight: 700 }}>{line}</div>
          </div>
        </Rise>
      ))}
    </Scene>
  );
}

export function Outro() {
  return (
    <Scene style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <Rise>
        <Wordmark size={120} />
      </Rise>
      <Rise delay={20}>
        <div style={{ fontSize: 40, color: colors.muted, marginTop: 36 }}>{TEAM.join("  ·  ")}</div>
      </Rise>
      <Rise delay={40}>
        <div style={{ fontSize: 36, marginTop: 30 }}>{REPO}</div>
      </Rise>
      <Rise delay={55}>
        <div style={{ fontSize: 28, color: colors.accent, marginTop: 30, fontWeight: 700 }}>{EVENT}</div>
      </Rise>
    </Scene>
  );
}
