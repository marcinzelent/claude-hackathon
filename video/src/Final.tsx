import { parseMedia } from "@remotion/media-parser";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  Series,
  getStaticFiles,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { colors, CUES, FINAL, font, FPS } from "./config";
import { HowClaude, Outro, Privacy } from "./scenes/Closing";
import { Hook, Intro, Problem } from "./scenes/Opening";
import { Radar } from "./ui";

/** Your recording, or null until it's in public/clips/. `rate` speeds it up to fit the video. */
export type Demo = { file: string | null; width: number; height: number; seconds: number; rate: number };
type Props = { demo: Demo };

const s = (seconds: number) => Math.round(seconds * FPS);
const FIXED = Object.values(FINAL.scenes).reduce((a, b) => a + b, 0);
const PLACEHOLDER: Demo = { file: null, width: 9, height: 19.5, seconds: 40, rate: 1 };

/** How long the demo scene is on screen, in seconds. */
const demoSeconds = (d: Demo) => d.seconds / d.rate;

export const calculateFinalMetadata: CalculateMetadataFunction<Props> = async () => {
  let demo = PLACEHOLDER;
  if (getStaticFiles().some((f) => f.name === FINAL.file)) {
    const media = await parseMedia({
      src: new URL(staticFile(FINAL.file), window.location.origin).toString(),
      fields: { slowDurationInSeconds: true, dimensions: true },
      acknowledgeRemotionLicense: true,
    });
    const seconds = media.slowDurationInSeconds;
    const room = FINAL.maxSeconds - FIXED;
    demo = {
      file: FINAL.file,
      width: media.dimensions?.width ?? 9,
      height: media.dimensions?.height ?? 19.5,
      seconds,
      rate: Math.max(1, seconds / room),
    };
  }
  return { props: { demo }, durationInFrames: s(FIXED + demoSeconds(demo)) };
};

/** A sound effect starting at `at` frames. */
function Sfx({ name, at, volume = 1, rate = 1 }: { name: string; at: number; volume?: number; rate?: number }) {
  return (
    <Sequence from={Math.max(0, at)} layout="none">
      <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * FINAL.sfx} playbackRate={rate} />
    </Sequence>
  );
}

/** Seconds into the recording for a cue, from "40%" or a number. */
const cueSeconds = (at: number | string, total: number) =>
  typeof at === "string" ? (parseFloat(at) / 100) * total : at;

export function RoomRadarFinal({ demo }: Props) {
  const { durationInFrames } = useVideoConfig();
  const sc = FINAL.scenes;
  const demoFrames = s(demoSeconds(demo));

  // Where each scene starts, in frames.
  const start = { hook: 0, problem: s(sc.hook), intro: s(sc.hook + sc.problem) } as Record<string, number>;
  start.demo = start.intro + s(sc.intro);
  start.claude = start.demo + demoFrames;
  start.privacy = start.claude + s(sc.claude);
  start.outro = start.privacy + s(sc.privacy);

  const cueFrames = CUES.map((c) => start.demo + s(cueSeconds(c.at, demo.seconds) / demo.rate));
  const underDemo = (f: number) => f >= start.demo && f < start.claude && FINAL.keepRecordingAudio;

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Series>
        <Series.Sequence durationInFrames={s(sc.hook)}>
          <Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(sc.problem)}>
          <Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(sc.intro)}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={demoFrames}>
          <DemoScene demo={demo} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(sc.claude)}>
          <HowClaude />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(sc.privacy)}>
          <Privacy />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(sc.outro)}>
          <Outro />
        </Series.Sequence>
      </Series>

      {/* Music bed: fades in, gets quieter under the recording's own sound, fades out at the end. */}
      <Html5Audio
        src={staticFile("sfx/music.wav")}
        loop
        volume={(f) =>
          FINAL.music *
          (underDemo(f) ? 0.35 : 1) *
          interpolate(f, [0, s(1.5), durationInFrames - s(3), durationInFrames - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* Hook: dots popping in, a swoosh for the first line, a build into the big question. */}
      {Array.from({ length: 10 }, (_, i) => (
        <Sfx key={`pop${i}`} name="pop" at={i * 9} volume={0.25} rate={0.8 + random(`p${i}`) * 0.7} />
      ))}
      <Sfx name="whoosh" at={18} volume={0.6} />
      <Sfx name="riser" at={110 - 60} volume={0.5} />
      <Sfx name="boom" at={110} volume={0.9} />

      {/* Problem: a tick per line, matching the line delays in scenes/Opening.tsx. */}
      <Sfx name="whoosh" at={start.problem - 8} volume={0.5} />
      {[0, 1, 2, 3].map((i) => (
        <Sfx key={`t${i}`} name="tick" at={start.problem + 20 + i * 45} volume={0.8} />
      ))}

      {/* Logo reveal. */}
      <Sfx name="riser" at={start.intro - 60} volume={0.6} />
      <Sfx name="boom" at={start.intro} />
      <Sfx name="ding" at={start.intro + 25} volume={0.5} />

      {/* Demo: swoosh in, a pop for every caption, a bell on the last one. */}
      <Sfx name="whoosh" at={start.demo - 8} volume={0.7} />
      {cueFrames.map((f, i) => (
        <Sfx key={`c${i}`} name={i === cueFrames.length - 1 ? "ding" : "pop"} at={f + 6} volume={0.7} />
      ))}

      {/* How Claude is used: a pop per card (delays from scenes/Closing.tsx). */}
      <Sfx name="whoosh" at={start.claude - 8} volume={0.6} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`h${i}`} name="pop" at={start.claude + 20 + i * 30} volume={0.8} rate={1 + i * 0.12} />
      ))}

      {/* Privacy: a soft bell per check mark, rising. */}
      <Sfx name="whoosh" at={start.privacy - 8} volume={0.5} />
      {[0, 1, 2].map((i) => (
        <Sfx key={`v${i}`} name="ding" at={start.privacy + 15 + i * 35} volume={0.3} rate={1 + i * 0.12} />
      ))}

      {/* Outro. */}
      <Sfx name="riser" at={start.outro - 60} volume={0.6} />
      <Sfx name="boom" at={start.outro} />
    </AbsoluteFill>
  );
}

