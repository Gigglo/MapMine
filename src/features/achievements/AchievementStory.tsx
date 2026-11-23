import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Navigation, Share2 } from "lucide-react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Sharing from "expo-sharing";
import { usePostHog } from "posthog-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Panel from "../../components/ui/Panel";
import { Button, styles } from "../../components/ui/primitives";
import { colors } from "../../theme/color";
import { readAchievementRoute, type RoutePoint, type Unlock } from "../../database/repository";
import RouteMap from "../activity/RouteMap";
import BadgeImage from "./BadgeImage";
import type { Milestone } from "./milestones";

export type EarnedStory = { milestone: Milestone; award: Unlock };
const dimensions = { width: 350, height: 200 };
const exportSize = { width: 1400, height: 800 };

async function exportStory(card: ComponentRef<typeof View>) {
  const raw = await captureRef(card, { format: "png", result: "tmpfile", useRenderInContext: Platform.OS === "ios" });
  try {
    const image = await ImageManipulator.manipulate(raw).resize(exportSize).renderAsync();
    return (await image.saveAsync({ format: SaveFormat.PNG })).uri;
  } finally {
    releaseCapture(raw);
  }
}

export default function AchievementStory({ milestone, award, onClose }: EarnedStory & { onClose: () => void }) {
  const posthog = usePostHog();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const space = Math.min(window.height * 0.88, window.height - insets.top - 12) - Math.max(14, insets.bottom) - 138;
  const width = Math.min(460, window.width - 44, Math.max(180, space * dimensions.width / dimensions.height));
  const unit = width / dimensions.width;
  const card = useRef<ComponentRef<typeof View>>(null);
  const sharing = useRef(false);
  const [laidOut, setLaidOut] = useState(false);
  const [badgeReady, setBadgeReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [points, setPoints] = useState<RoutePoint[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const earned = new Date(award.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const canShare = laidOut && badgeReady && points !== undefined && (!points.length || mapReady) && !busy;

  useEffect(() => {
    let active = true;
    void readAchievementRoute(award.timestamp).then(value => { if (active) setPoints(value); })
      .catch(() => {
        if (active) { setPoints([]); setError("Could not load the achievement route."); }
      });
    return () => { active = false; };
  }, [award.timestamp]);

  async function share() {
    if (!card.current || !canShare || sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setError("");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError("Image sharing is unavailable on this device.");
        return;
      }
      const captured = await exportStory(card.current);
      await Sharing.shareAsync(captured, {
        mimeType: "image/png", UTI: "public.png", dialogTitle: "Share achievement",
      });
    } catch {
      setError("Could not share the image. Try again.");
    } finally { sharing.current = false; setBusy(false); }
  }

  return <Panel title="Share achievement" onClose={onClose}>
    <View ref={card} collapsable={false} onLayout={() => setLaidOut(true)}
      style={[local.card, { width, height: dimensions.height * unit, padding: 17 * unit, borderRadius: 13 * unit }]}>
      <View style={local.line}>
        <Text allowFontScaling={false} style={[local.brand, { fontSize: 17 * unit }]}>MapMine</Text>
        <Text allowFontScaling={false} style={[local.kicker, { fontSize: 9 * unit }]}>ACHIEVEMENT UNLOCKED</Text>
      </View>
      <View style={[local.body, { gap: 14 * unit }]}>
        <View style={[local.copy, { gap: 7 * unit }]}>
          <Text allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.68}
            style={[local.title, { fontSize: 25 * unit, lineHeight: 27 * unit }]}>{milestone.name}</Text>
          <Text allowFontScaling={false} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.78}
            style={[local.description, { fontSize: 11 * unit, lineHeight: 14 * unit }]}>{milestone.description}</Text>
        </View>
        <View style={[local.artwork, { width: 108 * unit, gap: 7 * unit }]}>
          <BadgeImage id={milestone.id} size={32 * unit} onReady={() => setBadgeReady(true)} />
          {(points === undefined || points.length > 0) && <View style={[local.mapFrame, { borderRadius: 5 * unit }]}>
            {points ? <RouteMap points={points} onMapReady={setMapReady} />
              : <View style={local.emptyMap}><Navigation size={15 * unit} color="#aaa" /></View>}
          </View>}
        </View>
      </View>
      <View style={[local.line, local.footer, { paddingTop: 8 * unit }]}>
        <Text allowFontScaling={false} style={[local.xp, { fontSize: 13 * unit }]}>+{award.xp.toLocaleString()} XP</Text>
        <Text allowFontScaling={false} style={[local.date, { fontSize: 10 * unit }]}>{earned}</Text>
      </View>
    </View>
    <Button label={busy ? "Preparing image..." : "Share card"} kind="primary" disabled={!canShare}
      icon={<Share2 color={colors.background} size={16} />} onPress={() => {
        posthog.capture("button_pressed", { button_name: "share_achievement_card" });
        void share();
      }} />
    {error && <Text accessibilityLiveRegion="polite" style={styles.secondary}>{error}</Text>}
  </Panel>;
}

const local = StyleSheet.create({
  card: { alignSelf: "center", backgroundColor: "#090909", borderColor: "#444",
    borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", justifyContent: "space-between" },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: "#fff", fontWeight: "700", letterSpacing: -0.45 },
  kicker: { color: "#ccc", fontWeight: "600", letterSpacing: 0.65 },
  body: { flexDirection: "row", alignItems: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontWeight: "700", letterSpacing: -0.6 },
  description: { color: "#ddd" },
  artwork: { alignItems: "flex-end", justifyContent: "center" },
  mapFrame: { width: "100%", borderWidth: StyleSheet.hairlineWidth, borderColor: "#444", overflow: "hidden" },
  emptyMap: { aspectRatio: 320 / 180, backgroundColor: "#161616", alignItems: "center", justifyContent: "center" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#383838" },
  xp: { color: "#fff", fontWeight: "700", fontVariant: ["tabular-nums"] },
  date: { color: "#ccc", fontVariant: ["tabular-nums"] },
});
