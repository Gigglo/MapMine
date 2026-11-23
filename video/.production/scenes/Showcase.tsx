import { Sequence, useCurrentFrame } from "remotion";
import { ease, glide, mix, ramp } from "../animations/motion";
import { Caption, Stage, Type, usePortrait, warmGradient } from "../components/Design";
import { Phone } from "../components/Product";
import { seconds } from "../config/timing";

const panels = [
  { screen: "places", heading: ["Make the", "map yours."], label: "Saved places", note: "Keep the places you come back to." },
  { screen: "activity", heading: ["More than", "just distance."], label: "Activity", note: "See the new ground you covered." },
  { screen: "achievement", heading: ["Make it", "a milestone."], label: "Achievements", note: "Unlock rewards as you explore." },
] as const;
const cuts = [0, 3.2, 6.5, 10.4];
const tapAt = 54;

function Feature({ index }: { index: number }) {
  const f = useCurrentFrame(), portrait = usePortrait();
  const {screen,heading,label,note} = panels[index];
  const appear = glide(f, 3), next = index < 2 ? ease(f,seconds(cuts[index+1]-cuts[index]),seconds(cuts[index+1]-cuts[index])+18) : 0;
  const labelLine = ease(f, 3, 15);
  const noteIn = ramp(f, 24, 39);
  return <Stage style={{ opacity: 1-next }}>
    <div style={{ position: "absolute", left: portrait ? 82 : 144, top: portrait ? 199 : 288, right: portrait ? 70 : 816 }}>
      <Caption style={{ display: "flex", alignItems: "center", gap: 14, color: "#585e52", marginBottom: 22, opacity: labelLine }}>
        <span style={{ width: 26, height: 2, background: warmGradient, transform: `scaleX(${labelLine})`, transformOrigin: "left" }} />{label}
      </Caption>
      <div style={{ fontSize: portrait ? 94 : 117, fontWeight: 640, lineHeight: .95, letterSpacing: "-.08em" }}><Type text={heading[0]} delay={7} fast /><Type text={heading[1]} delay={15} fast /></div>
      <p style={{ color: "#565b50", fontSize: portrait ? 32 : 30, margin: "30px 0 0", opacity: noteIn, transform: `translateY(${(1-noteIn)*8}px)` }}>{note}</p>
    </div>
    <div style={{ position: "absolute", top: portrait ? 645 : 205, right: portrait ? 375 : 296, opacity: appear,
      transform: "translateY(" + ((1-appear)*84) + "px) rotate(" + ((1-appear)*3) + "deg) scale(" + mix(.9,portrait ? 1.35 : 1.06,appear) + ")", transformOrigin: "center top" }}>
      <Phone screen={screen} progress={glide(f, tapAt + 6)} panel={glide(f,20)} tapAt={tapAt} />
    </div>
    <Caption style={{ position: "absolute", bottom: portrait ? 243 : 95, left: portrait ? 82 : 144, color: "#656b5e", opacity: appear }}>
      Interface reconstruction · Demo data
    </Caption>
  </Stage>;
}

export function Showcase() {
  return <Stage>{panels.map((p,i) => <Sequence key={p.screen} from={seconds(cuts[i])} durationInFrames={seconds(cuts[i+1]-cuts[i])+18}>
    <Feature index={i} />
  </Sequence>)}</Stage>;
}
