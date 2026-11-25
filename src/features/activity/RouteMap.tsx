import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Pause, Play, RotateCcw } from "lucide-react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue,
  withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Path } from "react-native-svg";
import { Button, styles } from "../../components/ui/primitives";
import type { RoutePoint } from "../../database/repository";
import { mapHeight, mapWidth, routeGeometry, type Leg } from "./routeGeometry";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const cartoKey = process.env.EXPO_PUBLIC_CARTO_API_KEY?.trim();
const replayDurationMs = 20_000;

function Trace({ leg, progress, total }: { leg: Leg; progress: SharedValue<number>; total: number }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: leg.length - Math.max(0, Math.min(leg.length, progress.get() * total - leg.start)),
  }));
  return <AnimatedPath d={leg.path} stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
    fill="none" strokeDasharray={[leg.length, leg.length]} animatedProps={animatedProps} />;
}

function RouteMarker({ legs, total, progress }: { legs: Leg[]; total: number; progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const distance = progress.get() * total;
    const leg = legs.find(route => distance < route.start + route.length) ?? legs[legs.length - 1];
    const local = distance - leg.start;
    let low = 0;
    let high = leg.points.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (leg.points[mid].distance < local) low = mid;
      else high = mid;
    }
    const a = leg.points[low];
    const b = leg.points[high];
    const fraction = a.distance === b.distance ? 0 : Math.max(0, Math.min(1, (local - a.distance) / (b.distance - a.distance)));
    return { cx: a.x + (b.x - a.x) * fraction, cy: a.y + (b.y - a.y) * fraction };
  });
  return <AnimatedCircle r={5} fill="#ffffff" stroke="#141414" strokeWidth={2} animatedProps={animatedProps} />;
}

export default function RouteMap({ points, replay = false, onMapReady }: { points: RoutePoint[]; replay?: boolean; onMapReady?: (ready: boolean) => void }) {
  const { zoom, tiles, legs, total } = useMemo(() => routeGeometry(points), [points]);
  const moving = useMemo(() => legs.filter(leg => leg.length > 0), [legs]);
  const progress = useSharedValue(1);
  const [playing, setPlaying] = useState(false);
  const [failedTile, setFailedTile] = useState<string>();
  const [tileAttempt, setTileAttempt] = useState(0);
  const trackWidth = useRef(0);
  const progressStyle = useAnimatedStyle(() => ({ width: (progress.get() * 100) + "%" }));
  const playable = replay && total > 0;
  const pendingTiles = useMemo(() => new Set(tiles.map(tile => tile.id)), [tiles]);
  const tileSetKey = zoom + "/" + tiles.map(tile => tile.id).join("/");
  useEffect(() => {
    if (!onMapReady) return;
    if (!cartoKey || !tiles.length) {
      onMapReady(true);
      return;
    }
    const timer = setTimeout(() => onMapReady(true), 3000);
    return () => clearTimeout(timer);
  }, [tiles, onMapReady]);

  function play() {
    if (playing) {
      cancelAnimation(progress);
      setPlaying(false);
      return;
    }
    const current = progress.get();
    const start = current >= 1 ? 0 : current;
    progress.set(start);
    setPlaying(true);
    progress.set(withTiming(1, {
      duration: replayDurationMs * (1 - start), easing: Easing.linear, reduceMotion: ReduceMotion.Never,
    }, finished => { if (finished) scheduleOnRN(setPlaying, false); }));
  }

  function seek(value: number) {
    cancelAnimation(progress);
    setPlaying(false);
    progress.set(Math.max(0, Math.min(1, value)));
  }

  return <View style={local.root}>
    <View accessibilityLabel="Map of recorded GPS points" style={local.map}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {cartoKey && tiles.map(tile => <Image key={zoom + "/" + tile.id + "/" + tileAttempt} resizeMode="stretch" fadeDuration={0}
          onError={replay ? () => setFailedTile(tileSetKey) : undefined}
          onLoadEnd={onMapReady ? () => {
            pendingTiles.delete(tile.id);
            if (!pendingTiles.size) onMapReady(true);
          } : undefined}
          source={{ uri: `https://basemaps.cartocdn.com/dark_all/${zoom}/${tile.col}/${tile.row}@2x.png?key=${encodeURIComponent(cartoKey)}` }}
          style={{ position: "absolute", left: (tile.left / mapWidth * 100) + "%", top: (tile.top / mapHeight * 100) + "%",
            width: (256 / mapWidth * 100) + "%", height: (256 / mapHeight * 100) + "%" }} />)}
      </View>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} width="100%" height="100%">
          {legs.map((leg, index) => leg.length > 0 ? <Path key={index} d={leg.path} fill="none"
            stroke={playable ? "#9b9b9b" : "#fff"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            : <Circle key={index} cx={leg.points[0].x} cy={leg.points[0].y} r={3} fill="#fff" />)}
          {playable && moving.map((leg, index) => <Trace key={index} leg={leg} total={total} progress={progress} />)}
          {playable && <RouteMarker legs={moving} total={total} progress={progress} />}
        </Svg>
      </View>
      {Boolean(cartoKey && tiles.length) && <Pressable disabled={!replay} accessibilityRole={replay ? "link" : undefined}
        onPress={() => void Linking.openURL("https://carto.com/attributions").catch(() => undefined)} style={local.credit}>
        <Text allowFontScaling={false} style={local.creditText}>© OpenStreetMap © CARTO</Text>
      </Pressable>}
    </View>
    {replay && !cartoKey && <Text style={styles.secondary}>The basemap is unavailable in this build.</Text>}
    {replay && cartoKey && failedTile === tileSetKey && <View style={styles.row}>
      <Text style={styles.secondary} accessibilityLiveRegion="polite">Some map tiles could not load.</Text>
      <Button label="Retry map" onPress={() => {
        setFailedTile(undefined);
        setTileAttempt(attempt => attempt + 1);
      }} />
    </View>}
    {playable && <>
      <Pressable accessibilityRole="adjustable" accessibilityLabel="Route replay position"
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={({ nativeEvent }) => seek(progress.get() + (nativeEvent.actionName === "increment" ? 0.1 : -0.1))}
        onLayout={event => { trackWidth.current = event.nativeEvent.layout.width; }}
        onPress={event => { if (trackWidth.current > 0) seek(event.nativeEvent.locationX / trackWidth.current); }}
        style={local.seek}>
        <View pointerEvents="none" style={local.track}><Animated.View style={[local.progress, progressStyle]} /></View>
      </Pressable>
      <View style={styles.row}>
        <Button kind="primary" label={playing ? "Pause replay" : "Play route"}
          icon={playing ? <Pause color="#101010" size={14} /> : <Play color="#101010" size={14} />} onPress={play} />
        <Button label="Reset" icon={<RotateCcw color="#fff" size={14} />} onPress={() => seek(0)} />
      </View>
    </>}
  </View>;
}

const local = StyleSheet.create({
  root: { gap: 6 },
  map: { aspectRatio: mapWidth / mapHeight, overflow: "hidden", backgroundColor: "#202020" },
  seek: { height: 36, justifyContent: "center" },
  track: { height: 5, borderRadius: 3, overflow: "hidden", backgroundColor: "#555" },
  progress: { backgroundColor: "#ffffff", height: "100%" },
  credit: { position: "absolute", bottom: 4, right: 4, backgroundColor: "#171717dd", paddingHorizontal: 4, paddingVertical: 2 },
  creditText: { color: "#ededed", fontSize: 8 },
});
