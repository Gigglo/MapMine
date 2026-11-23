import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, Composition, Img, Sequence, continueRender, delayRender, interpolate,
  registerRoot, staticFile, useCurrentFrame } from "remotion";
import { CityMap } from "./components/CityMap";
import { Phone } from "./components/Product";
import { worldLand } from "./config/world-land";

const fps = 60;
const duration = 1463;
// Editorial cuts selected from the supplied mix's measured kick/snare transients.
const rapEntrance = 2.150;
const cutTimes = [0, rapEntrance, 7.470, 11.105, 14.720, 18.380, 18.985, 19.590, 20.805, duration / fps];
const attacks = [0.105, 0.760, 1.770, 1.995, 2.300, 2.600, 3.545, 4.145, 4.750, 5.045, 5.215, 5.650,
  6.255, 6.865, 7.290, 7.470, 8.080, 8.685, 9.295, 9.895, 10.510, 11.105, 11.715, 11.975, 12.295,
  12.905, 13.510, 14.120, 14.720, 15.330, 15.935, 16.540, 17.145, 17.755, 18.380, 18.985, 19.590,
  20.200, 20.805, 21.410, 22.015, 22.620, 23.225, 23.535];
const white = "#f4f4f2";
const black = "#0a0a0a";
const ramp = (value: number, start: number, end: number) =>
  interpolate(value, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const settle = (frame: number, length = 22) => 1 - (1 - ramp(frame, 0, length)) ** 3;
const logo = staticFile("brand/mapmine.png");

function beat(absolute: number) {
  let last: number | undefined;
  for (const attack of attacks) {
    if (attack > (absolute + 0.5) / fps) break;
    last = attack;
  }
  if (last === undefined) return 0;
  return Math.exp(-Math.max(0, absolute - Math.round(last * fps)) / 5);
}

function Stage({ children, bg = black, color = white }: { children: ReactNode; bg?: string; color?: string }) {
  return <AbsoluteFill style={{ background: bg, color, overflow: "hidden", fontFamily: "Geist, Arial, sans-serif" }}>{children}</AbsoluteFill>;
}
function Topline({ small, light = false }: { small: string; light?: boolean }) {
  return <div style={{ position: "absolute", top: 68, left: 95, right: 95, display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em", color: light ? "#262626" : "#d6d6d2" }}>
    <span>MapMine</span><span style={{ fontSize: 15, fontWeight: 620, letterSpacing: ".18em", textTransform: "uppercase" }}>{small}</span>
  </div>;
}
function Headline({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 152, letterSpacing: "-.085em", lineHeight: .89, fontWeight: 690, ...style }}>{children}</div>;
}
function MapField({ progress, pulse, opacity = 1 }: { progress: number; pulse: number; opacity?: number }) {
  return <AbsoluteFill style={{ filter: "grayscale(1)", opacity }}>
    <CityMap id="beat-map" progress={progress} pulse={1 - pulse} fog={1} zoom={1.35} aspect={16 / 9} follow />
  </AbsoluteFill>;
}
function Credit() {
  return <div style={{ position: "absolute", bottom: 28, right: 40, color: "#ebebe6", fontSize: 15,
    background: "#0a0a0ac9", padding: "6px 10px", borderRadius: 4 }}>© OpenStreetMap contributors · © CARTO</div>;
}
function Opening({ absolute }: { absolute: number }) {
  const words = ["MAKE", "THE", "MAP", "YOURS."];
  const wordStarts = [0.105, 0.760, 1.300, 1.770];
  let index = 0;
  for (let i = 1; i < wordStarts.length; i++) {
    if (absolute >= Math.round(wordStarts[i] * fps)) index = i;
  }
  const frame = absolute - Math.round(wordStarts[index] * fps);
  const light = index === 2;
  return <Stage bg={light ? white : black} color={light ? black : white}>
    <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
      <div style={{ overflow: "hidden", padding: "12px 48px 34px" }}>
        <Headline style={{ fontSize: index === 3 ? 248 : 292, lineHeight: 1, fontWeight: 740,
          opacity: settle(frame + (index === 0 ? 6 : 4), 10),
          transform: `translateY(${(1 - settle(frame + 4, 11)) * 70}px)` }}>{words[index]}</Headline>
      </div>
    </AbsoluteFill>
  </Stage>;
}

const radians = Math.PI / 180;
function project(longitude: number, latitude: number, center: number) {
  const lon = (longitude - center) * radians;
  const lat = latitude * radians;
  const tilt = 20 * radians;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.cos(tilt) * Math.sin(lat) - Math.sin(tilt) * Math.cos(lat) * Math.cos(lon);
  const z = Math.sin(tilt) * Math.sin(lat) + Math.cos(tilt) * Math.cos(lat) * Math.cos(lon);
  return { x: 430 + 366 * x, y: 430 - 366 * y, z };
}
function Globe({ frame, unlock }: { frame: number; unlock: number }) {
  const longitude = 83 - Math.min(31, Math.max(0, frame - 50) * 0.17);
  const dots = ["", "", ""];
  for (const [lon, lat] of worldLand) {
    const point = project(lon, lat, longitude);
    if (point.z < 0.055) continue;
    const layer = Math.min(2, Math.floor(point.z * 3));
    dots[layer] += "M" + point.x.toFixed(1) + " " + point.y.toFixed(1) + "h0.1";
  }
  const markers = [[85.82, 20.3], [73.8, 18.5], [2.35, 48.86], [103.82, 1.35], [36.82, -1.28], [139.69, 35.68]];
  return <svg viewBox="0 0 860 860" width="100%" height="100%">
    <defs>
      <radialGradient id="world-light" cx="41%" cy="32%" r="70%">
        <stop offset="0%" stopColor="#233ea9" stopOpacity=".67" />
        <stop offset="71%" stopColor="#161c47" stopOpacity=".83" />
        <stop offset="100%" stopColor="#110c27" />
      </radialGradient>
      <linearGradient id="world-edge" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#80eaff" />
        <stop offset="59%" stopColor="#4f72ff" />
        <stop offset="100%" stopColor="#cb76fa" />
      </linearGradient>
    </defs>
    <circle cx="430" cy="430" r="368" fill="url(#world-light)" stroke="url(#world-edge)" strokeWidth="2" />
    <circle cx="430" cy="430" r="385" fill="none" stroke="#8488ff" strokeOpacity=".32" />
    <ellipse cx="430" cy="430" rx="198" ry="366" fill="none" stroke="#95a8fa" strokeOpacity=".18" />
    <ellipse cx="430" cy="430" rx="365" ry="139" fill="none" stroke="#95a8fa" strokeOpacity=".18" />
    {dots.map((d, i) => <path key={i} d={d} fill="none" stroke={["#6999ed","#96b5ff","#b9e4ff"][i]}
      strokeWidth={4.5 + i} strokeOpacity={.42 + i * .19} strokeLinecap="round" />)}
    {markers.map(([lon, lat], i) => {
      const point = project(lon, lat, longitude);
      const hit = ramp(unlock - i * 6, 0, 10);
      const wave = ramp(unlock - i * 6, 0, 32);
      if (!hit || point.z < 0.08) return null;
      return <g key={lon} transform={`translate(${point.x} ${point.y})`} opacity={hit}>
        <circle r={12 + wave * 39} fill="none" stroke="#a0edff" strokeWidth="2" opacity={1 - wave} />
        <circle r="13" fill="#8bdaff" fillOpacity=".26" /><circle r="5.5" fill="#e7fbff" />
      </g>;
    })}
  </svg>;
}
function WorldReveal({ absolute }: { absolute: number }) {
  const frame = useCurrentFrame();
  const time = absolute / fps;
  const pullback = settle(frame, 104);
  const globeIn = ramp(time, 3.545, 4.750);
  const unlock = absolute - Math.round(5.045 * fps);
  const title = settle(unlock, 17);
  const colorBurst = Math.exp(-frame / 14);
  return <Stage bg="#07091b">
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 72% 41%,#25236c 0%,#101434 41%,#080817 77%)" }} />
    <AbsoluteFill style={{ opacity: 1 - globeIn, filter: "sepia(1) saturate(3.4) hue-rotate(168deg) brightness(1.4)" }}>
      <CityMap id="launch-pullback" progress={.48 + pullback * .30} fog={.52} pulse={1 - beat(absolute)}
        zoom={4.3 - pullback * 3.1} aspect={16 / 9} follow />
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 12%, #0a0b2580 74%, #070819 100%)",
      opacity: 1 - globeIn }} />
    <div style={{ position: "absolute", left: 960, top: 514, opacity: 1 - globeIn,
      transform: `translate(-50%,-50%) scale(${1.58 - pullback * .58})`, filter: "drop-shadow(0 0 28px #55c8ff)" }}>
      <svg width="122" height="122" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={32 + pullback * 11} fill="#53c7ff" fillOpacity=".12" stroke="#a3e8ff" strokeOpacity=".57" />
        <path d="M49 22L73 71L50 61L28 71Z" fill="#fff" stroke="#18244e" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
    <div style={{ position: "absolute", width: 948, height: 948, top: 57,
      left: 487 + 388 * title, opacity: globeIn, transform: `scale(${1.70 - .70 * globeIn - .08 * title})` }}>
      <Globe frame={frame} unlock={unlock} />
    </div>
    <Topline small="Explore" />
    {title > 0 && <div style={{ position: "absolute", left: 95, top: 366, opacity: title, transform: `translateX(${-22 * (1 - title)}px)` }}>
      <Headline style={{ fontSize: 124 }}>World<br />unlocked.</Headline>
      <div style={{ marginTop: 30, fontSize: 34, color: "#cadbfc" }}>One street at a time.</div>
    </div>}
    <AbsoluteFill style={{ background: "linear-gradient(118deg,#72eaff 3%,#5069ff 57%,#e071ff 100%)", opacity: colorBurst * .58,
      mixBlendMode: "screen" }} />
    {globeIn < .96 && <Credit />}
  </Stage>;
}

