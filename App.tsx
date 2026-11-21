import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Button, styles } from "./src/components/ui/primitives";
import { useTracking } from "./src/features/location/useTracking";
import BrandSplash from "./src/features/profile/BrandSplash";
import { loadBrandLogo } from "./src/features/profile/branding";
import { removeCachedExport } from "./src/features/profile/personalExport";
import { initialize, report, useSession } from "./src/store/session";
import { colors } from "./src/theme/color";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const revealSplash = () => void SplashScreen.hideAsync().catch(() => undefined);

function Bootstrap() {
  const ready = useSession(state => state.ready);
  const error = useSession(state => state.error);
  const [entered, setEntered] = useState(false);
  useTracking(entered);

  useEffect(() => {
    try { loadBrandLogo(); } catch { /* The bundled logo is always available. */ }
    void initialize().then(removeCachedExport).catch(report);
  }, []);

  return <>
    {ready && <View style={local.root} pointerEvents={entered ? "auto" : "none"}
      accessibilityElementsHidden={!entered} importantForAccessibility={entered ? "auto" : "no-hide-descendants"}>
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      </Stack>
    </View>}
    {entered && error && <View style={local.notice}>
      <Text accessibilityLiveRegion="polite" style={[styles.secondary, styles.flex]}>MapMine couldn’t complete the last operation.</Text>
      <Button label="Dismiss" onPress={() => useSession.setState({ error: null })} />
    </View>}
    {!entered && <BrandSplash ready={ready} onLayout={revealSplash} onEnter={() => setEntered(true)}
      onRetry={!ready && error ? () => void initialize().catch(report) : undefined} />}
  </>;
}

export default function App() {
  return <GestureHandlerRootView style={local.root}>
    <SafeAreaProvider>
      <BottomSheetModalProvider>
        <StatusBar style="light" />
        <Bootstrap />
      </BottomSheetModalProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>;
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  notice: { position: "absolute", bottom: 100, left: 14, right: 14, padding: 12, borderRadius: 14, gap: 8,
    alignItems: "center", flexDirection: "row", backgroundColor: colors.elevated },
});
