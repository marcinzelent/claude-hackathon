import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, font } from "./config";

/** Fades a whole scene in and out. */
export function Scene({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 15%, ${colors.bg2} 0%, ${colors.bg} 60%)`,
        color: colors.text,
        fontFamily: font,
        opacity,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Springs in from below, starting at `delay` frames. */
export function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style }}>{children}</div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: colors.accent }}>
      {children}
    </div>
  );
}

export function Wordmark({ size = 120 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.25 }}>
      <Radar size={size} />
      <div style={{ fontSize: size * 0.8, fontWeight: 800, letterSpacing: -2 }}>RoomRadar</div>
    </div>
  );
}

/** Animated radar sweep, the logo. */
export function Radar({ size }: { size: number }) {
  const frame = useCurrentFrame();
  const angle = (frame * 6) % 360;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={colors.accent} stopOpacity="0" />
          <stop offset="1" stopColor={colors.accent} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {[46, 32, 18].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={colors.accent} strokeOpacity="0.5" strokeWidth="2" />
      ))}
      <path d="M50 50 L96 50 A46 46 0 0 0 82.5 17.5 Z" fill="url(#sweep)" transform={`rotate(${angle} 50 50)`} />
      <circle cx="68" cy="34" r="5" fill={colors.good} />
      <circle cx="30" cy="62" r="4" fill={colors.warm} />
      <circle cx="50" cy="50" r="4" fill={colors.text} />
    </svg>
  );
}
