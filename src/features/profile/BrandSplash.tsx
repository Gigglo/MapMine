import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, styles } from "../../components/ui/primitives";
import BrandImage from "./BrandImage";
import { useBrandLogo } from "./branding";
import { colors } from "../../theme/color";

const fade = FadeIn.duration(450);

export default function BrandSplash({ ready, onLayout, onEnter, onRetry }: {
  ready: boolean; onLayout: () => void; onEnter: () => void; onRetry?: () => void;
}) {
  const { source } = useBrandLogo();
  const { bottom } = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setFinished(true), reducedMotion ? 0 : 650);
    return () => clearTimeout(timer);
  }, [visible, reducedMotion]);

  useEffect(() => {
    if (ready && finished) onEnter();
  }, [ready, finished, onEnter]);

  return <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, local.splash]} onLayout={() => {
    if (!visible) { onLayout(); setVisible(true); }
  }}>
    {visible && <Animated.View entering={fade} style={local.lockup}>
      <BrandImage source={source} style={local.logo} />
      <Text style={local.wordmark}>MapMine</Text>
    </Animated.View>}
    {!ready && finished && <View style={[local.status, { bottom: Math.max(bottom, 16) + 24 }]}>
      <Text accessibilityLiveRegion="polite" style={styles.secondary}>{onRetry ? "Could not open your local map data." : "Opening your map…"}</Text>
      {onRetry && <Button label="Retry" onPress={onRetry} />}
    </View>}
  </View>;
}

const local = StyleSheet.create({
  splash: { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", zIndex: 20 },
  lockup: { alignItems: "center", gap: 12 },
  logo: { width: 68, height: 68, borderRadius: 15 },
  wordmark: { color: colors.text, fontSize: 42, fontWeight: "600", letterSpacing: -1.7 },
  status: { position: "absolute", alignItems: "center", gap: 10 },
});
