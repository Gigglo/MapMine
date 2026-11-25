import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Route } from "lucide-react-native";
import { router } from "expo-router";
import { Button, Card, Chips, Page, Section, Stat, formatArea, formatDistance, styles, tap } from "../components/ui/primitives";
import { readActivityRange, readDayActivity } from "../database/repository";
import RouteMap from "../features/activity/RouteMap";
import { activityPeriods, activityWindow, summarizeActivity, type ActivityPeriod } from "../features/activity/activityStats";
import { dayKey } from "../features/exploration/engine";
import { useSession } from "../store/session";
import { interfaceEggs } from "../features/easterEggs/catalog";
import { discoverEgg } from "../features/easterEggs/discovery";
import { colors } from "../theme/color";

const series = ["Distance", "Area"] as const;
const periods = Object.keys(activityPeriods) as ActivityPeriod[];
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
  const [selectedDate, setSelectedDate] = useState<string>();
  const [period, setPeriod] = useState<ActivityPeriod>("Weekly");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [pagesBack, setPagesBack] = useState(0);
  const [journeyId, setJourneyId] = useState<number | null>(null);
  const [metric, setMetric] = useState<(typeof series)[number]>("Distance");
  const [history, setHistory] = useState<{ key: string; data: Awaited<ReturnType<typeof readActivityRange>> | null }>();
  const [activity, setActivity] = useState<{ day: string; data: Awaited<ReturnType<typeof readDayActivity>> }>();
  const [failedDay, setFailedDay] = useState("");
  const [reload, setReload] = useState(0);
  const snapshot = useSession(state => state.summary);
  const historyRevision = useSession(state => state.historyRevision);

  const window = useMemo(() => activityWindow(today, period, pagesBack), [today, period, pagesBack]);
  const { start, end } = window;
  const rangeKey = start + "/" + end;
  const daily = period === "Daily";
  const showDay = daily || period === "Weekly";
  const day = selectedDate && selectedDate >= start && selectedDate <= end ? selectedDate : end;
  const rangeRevision = useSession(state => state.latestRecordedDay &&
    state.latestRecordedDay >= start && state.latestRecordedDay <= end ? state.revision : 0);
  const dayRevision = useSession(state => state.latestRecordedDay === day ? state.sampleRevision : 0);

  useEffect(() => {
    if (daily) return;
    let active = true;
    void readActivityRange(start, end).then(data => { if (active) setHistory({ key: rangeKey, data }); })
      .catch(() => { if (active) setHistory({ key: rangeKey, data: null }); });
    return () => { active = false; };
  }, [daily, start, end, rangeKey, historyRevision, rangeRevision, reload]);

  useEffect(() => {
    if (!showDay) return;
    let active = true;
    void readDayActivity(day).then(data => {
      if (active) { setActivity({ day, data }); setFailedDay(""); }
    }).catch(() => { if (active) setFailedDay(day); });
    return () => { active = false; };
  }, [showDay, day, dayRevision, historyRevision, reload]);

  function selectDate(value: string) {
    tap();
    setSelectedDate(value);
    setJourneyId(null);
  }

  function changePage(delta: number) {
    tap();
    setPagesBack(current => Math.max(0, current + delta));
    setSelectedDate(undefined);
    setJourneyId(null);
  }

  function selectPeriod(value: ActivityPeriod) {
    tap();
    setPeriodOpen(false);
    if (value === period) return;
    setPeriod(value);
    setPagesBack(0);
    setSelectedDate(undefined);
    setJourneyId(null);
  }

  const selected = activity?.day === day ? activity.data : undefined;
  const selectedJourney = selected?.journeys.find(journey => journey.id === journeyId);
  const route = useMemo(() => selectedJourney ? selected?.points.filter(point => point.journey === selectedJourney.id) : selected?.points,
    [selected, selectedJourney]);
  const range = history?.key === rangeKey ? history.data : undefined;
  const chart = useMemo(() => range ? summarizeActivity(range.days, window) : undefined, [range, window]);
  const field = metric === "Distance" ? "meters" : "area";
  const values = chart?.buckets.map(bucket => bucket[field]) ?? [];
  const max = Math.max(1, ...values);
  const format = metric === "Distance" ? formatDistance : formatArea;

  return <Page title="Activity" onTitleLongPress={() => void discoverEgg(interfaceEggs.activity)} embedded={Boolean(onSheetBack)} onBack={onSheetBack ?? (() => router.navigate("/"))}>
    <Card>
      <View style={[styles.row, local.rangeHeader]}>
        <Text accessibilityRole="header" style={[styles.heading, styles.flex]}>Activity stats</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Activity period, ${period}`}
          accessibilityState={{ expanded: periodOpen }} onPress={() => { tap(); setPeriodOpen(open => !open); }}
          style={local.periodButton}>
          <Text style={styles.buttonText}>{period}</Text>
          <ChevronDown color={colors.text} size={16} />
        </Pressable>
      </View>
      {periodOpen && <View style={local.periodMenu}>{periods.map(option => (
        <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: option === period }}
          onPress={() => selectPeriod(option)} style={[local.periodOption, option === period && local.journeySelected]}>
          <Text style={[styles.text, styles.flex]}>{option}</Text>
          {option === period && <Check color={colors.text} size={16} />}
        </Pressable>
      ))}</View>}
      <View style={[styles.row, local.rangeHeader]}>
        <Text style={[styles.secondary, styles.flex]}>
          {daily ? dayFormat.format(dateAtNoon(end)) : `${shortDate.format(dateAtNoon(start))} – ${shortDate.format(dateAtNoon(end))}`}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous activity period" style={local.icon} onPress={() => changePage(1)}>
          <ChevronLeft color={colors.text} size={19} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next activity period" accessibilityState={{ disabled: pagesBack === 0 }}
          disabled={pagesBack === 0} style={local.icon} onPress={() => changePage(-1)}>
          <ChevronRight color={pagesBack ? colors.text : colors.textMuted} size={19} />
        </Pressable>
      </View>
      {!daily && (range === null ? <>
        <Text style={styles.secondary}>Could not load activity stats.</Text>
        <Button label="Retry stats" onPress={() => setReload(value => value + 1)} />
      </> : range && chart ? <>
        <Chips items={series} selected={metric} onChange={setMetric} />
        <Text style={local.total}>{format(chart.totals[field])}</Text>
        <View style={styles.wrap}>
          <Stat label={metric === "Distance" ? "Territory" : "Distance"}
            value={metric === "Distance" ? formatArea(chart.totals.area) : formatDistance(chart.totals.meters)} />
          <Stat label="Moving time" value={duration(chart.totals.seconds)} />
          <Stat label="Places visited" value={range.visits} />
        </View>
        {window.bucketDays > 1 && <Text style={styles.secondary}>{window.bucketDays}-day totals</Text>}
        <View style={local.bars}>{chart.buckets.map(({ first, last }, index) => {
          const active = showDay && first === day;
          const label = first === last ? dayFormat.format(dateAtNoon(first))
            : `${shortDate.format(dateAtNoon(first))} – ${shortDate.format(dateAtNoon(last))}`;
          const description = `${label}, ${format(values[index])}`;
          const bar = <>
            <View style={local.barTrack}>
              <ActivityBar height={Math.max(3, values[index] / max * 80)} selected={active} />
            </View>
            <Text style={[local.dayLabel, active && local.activeLabel]}>
              {showDay ? weekday.format(dateAtNoon(first)) : dateAtNoon(first).getDate()}
            </Text>
          </>;
          return showDay ? <Pressable key={first} accessibilityRole="button" accessibilityState={{ selected: active }}
            accessibilityLabel={description} style={local.column} onPress={() => selectDate(first)}>{bar}</Pressable>
            : <View key={first} accessible accessibilityLabel={description} style={local.column}>{bar}</View>;
        })}</View>
      </> : <Text accessibilityLiveRegion="polite" style={styles.secondary}>Loading activity stats…</Text>)}
    </Card>
    {showDay && <Section title={day === today ? "Today" : dayFormat.format(dateAtNoon(day))}>
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
    </Section>}
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
  rangeHeader: { gap: 1 },
  periodButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  periodMenu: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden" },
  periodOption: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
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
