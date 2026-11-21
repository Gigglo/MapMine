import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetScrollView, useBottomSheetSpringConfigs } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, ChevronUp, Footprints, MapPin } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button, Stat, formatArea, formatDistance, styles, tap } from "../../components/ui/primitives";
import { statusText, useSession } from "../../store/session";
import { colors } from "../../theme/color";
import ExploreMenu, { type ExploreDestination } from "./ExploreMenu";
import PlacesScreen from "../../screens/PlacesScreen";
import ActivityScreen from "../../screens/ActivityScreen";
import AchievementsScreen from "../../screens/AchievementsScreen";

export default function ExploreSummary({ position, onChange, onTrack, onSave }: {
  position: number; onChange: (index: number) => void; onTrack: () => void; onSave: () => void;
}) {
  const sheet = useRef<BottomSheet>(null);
  const [destination, setDestination] = useState<ExploreDestination | null>(null);
  const { bottom } = useSafeAreaInsets();
  const snapshot = useSession(state => state.summary);
  const status = useSession(state => state.status);
  const fix = useSession(state => state.fix !== null);
  const tracking = useSession(state => state.preferences.tracking);
  const stops = useMemo(() => [90, "43%", "83%"], []);
  const spring = useBottomSheetSpringConfigs({ damping: 30, stiffness: 285, mass: 0.85, overshootClamping: true });
  const today = snapshot?.today;
  const active = status === "live";
  const expanded = position > 0;
  const Chevron = expanded ? ChevronDown : ChevronUp;

  return <BottomSheet ref={sheet} index={0} snapPoints={stops} enableDynamicSizing={false}
    detached bottomInset={Math.max(bottom, 10) + 6} style={local.sheet}
    animationConfigs={spring} animateOnMount={false} enablePanDownToClose={false} backgroundStyle={local.background}
    handleIndicatorStyle={local.handle} onChange={index => {
      if (index === 0) setDestination(null);
      if (index !== position) tap();
      onChange(index);
    }}>
    <BottomSheetScrollView key={destination ?? "explore"} keyboardShouldPersistTaps="handled" contentContainerStyle={local.content}>
      {destination ? <Animated.View entering={FadeIn.duration(160)}>
        {destination === "/places" && <PlacesScreen onSheetBack={() => setDestination(null)}
          onShowMap={() => { setDestination(null); sheet.current?.snapToIndex(0); }} />}
        {destination === "/activity" && <ActivityScreen onSheetBack={() => setDestination(null)} />}
        {destination === "/achievements" && <AchievementsScreen onSheetBack={() => setDestination(null)} />}
      </Animated.View> : <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? "Collapse exploration summary" : "Expand exploration summary"}
        onPress={() => sheet.current?.snapToIndex(expanded ? 0 : 1)} style={local.summary}>
        <View style={local.emblem}><Footprints color={colors.text} size={21} /></View>
        <View style={styles.flex}>
          <Text style={styles.heading}>Exploration</Text>
          <Text numberOfLines={1} style={styles.secondary}>{formatDistance(today?.meters ?? 0)} travelled · {formatArea(today?.area ?? 0)} new</Text>
        </View>
        <Chevron color={colors.textSecondary} size={18} />
      </Pressable>
      <View accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? "auto" : "no-hide-descendants"} style={local.details}>
      <ExploreMenu onSelect={value => { setDestination(value); sheet.current?.snapToIndex(2); }} />
      <View style={styles.row}>
        <View style={[local.status, active && local.active]} />
        <Text accessibilityLiveRegion="polite" style={[styles.secondary, styles.flex]}>{statusText[status]}</Text>
        <Button label={tracking && ["live", "searching", "weak", "checking"].includes(status) ? "Pause" : "Enable / retry"} onPress={onTrack} />
      </View>
      <Text accessibilityRole="header" style={styles.heading}>Today</Text>
      <View style={styles.wrap}>
        <Stat label="Distance today" value={formatDistance(today?.meters ?? 0)} />
        <Stat label="New area today" value={formatArea(today?.area ?? 0)} />
        <Stat label="Cells unlocked today" value={today?.cells ?? 0} />
        <Stat label="Places visited today" value={snapshot?.visitsToday ?? 0} />
        <Stat label="Landmarks unlocked" value={snapshot?.metrics.landmarks ?? 0} />
        <Stat label="Day streak" value={snapshot?.metrics.streak ?? 0} />
      </View>
      <Button label="Save my location" disabled={!fix} onPress={onSave} icon={<MapPin color={colors.text} size={16} />} />
      <Text style={styles.heading}>Recent journeys</Text>
      {snapshot?.journeys.length ? snapshot.journeys.slice(0, 3).map(journey => <View key={journey.id} style={styles.row}>
        <Text style={[styles.text, styles.flex]}>{new Date(journey.started).toLocaleDateString()}</Text>
        <Text style={styles.secondary}>{formatDistance(journey.meters)}</Text>
      </View>) : <Text style={styles.secondary}>Your journeys appear here after you start exploring.</Text>}
      </View>
      </>}
    </BottomSheetScrollView>
  </BottomSheet>;
}

const local = StyleSheet.create({
  sheet: { marginHorizontal: 14, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  background: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  handle: { backgroundColor: "#666666", width: 29 },
  content: { paddingHorizontal: 17, paddingBottom: 23, gap: 13 },
  details: { gap: 14 },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 55 },
  emblem: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  status: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  active: { backgroundColor: colors.success },
});
