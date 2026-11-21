import { useRef } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { ArrowRight } from "lucide-react-native";
import { Button, styles, tap } from "../../components/ui/primitives";
import { colors } from "../../theme/color";
import { useBrandLogo } from "./branding";

const logoEntrance = ZoomIn.springify().damping(22).stiffness(165).mass(0.8)
  .withInitialValues({ transform: [{ scale: 0.89 }] });

function EnterSlider({ onEnter }: { onEnter: () => void }) {
  const { width } = useWindowDimensions();
  const railWidth = Math.min(310, width - 52);
  const travel = Math.max(1, railWidth - 56);
  const progress = useSharedValue(0);
  const committed = useSharedValue(false);
  const pressed = useRef(false);

  function enter() {
    if (pressed.current) return;
    pressed.current = true;
    committed.set(true);
    tap();
    progress.set(withTiming(1, { duration: 180 }, completed => {
      if (completed) scheduleOnRN(onEnter);
    }));
  }

  const pan = usePanGesture({
    activeOffsetX: 8,
    failOffsetY: [-18, 18],
    onUpdate: event => {
      if (!committed.get()) progress.set(Math.max(0, Math.min(1, event.translationX / travel)));
    },
    onDeactivate: event => {
      if (committed.get()) return;
      if (!event.canceled && progress.get() >= 0.62) scheduleOnRN(enter);
      else progress.set(withSpring(0, { damping: 23, stiffness: 270 }));
    },
  });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: travel * progress.get() }] }));
  const fill = useAnimatedStyle(() => ({ width: 50 + travel * progress.get() }));
  const label = useAnimatedStyle(() => ({ opacity: 1 - progress.get() * 0.88 }));

  return <Animated.View entering={FadeIn.duration(240)}>
    <GestureDetector gesture={pan}>
      <Pressable accessibilityRole="button" accessibilityLabel="Enter the world" onPress={enter}
        style={[local.rail, { width: railWidth }]}>
        <Animated.View pointerEvents="none" style={[local.fill, fill]} />
        <Animated.Text pointerEvents="none" style={[local.instruction, label]}>Swipe to enter the world</Animated.Text>
        <Animated.View pointerEvents="none" style={[local.thumb, thumb]}>
          <ArrowRight size={20} color={colors.background} />
        </Animated.View>
      </Pressable>
    </GestureDetector>
  </Animated.View>;
}

export default function BrandSplash({ ready, onLayout, onEnter, onRetry }: {
  ready: boolean; onLayout: () => void; onEnter: () => void; onRetry?: () => void;
}) {
  const { source } = useBrandLogo();
  const { bottom } = useSafeAreaInsets();
  return <Animated.View accessibilityViewIsModal exiting={FadeOut.duration(300)} onLayout={onLayout}
    style={[StyleSheet.absoluteFill, local.splash]}>
    <Animated.View entering={logoEntrance} style={local.lockup}>
      <Image source={source} style={local.logo} fadeDuration={0} accessibilityLabel="MapMine logo" />
    </Animated.View>
    <View style={[local.entry, { bottom: Math.max(bottom, 16) + 24 }]}>
      {ready ? <EnterSlider onEnter={onEnter} /> : onRetry ? <>
        <Text style={styles.secondary}>Couldn’t open your local map data.</Text>
        <Button label="Retry" onPress={onRetry} />
      </> : <Text accessibilityLiveRegion="polite" style={styles.secondary}>Opening your map…</Text>}
    </View>
  </Animated.View>;
}

const local = StyleSheet.create({
  splash: { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", zIndex: 20 },
  lockup: { width: 150, height: 150, alignItems: "center", justifyContent: "center", marginTop: -44 },
  logo: { width: 96, height: 96, borderRadius: 20 },
  entry: { position: "absolute", alignItems: "center", gap: 10 },
  rail: { height: 56, justifyContent: "center", borderRadius: 29, borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#414141", backgroundColor: "#1C1C1C", overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 28, backgroundColor: "#303030" },
  instruction: { marginLeft: 64, color: colors.text, fontSize: 13, fontWeight: "600" },
  thumb: { position: "absolute", left: 5, top: 5, width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.text },
});
