import { useRef, useState, type ComponentRef } from "react";
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Share2 } from "lucide-react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Panel from "../../components/ui/Panel";
import { Button, styles } from "../../components/ui/primitives";
import { colors } from "../../theme/color";
import type { Unlock } from "../../database/repository";
import { bundledLogo } from "../profile/branding";
import { badges } from "./badges";
import type { Milestone } from "./milestones";

export type EarnedStory = { milestone: Milestone; award: Unlock };
const exportSize = { width: 1080, height: 1920 };
const cardBackground = require("../../../assets/achievement-story-background.png");
const heartBackdrop = [
  { glyph: "💗", left: -24, top: 50, size: 104, opacity: 0.3, angle: "-16deg" },
  { glyph: "💖", left: 195, top: 162, size: 105, opacity: 0.3, angle: "14deg" },
  { glyph: "💕", left: -16, top: 274, size: 84, opacity: 0.3, angle: "-12deg" },
  { glyph: "🫶", left: 183, top: 410, size: 88, opacity: 0.3, angle: "13deg" },
];
const celebration = [
  { glyph: "✦", left: 56, top: 112, size: 17 },
  { glyph: "✧", left: 67, top: 173, size: 14 },
  { glyph: "✦", left: 213, top: 95, size: 21 },
  { glyph: "🎉", left: 210, top: 166, size: 24 },
];

async function exportStory(card: ComponentRef<typeof View>) {
  const raw = await captureRef(card, { format: "png", result: "tmpfile", useRenderInContext: Platform.OS === "ios" });
  try {
    const image = await ImageManipulator.manipulate(raw).resize(exportSize).renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.PNG });
    return result.uri;
  } finally {
    releaseCapture(raw);
  }
}

