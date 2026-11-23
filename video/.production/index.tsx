import { useEffect, useState, type ComponentType } from "react";
import { AbsoluteFill, Audio, Composition, Sequence, continueRender, delayRender, registerRoot, staticFile, useCurrentFrame } from "remotion";
import { Hook, Intro, Unexplored } from "./scenes/Opening";
import { Exploration, Payoff } from "./scenes/Exploration";
import { Showcase } from "./scenes/Showcase";
import { Closing } from "./scenes/Closing";
import { ease } from "./animations/motion";
import { duration, fps, paper, sceneStarts, seconds } from "./config/timing";

type PromoProps = { music: string; effects: string; musicVolume: number; effectsVolume: number };
const defaults: PromoProps = {
  music: "audio/mapmine-launch-mix.wav", effects: "audio/typing-cues.wav", musicVolume: 1, effectsVolume: .78,
};
const scenes: ComponentType[] = [Hook, Unexplored, Intro, Exploration, Showcase, Payoff, Closing];
const overlap = 19;

function Scene({ component: Component, first }: { component: ComponentType; first: boolean }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: first ? 1 : ease(frame, 0, overlap) }}><Component /></AbsoluteFill>;
}

function Promo({ music, effects, musicVolume, effectsVolume }: PromoProps) {
  const [font] = useState(() => delayRender("Loading the bundled Geist font"));
  useEffect(() => {
    const face = new FontFace("Geist", "url(" + staticFile("brand/geist.woff2") + ")", { weight: "100 900" });
    face.load().then(loaded => document.fonts.add(loaded)).catch(() => undefined).finally(() => continueRender(font));
  }, [font]);

  return <AbsoluteFill style={{ background: paper }}>
    {scenes.map((component, index) => {
      const from = seconds(sceneStarts[index]);
      const end = index === scenes.length - 1 ? duration : seconds(sceneStarts[index + 1]) + overlap;
      return <Sequence key={component.name} name={component.name} from={from} durationInFrames={end - from} premountFor={24}>
        <Scene component={component} first={index === 0} />
      </Sequence>;
    })}
    {music && musicVolume > 0 && <Audio src={staticFile(music)} volume={musicVolume} />}
    {effects && effectsVolume > 0 && <Audio src={staticFile(effects)} volume={effectsVolume} />}
  </AbsoluteFill>;
}

function Root() {
  return <>
    <Composition id="MapMineLaunch" component={Promo} defaultProps={defaults} width={1920} height={1080} fps={fps} durationInFrames={duration} />
    <Composition id="MapMineVertical" component={Promo} defaultProps={defaults} width={1080} height={1920} fps={fps} durationInFrames={duration} />
  </>;
}

registerRoot(Root);
