import { Platform } from "react-native";
import { useSession } from "../../store/session";
import type { LandmarkUnlock, Unlock } from "../../database/repository";

const channelId = "exploration";
let setup: Promise<typeof import("expo-notifications")> | null = null;

function configure() {
  setup ??= import("expo-notifications").then(async notifications => {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") await notifications.setNotificationChannelAsync(channelId, {
      name: "Exploration updates", importance: notifications.AndroidImportance.DEFAULT,
    });
    return notifications;
  }).catch(error => { setup = null; throw error; });
  return setup;
}

export async function requestExplorationAlerts() {
  const notifications = await configure();
  const existing = await notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  return (await notifications.requestPermissionsAsync()).granted;
}

export async function getExplorationAlertPermission() {
  const notifications = await configure();
  const permission = await notifications.getPermissionsAsync();
  return permission.granted ? "allowed" : permission.canAskAgain ? "available" : "blocked";
}

export async function sendTestAlert() {
  const notifications = await configure();
  if (!(await notifications.getPermissionsAsync()).granted) return false;
  await notifications.scheduleNotificationAsync({
    identifier: "mapmine-test-alert",
    content: { title: "MapMine test alert", body: "Exploration alerts are enabled on this device." },
    trigger: Platform.OS === "android" ? { channelId } : null,
  });
  return true;
}

export async function notifyExploration(landmarks: readonly LandmarkUnlock[], awards: readonly Unlock[]) {
  if ((!landmarks.length && !awards.length) || !useSession.getState().preferences.notifications) return;
  const notifications = await configure();
  if (!(await notifications.getPermissionsAsync()).granted || !useSession.getState().preferences.notifications) return;
  const landmark = landmarks.at(-1);
  const award = awards.at(-1);
  await notifications.scheduleNotificationAsync({
    identifier: landmark ? "landmark-" + landmark.id + "-" + landmark.timestamp : "milestone-" + award?.id + "-" + award?.timestamp,
    content: {
      title: landmark ? "Location unlocked" : "Achievement unlocked",
      body: landmark ? "A new landmark was added to your MapMine collection." : "You reached a new exploration milestone.",
    },
    trigger: Platform.OS === "android" ? { channelId } : null,
  });
}