/** The real app: your recording in a phone (or a window, if it's landscape) with captions and a progress bar. */
function DemoScene({ demo }: { demo: Demo }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
  const fade = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const portrait = demo.height >= demo.width;

  const cues = CUES.map((c) => ({ ...c, frame: s(cueSeconds(c.at, demo.seconds) / demo.rate) }));
  const current = cues.filter((c) => c.frame <= frame).at(-1);

  // Screen size: a phone 900px tall, or a 1500px-wide window.
  const screenH = portrait ? 900 : (1500 * demo.height) / demo.width;
  const screenW = portrait ? (900 * demo.width) / demo.height : 1500;
  const sway = Math.sin(frame / 70) * 4;

  const video = demo.file ? (
    <OffthreadVideo
      src={staticFile(demo.file)}
      playbackRate={demo.rate}
      muted={!FINAL.keepRecordingAudio}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#F7F5F2",
        color: "#5B4BDB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: 30,
        fontWeight: 700,
        padding: 30,
      }}
    >
      Put RoomRadar_final.mp4 in public/clips/
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 70% 50%, ${colors.accentSoft} 0%, ${colors.bg} 55%)`,
        color: colors.text,
        fontFamily: font,
        opacity: fade,
      }}
    >
      {/* Big slow radar behind the phone, plus drifting dots: people in the room. */}
      <AbsoluteFill
        style={{
          alignItems: portrait ? "flex-end" : "center",
          justifyContent: "center",
          paddingRight: portrait ? 120 : 0,
          opacity: 0.25,
        }}
      >
        <Radar size={1300} />
      </AbsoluteFill>
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: random(`dx${i}`) * 1920,
            top: (random(`dy${i}`) * 1200 - frame * (0.3 + random(`ds${i}`) * 0.8)) % 1200,
            width: 8,
            height: 8,
            borderRadius: 4,
            background: i % 5 === 0 ? colors.good : colors.accent,
            opacity: 0.35,
          }}
        />
      ))}

      {/* Live-demo badge. */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 3,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: "#FF4D6D",
            opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 12)),
          }}
        />
        LIVE DEMO
        {demo.rate > 1.15 && (
          <span style={{ color: colors.muted, fontWeight: 600, letterSpacing: 0 }}>
            · sped up {demo.rate.toFixed(1)}×
          </span>
        )}
      </div>

      {/* The current caption. */}
      {current && (
        <Caption
          key={current.text}
          kicker={current.kicker}
          text={current.text}
          since={frame - current.frame}
          portrait={portrait}
        />
      )}

      {/* The recording in its frame. */}
      <AbsoluteFill
        style={{
          alignItems: portrait ? "flex-end" : "center",
          justifyContent: portrait ? "center" : "flex-start",
          paddingRight: portrait ? 220 : 0,
          paddingTop: portrait ? 0 : 130,
          perspective: 2200,
        }}
      >
        <div
          style={{
            width: screenW + 28,
            height: screenH + 28,
            padding: 14,
            borderRadius: portrait ? 64 : 28,
            background: "#05040A",
            boxShadow: `0 50px 140px rgba(0,0,0,0.65), 0 0 0 2px ${colors.border}, 0 0 120px ${colors.accent}55`,
            transform: `translateY(${(1 - enter) * 300}px) rotateY(${portrait ? -8 + sway : sway / 2}deg) rotateX(${2 - sway / 3}deg) scale(${0.9 + 0.1 * enter})`,
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: portrait ? 50 : 16, overflow: "hidden" }}>
            {video}
          </div>
        </div>
      </AbsoluteFill>

      {/* Progress bar with a marker per caption. */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
          height: 6,
          borderRadius: 3,
          background: colors.border,
        }}
      >
        <div
          style={{
            width: `${(frame / durationInFrames) * 100}%`,
            height: "100%",
            borderRadius: 3,
            background: colors.accent,
          }}
        />
        {cues.map((c) => (
          <div
            key={c.text}
            style={{
              position: "absolute",
              top: -5,
              left: `${(c.frame / durationInFrames) * 100}%`,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: frame >= c.frame ? colors.good : colors.border,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** A caption that slides and un-blurs in. Left of the phone, or a lower third for landscape recordings. */
function Caption({
  kicker,
  text,
  since,
  portrait,
}: {
  kicker: string;
  text: string;
  since: number;
  portrait: boolean;
}) {
  const { fps } = useVideoConfig();
  const p = spring({ frame: since, fps, config: { damping: 14 } });
  const box = portrait
    ? { left: 120, top: 0, bottom: 0, width: 760, justifyContent: "center" as const }
    : { left: 0, right: 0, bottom: 90, alignItems: "center" as const, textAlign: "center" as const };
  return (
    <div style={{ position: "absolute", display: "flex", flexDirection: "column", ...box }}>
      <div
        style={{
          opacity: p,
          transform: `translateX(${(1 - p) * -80}px)`,
          filter: `blur(${(1 - p) * 12}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: 999,
            background: colors.accent,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontSize: portrait ? 88 : 64,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.05,
            marginTop: 24,
            textShadow: `0 0 40px ${colors.accent}88`,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
