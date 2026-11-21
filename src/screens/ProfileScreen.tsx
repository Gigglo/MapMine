import { useState } from "react";
import { Alert, Image, Linking, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, Download, Settings2 } from "lucide-react-native";
import IconButton from "../components/ui/IconButton";
import { Button, Card, Chips, Field, Page, Section, Stat, formatArea, formatDistance, styles } from "../components/ui/primitives";
import { clearHistory, type Mode } from "../database/repository";
import { levelFor, milestones } from "../features/achievements/milestones";
import NotificationPanel from "../features/engagement/NotificationPanel";
import { chooseBrandLogo, resetBrandLogo, useBrandLogo } from "../features/profile/branding";
import { removeCachedExport, sharePersonalData } from "../features/profile/personalExport";
import { enableTracking, refresh, report, statusText, updatePreferences, useSession } from "../store/session";
import { colors } from "../theme/color";

const retention = ["7 days", "30 days", "90 days"] as const;
const modes = ["Explore", "Normal", "Heatmap", "Places"] as const;

export default function ProfileScreen({ settings = false }: { settings?: boolean }) {
  const { source: logo, custom } = useBrandLogo();
  const preferences = useSession(state => state.preferences);
  const summary = useSession(state => state.summary);
  const status = useSession(state => state.status);
  const permission = useSession(state => state.permission);
  const savedPlaces = useSession(state => state.places.length);
  const [name, setName] = useState(preferences.name);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const xp = summary?.unlocked.reduce((total, award) => total + award.xp, 0) ?? 0;

  async function execute(work: () => Promise<void | string>, message: string) {
    setBusy(true);
    setFeedback("");
    try { setFeedback((await work()) ?? message); }
    catch { setFeedback("The operation could not be completed. Try again."); }
    finally { setBusy(false); }
  }

  function confirm(reset: boolean) {
    Alert.alert(reset ? "Reset exploration?" : "Clear location history?",
      reset ? "This deletes territory, landmark discoveries, statistics, achievements, and recorded location activity. Saved places stay on this device."
        : "This deletes GPS samples, heatmap records, journeys, and visits. Discovered territory and aggregate exploration totals are kept.", [
        { text: "Cancel", style: "cancel" },
        { text: reset ? "Reset" : "Clear", style: "destructive", onPress: () => void execute(async () => {
          await updatePreferences({ tracking: 0 });
          await removeCachedExport();
          await clearHistory(reset);
          useSession.setState(reset ? { award: null, unlockedLandmarks: {}, recentLandmark: null } : { award: null });
          await refresh();
        }, reset ? "Exploration reset. Tracking is paused." : "Location history cleared. Tracking is paused.") },
      ]);
  }

  return <Page title={settings ? "Settings" : "Profile"}
    action={!settings && <IconButton size={44} label="Notifications" onPress={() => setShowNotifications(true)}>
      <Bell size={19} color={colors.text} />
    </IconButton>}
    onBack={() => router.canGoBack() ? router.back() : router.replace("/")}>
    {!settings ? <>
      <Card>
        <View style={styles.row}>
          <Image source={logo} style={{ width: 56, height: 56, borderRadius: 15 }} />
          <View style={styles.flex}>
            <Text style={styles.heading}>{preferences.name}</Text>
            <Text style={styles.secondary}>Level {levelFor(xp)} · {xp.toLocaleString()} XP</Text>
            <View accessibilityLabel={`${250 - xp % 250} XP to next level`} style={local.track}>
              <View style={[local.fill, { width: `${xp % 250 / 2.5}%` }]} />
            </View>
          </View>
        </View>
      </Card>
      <Section title="Today">
        <Card><View style={styles.wrap}>
          <Stat label="Distance" value={formatDistance(summary?.today.meters ?? 0)} />
          <Stat label="New territory" value={formatArea(summary?.today.area ?? 0)} />
          <Stat label="Places visited" value={summary?.visitsToday ?? 0} />
        </View></Card>
      </Section>
      <Section title="Lifetime">
        <Card><View style={styles.wrap}>
          <Stat label="Travelled" value={formatDistance(summary?.metrics.meters ?? 0)} />
          <Stat label="Discovered" value={formatArea(summary?.metrics.squareMeters ?? 0)} />
          <Stat label="Day streak" value={summary?.metrics.streak ?? 0} />
          <Stat label="Landmarks" value={(summary?.metrics.landmarks ?? 0).toLocaleString()} />
          <Stat label="Explored cells" value={(summary?.metrics.cells ?? 0).toLocaleString()} />
          <Stat label="Achievements" value={`${summary?.unlocked.length ?? 0}/${milestones.length}`} />
          <Stat label="Saved places" value={savedPlaces} />
          <Stat label="Places visited" value={summary?.metrics.places ?? 0} />
        </View></Card>
      </Section>
      <Button label="Settings" onPress={() => router.push("/settings")} icon={<Settings2 color={colors.text} size={18} />} />
    </> : <>
      <Section title="Profile name">
        <Field value={name} onChangeText={setName} accessibilityLabel="Profile name" maxLength={60} />
        <Button label="Save name" disabled={!name.trim() || name.trim() === preferences.name}
          onPress={() => void execute(() => updatePreferences({ name: name.trim() }), "Name saved.")} />
      </Section>
      <Section title="Location tracking">
        <Card>
          <Text style={styles.text}>{statusText[status]}</Text>
          <Text style={styles.secondary}>Foreground permission · {permission === "Unknown" ? "Not requested" : permission}</Text>
          <Text style={styles.secondary}>MapMine records location while the app is active. Precise history stays on this device until you choose to share an export.</Text>
          <Button label={preferences.tracking ? "Pause tracking" : "Enable foreground tracking"}
            onPress={() => void (preferences.tracking ? updatePreferences({ tracking: 0 }) : enableTracking()).catch(report)} />
          {status === "denied" && <Button label="Request location permission" onPress={() => void enableTracking().catch(report)} />}
          {(status === "blocked" || status === "off") && <Button label="Open device settings" onPress={() => void Linking.openSettings().catch(report)} />}
        </Card>
      </Section>
      <Section title="Appearance and feedback">
        <Card>
          <View style={styles.row}>
            <Image source={logo} style={{ width: 48, height: 48, borderRadius: 13 }} />
            <View style={styles.flex}><Text style={styles.text}>App logo</Text><Text style={styles.secondary}>Shown in your profile and opening screen.</Text></View>
          </View>
          <Button label="Choose logo" disabled={busy} onPress={() => void execute(chooseBrandLogo, "")} />
          {custom && <Button label="Restore MapMine logo" disabled={busy}
            onPress={() => void execute(resetBrandLogo, "Logo restored.")} />}
        </Card>
        <Text style={styles.secondary}>Preferred map layer</Text>
        <Chips items={modes} selected={modes.find(mode => mode.toLowerCase() === preferences.mode) ?? "Explore"}
          onChange={value => void updatePreferences({ mode: value.toLowerCase() as Mode }).catch(report)} />
        <Button label={preferences.haptics ? "Turn haptics off" : "Turn haptics on"}
          onPress={() => void updatePreferences({ haptics: preferences.haptics ? 0 : 1 }).catch(report)} />
      </Section>
      <Section title="Notifications">
        <Button label="Manage exploration alerts" onPress={() => setShowNotifications(true)}
          icon={<Bell color={colors.text} size={16} />} />
      </Section>
      <Section title="Privacy and data">
        <Text style={styles.secondary}>Raw GPS retention. Discovered cells and aggregated statistics remain until you clear or reset them.</Text>
        <Chips items={retention} selected={retention.find(value => parseInt(value, 10) === preferences.retention) ?? "30 days"}
          onChange={value => void execute(() => updatePreferences({ retention: parseInt(value, 10) }), "Retention updated.")} />
        <Button label="Export personal data" disabled={busy} onPress={() => void execute(async () =>
          await sharePersonalData() ? undefined : "File sharing is unavailable on this device.", "Export file prepared.")}
          icon={<Download color={colors.text} size={17} />} />
        <Button label="Clear location history" disabled={busy} kind="danger" onPress={() => confirm(false)} />
        <Button label="Reset exploration progress" disabled={busy} kind="danger" onPress={() => confirm(true)} />
      </Section>
    </>}
    {feedback ? <Text accessibilityLiveRegion="polite" style={styles.secondary}>{feedback}</Text> : null}
    {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
  </Page>;
}

const local = StyleSheet.create({
  track: { height: 4, backgroundColor: colors.elevated, borderRadius: 3, marginTop: 7, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.text, borderRadius: 3 },
});
