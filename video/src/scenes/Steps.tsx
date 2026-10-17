import type { ReactNode } from "react";
import { colors } from "../config";
import { Phone, type Clips } from "../Phone";
import { Kicker, Rise, Scene } from "../ui";

/** One step of the app: what it does on the left, the real app on the right. */
function Step({
  n,
  title,
  points,
  clips,
  part,
  label,
  extra,
}: {
  n: number;
  title: string;
  points: string[];
  clips: Clips;
  part: "profile" | "events" | "results";
  label: string;
  extra?: ReactNode;
}) {
  return (
    <Scene style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 120 }}>
      <div style={{ flex: 1 }}>
        <Rise>
          <Kicker>Step {n}</Kicker>
        </Rise>
        <Rise delay={8}>
          <div style={{ fontSize: 76, fontWeight: 800, marginTop: 16, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
        </Rise>
        {points.map((p, i) => (
          <Rise key={p} delay={40 + i * 40}>
            <div style={{ display: "flex", gap: 20, alignItems: "baseline", marginTop: 34 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: colors.accent, flexShrink: 0 }} />
              <div style={{ fontSize: 40, lineHeight: 1.3, color: colors.text }}>{p}</div>
            </div>
          </Rise>
        ))}
        {extra}
      </div>
      <Phone clips={clips} part={part} label={label} />
    </Scene>
  );
}

export const Profile = ({ clips }: { clips: Clips }) => (
  <Step
    n={1}
    title="Tell it what you're after"
    points={[
      "Paste your LinkedIn link or upload your CV.",
      "Claude reads it and suggests the role to aim for.",
      "Edit anything. It stays on your phone.",
    ]}
    clips={clips}
    part="profile"
    label="Onboarding"
  />
);

export const Events = ({ clips }: { clips: Clips }) => (
  <Step
    n={2}
    title="Pick tonight's event"
    points={[
      "Your Luma events, through your own sign-in.",
      "Claude picks public events in your city that fit your goal.",
    ]}
    clips={clips}
    part="events"
    label="Your events"
  />
);

const CALLOUTS: [string, string][] = [
  ["Score", "how much they can help you, 0 to 100"],
  ["Why", "only facts from their profile, never invented"],
  ["Say hi", "a first line you can actually say"],
  ["Learn from them", "one thing about AI work to ask"],
];

export const Results = ({ clips }: { clips: Clips }) => (
  <Step
    n={3}
    title="Know who to meet"
    points={["Claude reads every guest's profile and ranks them for you."]}
    clips={clips}
    part="results"
    label="Who to meet"
    extra={
      <div style={{ marginTop: 40, display: "grid", gap: 18 }}>
        {CALLOUTS.map(([k, v], i) => (
          <Rise key={k} delay={120 + i * 55}>
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 18,
                padding: "18px 26px",
                fontSize: 32,
              }}
            >
              <span style={{ color: colors.accent, fontWeight: 800 }}>{k}</span>
              <span style={{ color: colors.muted }}> · {v}</span>
            </div>
          </Rise>
        ))}
      </div>
    }
  />
);
