import { Easing, interpolate, spring } from "remotion";
import { fps } from "../config/timing";

export const ramp = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
export const ease = (frame: number, from: number, to: number) => Easing.inOut(Easing.cubic)(ramp(frame, from, to));
export const glide = (frame: number, delay = 0) => spring({
  frame: Math.max(0, frame - delay), fps, config: { damping: 28, stiffness: 135, mass: 0.9 }, durationInFrames: 54,
});
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
