import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Keyboard, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Award, Landmark as LandmarkIcon } from "lucide-react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import IconButton from "../components/ui/IconButton";
import Panel from "../components/ui/Panel";
import { Button, Chips, styles, tap } from "../components/ui/primitives";
import type { Bounds, Mode, Place, Range } from "../database/repository";
import { milestones } from "../features/achievements/milestones";
import { badges } from "../features/achievements/badges";
import type { Point } from "../features/exploration/engine";
import ExploreSummary from "../features/exploration/ExploreSummary";
import { simulatedCells, walkingRoute } from "../features/exploration/simulation";
import { findLandmark, type Landmark } from "../features/landmarks/catalog";
import { findIndiaLandmark } from "../features/landmarks/indiaCatalog";
import type { MapEvent } from "../features/map/mapBridge";
import MapControls from "../features/map/MapControls";
import MapSearch from "../features/map/MapSearch";
import MapView, { type MapHandle } from "../features/map/MapView";
import { useMapData } from "../features/map/useMapData";
import PlacePanel, { type PlaceSelection } from "../features/places/PlacePanel";
import { useBrandLogo } from "../features/profile/branding";
import { enableTracking, report, statusText, updatePreferences, useSession } from "../store/session";
import { colors } from "../theme/color";

const modes: { value: Mode; label: string; description: string }[] = [
  { value: "explore", label: "Explore", description: "Reveal new territory as you travel" },
  { value: "normal", label: "Normal", description: "Full monochrome vector map" },
  { value: "heatmap", label: "Heatmap", description: "See where you spend time and travel" },
  { value: "places", label: "Places", description: "Find your saved locations" },
];
const ranges: Range[] = ["Today", "Week", "Month", "All time"];
const heatMetrics = ["Time spent", "Travel density"] as const;

