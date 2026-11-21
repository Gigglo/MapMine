import { useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Switch, Text, View } from "react-native";
import { Award, Landmark as LandmarkIcon } from "lucide-react-native";
import Panel from "../../components/ui/Panel";
import { Button, styles } from "../../components/ui/primitives";
import { updatePreferences, useSession } from "../../store/session";
import { colors } from "../../theme/color";
import { milestones } from "../achievements/milestones";
import { findLandmark } from "../landmarks/catalog";
import { getExplorationAlertPermission, requestExplorationAlerts, sendTestAlert } from "./notifications";

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const enabled = useSession(state => Boolean(state.preferences.notifications));
  const awards = useSession(state => state.summary?.unlocked);
  const landmarks = useSession(state => state.unlockedLandmarks);
  const [permission, setPermission] = useState<"unknown" | "allowed" | "available" | "blocked">("unknown");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const recent = [
    ...(awards ?? []).map(({ id, timestamp }) => ({
      id, timestamp, title: milestones.find(item => item.id === id)?.name ?? "Achievement earned", kind: "award",
    })),
    ...Object.entries(landmarks).map(([id, timestamp]) => ({
      id, timestamp, title: findLandmark(id)?.name ?? "Location unlocked", kind: "landmark",
    })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

  useEffect(() => {
    let active = true;
    const refresh = () => void getExplorationAlertPermission().then(value => {
      if (active) setPermission(value);
    }).catch(() => undefined);
    refresh();
    const listener = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { active = false; listener.remove(); };
  }, []);

  async function change(next: boolean) {
    setBusy(true);
    setFeedback("");
    try {
      if (next && !(await requestExplorationAlerts())) {
        setPermission(await getExplorationAlertPermission());
        setFeedback("Allow notifications in device settings to receive alerts.");
        return;
      }
      await updatePreferences({ notifications: next ? 1 : 0 });
      if (next) setPermission("allowed");
    } catch {
      setFeedback("Couldn’t update notifications. Try again.");
    } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    setFeedback("");
    try {
      const sent = await sendTestAlert();
      setFeedback(sent ? "Test sent. Check your notification centre." : "Allow notifications in device settings to receive alerts.");
      if (!sent) setPermission(await getExplorationAlertPermission());
    } catch {
      setFeedback("Couldn’t send a test notification.");
    } finally { setBusy(false); }
  }

  return <Panel title="Notifications" onClose={onClose}>
    <View style={[styles.row, local.setting]}>
      <View style={styles.flex}>
        <Text style={styles.heading}>Exploration alerts</Text>
        <Text style={styles.secondary}>Landmark discoveries and earned achievements</Text>
      </View>
      <Switch accessibilityLabel="Exploration alerts" value={enabled} disabled={busy}
        onValueChange={value => void change(value)} />
    </View>
    {permission === "blocked" && <Button label="Open device settings" onPress={() => {
      void Linking.openSettings().catch(() => setFeedback("Couldn’t open device settings."));
    }} />}
    {enabled && permission === "allowed" && <Button label="Send a test notification" disabled={busy} onPress={() => void test()} />}
    {!!feedback && <Text accessibilityLiveRegion="polite" style={styles.secondary}>{feedback}</Text>}
    <Text accessibilityRole="header" style={[styles.heading, local.recentTitle]}>Recent unlocks</Text>
    {recent.length ? recent.map(item => {
      const Icon = item.kind === "award" ? Award : LandmarkIcon;
      return <View key={item.id} style={[styles.row, local.event]}>
        <Icon size={17} color={colors.textSecondary} />
        <View style={styles.flex}><Text numberOfLines={2} style={styles.text}>{item.title}</Text>
          <Text style={styles.secondary}>{new Date(item.timestamp).toLocaleDateString()}</Text></View>
      </View>;
    }) : <Text style={styles.secondary}>New discoveries and achievements will appear here.</Text>}
  </Panel>;
}

const local = StyleSheet.create({
  setting: { backgroundColor: colors.elevated, minHeight: 60, paddingHorizontal: 12, borderRadius: 13 },
  recentTitle: { marginTop: 5 },
  event: { minHeight: 42, paddingHorizontal: 3, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
