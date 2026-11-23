import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowRight, Camera, Footprints, MapPin, Navigation, Play } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Mask, Path, Rect } from "react-native-svg";
import { Button } from "../../components/ui/primitives";
import { colors } from "../../theme/color";

const mapArt = require("../../../assets/walkthrough-map.webp");
const previewRoute = "M395 514C457 526 511 562 565 599C602 553 623 509 639 473C662 420 674 361 676 308L857 329C866 298 869 269 865 241";
const pages = [
  {
    title: "Make the map yours.",
    description: "MapMine turns everyday walks into a map of where you've explored. As you move, new streets are revealed and nearby landmarks can unlock after a visit.",
    tip: "Start on the map. Expand the Exploration panel to see what you've uncovered.",
  },
  {
    title: "Track your first walk.",
    description: "Open Exploration, tap Enable, and allow precise location when your phone asks. Go for a walk and MapMine will record your route and distance.",
    tip: "For locked-screen recording, enable background location in Settings. Use Pause whenever you want to stop recording.",
  },
  {
    title: "Save the places you love.",
    description: "Press and hold a point on the map, or tap Save my location. Choose a pin, write a short memory, and add up to two photos.",
    tip: "Open Places to revisit your spots. Use Share coordinates to send a point someone can paste into MapMine search.",
  },
  {
    title: "See how far you've gone.",
    description: "Open Activity and tap a bar to see that day's distance and play back its route. Use the arrows to browse older weeks.",
    tip: "Open Achievements to see milestones you've earned and share an achievement card.",
  },
] as const;

function Illustration({ step }: { step: number }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={local.visual}>
    {step !== 3 && <Image source={mapArt} resizeMode="cover" fadeDuration={0} style={[StyleSheet.absoluteFill, local.map]} />}
    {step === 0 && <>
      <Svg viewBox="0 0 1500 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="walkthrough-fog" x={0} y={0} width={1500} height={900} maskUnits="userSpaceOnUse" maskType="luminance">
            <Rect width={1500} height={900} fill="#fff" />
            <Path d={previewRoute} fill="none" stroke="#000" strokeWidth={170} strokeLinecap="round" strokeLinejoin="round" />
          </Mask>
        </Defs>
        <Rect width={1500} height={900} fill="#070707" fillOpacity={0.84} mask="url(#walkthrough-fog)" />
        <Path d={previewRoute} fill="none" stroke="#fff" strokeOpacity={0.07} strokeWidth={158}
          strokeLinecap="round" strokeLinejoin="round" />
        <Path d={previewRoute} fill="none" stroke="#090909" strokeWidth={27} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={previewRoute} fill="none" stroke="#fff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={395} cy={514} r={20} fill="#111" stroke="#fff" strokeWidth={9} />
        <Path d="M861 202L892 260L866 250L844 265Z" fill="#fff" stroke="#111" strokeWidth={7} strokeLinejoin="round" />
      </Svg>
      <Text style={local.attribution}>Map imagery © OpenStreetMap contributors © CARTO</Text>
    </>}
    {step === 1 && <>
      <View style={local.tracking}>
        <View style={local.trackingIcon}><Footprints size={24} color="#fff" /></View>
        <View style={local.flex}>
          <Text style={local.previewTitle}>Exploration</Text>
          <Text style={local.previewInfo}>Finding your location</Text>
        </View>
        <View style={local.pill}><Text style={local.pillText}>Enable / retry</Text></View>
      </View>
      <Text style={local.attribution}>Map imagery © OpenStreetMap contributors © CARTO</Text>
    </>}
    {step === 2 && <>
      <View style={local.pin}><MapPin size={27} color="#fff" /></View>
      <View style={local.place}>
        <Text style={local.previewTitle}>Save a place</Text>
        <View style={local.previewRow}><Camera size={16} color="#bfbfbf" /><Text style={local.previewInfo}>Add photo (0/2)</Text></View>
      </View>
      <Text style={local.attribution}>Map imagery © OpenStreetMap contributors © CARTO</Text>
    </>}
    {step === 3 && <View style={local.activity}>
      <View style={local.previewRow}><Text style={[local.previewTitle, local.flex]}>Weekly activity</Text><Navigation size={17} color="#ddd" /></View>
      <Text style={local.metric}>5.4 km</Text>
      <View style={local.bars}>{[12, 28, 23, 44, 19, 34, 27].map((height, index) =>
        <View key={index} style={[local.bar, { height, backgroundColor: index === 3 ? "#fff" : "#747474" }]} />)}</View>
      <View style={local.previewRow}><Play size={14} color="#fff" /><Text style={local.previewInfo}>Play route</Text></View>
    </View>}
  </View>;
}

