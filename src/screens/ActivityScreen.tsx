import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, Route } from "lucide-react-native";
import { router } from "expo-router";
import { Button, Card, Chips, Page, Section, Stat, formatArea, formatDistance, styles, tap } from "../components/ui/primitives";
import { readActivityDays, readDayActivity, type Day } from "../database/repository";
import RouteMap from "../features/activity/RouteMap";
import { dayKey, precedingDay } from "../features/exploration/engine";
import { useSession } from "../store/session";
import { interfaceEggs } from "../features/easterEggs/catalog";
import { discoverEgg } from "../features/easterEggs/discovery";
import { colors } from "../theme/color";

const series = ["Distance", "Area"] as const;
const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dateAtNoon = (day: string) => new Date(day + "T12:00:00");

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (!minutes) return seconds ? Math.floor(seconds) + " s" : "0 min";
  return minutes >= 60 ? Math.floor(minutes / 60) + " h " + minutes % 60 + " min" : minutes + " min";
}

function ActivityBar({ height, selected }: { height: number; selected: boolean }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(height, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [fill, height]);
  const motion = useAnimatedStyle(() => ({ height: fill.get() }));
  return <Animated.View style={[local.bar, selected && local.barSelected, motion]} />;
}

export default function ActivityScreen({ onSheetBack }: { onSheetBack?: () => void } = {}) {
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [weeksBack, setWeeksBack] = useState(0);
  const [journeyId, setJourneyId] = useState<number | null>(null);
  const [metric, setMetric] = useState<(typeof series)[number]>("Distance");
  const [history, setHistory] = useState<{ end: string; days: Day[] }>();
  const [activity, setActivity] = useState<{ day: string; data: Awaited<ReturnType<typeof readDayActivity>> }>();
  const [failedDay, setFailedDay] = useState("");
  const [reload, setReload] = useState(0);
  const snapshot = useSession(state => state.summary);
  const historyRevision = useSession(state => state.historyRevision);

  const end = precedingDay(today, weeksBack * 7);
  const start = precedingDay(end, 6);
  const weekRevision = useSession(state => state.latestRecordedDay &&
    state.latestRecordedDay >= start && state.latestRecordedDay <= end ? state.revision : 0);
  const dayRevision = useSession(state => state.latestRecordedDay === day ? state.sampleRevision : 0);

  useEffect(() => {
    if (!weeksBack) return;
    let active = true;
    void readActivityDays(start, end).then(days => { if (active) setHistory({ end, days }); })
      .catch(() => { if (active) setHistory({ end, days: [] }); });
    return () => { active = false; };
  }, [start, end, weeksBack, historyRevision, weekRevision]);

  useEffect(() => {
    let active = true;
    void readDayActivity(day).then(data => {
      if (active) { setActivity({ day, data }); setFailedDay(""); }
    }).catch(() => { if (active) setFailedDay(day); });
    return () => { active = false; };
  }, [day, dayRevision, historyRevision, reload]);

  function selectDate(value: string) {
    tap();
    setDay(value);
    setJourneyId(null);
  }

  function changeWeek(delta: number) {
    const next = Math.max(0, weeksBack + delta);
    setWeeksBack(next);
    selectDate(precedingDay(today, next * 7));
  }

  const selected = activity?.day === day ? activity.data : undefined;
  const selectedJourney = selected?.journeys.find(journey => journey.id === journeyId);
  const route = useMemo(() => selectedJourney ? selected?.points.filter(point => point.journey === selectedJourney.id) : selected?.points,
    [selected, selectedJourney]);
  const days = weeksBack ? (history?.end === end ? history.days : []) : (snapshot?.days ?? []);
  const byDay = new Map(days.map(entry => [entry.day, entry]));
  const dates = Array.from({ length: 7 }, (_, index) => precedingDay(end, 6 - index));
  const values = dates.map(date => {
    const entry = byDay.get(date);
    return (metric === "Distance" ? entry?.meters : entry?.area) ?? 0;
  });
  const max = Math.max(1, ...values);
  const format = metric === "Distance" ? formatDistance : formatArea;

  return <Page title="Activity" onTitleLongPress={() => void discoverEgg(interfaceEggs.activity)} embedded={Boolean(onSheetBack)} onBack={onSheetBack ?? (() => router.navigate("/"))}>
    <Card>
      <View style={[styles.row, local.weekHeader]}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.heading}>Weekly activity</Text>
          <Text style={styles.secondary}>{shortDate.format(dateAtNoon(start))} – {shortDate.format(dateAtNoon(end))}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous week" style={local.icon} onPress={() => changeWeek(1)}>
          <ChevronLeft color={colors.text} size={19} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" accessibilityState={{ disabled: weeksBack === 0 }}
          disabled={weeksBack === 0} style={local.icon} onPress={() => changeWeek(-1)}>
          <ChevronRight color={weeksBack ? colors.text : colors.textMuted} size={19} />
        </Pressable>
      </View>
      <Chips items={series} selected={metric} onChange={setMetric} />
      <Text style={local.total}>{weeksBack && history?.end !== end
        ? "—" : format(values.reduce((total, value) => total + value, 0))}</Text>
      <View style={local.bars}>{dates.map((date, index) => (
        <Pressable key={date} accessibilityRole="button" accessibilityState={{ selected: date === day }}
          accessibilityLabel={dayFormat.format(dateAtNoon(date)) + ", " + format(values[index])}
          style={local.column} onPress={() => selectDate(date)}>
          <View style={local.barTrack}>
            <ActivityBar height={Math.max(3, values[index] / max * 80)} selected={date === day} />
          </View>
          <Text style={[local.dayLabel, date === day && local.activeLabel]}>{weekday.format(dateAtNoon(date))}</Text>
        </Pressable>
      ))}</View>
    </Card>
    <Section title={day === today ? "Today" : dayFormat.format(dateAtNoon(day))}>
      {failedDay === day ? <Card><Text style={styles.secondary}>Could not load activity.</Text>
        <Button label="Retry" onPress={() => { setFailedDay(""); setReload(value => value + 1); }} /></Card>
        : !selected ? <Card><Text accessibilityLiveRegion="polite" style={styles.secondary}>Loading activity…</Text></Card>
        : <View style={local.stack}>
          <View style={local.hero}>
            <Text style={local.distance}>{formatDistance(selected.stats?.meters ?? 0)}</Text>
            <Text style={styles.secondary}>Distance recorded</Text>
            <View style={styles.wrap}>
              <Stat label="Moving time" value={duration(selected.stats?.seconds ?? 0)} />
              <Stat label="Territory" value={formatArea(selected.stats?.area ?? 0)} />
              <Stat label="Places visited" value={selected.visits} />
            </View>
          </View>
          <Card>
            <View style={styles.row}><Route size={19} color={colors.text} />
              <Text style={styles.heading}>{selectedJourney ? timeFormat.format(selectedJourney.started) + " journey" : "Day route"}</Text>
              {selectedJourney && <Button label="Full day" onPress={() => setJourneyId(null)} />}
            </View>
            {route?.length ? <RouteMap key={day + ":" + (selectedJourney?.id ?? "all")} points={route} replay />
              : <Text style={styles.secondary}>{selected.stats || selectedJourney
                ? "GPS points for this route are no longer available." : "Your route will appear here after you travel with tracking on."}</Text>}
          </Card>
          {selected.journeys.length > 0 && <Card>
            <Text accessibilityRole="header" style={styles.heading}>Journeys</Text>
            {selected.journeys.map(journey => <Pressable key={journey.id} accessibilityRole="button"
              accessibilityState={{ selected: selectedJourney?.id === journey.id }}
              accessibilityLabel={timeFormat.format(journey.started) + " journey, " + formatDistance(journey.meters)}
              onPress={() => { tap(); setJourneyId(selectedJourney?.id === journey.id ? null : journey.id); }}
              style={({ pressed }) => [local.journey, (pressed || selectedJourney?.id === journey.id) && local.journeySelected]}>
              <View style={styles.flex}><Text style={styles.text}>{timeFormat.format(journey.started)}</Text>
                <Text style={styles.secondary}>{duration(journey.seconds)} moving</Text></View>
              <Text style={styles.text}>{formatDistance(journey.meters)}</Text>
              <ChevronRight color={colors.textSecondary} size={15} />
            </Pressable>)}
          </Card>}
        </View>}
    </Section>
    <Section title="Lifetime">
      <Card><View style={styles.wrap}>
        <Stat label="Distance" value={formatDistance(snapshot?.metrics.meters ?? 0)} />
        <Stat label="Territory" value={formatArea(snapshot?.metrics.squareMeters ?? 0)} />
        <Stat label="Day streak" value={snapshot?.metrics.streak ?? 0} />
        <Stat label="Unique cells" value={(snapshot?.metrics.cells ?? 0).toLocaleString()} />
        <Stat label="Places visited" value={snapshot?.metrics.places ?? 0} />
        <Stat label="Landmarks" value={snapshot?.metrics.landmarks ?? 0} />
      </View></Card>
    </Section>
  </Page>;
}

const local = StyleSheet.create({
  stack: { gap: 12 },
  weekHeader: { gap: 1 },
  icon: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  hero: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  distance: { color: colors.text, fontSize: 39, fontWeight: "600", letterSpacing: -1.6, fontVariant: ["tabular-nums"] },
  journey: { flexDirection: "row", alignItems: "center", padding: 9, gap: 8, borderRadius: 8 },
  journeySelected: { backgroundColor: colors.elevated },
  total: { color: colors.text, fontSize: 33, fontWeight: "600", letterSpacing: -1.2, fontVariant: ["tabular-nums"] },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  column: { flex: 1, alignItems: "center", gap: 7 },
  barTrack: { width: "68%", maxWidth: 30, height: 80, borderRadius: 4, overflow: "hidden",
    backgroundColor: colors.elevated, justifyContent: "flex-end" },
  bar: { width: "100%", backgroundColor: "#828282", borderRadius: 4 },
  barSelected: { backgroundColor: colors.text },
  dayLabel: { color: colors.textSecondary, fontSize: 11 },
  activeLabel: { color: colors.text, fontWeight: "700" },
});
