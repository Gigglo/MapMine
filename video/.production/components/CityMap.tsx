import type { CSSProperties } from "react";
import { staticFile } from "remotion";
import { ease, mix } from "../animations/motion";
import { blue } from "../config/timing";

type Point = readonly [number, number];
const route: Point[] = [[345, 890], [404, 807], [455, 741], [521, 652], [560, 598], [595, 544], [618, 503],
  [640, 455], [655, 412], [666, 367], [675, 311], [714, 314], [780, 322], [858, 330], [866, 257], [860, 157]];
const lengths = route.slice(1).map(([x,y], i) => Math.hypot(x - route[i][0], y - route[i][1]));
const total = lengths.reduce((sum, length) => sum + length, 0);
const map = staticFile("maps/bhubaneswar.webp");

function trail(progress: number) {
  let remaining = progress * total;
  let segment = 0;
  while (segment < lengths.length - 1 && remaining > lengths[segment]) remaining -= lengths[segment++];
  const [x,y] = route[segment];
  const t = Math.min(1, remaining / lengths[segment]);
  const end: Point = [mix(x, route[segment + 1][0], t), mix(y, route[segment + 1][1], t)];
  const points = [...route.slice(0, segment + 1), end];
  return { end, points: points.map(p => p.join(",")).join(" "),
    heading: Math.atan2(end[1] - y, end[0] - x) * 180 / Math.PI + 90 };
}

type Discovery = { progress: number; elapsed: number };

function DiscoveryPin({ progress, elapsed }: Discovery) {
  const { end: [x, y] } = trail(progress);
  const visible = ease(elapsed, -105, -85);
  const unlocked = ease(elapsed, 0, 11);
  const wave = ease(elapsed, 0, 31);
  const scale = mix(.8, 1, visible) + .16 * Math.sin(unlocked * Math.PI);
  return <g transform={`translate(${x}, ${y - 27}) scale(${scale})`} opacity={visible}>
    <circle r={mix(13, 33, wave)} fill="none" stroke="#ffb266" strokeWidth="1.8" opacity={unlocked * (1 - wave)} />
    <path d="M0 15v12" fill="none" stroke={elapsed < 0 ? "#c5c0b7" : "#ffb266"} strokeWidth="1.5" opacity=".8" />
    <circle r="13" fill={elapsed < 0 ? "#242321" : "#f3a255"} stroke={elapsed < 0 ? "#c5c0b7" : "#ffd39c"} strokeWidth="1.5" />
    <text y="5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#f5eee5" opacity={1 - unlocked}>?</text>
    <path d="m-5 0 3.5 3.5L5.5-4" stroke="#44250e" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={unlocked} />
  </g>;
}

export function CityMap({ id, progress, fog = 1, zoom = 1.3, follow = true, pulse = 0, marker = true, aspect = 1500 / 900, discoveries,
  style }: { id: string; progress: number; fog?: number; zoom?: number; follow?: boolean; pulse?: number;
  marker?: boolean; aspect?: number; discoveries?: readonly Discovery[]; style?: CSSProperties }) {
  const { end: [x,y], points, heading } = trail(progress);
  const centerX = follow ? mix(680, x, .77) : 750;
  const centerY = follow ? mix(550, y, .77) : 450;
  const mask = `${id}-fog`;
  const width = Math.min(1500, 900 * aspect) / zoom;
  const height = width / aspect;
  const left = Math.max(0, Math.min(1500 - width, centerX - width / 2));
  const top = Math.max(0, Math.min(900 - height, centerY - height / 2));
  return <svg viewBox={`${left} ${top} ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden
    style={{ width: "100%", height: "100%", display: "block", background: "#111211", ...style }}>
    <defs>
      <mask id={mask} x="0" y="0" width="1500" height="900" maskUnits="userSpaceOnUse" style={{ maskType: "luminance" }}>
        <rect width="1500" height="900" fill="white" />
        {([[158, "#dedede"], [139, "#ababab"], [120, "#626262"], [102, "#232323"], [88, "#000"]] as const).map(([width, shade]) =>
          <polyline key={width} points={points} stroke={shade} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
      </mask>
    </defs>
    <image href={map} width="1500" height="900" />
    <rect width="1500" height="900" fill="#070908" opacity={fog * .91} mask={`url(#${mask})`} />
    {marker && <g>
      <polyline points={points} stroke="#e7effa" strokeOpacity=".88" strokeWidth="2.3" strokeDasharray="2.5 5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={x} cy={y} r={9 + pulse * 19} fill="none" stroke={blue} strokeWidth="1.7" opacity={(1 - pulse) * .65} />
      <circle cx={x} cy={y} r="12" fill="#60a5fa" opacity=".22" />
      <path d="M0 -8 7 7 0 4 -7 7Z" transform={`translate(${x} ${y}) rotate(${heading})`} fill="#eff6ff" stroke="#121a24" strokeWidth="2" strokeLinejoin="round" />
    </g>}
    {discoveries?.map(discovery => <DiscoveryPin key={discovery.progress} {...discovery} />)}
  </svg>;
}
