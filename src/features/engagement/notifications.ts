import { AppState, Platform } from "react-native";
import { markNearbyReminder, readNearbyReminderTime, readPreferences, type LandmarkUnlock, type Unlock } from "../../database/repository";
import { distance, validPoint, type Fix, type Point } from "../exploration/engine";
import { findLandmark, landmarks, type Landmark } from "../landmarks/catalog";
import { findIndiaLandmark, indiaLandmarksNear } from "../landmarks/indiaCatalog";

export const notificationOptions = { unlocks: 1, walk: 2, nearby: 4 } as const;
const channelId = "exploration";
const walkId = "mapmine-daily-walk";
const nearbyId = "mapmine-nearby-suggestion";
const nearbyInterval = 3 * 86_400_000;
const nearbyCheckInterval = 15 * 60_000;
let lastNearbyCheck: number | undefined;
let setup: Promise<typeof import("expo-notifications")> | null = null;
let operation: Promise<unknown> = Promise.resolve();

function serialize<T>(work: () => Promise<T>) {
  const next = operation.then(work);
  operation = next.catch(() => undefined);
  return next;
}

function configure() {
  setup ??= import("expo-notifications").then(async notifications => {
    notifications.setNotificationHandler({
      handleNotification: async notification => ({
        shouldShowBanner: notification.request.content.data?.kind !== "landmark" || AppState.currentState !== "active",
        shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") await notifications.setNotificationChannelAsync(channelId, {
      name: "Exploration updates", importance: notifications.AndroidImportance.DEFAULT,
    });
    return notifications;
  }).catch(error => { setup = null; throw error; });
  return setup;
}

const supported = Platform.OS === "ios" || Platform.OS === "android";

export async function requestExplorationAlerts() {
  if (!supported) return false;
  const notifications = await configure();
  const existing = await notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  return (await notifications.requestPermissionsAsync()).granted;
}

export async function getExplorationAlertPermission() {
  if (!supported) return "blocked";
  const notifications = await configure();
  const permission = await notifications.getPermissionsAsync();
  return permission.granted ? "allowed" : permission.canAskAgain ? "available" : "blocked";
}

export async function sendTestAlert() {
  if (!supported) return false;
  const notifications = await configure();
  if (!(await notifications.getPermissionsAsync()).granted) return false;
  await notifications.scheduleNotificationAsync({
    identifier: "mapmine-test-alert",
    content: { title: "MapMine test alert", body: "Exploration alerts are enabled on this device." },
    trigger: Platform.OS === "android" ? { channelId } : null,
  });
  return true;
}

export function syncReminders() {
  if (!supported) return Promise.resolve();
  return serialize(async () => {
    const notifications = await configure();
    const [preferences, permission, scheduled] = await Promise.all([
      readPreferences(), notifications.getPermissionsAsync(), notifications.getAllScheduledNotificationsAsync(),
    ]);
    const walkEnabled = permission.granted && Boolean(preferences.notifications & notificationOptions.walk);
    const walkScheduled = scheduled.some(item => item.identifier === walkId);
    if (walkEnabled && !walkScheduled) await notifications.scheduleNotificationAsync({
      identifier: walkId,
      content: { title: "Time for a little walk", body: "Take a few minutes outside and see what your map reveals." },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 0, channelId },
    });
    if (!walkEnabled && walkScheduled) await notifications.cancelScheduledNotificationAsync(walkId);

    const nearbyEnabled = permission.granted && preferences.tracking && (preferences.notifications & notificationOptions.nearby);
    if (!nearbyEnabled && scheduled.some(item => item.identifier === nearbyId)) {
      await notifications.cancelScheduledNotificationAsync(nearbyId);
    }
    if (nearbyEnabled) lastNearbyCheck = undefined;
  });
}

export function considerNearbySuggestion(fix: Fix, unlocked: Readonly<Record<string, number>>) {
  if (!supported) return Promise.resolve();
  const now = Date.now();
  if (now - fix.timestamp > 30_000 || (lastNearbyCheck !== undefined && now - lastNearbyCheck < nearbyCheckInterval)) {
    return Promise.resolve();
  }
  lastNearbyCheck = now;
  return serialize(async () => {
    const preferences = await readPreferences();
    if (!(preferences.notifications & notificationOptions.nearby) || !preferences.tracking) return;
    const previous = await readNearbyReminderTime();
    if (now - previous < nearbyInterval) return;
    const fire = new Date(now + 10 * 60_000);
    if (fire.getHours() < 10 || fire.getHours() >= 19) return;
    const notifications = await configure();
    if (!(await notifications.getPermissionsAsync()).granted) return;
    if ((await notifications.getAllScheduledNotificationsAsync()).some(item => item.identifier === nearbyId)) return;
    const local = await indiaLandmarksNear(fix, 0.04).catch(() => []);
    let nearest: Landmark | undefined;
    let meters = 4_000;
    for (const landmark of [...local, ...landmarks]) {
      if (unlocked[landmark.id]) continue;
      const away = distance(fix, landmark);
      if (away >= 300 && away < meters) { nearest = landmark; meters = away; }
    }
    if (!nearest) return;
    const latest = await readPreferences();
    if (!latest.tracking || !(latest.notifications & notificationOptions.nearby)) return;
    await notifications.scheduleNotificationAsync({
      identifier: nearbyId,
      content: {
        title: "A little detour?",
        body: `${nearest.name} is about ${(meters / 1000).toFixed(1)} km away. Save it for your next walk.`,
        data: { kind: "nearby", latitude: nearest.latitude, longitude: nearest.longitude },
      },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId },
    });
    await markNearbyReminder(now);
  });
}

export async function notifyExploration(unlocks: readonly LandmarkUnlock[], awards: readonly Unlock[]) {
  const landmark = unlocks.at(-1);
  const award = awards.at(-1);
  if (!supported || (!landmark && !award)) return;
  if (!((await readPreferences()).notifications & notificationOptions.unlocks)) return;
  const notifications = await configure();
  if (!(await notifications.getPermissionsAsync()).granted) return;
  const name = landmark && (findLandmark(landmark.id)
    ?? await findIndiaLandmark(landmark.id).catch(() => undefined))?.name;
  await notifications.scheduleNotificationAsync({
    identifier: landmark ? "landmark-" + landmark.id + "-" + landmark.timestamp : "milestone-" + award?.id + "-" + award?.timestamp,
    content: {
      title: landmark ? "Location unlocked" : "Achievement unlocked",
      body: name ?? (landmark ? "A new landmark was added to your collection." : "You reached a new exploration milestone."),
      data: { kind: landmark ? "landmark" : "award" },
    },
    trigger: Platform.OS === "android" ? { channelId } : null,
  });
}

export function monitorNearbyNotification(open: (point: Point) => void) {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  if (supported) void configure().then(notifications => {
    if (!active) return;
    const handle = (response: ReturnType<typeof notifications.getLastNotificationResponse>) => {
      if (response?.actionIdentifier !== notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const data = response.notification.request.content.data;
      if (data?.kind !== "nearby" || typeof data.latitude !== "number" || typeof data.longitude !== "number") return;
      const point = { latitude: data.latitude, longitude: data.longitude };
      if (!validPoint(point)) return;
      notifications.clearLastNotificationResponse();
      open(point);
    };
    const subscription = notifications.addNotificationResponseReceivedListener(handle);
    unsubscribe = () => subscription.remove();
    handle(notifications.getLastNotificationResponse());
  }).catch(() => undefined);
  return () => { active = false; unsubscribe?.(); };
}