function Product({ mode }: { mode: "places" | "activity" }) {
  const frame = useCurrentFrame();
  const arrival = settle(frame, 26);
  const isPlaces = mode === "places";
  return <Stage bg={isPlaces ? "#e7edff" : "#0e1532"} color={isPlaces ? black : white}>
    <Topline small={isPlaces ? "Saved places" : "Activity"} light={isPlaces} />
    <div style={{ position: "absolute", left: 95, top: 310, maxWidth: 850, opacity: arrival,
      transform: `translateY(${(1 - arrival) * 28}px)` }}>
      <Headline style={{ fontSize: 126 }}>{isPlaces ? <>Keep the<br />good spots.</> : <>See how<br />far you went.</>}</Headline>
      <div style={{ fontSize: 34, marginTop: 38, color: isPlaces ? "#424242" : "#c7c7c1" }}>
        {isPlaces ? "A pin, a memory, two photos." : "Distance, weekly stats, and route replay."}
      </div>
    </div>
    <div style={{ position: "absolute", left: 1036, top: 174, width: 314, height: 650, transformOrigin: "top left",
      transform: "scale(1.10)" }}>
      <Phone screen={mode} progress={isPlaces ? 1 : ramp(frame, 9, 103)} panel={1} />
    </div>
    <div style={{ position: "absolute", right: 100, top: 339, height: 300, width: 95, display: "flex",
      justifyContent: "center", alignItems: "center", borderLeft: `1px solid ${isPlaces ? "#a5a5a2" : "#464644"}`,
      writingMode: "vertical-rl", fontSize: 17, letterSpacing: ".19em", textTransform: "uppercase" }}>
      {isPlaces ? "Made personal" : "Every route counts"}
    </div>
  </Stage>;
}