export default function Walkthrough({ onFinish }: { onFinish: () => void | Promise<void> }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = pages[step];
  const last = step === pages.length - 1;

  async function finish() {
    setSaving(true);
    setFailed(false);
    try { await onFinish(); }
    catch { setFailed(true); }
    finally { setSaving(false); }
  }

  return <SafeAreaView style={local.screen} accessibilityViewIsModal>
    <View style={local.header}>
      <Text style={local.wordmark}>MapMine</Text>
      <Button label="Skip" disabled={saving} onPress={() => void finish()} />
    </View>
    <ScrollView key={step} contentContainerStyle={local.content} showsVerticalScrollIndicator={false}>
      <Illustration step={step} />
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={local.title}>{page.title}</Text>
      <Text style={local.description}>{page.description}</Text>
      <Text style={local.tip}>{page.tip}</Text>
    </ScrollView>
    <View style={local.footer}>
      <View accessible style={local.progress} accessibilityLabel={`Step ${step + 1} of ${pages.length}`}>
        {pages.map((_, index) => <View key={index} style={[local.segment, index <= step && local.segmentActive]} />)}
      </View>
      {failed && <Text accessibilityRole="alert" style={local.tip}>Could not save your progress. Try again.</Text>}
      <View style={local.actions}>
        {step > 0 && <Button label="Back" disabled={saving} onPress={() => setStep(value => value - 1)} />}
        <View style={local.flex}>
          <Button label={last ? "Open MapMine" : "Continue"} kind="primary" disabled={saving}
            onPress={last ? () => void finish() : () => setStep(value => Math.min(value + 1, pages.length - 1))}
            icon={<ArrowRight size={16} color={colors.background} />} />
        </View>
      </View>
    </View>
  </SafeAreaView>;
}

const local = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 23, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.6 },
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 23, paddingTop: 12, paddingBottom: 14, gap: 13 },
  visual: { height: 214, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    justifyContent: "center", alignItems: "center", overflow: "hidden" },
  map: { width: "100%", height: "100%" },
  attribution: { position: "absolute", bottom: 6, right: 7, color: "#ddd", fontSize: 8, backgroundColor: "#0a0a0a",
    paddingHorizontal: 4, paddingVertical: 2 },
  title: { color: colors.text, fontSize: 35, fontWeight: "700", letterSpacing: -1.3 },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  tip: { color: "#bcbcbc", fontSize: 14, lineHeight: 21 },
  footer: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 23, paddingTop: 10, paddingBottom: 12, gap: 12 },
  progress: { flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.elevated },
  segmentActive: { backgroundColor: colors.text },
  actions: { flexDirection: "row", gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  tracking: { flexDirection: "row", alignItems: "center", gap: 9, width: "90%", padding: 10, borderRadius: 13,
    backgroundColor: "#111", borderColor: "#555", borderWidth: 1 },
  trackingIcon: { width: 35, height: 35, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#262626" },
  previewTitle: { color: "#fff", fontWeight: "700", fontSize: 13 },
  previewInfo: { color: "#c0c0c0", fontSize: 11 },
  pill: { backgroundColor: "#fff", paddingVertical: 7, paddingHorizontal: 6, borderRadius: 7 },
  pillText: { color: "#111", fontSize: 9, fontWeight: "700" },
  pin: { marginBottom: 8, backgroundColor: "#111", borderRadius: 12, borderColor: "#eee", borderWidth: 1, padding: 5 },
  place: { alignSelf: "center", width: "56%", backgroundColor: "#111", borderWidth: 1, borderColor: "#555",
    borderRadius: 12, padding: 11, gap: 7 },
  previewRow: { flexDirection: "row", gap: 7, alignItems: "center" },
  activity: { width: "78%", maxWidth: 260, padding: 13, gap: 8, borderWidth: 1, borderColor: "#414141", borderRadius: 12, backgroundColor: "#101010" },
  metric: { color: "#fff", fontSize: 27, fontWeight: "600", letterSpacing: -0.6 },
  bars: { height: 48, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },
  bar: { flex: 1, maxWidth: 19, borderRadius: 3 },
});
