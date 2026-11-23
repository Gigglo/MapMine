import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ramp } from "../animations/motion";
import { ink, paper } from "../config/timing";

export function usePortrait() {
  const { width, height } = useVideoConfig();
  return height > width;
}

export function Stage({ children, dark = false, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return <AbsoluteFill style={{ background: dark ? "#111211" : paper, color: dark ? paper : ink,
    fontFamily: "Geist, Arial, sans-serif", overflow: "hidden", ...style }}>{children}</AbsoluteFill>;
}

export function Caption({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 22, letterSpacing: "0.11em", fontWeight: 550, textTransform: "uppercase", ...style }}>{children}</div>;
}

export function Logo({ size }: { size: number }) {
  return <Img alt="" src={staticFile("brand/mapmine.png")} style={{ width: size, height: size, borderRadius: Math.round(size * .23), display: "block" }} />;
}

export const warmGradient = "linear-gradient(105deg, #a73d17 0%, #b64a18 48%, #d56a1d 100%)";

export function Type({ text, delay = 0, step, fast = false, warm = false }: {
  text: string;
  delay?: number;
  step?: number;
  fast?: boolean;
  warm?: boolean;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return <span aria-label={text} style={{ display: "block" }}>
    {words.map((word, i) => {
      const start = delay + i * (step ?? (fast ? 3 : 7));
      const progress = ramp(frame, start, start + (fast ? 15 : 23));
      const remaining = (1 - progress) ** 2.6;
      return <span key={i} style={{
        display: "inline-block", verticalAlign: "bottom", overflow: "hidden",
        padding: ".08em 0 .13em", marginBottom: "-.13em", marginTop: "-.08em",
        marginRight: i < words.length - 1 ? ".24em" : 0,
      }}>
        <span style={{ display: "block", opacity: ramp(frame, start, start + (fast ? 5 : 8)),
          ...(warm ? { backgroundImage: warmGradient, backgroundClip: "text", color: "transparent" } : {}),
          transform: `translateY(${remaining * 94}%)` }}>{word}</span>
      </span>;
    })}
  </span>;
}

export function Credit({ light = true }: { light?: boolean }) {
  return <div style={{ position: "absolute", right: 18, bottom: 14, fontSize: 15, color: light ? "#d6d9d6" : "#4e514d",
    background: light ? "#111d" : "#f7f6f1e8", padding: "6px 10px", borderRadius: 5 }}>© OpenStreetMap contributors · © CARTO</div>;
}
