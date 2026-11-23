import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AppAnalytics, ScreenAnalytics } from "./src/features/analytics/AppAnalytics";
import { Button, styles } from "./src/components/ui/primitives";
import { monitorNearbyNotification, syncReminders } from "./src/features/engagement/notifications";
import { EggToast } from "./src/features/easterEggs/EggSurfaces";
import { useTracking } from "./src/features/location/useTracking";
import Walkthrough from "./src/features/onboarding/Walkthrough";
import BrandSplash from "./src/features/profile/BrandSplash";
import { loadBrandLogo } from "./src/features/profile/branding";
import { removeCachedExport } from "./src/features/profile/personalExport";
import { initialize, report, updatePreferences, useSession } from "./src/store/session";
import { colors } from "./src/theme/color";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const revealSplash = () => void SplashScreen.hideAsync().catch(() => undefined);

function Bootstrap() {
  const ready = useSession(state => state.ready);
  const tracking = useSession(state => state.preferences.tracking);
  const walkthroughSeen = useSession(state => state.preferences.walkthroughSeen);
  const notifications = useSession(state => state.preferences.notifications);
  const error = useSession(state => state.error);
  const [entered, setEntered] = useState(false);
  const walkthroughPending = ready && !walkthroughSeen;
  const appVisible = entered && !walkthroughPending;
  useTracking();

  const enterWorld = useCallback(() => setEntered(true), []);

  useEffect(() => {
    try { loadBrandLogo(); } catch { /* The bundled logo is always available. */ }
    void initialize().then(removeCachedExport).catch(report);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sync = () => void syncReminders().catch(() => undefined);
    sync();
    const listener = AppState.addEventListener("change", state => { if (state === "active") sync(); });
    return () => listener.remove();
  }, [ready, tracking, notifications]);

  useEffect(() => {
    if (!appVisible) return;
    return monitorNearbyNotification(point => {
      router.navigate("/");
      useSession.setState({ target: point, following: false });
    });
  }, [appVisible]);

  return <>
    <ScreenAnalytics ready={appVisible} />
    {ready && !walkthroughPending && <View style={local.root} pointerEvents={entered ? "auto" : "none"}
      accessibilityElementsHidden={!entered} importantForAccessibility={entered ? "auto" : "no-hide-descendants"}>
      <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      </Stack>
    </View>}
    {appVisible && error && <View style={local.notice}>
      <Text accessibilityLiveRegion="polite" style={[styles.secondary, styles.flex]}>MapMine couldn’t complete the last operation.</Text>
      <Button label="Dismiss" onPress={() => useSession.setState({ error: null })} />
    </View>}
    {appVisible && <EggToast />}
    {entered && walkthroughPending && <Walkthrough onFinish={() => updatePreferences({ walkthroughSeen: 1 })} />}
    {!entered && <BrandSplash ready={ready} onLayout={revealSplash} onEnter={enterWorld}
      onRetry={!ready && error ? () => void initialize().catch(report) : undefined} />}
  </>;
}

export default function App() {
  return <GestureHandlerRootView style={local.root}>
    <SafeAreaProvider>
      <BottomSheetModalProvider>
        <StatusBar style="light" />
        <AppAnalytics><Bootstrap /></AppAnalytics>
      </BottomSheetModalProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>;
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  notice: { position: "absolute", bottom: 100, left: 14, right: 14, padding: 12, borderRadius: 14, gap: 8,
    alignItems: "center", flexDirection: "row", backgroundColor: colors.elevated },
});
