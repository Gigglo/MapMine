import { useCurrentFrame } from "remotion";
import { Caption, Credit, Stage, Type, usePortrait } from "../components/Design";
import { CityMap } from "../components/CityMap";
import { ease, glide, mix, ramp } from "../animations/motion";
import { seconds } from "../config/timing";

const beats = [
  { name: "Move.", at: 0 },
  { name: "Explore.", at: 3.1 },
  { name: "Reveal.", at: 6.5 },
];

const places = [
  { name: "Neighborhood café", at: 218 },
  { name: "Local park", at: 403 },
] as const;

const routeProgress = (frame: number) => mix(.055, 1, ease(frame, 6, 574));

export function Exploration() {
  const f = useCurrentFrame(), portrait = usePortrait();
  const progress = routeProgress(f);
  const width = portrait ? 920 : 1658;
  const height = portrait ? 1040 : 674;
  return <Stage style={{ padding: portrait ? "218px 80px" : "89px 131px" }}>
    <Caption style={{ color: "#55594f" }}>Fog of war · Bhubaneswar</Caption>
    <div style={{ height: portrait ? 161 : 151, position: "relative", marginTop: portrait ? 15 : 4 }}>
      {beats.map(({name,at},i) => {
        const start = seconds(at), end = beats[i+1] ? seconds(beats[i+1].at) : 629;
        const out = ease(f,end-9,end);
        return <div key={name} style={{ position: "absolute", top: 0, left: 0, fontWeight: 650,
          fontSize: portrait ? 118 : 132, letterSpacing: "-.085em", lineHeight: 1, opacity: 1-out, transform: "translateY(" + (-26*out) + "px)" }}>
          <Type text={name} delay={start} fast warm={name === "Reveal."} />
        </div>;
      })}
    </div>
    <div style={{ width, height, position: "relative", borderRadius: 26, overflow: "hidden", background: "#111211" }}>
      <CityMap id="core" progress={progress} aspect={width / height} zoom={portrait ? 1.15 : 1.45} fog={1}
        pulse={(f % 80)/80} discoveries={places.map(({ at }) => ({ progress: routeProgress(at), elapsed: f - at }))} />
      <div style={{ position: "absolute", top: 16, left: 17, background: "#151715dd", border: "1px solid #b8bdb82e", padding: "9px 12px", borderRadius: 8, color: "#f2f5f2", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, background: "#82baff", borderRadius: "50%" }} /> Route simulation
      </div>
      {places.map(({ name, at }) => {
        const age = f - at;
        if (age < 0 || age > 114) return null;
        const enter = 1 - (1 - ramp(age, 0, 19)) ** 3;
        const leave = ease(age, 97, 114);
        return <div key={name} style={{
          position: "absolute", top: portrait ? 64 : 25, right: 24,
          display: "flex", gap: 15, alignItems: "center", minWidth: portrait ? 325 : 307,
          background: "#201a16f5", border: "1px solid #825633", borderRadius: 17,
          color: "#fff3e7", padding: "14px 19px", boxShadow: "0 12px 30px #0007",
          opacity: enter * (1 - leave), transform: `translateY(${(1 - enter) * -16 - leave * 12}px) scale(${mix(.96, 1, enter)})`,
          transformOrigin: "right top",
        }}>
          <div style={{ display: "grid", placeItems: "center", width: 43, height: 43, borderRadius: 12,
            backgroundImage: "linear-gradient(135deg, #ffd193, #ec853b)", color: "#49250f" }}>
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="m8.7 10.3 2.2 2.2 4.4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#ffb975", fontWeight: 640, fontSize: 14, letterSpacing: ".085em", textTransform: "uppercase" }}>Place unlocked</div>
            <div style={{ fontSize: portrait ? 27 : 24, fontWeight: 640, letterSpacing: "-.04em", marginTop: 3 }}>
              <Type text={name} delay={at + 5} fast />
            </div>
          </div>
        </div>;
      })}
      <Credit />
    </div>
    <div style={{ width, marginTop: 23, display: "flex", alignItems: "center", gap: 20, color: "#54574e", fontSize: 20 }}>
      <div style={{ flex: 1, height: 2, background: "#d6d7ce" }}><div style={{ width: progress*100+"%", height: "100%", background: "#3e4238" }} /></div>
      Territory stays revealed
    </div>
  </Stage>;
}

export function Payoff() {
  const f = useCurrentFrame(), portrait = usePortrait();
  const view = ease(f, 0, 235), exit = ease(f, 124, 137);
  return <Stage dark>
    <div style={{ position: "absolute", inset: 0, opacity: .78 }}>
      <CityMap id="payoff" progress={1} zoom={mix(1.67, 1, view)} follow={false} fog={mix(.93,.58,view)} marker={false} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "#0a0d0b88" }} />
    <div style={{ position: "absolute", top: portrait ? 635 : 375, left: portrait ? 78 : 150, right: portrait ? 75 : 145, fontSize: portrait ? 106 : 126, fontWeight: 620, lineHeight: .98, letterSpacing: "-.068em" }}>
      <div style={{ position: "absolute", opacity: 1-exit, transform: "translateY(" + (-24*exit) + "px)" }}><Type text="Your city." fast /><Type text="Your adventure." delay={11} fast /></div>
      <div style={{ position: "absolute" }}><Type text="There’s always more" delay={137} fast /><Type text="to discover." delay={151} fast /></div>
    </div>
    <div style={{ position: "absolute", bottom: portrait ? 175 : 70, right: portrait ? 50 : 80 }}><Credit /></div>
  </Stage>;
}
