import { useCurrentFrame } from "remotion";
import { Caption, Credit, Logo, Stage, Type, usePortrait } from "../components/Design";
import { CityMap } from "../components/CityMap";
import { Phone } from "../components/Product";
import { ease, glide, mix, ramp } from "../animations/motion";

export function Hook() {
  const f = useCurrentFrame(), portrait = usePortrait();
  const exit = ease(f, 94, 108);
  const second = ease(f, 108, 119);
  return <Stage style={{ padding: portrait ? "280px 84px" : "132px 152px" }}>
    <Caption style={{ color: "#565a51", opacity: ramp(f,0,24) }}>MapMine · Real-world exploration</Caption>
    <div style={{ position: "absolute", left: portrait ? 84 : 152, right: portrait ? 74 : 125, top: portrait ? 630 : 329, letterSpacing: "-.087em", lineHeight: .94, fontSize: portrait ? 104 : 143, fontWeight: 640 }}>
      <div style={{ position: "absolute", opacity: 1-exit, transform: "translateY(" + (-40*exit) + "px)" }}><Type text="You’ve lived" /><Type text="here for years." delay={17} /></div>
      <div style={{ position: "absolute", opacity: second }}>
        <Type text="But how much" delay={109} fast />
        <Type text="have you actually" delay={120} fast />
        <Type text="explored?" delay={133} fast warm />
      </div>
    </div>
    <div style={{ position: "absolute", left: portrait ? 84 : 152, right: portrait ? 84 : 152, bottom: portrait ? 310 : 130, height: 1, background: "#c9cbc0" }}>
      <div style={{ width: ramp(f, 16, 264)*100 + "%", background: "#2b2c27", height: 2 }} />
    </div>
  </Stage>;
}

export function Unexplored() {
  const f = useCurrentFrame(), portrait = usePortrait();
  const intro = glide(f);
  return <Stage>
    <div style={{ position: "absolute", top: portrait ? 208 : 111, left: portrait ? 84 : 137, right: 67 }}>
      <Caption style={{ color: "#53584c", marginBottom: 22, opacity: intro }}>Bhubaneswar · Odisha, India</Caption>
      <div style={{ fontSize: portrait ? 82 : 105, letterSpacing: "-.077em", lineHeight: .97, fontWeight: 640 }}>
        <Type text="What if the real world" delay={12} /><Type text="had an unexplored map?" delay={29} />
      </div>
    </div>
    <div style={{ position: "absolute", left: portrait ? 66 : 137, right: portrait ? 66 : 137, top: portrait ? 630 : 418, bottom: portrait ? 272 : 85, borderRadius: 26, overflow: "hidden",
      transform: "translateY(" + ((1-intro)*46) + "px)", opacity: intro }}>
      <CityMap id="unexplored" progress={.19} fog={ease(f, 44, 235)} zoom={mix(1, portrait ? 1.17 : 1.36, ease(f, 25, 270))} follow={portrait} marker={false} />
      <Credit />
    </div>
  </Stage>;
}

export function Intro() {
  const f = useCurrentFrame(), portrait = usePortrait();
  const intro = glide(f, 12), device = glide(f, 33);
  return <Stage>
    <div style={{ position: "absolute", left: portrait ? 83 : 156, right: portrait ? 83 : 860, top: portrait ? 244 : 330 }}>
      <div style={{ opacity: intro, transform: "translateY(" + ((1-intro)*25) + "px) scale(" + mix(.8,1,intro) + ")" , transformOrigin: "left center" }}><Logo size={portrait ? 106 : 104} /></div>
      <div style={{ marginTop: 30, fontSize: portrait ? 104 : 119, lineHeight: .97, fontWeight: 650, letterSpacing: "-.08em" }}><Type text="Meet MapMine." delay={22} /></div>
      <div style={{ opacity: glide(f, 55), fontSize: portrait ? 34 : 32, marginTop: 25, color: "#565951" }}>A map you uncover by moving.</div>
    </div>
    <div style={{ position: "absolute", right: portrait ? 375 : 295, top: portrait ? 765 : 207, opacity: device,
      transform: "translateY(" + ((1-device)*95) + "px) scale(" + mix(.78, portrait ? 1.35 : 1.05, device) + ")", transformOrigin: "center top" }}>
      <Phone screen="explore" progress={.2} />
    </div>
    <Caption style={{ position: "absolute", bottom: portrait ? 209 : 100, left: portrait ? 84 : 156, color: "#63685e", opacity: glide(f,64) }}>Interface reconstruction · Demo data</Caption>
  </Stage>;
}
