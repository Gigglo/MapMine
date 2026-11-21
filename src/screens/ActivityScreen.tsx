import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Route } from "lucide-react-native";
import { router } from "expo-router";
import { Card, Chips, Page, Section, Stat, formatArea, formatDistance, styles } from "../components/ui/primitives";
import { useSession } from "../store/session";
import { colors } from "../theme/color";

const series = ["Distance", "Area"] as const;
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

export default function ActivityScreen({ onSheetBack }: { onSheetBack?: () => void } = {}) {
  const [metric, setMetric] = useState<(typeof series)[number]>("Distance");
  const snapshot = useSession(state => state.summary);
  const stats = snapshot?.metrics;
  const values = (snapshot?.days ?? []).map(day => metric === "Distance" ? day.meters : day.area);
  const max = Math.max(1, ...values);
  const format = metric === "Distance" ? formatDistance : formatArea;
  const weeklyTotal = values.reduce((total, value) => total + value, 0);

  return <Page title="Activity" embedded={Boolean(onSheetBack)} onBack={onSheetBack ?? (() => router.navigate("/"))}>
    <Section title="Today">
      <View style={chart.todaySummary}>
        <Stat label="Distance" value={formatDistance(snapshot?.today.meters ?? 0)} />
        <Stat label="New territory" value={formatArea(snapshot?.today.area ?? 0)} />
        <Stat label="Places visited" value={snapshot?.visitsToday ?? 0} />
      </View>
    </Section>
    <Section title="Last seven days">
      <Card>
        <Chips items={series} selected={metric} onChange={setMetric} />
        <View><Text style={chart.total}>{format(weeklyTotal)}</Text>
          <Text style={styles.secondary}>{metric === "Distance" ? "Distance travelled" : "New territory"}</Text></View>
        <View style={chart.bars}>{snapshot?.days.map((day, index) => {
          const name = weekday.format(new Date(day.day + "T12:00:00"));
          return <View accessible accessibilityLabel={name + ", " + format(values[index])} key={day.day} style={chart.column}>
            <View style={[chart.bar, { height: Math.max(2, values[index] / max * 92) }, index === values.length - 1 && chart.today]} />
            <Text style={chart.label}>{name}</Text>
          </View>;
        })}</View>
        {!values.some(Boolean) && <Text style={styles.secondary}>Your weekly trend appears as you explore.</Text>}
      </Card>
    </Section>
    <Section title="Lifetime">
      <Card><View style={styles.wrap}>
        <Stat label="Distance travelled" value={formatDistance(stats?.meters ?? 0)} />
        <Stat label="Area discovered" value={formatArea(stats?.squareMeters ?? 0)} />
        <Stat label="Unique cells" value={(stats?.cells ?? 0).toLocaleString()} />
        <Stat label="Places visited" value={stats?.places ?? 0} />
        <Stat label="Landmarks unlocked" value={stats?.landmarks ?? 0} />
        <Stat label="Current day streak" value={stats?.streak ?? 0} />
      </View></Card>
    </Section>
    <Section title="Recent journeys">
      <Card>{snapshot?.journeys.length ? snapshot.journeys.map(journey => <View style={styles.row} key={journey.id}>
        <Route size={18} color={colors.textSecondary} />
        <Text style={[styles.text, styles.flex]}>{new Date(journey.started).toLocaleDateString()}</Text>
        <Text style={styles.text}>{formatDistance(journey.meters)}</Text>
      </View>) : <Text style={styles.secondary}>Travel with foreground tracking enabled to record a journey.</Text>}</Card>
    </Section>
  </Page>;
}

const chart = StyleSheet.create({
  todaySummary: { ...styles.wrap, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  total: { color: colors.text, fontSize: 26, fontWeight: "500", letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 7, minHeight: 120, paddingTop: 8 },
  column: { flex: 1, alignItems: "center", gap: 7 },
  bar: { width: "60%", maxWidth: 28, backgroundColor: "#717171", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  today: { backgroundColor: colors.text },
  label: { color: colors.textSecondary, fontSize: 11 },
});
