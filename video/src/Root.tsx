import { Composition, Series, getStaticFiles, staticFile } from "remotion";
import { FPS, SCENES, TOTAL_SECONDS } from "./config";
import type { Clips } from "./Phone";
import { HowClaude, Outro, Privacy } from "./scenes/Closing";
import { Hook, Intro, Problem } from "./scenes/Opening";
import { Events, Profile, Results } from "./scenes/Steps";

const CLIP = "clips/app.webm";
const MARKS = "clips/marks.json";

function RoomRadar({ clips }: { clips: Clips }) {
  const s = (seconds: number) => Math.round(seconds * FPS);
  return (
    <Series>
      <Series.Sequence durationInFrames={s(SCENES.hook)}>
        <Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.problem)}>
        <Problem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.intro)}>
        <Intro />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.profile)}>
        <Profile clips={clips} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.events)}>
        <Events clips={clips} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.results)}>
        <Results clips={clips} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.claude)}>
        <HowClaude />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.privacy)}>
        <Privacy />
      </Series.Sequence>
      <Series.Sequence durationInFrames={s(SCENES.outro)}>
        <Outro />
      </Series.Sequence>
    </Series>
  );
}

export function Root() {
  return (
    <Composition
      id="RoomRadar"
      component={RoomRadar}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={Math.round(TOTAL_SECONDS * FPS)}
      defaultProps={{ clips: { file: null, marks: null } as Clips }}
      // Use the app recording from `npm run record` when it exists.
      calculateMetadata={async () => {
        const files = getStaticFiles().map((f) => f.name);
        if (!files.includes(CLIP) || !files.includes(MARKS)) return {};
        const marks = (await fetch(staticFile(MARKS)).then((r) => r.json())) as Clips["marks"];
        return { props: { clips: { file: CLIP, marks } } };
      }}
    />
  );
}
