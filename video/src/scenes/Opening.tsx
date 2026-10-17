import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../config";
import { Kicker, Rise, Scene, Wordmark } from "../ui";

const PEOPLE = 120;

/** A room filling up with 120 people, then the question. */
export function Hook() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return (
    <Scene>
      <AbsoluteFill>
        {Array.from({ length: PEOPLE }, (_, i) => {
          const appear = spring({ frame: frame - i * 0.9, fps, config: { damping: 200 } });
          const x = random(`x${i}`) * width;
          const y = random(`y${i}`) * height;
          const drift = Math.sin((frame + i * 20) / 30) * 6;
          const dim = interpolate(frame, [150, 200], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y + drift,
                width: 22,
                height: 22,
                borderRadius: 11,
                background: i % 7 === 0 ? colors.accent : colors.muted,
                opacity: appear * 0.8 * dim,
                transform: `scale(${appear})`,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <Rise delay={20}>
          <div style={{ fontSize: 56, color: colors.muted, fontWeight: 600 }}>An AI meetup in Berlin. 120 people.</div>
        </Rise>
        <Rise delay={110}>
          <div style={{ fontSize: 110, fontWeight: 800, marginTop: 24, letterSpacing: -3 }}>Who should you talk to?</div>
        </Rise>
      </AbsoluteFill>
    </Scene>
  );
}

const LINES = [
  "AI teams hire through their network.",
  "Newcomers don't know who's who in the room.",
  "So they talk to whoever is standing nearest,",
  "and leave without the one conversation that mattered.",
];

export function Problem() {
  return (
    <Scene style={{ padding: "0 180px", justifyContent: "center" }}>
      <Rise>
        <Kicker>The problem</Kicker>
      </Rise>
      {LINES.map((line, i) => (
        <Rise key={line} delay={20 + i * 45}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              marginTop: 28,
              color: i === 3 ? colors.warm : colors.text,
              letterSpacing: -1,
            }}
          >
            {line}
          </div>
        </Rise>
      ))}
    </Scene>
  );
}

export function Intro() {
  return (
    <Scene style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <Rise>
        <Wordmark size={150} />
      </Rise>
      <Rise delay={25}>
        <div style={{ fontSize: 58, fontWeight: 600, marginTop: 40 }}>Walk into the room knowing who to talk to.</div>
      </Rise>
      <Rise delay={55}>
        <div style={{ fontSize: 34, color: colors.muted, marginTop: 24 }}>
          For job seekers breaking into AI · powered by Claude
        </div>
      </Rise>
    </Scene>
  );
}
