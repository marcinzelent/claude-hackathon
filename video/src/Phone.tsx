import { Freeze, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./config";

export type Segment = { start: number; end: number }; // seconds into the recording
export type Clips = { file: string | null; marks: Record<"profile" | "events" | "results", Segment> | null };

const W = 430;
const H = 930;

/**
 * A phone playing one segment of the app recording, sped up or slowed down to fill the scene.
 * Shows a placeholder until `npm run record` has made public/clips/app.webm.
 */
export function Phone({ clips, part, label }: { clips: Clips; part: keyof NonNullable<Clips["marks"]>; label: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const seg = clips.marks?.[part];

  let screen;
  if (clips.file && seg && seg.end > seg.start) {
    const sceneSeconds = durationInFrames / fps;
    const rate = Math.min(2.5, Math.max(0.75, (seg.end - seg.start) / sceneSeconds));
    // If the clip is shorter than the scene, hold its last frame instead of going black.
    const playFrames = Math.max(1, Math.floor(((seg.end - seg.start) * fps) / rate) - 1);
    const video = (
      <OffthreadVideo
        src={staticFile(clips.file)}
        trimBefore={Math.round(seg.start * fps)}
        trimAfter={Math.round(seg.end * fps)}
        playbackRate={rate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
    screen = frame < playFrames ? video : <Freeze frame={playFrames - 1}>{video}</Freeze>;
  } else {
    screen = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F7F5F2",
          color: "#6B6862",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          textAlign: "center",
          padding: 40,
          fontSize: 26,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: "#5B4BDB" }}>{label}</div>
        <div>Screen recording goes here.</div>
        <div style={{ fontSize: 20 }}>Run `npm run record` in video/</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 56,
        padding: 14,
        background: "#05040A",
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 0 2px ${colors.border}, 0 0 80px ${colors.accent}33`,
        transform: `translateY(${(1 - enter) * 80}px) rotate(${interpolate(enter, [0, 1], [4, 0])}deg)`,
        opacity: enter,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 44, overflow: "hidden", position: "relative" }}>
        {screen}
      </div>
    </div>
  );
}