function Achievement({ absolute }: { absolute: number }) {
  const frame = useCurrentFrame();
  const arrival = settle(frame, 22);
  return <Stage>
    <Topline small="Achievements" />
    <div style={{ position: "absolute", left: 96, top: 301, opacity: arrival }}>
      <Headline style={{ fontSize: 123 }}>Make<br />it count.</Headline>
      <div style={{ fontSize: 33, marginTop: 38, color: "#c7c7c3" }}>Earn milestones. Share the proof.</div>
    </div>
    <div style={{ position: "absolute", left: 870, top: 302, width: 876, height: 480, borderRadius: 23, border: "1px solid #747472",
      background: "#141414", boxShadow: "0 32px 110px #0009", padding: 34, boxSizing: "border-box",
      transform: `translateY(${(1 - arrival) * 75}px) rotate(${-4 + arrival * 1.5}deg) scale(${1 + beat(absolute) * .008})`, opacity: arrival }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 680 }}>
        <span>MapMine</span><span style={{ fontSize: 17, letterSpacing: ".13em", color: "#dadad6" }}>ACHIEVEMENT UNLOCKED</span>
      </div>
      <div style={{ marginTop: 58, width: 445, fontSize: 81, fontWeight: 690, lineHeight: .9, letterSpacing: "-.08em" }}>First<br />Landmark</div>
      <div style={{ marginTop: 19, color: "#d2d2cc", fontSize: 23 }}>Discover your first landmark.</div>
      <div style={{ position: "absolute", right: 39, top: 111, width: 296, height: 189, overflow: "hidden", border: "1px solid #646464",
        borderRadius: 11, filter: "grayscale(1)" }}><CityMap id="badge-route" aspect={296 / 189} progress={.77} fog={.66} /></div>
      <div style={{ position: "absolute", bottom: 30, left: 35, right: 35, display: "flex", justifyContent: "space-between",
        borderTop: "1px solid #515151", paddingTop: 19, fontSize: 22 }}><b>+100 XP</b><span style={{ color: "#c7c7be" }}>Earned on foot</span></div>
    </div>
    <Credit />
  </Stage>;
}
function Cutaway({ type, absolute }: { type: number; absolute: number }) {
  const frame = useCurrentFrame();
  const dark = type !== 1;
  const word = ["Explore.", "Record.", "Remember."][type];
  return <Stage bg={dark ? black : white} color={dark ? white : black}>
    {type !== 1 && <MapField progress={type === 0 ? .53 : .95} pulse={beat(absolute)} opacity={.49} />}
    <AbsoluteFill style={{ display: "grid", placeItems: "center",
      transform: `scale(${1.045 - .045 * settle(frame, 13)})` }}>
      <Headline style={{ fontSize: 217, lineHeight: 1 }}>{word}</Headline>
    </AbsoluteFill>
    {type !== 1 && <Credit />}
  </Stage>;
}
function Endcard({ absolute }: { absolute: number }) {
  const frame = useCurrentFrame();
  const p = beat(absolute);
  return <Stage bg="#090c20">
    <MapField progress={.88} pulse={p} opacity={.22} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center,#171f43d9 15%,#10153480 61%,#080a1a 100%)" }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", transform: `translateY(${(1 - settle(frame, 25)) * 20 - 24}px)`, opacity: .75 + .25 * settle(frame, 25) }}>
      <Img src={logo} alt="" style={{ width: 138, height: 138, objectFit: "cover", borderRadius: 27, marginBottom: 26,
        boxShadow: "0 18px 60px #5476ff55" }} />
      <Headline style={{ fontSize: 163, lineHeight: 1 }}>MapMine</Headline>
      <div style={{ color: "#d6d6d1", fontSize: 34, letterSpacing: "-.025em", marginTop: 25 }}>Make the map yours.</div>
      <div style={{ marginTop: 47, border: "1px solid #8c8c87", borderRadius: 100, padding: "15px 30px",
        fontSize: 19, fontWeight: 620, letterSpacing: ".12em", textTransform: "uppercase" }}>Download MapMine</div>
    </div>
    <Credit />
  </Stage>;
}

