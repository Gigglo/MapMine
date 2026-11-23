import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue,
  withTiming, type SharedValue } from "react-native-reanimated";

const particles = [
  { glyph: "\u{1F389}", x: -118, y: -112, tilt: -38, drift: 24 },
  { glyph: "\u2728", x: -74, y: -148, tilt: 20, drift: 36 },
  { glyph: "\u{1F4CD}", x: -35, y: -103, tilt: -22, drift: 62 },
  { glyph: "\u2B50", x: 5, y: -162, tilt: 49, drift: 23 },
  { glyph: "\u2728", x: 49, y: -111, tilt: -26, drift: 52 },
  { glyph: "\u{1F5FA}\uFE0F", x: 89, y: -144, tilt: 27, drift: 38 },
  { glyph: "\u{1F389}", x: 117, y: -92, tilt: 42, drift: 59 },
];

function Particle({ glyph, x, y, tilt, drift, progress }: (typeof particles)[number] & { progress: SharedValue<number> }) {
  const motion = useAnimatedStyle(() => {
    const time = progress.get();
    return {
      opacity: interpolate(time, [0, 0.16, 0.62, 1], [0, 1, 1, 0], "clamp"),
      transform: [
        { translateX: x * time },
        { translateY: y * Math.sin(time * Math.PI / 2) + drift * time * time },
        { rotate: tilt * time + "deg" },
        { scale: interpolate(time, [0, 0.32, 1], [0.65, 1.1, 0.9], "clamp") },
      ],
    };
  });
  return <Animated.Text allowFontScaling={false} style={[local.glyph, motion]}>{glyph}</Animated.Text>;
}

export default function LandmarkCelebration() {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reducedMotion) progress.set(withTiming(1, { duration: 1450, easing: Easing.out(Easing.quad) }));
  }, [progress, reducedMotion]);
  if (reducedMotion) return null;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants" style={local.burst}>
    {particles.map(particle => <Particle key={particle.x} {...particle} progress={progress} />)}
  </View>;
}

const local = StyleSheet.create({
  burst: { position: "absolute", top: 0, left: "50%", width: 0, height: 0 },
  glyph: { position: "absolute", width: 32, left: -16, top: -12, textAlign: "center", fontSize: 23 },
});