export default function ExploreScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { source: logo } = useBrandLogo();
  const map = useRef<MapHandle>(null);
  const didCenter = useRef(false);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const follow = useSession(state => state.following);
  const [sheet, setSheet] = useState(0);
  const [panel, setPanel] = useState<"layers" | null>(null);
  const [selection, setSelection] = useState<PlaceSelection | null>(null);
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [range, setRange] = useState<Range>("Week");
  const [heatMetric, setHeatMetric] = useState<(typeof heatMetrics)[number]>("Time spent");
  const [preview, setPreview] = useState<string[] | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [previewRoute, setPreviewRoute] = useState<Point[] | null>(null);
  const status = useSession(state => state.status);
  const fix = useSession(state => state.fix);
  const places = useSession(state => state.places);
  const target = useSession(state => state.target);
  const mode = useSession(state => state.preferences.mode);
  const tracking = useSession(state => state.preferences.tracking);
  const award = useSession(state => state.award);
  const earnedMilestone = milestones.find(item => item.id === award?.id);
  const recentLandmark = useSession(state => state.recentLandmark);
  const landmarkUnlocked = useSession(state => landmark ? state.unlockedLandmarks[landmark.id] : undefined);
  const [indiaUnlock, setIndiaUnlock] = useState<{ id: string; name: string } | null>(null);
  const unlockedName = recentLandmark ? findLandmark(recentLandmark.id)?.name ??
    (indiaUnlock?.id === recentLandmark.id ? indiaUnlock.name : "Landmark discovered") : undefined;
  useMapData(map, ready, bounds, range, heatMetric === "Time spent" ? "seconds" : "samples", preview);

  useEffect(() => {
    if (!previewRoute) return;
    let step = 1;
    const timer = setInterval(() => {
      setPreview(simulatedCells(previewRoute.slice(0, step + 1)));
      setPreviewPoint(previewRoute[step]);
      step++;
      if (step >= previewRoute.length) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [previewRoute]);

  useEffect(() => {
    if (!award) return;
    if (!recentLandmark) tap();
    const timer = setTimeout(() => useSession.setState({ award: null }), 4500);
    return () => clearTimeout(timer);
  }, [award, recentLandmark]);

  useEffect(() => {
    if (!recentLandmark) return;
    let active = true;
    if (recentLandmark.id.startsWith("india-")) void findIndiaLandmark(recentLandmark.id).then(entry => {
      if (active && entry) setIndiaUnlock({ id: entry.id, name: entry.name });
    }).catch(report);
    tap();
    const timer = setTimeout(() => useSession.setState({ recentLandmark: null, award: null }), 4700);
    return () => { active = false; clearTimeout(timer); };
  }, [recentLandmark]);

  const handleEvent = useCallback((event: MapEvent) => {
    switch (event.type) {
      case "ready": setReady(true); setFailure(false); break;
      case "error": setReady(false); setFailure(true); break;
      case "gesture": Keyboard.dismiss(); didCenter.current = true; useSession.setState({ following: false }); break;
      case "viewport": setBounds(event.bounds); break;
      case "hold": setSelection({ point: event.point }); break;
      case "attribution": void Linking.openURL(event.url).catch(report); break;
      case "landmark": {
        const entry = findLandmark(event.id);
        if (entry) { tap(); setLandmark(entry); }
        else void findIndiaLandmark(event.id).then(local => {
          if (local) { tap(); setLandmark(local); }
        }).catch(report);
        break;
      }
      case "place": {
        const place = useSession.getState().places.find(item => item.id === event.id);
        if (place) setSelection({ point: place, place });
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const current = previewPoint ?? fix;
    const point = current ? { latitude: current.latitude, longitude: current.longitude } : null;
    map.current?.send({ type: "location", point, heading: previewPoint ? null : fix?.heading ?? null, follow });
    if (fix && !previewPoint && !didCenter.current && !target) {
      didCenter.current = true;
      map.current?.send({ type: "center", point: { latitude: fix.latitude, longitude: fix.longitude }, zoom: 16 });
    }
  }, [ready, fix, follow, previewPoint, target]);

  useEffect(() => {
    if (!ready || !target) return;
    didCenter.current = true;
    map.current?.send({ type: "center", point: target, zoom: 16 });
    useSession.setState({ target: null });
  }, [ready, target]);

  function requestLocation() {
    if (status === "blocked" || status === "off") void Linking.openSettings().catch(report);
    else void enableTracking().catch(report);
  }

  function locate() {
    if (fix) map.current?.send({ type: "center", point: fix, zoom: 16 });
    else requestLocation();
  }

  function showPlace(place: Place) {
    didCenter.current = true;
    useSession.setState({ following: false, target: { latitude: place.latitude, longitude: place.longitude } });
    setPanel(null);
    setSelection(null);
    if (mode === "heatmap" || mode === "normal") void updatePreferences({ mode: "places" }).catch(report);
  }

  function showLandmark(entry: Landmark) {
    useSession.setState({ target: { latitude: entry.latitude, longitude: entry.longitude }, following: false });
  }
  return <View style={local.root}>
    <View style={StyleSheet.absoluteFill}><MapView ref={map} onEvent={handleEvent} /></View>
    {sheet < 2 && <>
      <View style={[local.top, { top: top + 12 }]}>
        <View style={local.toolbar}>
          <MapSearch places={places} onPlace={showPlace} onLandmark={showLandmark} />
          <IconButton label="Open profile" size={48} onPress={() => { Keyboard.dismiss(); router.push("/profile"); }}><Image source={logo} style={local.profileLogo} /></IconButton>
        </View>
        {preview ? <View style={local.status}><Text style={styles.secondary}>Simulation</Text></View> :
          status !== "live" && <Pressable accessibilityRole="button" onPress={requestLocation} style={local.status}>
            <View style={local.statusDot} /><Text style={styles.secondary}>{statusText[status]}</Text>
          </Pressable>}
      </View>
      <View style={[local.controls, { top: top + 77 }]}>
        <MapControls onZoom={amount => map.current?.send({ type: "zoom", amount })}
          onReset={() => map.current?.send({ type: "north" })}
          onLayers={() => { Keyboard.dismiss(); setPanel("layers"); }} onLocate={locate} following={follow} compact={sheet > 0}
          onFollow={() => { if (fix) useSession.setState({ following: !follow }); else requestLocation(); }} />
      </View>
    </>}
    {failure && <View style={local.error}>
      <Text style={styles.text}>The vector map couldn’t load.</Text>
      <Button label="Retry map" onPress={() => { setFailure(false); map.current?.reload(); }} />
    </View>}
    <ExploreSummary position={sheet} onChange={setSheet} onTrack={() => {
      if (tracking && ["live", "searching", "weak", "checking"].includes(status)) void updatePreferences({ tracking: 0 }).catch(report);
      else requestLocation();
    }} onSave={() => { if (fix) setSelection({ point: fix }); }} />
    {(unlockedName || award) && sheet === 0 && <Animated.View pointerEvents="none" entering={FadeInDown.springify()}
      exiting={FadeOut} accessibilityLiveRegion="polite" style={[local.award, { bottom: Math.max(bottom, 10) + 108 }]}>
      {unlockedName ? <LandmarkIcon size={22} color={colors.success} /> : earnedMilestone ?
        <Image source={badges[earnedMilestone.id]} style={local.awardBadge} /> : <Award size={22} color={colors.success} />}
      <View style={local.awardText}><Text style={styles.text} numberOfLines={2}>{unlockedName ?? earnedMilestone?.name}</Text>
        <Text style={styles.secondary}>{unlockedName ? "Location unlocked" : `Achievement unlocked · +${award?.xp} XP`}</Text></View>
    </Animated.View>}
    {panel === "layers" && <Panel title="Map layers" onClose={() => setPanel(null)}>
      {modes.map(item => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: mode === item.value }}
        style={[local.result, mode === item.value && local.selected]} onPress={() => { tap(); void updatePreferences({ mode: item.value }).catch(report); }}>
        <View style={styles.flex}><Text style={styles.text}>{item.label}</Text><Text style={styles.secondary}>{item.description}</Text></View>
        {mode === item.value ? <View style={local.brandDot} /> : null}
      </Pressable>)}
      {mode === "heatmap" && <>
        <Chips items={ranges} selected={range} onChange={setRange} />
        <Chips items={heatMetrics} selected={heatMetric} onChange={setHeatMetric} />
      </>}
      <Button label={follow ? "Turn off follow mode" : "Follow my location"} disabled={!fix} onPress={() => useSession.setState({ following: !follow })} />
      {__DEV__ && <Button label={preview ? "End simulated walk" : "Preview a simulated walk"} onPress={() => {
        if (preview) { setPreviewRoute(null); setPreview(null); setPreviewPoint(null); setPanel(null); return; }
        const origin = fix ?? { latitude: bounds ? (bounds.south + bounds.north) / 2 : 20.2961,
          longitude: bounds ? (((bounds.west + bounds.east) / 2 + 180) % 360 + 360) % 360 - 180 : 85.8245 };
        const route = walkingRoute(origin);
        setPreview(simulatedCells(route.slice(0, 1)));
        setPreviewPoint(route[0]);
        setPreviewRoute(route);
        didCenter.current = true;
        useSession.setState({ following: false });
        map.current?.send({ type: "center", point: route[20], zoom: 16 });
        setPanel(null);
      }} />}
    </Panel>}
    {selection && <PlacePanel selection={selection} onClose={() => setSelection(null)} onMap={showPlace} />}
    {landmark && <Panel title={landmarkUnlocked ? landmark.name : "Undiscovered landmark"} onClose={() => setLandmark(null)}>
      <Text style={styles.secondary}>{landmark.category}</Text>
      <Text style={styles.text}>{landmarkUnlocked ? `Discovered on ${new Date(landmarkUnlocked).toLocaleDateString()}` :
        "Visit in person with tracking on and stay nearby for about 24 seconds to unlock this location."}</Text>
      {landmark.id.startsWith("unesco-") && <Text accessibilityRole="link" style={styles.secondary}
        onPress={() => void Linking.openURL("https://data.unesco.org/explore/dataset/whc001/").catch(report)}>
        UNESCO World Heritage List · CC BY-SA 4.0
      </Text>}
      {landmark.id.startsWith("india-") && <Text accessibilityRole="link" style={styles.secondary}
        onPress={() => void Linking.openURL("https://www.geonames.org/").catch(report)}>GeoNames · CC BY 4.0</Text>}
      <Button label="Show on map" onPress={() => {
        didCenter.current = true;
        useSession.setState({ following: false });
        map.current?.send({ type: "center", point: { latitude: landmark.latitude, longitude: landmark.longitude }, zoom: 16 });
        setLandmark(null);
      }} />
    </Panel>}
  </View>;
}

const local = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { position: "absolute", left: 16, right: 16, gap: 7, alignItems: "flex-start", zIndex: 6 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text },
  toolbar: { flexDirection: "row", alignSelf: "stretch", alignItems: "flex-start", gap: 8, zIndex: 2 },
  profileLogo: { width: 38, height: 38, borderRadius: 11 },
  status: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 5,
    backgroundColor: colors.background, borderRadius: 10, minHeight: 34 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.location },
  controls: { position: "absolute", right: 16 },
  error: { position: "absolute", left: 24, right: 76, top: "42%", padding: 15, borderRadius: 15, gap: 8, backgroundColor: colors.surface },
  result: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 48, padding: 10, borderRadius: 12 },
  selected: { backgroundColor: colors.elevated },
  award: { position: "absolute", left: 16, maxWidth: "72%", flexDirection: "row", alignItems: "center",
    gap: 9, padding: 12, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  awardText: { flexShrink: 1 },
  awardBadge: { width: 34, height: 34, borderRadius: 8 },
});