function Film() {
  const [font] = useState(() => delayRender("Load Geist"));
  useEffect(() => {
    const face = new FontFace("Geist", `url(${staticFile("brand/geist.woff2")})`, { weight: "100 900" });
    face.load().then(loaded => document.fonts.add(loaded)).catch(() => undefined).finally(() => continueRender(font));
  }, [font]);
  const absolute = useCurrentFrame();
  const scenes = [
    <Opening absolute={absolute} />,
    <WorldReveal absolute={absolute} />,
    <Product mode="places" />,
    <Product mode="activity" />,
    <Achievement absolute={absolute} />,
    <Cutaway absolute={absolute} type={0} />,
    <Cutaway absolute={absolute} type={1} />,
    <Cutaway absolute={absolute} type={2} />,
    <Endcard absolute={absolute} />,
  ];
  return <AbsoluteFill style={{ background: black }}>
    {scenes.map((scene, i) => {
      const start = Math.round(cutTimes[i] * fps);
      const end = Math.round(cutTimes[i + 1] * fps);
      return <Sequence key={start} from={start} durationInFrames={end - start}>{scene}</Sequence>;
    })}
  </AbsoluteFill>;
}

function Root() {
  return <Composition id="MapMineBeatCut" component={Film} width={1920} height={1080} fps={fps} durationInFrames={duration} />;
}

registerRoot(Root);
