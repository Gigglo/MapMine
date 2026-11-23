import { useCurrentFrame } from "remotion";
import { glide, mix, ramp } from "../animations/motion";
import { Logo, Stage, Type, usePortrait } from "../components/Design";

export function Closing() {
  const f = useCurrentFrame(), portrait = usePortrait(), mark = glide(f, 12), url = glide(f, 108);
  return <Stage style={{ alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center", width: portrait ? 894 : 1200, marginTop: portrait ? -45 : -18 }}>
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: portrait ? 24 : 31, opacity: mark,
        transform: "translateY(" + ((1-mark)*27) + "px) scale(" + mix(.91,1,mark) + ")" }}>
        <Logo size={portrait ? 115 : 125} />
        <span style={{ fontWeight: 670, letterSpacing: "-.077em", fontSize: portrait ? 133 : 148, lineHeight: 1 }}>MapMine</span>
      </div>
      <div style={{ fontSize: portrait ? 48 : 46, fontWeight: 500, letterSpacing: "-.05em", marginTop: 33 }}><Type text="The World Is Yours to Discover." delay={47} step={7} /></div>
      <div style={{ fontSize: portrait ? 30 : 27, color: "#4b5247", margin: "53px auto 0", opacity: url, transform: "translateY(" + ((1-url)*15) + "px)", display: "table", lineHeight: 1.5 }}>
        mapminee.vercel.app
        <div style={{ height: 1, width: ramp(f,124,174)*100+"%", margin: "5px auto 0", background: "#787f71" }} />
      </div>
    </div>
  </Stage>;
}