export default function AchievementStory({ milestone, award, onClose }: EarnedStory & { onClose: () => void }) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const space = Math.min(window.height * 0.88, window.height - insets.top - 12) - Math.max(14, insets.bottom) - 138;
  const width = 9 * Math.floor(Math.min(288, window.width - 48, Math.max(126, space * 9 / 16)) / 9);
  const unit = width / 288;
  const card = useRef<ComponentRef<typeof View>>(null);
  const captured = useRef<string | null>(null);
  const sharing = useRef(false);
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accent = "#FFDBA5";
  const earned = new Date(award.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const zone = (top: number) => ({ top: top * unit, left: 21 * unit, right: 21 * unit });

  async function share() {
    const target = card.current;
    if (!target || !laidOut || !imageReady || !logoReady || !backgroundReady || sharing.current) return;
    sharing.current = true;
    setBusy(true);
    setError("");
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setError("Image sharing is unavailable on this device.");
        return;
      }
      // Capture the laid-out view first. Resize the resulting bitmap separately.
      captured.current ??= await exportStory(target);
      await Sharing.shareAsync(captured.current, {
        mimeType: "image/png", UTI: "public.png", dialogTitle: "Share achievement",
      });
    } catch {
      captured.current = null;
      setError("Couldn’t share the image. Try again.");
    } finally { sharing.current = false; setBusy(false); }
  }

  return <Panel title="Share achievement" onClose={onClose}>
    <View style={local.preview}>
      <View ref={card} collapsable={false} onLayout={() => setLaidOut(true)}
        style={[local.card, { width, height: 512 * unit }]}>
        <Image source={cardBackground} resizeMode="stretch" fadeDuration={0}
          onLoad={() => setBackgroundReady(true)} onError={() => setError("Couldn’t load the card background.")}
          accessible={false} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} />
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}>
          {heartBackdrop.map(({ glyph, left, top, size, opacity, angle }) => (
            <Text key={glyph} allowFontScaling={false} style={[local.overlay, {
              left: left * unit, top: top * unit, fontSize: size * unit, opacity, transform: [{ rotate: angle }],
            }]}>{glyph}</Text>
          ))}
          {celebration.map(({ glyph, left, top, size }) => (
            <Text key={left} allowFontScaling={false} style={[local.overlay, {
              left: left * unit, top: top * unit, fontSize: size * unit, color: accent,
            }]}>{glyph}</Text>
          ))}
        </View>
        <View style={[local.line, zone(22)]}>
          <View style={[local.lockup, { gap: 8 * unit }]}>
            <Image source={bundledLogo} fadeDuration={0} onLoad={() => setLogoReady(true)}
              onError={() => setError("Couldn’t load the MapMine logo.")}
              style={{ width: 24 * unit, height: 24 * unit, borderRadius: 6 * unit }} />
            <Text allowFontScaling={false} style={[local.brand, { fontSize: 14 * unit }]}>MapMine</Text>
          </View>
        </View>
        <View pointerEvents="none" style={[local.medallion, {
          top: 91 * unit, left: 90 * unit, width: 108 * unit, height: 108 * unit,
          borderRadius: 30 * unit, borderColor: accent + "90", backgroundColor: "#FFCA7340",
        }]} />
        <View style={[local.artFrame, {
          top: 105 * unit, left: 103 * unit, width: 82 * unit, height: 82 * unit,
          borderRadius: 24 * unit, borderColor: accent + "80", padding: 3 * unit,
        }]}>
          <Image source={badges[milestone.id]} resizeMode="cover" fadeDuration={0}
            onLoad={() => setImageReady(true)} onError={() => setError("Couldn’t load the badge image.")}
            style={[local.art, { borderRadius: 21 * unit }]} />
        </View>
        <Text allowFontScaling={false} style={[local.overlay, local.eyebrow, local.center, zone(230), { color: accent, fontSize: 10 * unit }]}>
          ACHIEVEMENT UNLOCKED
        </Text>
        <Text allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}
          style={[local.overlay, local.title, local.center, zone(251), { fontSize: 30 * unit, lineHeight: 33 * unit, height: 70 * unit }]}>
          {milestone.name}
        </Text>
        <View style={[local.overlay, local.earnedFor, zone(344), {
          paddingTop: 13 * unit, gap: 6 * unit, borderColor: accent + "40",
        }]}>
          <Text allowFontScaling={false} style={[local.eyebrow, { color: accent, fontSize: 9 * unit }]}>EARNED FOR</Text>
          <Text allowFontScaling={false} numberOfLines={3}
            style={[local.description, { fontSize: 13 * unit, lineHeight: 17 * unit }]}>{milestone.description}</Text>
        </View>
        <View style={[local.line, local.footer, zone(441), { paddingHorizontal: 13 * unit, height: 45 * unit, borderRadius: 23 * unit }]}>
          <Text allowFontScaling={false} style={[local.xp, { color: "#FFF7E9", fontSize: 17 * unit }]}>+{award.xp.toLocaleString()} XP</Text>
          <Text allowFontScaling={false} style={[local.description, { fontSize: 11 * unit }]}>{earned}</Text>
        </View>
      </View>
    </View>
    <Button label={busy ? "Preparing image…" : "Share story image"} kind="primary" disabled={!laidOut || !imageReady || !logoReady || !backgroundReady || busy}
      icon={<Share2 color={colors.background} size={16} />} onPress={() => void share()} />
    {error && <Text accessibilityLiveRegion="polite" style={styles.secondary}>{error}</Text>}
  </Panel>;
}

const local = StyleSheet.create({
  preview: { alignSelf: "center", borderRadius: 15, overflow: "hidden" },
  card: { backgroundColor: "#601F10", overflow: "hidden" },
  overlay: { position: "absolute" },
  line: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lockup: { flexDirection: "row", alignItems: "center" },
  brand: { color: colors.text, fontWeight: "600", letterSpacing: -0.15 },
  medallion: { position: "absolute", borderWidth: 1 },
  center: { textAlign: "center" },
  earnedFor: { borderTopWidth: 1 },
  artFrame: { position: "absolute", borderWidth: 1 },
  art: { width: "100%", height: "100%", backgroundColor: colors.elevated },
  eyebrow: { letterSpacing: 1.4, fontWeight: "600" },
  title: { color: "#FFF8EB", fontWeight: "700", letterSpacing: -0.6, includeFontPadding: false },
  description: { color: "#FFE7D1", fontWeight: "500" },
  footer: { borderWidth: 1, borderColor: "#FFE4AE58", backgroundColor: "#FFDF9926" },
  xp: { fontWeight: "700" },
});
