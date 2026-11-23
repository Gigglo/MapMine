import type { ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { ease, mix } from "../animations/motion";
import { CityMap } from "./CityMap";
import { blue } from "../config/timing";

const paths = {
  search: "M19 19l-4-4m1-4a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  pin: "M12 21s7-6 7-12A7 7 0 0 0 5 9c0 6 7 12 7 12Zm2-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  award: "M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 3v6m-4 0h8",
  route: "M6 5h10a3 3 0 0 1 0 6h-8a3 3 0 0 0 0 6h10m-12-9V2m-3 3h6m9 9v6m-3-3h6",
};
function Icon({ name, size = 21 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
function Panel({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", bottom: 14, left: 10, right: 10, background: "#1b1b1b", border: "1px solid #414141", borderRadius: 21, padding: "7px 15px 15px", boxShadow: "0 -10px 30px #0006" }}>
    <div style={{ width: 35, height: 4, borderRadius: 6, margin: "0 auto 13px", background: "#686868" }} />{children}
  </div>;
}
const cover = staticFile("brand/mapmine.png");
type Screen = "explore" | "places" | "activity" | "achievement";

function TapTarget({ frame, at, children }: { frame: number; at?: number; children: ReactNode }) {
  if (at === undefined) return children;
  const press = ease(frame, at - 4, at) * (1 - ease(frame, at + 1, at + 10));
  const ripple = ease(frame, at, at + 23);
  const ringOpacity = ease(frame, at - 3, at + 2) * (1 - ripple);
  const focus = ease(frame, at, at + 7) * (1 - ease(frame, at + 18, at + 32));
  return <div style={{ position: "relative" }}>
    <div style={{ transform: `scale(${mix(1, .965, press)})`, borderRadius: 9, background: `rgba(130, 186, 255, ${focus * .16})` }}>
      {children}
    </div>
    <div style={{
      position: "absolute", right: 16, top: "50%", width: 24, height: 24, borderRadius: "50%",
      border: "2px solid #add5ff", boxSizing: "border-box", opacity: ringOpacity,
      transform: `translate(50%, -50%) scale(${mix(.52, 2.25, ripple)})`,
      boxShadow: "0 0 8px #79b5ff85", pointerEvents: "none",
    }} />
  </div>;
}

export function Phone({ screen, progress, panel = 1, tapAt }: { screen: Screen; progress: number; panel?: number; tapAt?: number }) {
  const frame = useCurrentFrame();
  return <div style={{ position: "relative", width: 330, height: 650, borderRadius: 39, padding: 7, boxSizing: "border-box", background: "#141414", border: "2px solid #41413d", boxShadow: "0 28px 75px #1114", color: "#f3f3f3" }}>
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 29, background: "#111" }}>
      <div style={{ position: "absolute", top: 15, left: 23, right: 23, display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 13, zIndex: 2 }}><span>9:41</span><span>● ▰</span></div>
      <div style={{ position: "absolute", inset: 0, background: "#141414" }}>
        {screen === "explore" && <>
          <CityMap id="phone-explore" progress={progress} zoom={1.15} pulse={progress % .6} />
          <div style={{ position: "absolute", top: 48, left: 13, right: 13, display: "flex", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 11px", flex: 1, color: "#bbb", background: "#202020", borderRadius: 12, height: 43, fontSize: 12 }}><Icon name="search" size={17} /> Search places and landmarks</div>
            <Img alt="" src={cover} style={{ width: 43, height: 43, borderRadius: 12 }} />
          </div>
          <div style={{ position: "absolute", right: 14, top: 106, display: "grid", gap: 7 }}>
            {(["pin", "layers"] as const).map(icon => <div key={icon} style={{ background: "#202020", padding: 9, borderRadius: 10 }}><Icon name={icon} /></div>)}
          </div>
          <Panel><strong style={{ fontSize: 18 }}>Exploration</strong><div style={{ fontSize: 12, color: "#aeaeae", marginTop: 5 }}>Today · {Math.round(progress * 240) / 100} km travelled</div>
            <div style={{ display: "flex", gap: 9, marginTop: 13 }}>{["Places", "Activity", "Achievements"].map(name => <span key={name} style={{ borderRadius: 8, background: "#292929", fontSize: 10, padding: "9px 7px" }}>{name}</span>)}</div>
          </Panel>
        </>}
        {screen !== "explore" && <div style={{ position: "absolute", top: 55, left: 0, right: 0, bottom: 9, padding: "14px 17px", background: "#151515", borderRadius: "22px 22px 0 0", transform: "translateY(" + ((1-panel) * 95) + "px)", opacity: panel }}>
          <div style={{ width: 34, height: 4, borderRadius: 5, background: "#555", margin: "0 auto 18px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 21, fontWeight: 620 }}><span style={{ color: "#aaa", background: "#242424", padding: "7px 10px", borderRadius: 9 }}>‹</span>{screen === "places" ? "Places" : screen === "activity" ? "Activity" : "Achievements"}</div>
          {screen === "places" && <>
            <div style={{ marginTop: 19, background: "#252525", color: "#aaa", height: 43, display: "flex", alignItems: "center", gap: 10, padding: "0 11px", borderRadius: 11, fontSize: 13 }}><Icon name="search" size={17} />Search places</div>
            <div style={{ display: "flex", gap: 6, margin: "11px 0" }}>{["All","Food","Favourite"].map((label,i) => <span key={label} style={{ color: i ? "#ddd" : "#111", background: i ? "#272727" : "#eee", borderRadius: 9, padding: "8px 10px", fontSize: 11 }}>{label}</span>)}</div>
            {[["Neighbourhood café","Food"],["State Museum","Favourite"],["Morning walking route","Other"]].map(([name, tag], index) => (
              <TapTarget key={name} frame={frame} at={index === 0 ? tapAt : undefined}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid #313131", fontSize: 13 }}><Icon name="pin" /><div>{name}<div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>{tag}</div></div></div>
              </TapTarget>
            ))}
            <div style={{ position: "absolute", bottom: 15, left: 10, right: 10, padding: 15, borderRadius: 17, background: "#262626", border: "1px solid #454545", opacity: progress, transform: "translateY(" + (1-progress)*95 + "px)" }}><strong>Neighbourhood café</strong><p style={{ color: "#bbb", fontSize: 12, marginBottom: 0 }}>Latest visit · 42 min</p></div>
          </>}
          {screen === "activity" && <>
            <p style={{ fontSize: 14, fontWeight: 650, margin: "23px 0 12px" }}>Today</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "12px 0", borderBlock: "1px solid #363636" }}>{[["2.48 km","Distance"],["0.16 km²","New territory"],["2","Places"]].map(([value,label]) => <div key={label}><strong>{value}</strong><div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>{label}</div></div>)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 8px" }}>
              <span style={{ fontSize: 14, fontWeight: 650 }}>Distance</span>
              <TapTarget frame={frame} at={tapAt}>
                <div style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #414141", fontSize: 11, fontWeight: 550 }}>Last 7 days</div>
              </TapTarget>
            </div>
            <div style={{ background: "#202020", borderRadius: 13, padding: 13 }}><strong style={{ fontSize: 24 }}>12.4 km</strong><div style={{ color: "#aaa", fontSize: 11, marginTop: 3 }}>Distance travelled</div>
              <div style={{ height: 112, display: "flex", alignItems: "flex-end", gap: 10, justifyContent: "center" }}>
                {[28,44,35,68,38,76,59].map((value,i) => <div key={i} style={{ textAlign: "center", color: "#aaa", fontSize: 9 }}><div style={{ width: 15, marginBottom: 6, height: value * progress, background: i === 6 ? "#eee" : "#737373", borderRadius: "3px 3px 0 0" }} />{"MTWTFSS"[i]}</div>)}
              </div>
            </div>
            <p style={{ fontSize: 14, fontWeight: 650, marginTop: 23 }}>Recent journeys</p>
            <div style={{ display: "flex", gap: 8, color: "#c0c0c0", fontSize: 12, alignItems: "center" }}><Icon name="route" size={16} /> Sunset walk · 2.48 km</div>
          </>}
          {screen === "achievement" && <>
            <div style={{ margin: "20px 0 12px", fontSize: 13, color: "#bbb" }}>Level 4 · 820 XP</div>
            <div style={{ height: 5, background: "#393939", borderRadius: 6 }}><div style={{ width: "72%", height: "100%", borderRadius: 6, background: "#eee" }} /></div>
            <div style={{ marginTop: 18, color: "#ddd", display: "grid", gap: 14 }}>
              {["Stray Cat","Side Quest Gremlin","Delulu Estate Holdings"].map((label, index) => (
                <TapTarget key={label} frame={frame} at={index === 2 ? tapAt : undefined}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}><Icon name="award" />{label}</div>
                </TapTarget>
              ))}
            </div>
            <div style={{ position: "absolute", bottom: 15, left: 10, right: 10, padding: "19px 12px", textAlign: "center", background: "#763416", color: "#fff2df", border: "1px solid #c38955", borderRadius: 17, transform: "translateY(" + (1-progress)*125 + "px)", opacity: progress }}>
              <Img alt="" src={staticFile("brand/delulu-estate.jpg")} style={{ width: 43, height: 43, borderRadius: 11 }} /><div style={{ color: "#ffd49d", fontSize: 10, margin: "7px 0", textTransform: "uppercase", letterSpacing: 1 }}>Achievement unlocked</div><strong>Delulu Estate Holdings</strong><div style={{ fontSize: 11, marginTop: 6 }}>Discover 5 km² · +550 XP</div>
            </div>
          </>}
        </div>}
      </div>
      <div style={{ position: "absolute", bottom: 4, width: 86, height: 3, left: "calc(50% - 43px)", borderRadius: 3, background: "#e5e5e5", opacity: .76 }} />
    </div>
  </div>;
}

export const signal = blue;
