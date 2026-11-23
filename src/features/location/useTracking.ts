import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { pruneHistory, readLandmarkUnlocks } from "../../database/repository";
import { refresh, report, useSession, type Permission } from "../../store/session";
import { locationTask } from "./locationTask";
import { lastLocationReceived, recordLocations, resetRecording } from "./recordLocations";

const options = { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 0 };
let lifecycle = Promise.resolve();

function permissionLabel(permission: Location.LocationPermissionResponse): Permission {
  if (permission.granted) return "Granted";
  if (!permission.canAskAgain) return "Blocked";
  return permission.status === "denied" ? "Denied" : "Unknown";
}

export function useTracking() {
  const ready = useSession(state => state.ready);
  const tracking = useSession(state => state.preferences.tracking);
  const attempt = useSession(state => state.trackingAttempt);
  const backgroundAttempt = useSession(state => state.backgroundTrackingAttempt);
  const prompted = useRef(0);
  const backgroundPrompted = useRef(0);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const listener = AppState.addEventListener("change", next => {
      if (next === "active" && useSession.getState().ready) {
        void pruneHistory(useSession.getState().preferences.retention)
          .then(async () => {
            useSession.setState({ unlockedLandmarks: await readLandmarkUnlocks() });
            await refresh();
          }).catch(report);
      }
      setAppState(next);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!ready || (tracking && appState !== "active" && appState !== null)) return;
    let active = true;
    let watcher: Location.LocationSubscription | undefined;
    let timeout: ReturnType<typeof setInterval> | undefined;

    function fail(error: unknown) {
      if (active && useSession.getState().preferences.tracking) {
        useSession.setState({ status: "error", fix: null });
        report(error);
      }
    }

    async function sync() {
      if (!active) return;
      const native = Platform.OS === "ios" || Platform.OS === "android";
      const supported = native && await TaskManager.isAvailableAsync();
      const running = supported && await Location.hasStartedLocationUpdatesAsync(locationTask);
      if (!active) return;
      if (!tracking) {
        if (running) await Location.stopLocationUpdatesAsync(locationTask);
        await resetRecording();
      }

      let permission = await Location.getForegroundPermissionsAsync();
      if (active && tracking && !permission.granted && permission.canAskAgain && attempt > prompted.current) {
        prompted.current = attempt;
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!active) return;
      useSession.setState({ permission: permissionLabel(permission), backgroundAvailable: supported });
      if (!tracking) {
        useSession.setState({ backgroundTracking: false });
        return;
      }
      if (!permission.granted || !await Location.hasServicesEnabledAsync()) {
        if (running) await Location.stopLocationUpdatesAsync(locationTask);
        if (active) useSession.setState({
          backgroundTracking: false,
          status: permission.granted ? "off" : permission.canAskAgain ? "denied" : "blocked",
          fix: null,
        });
        return;
      }
      if (!active) return;

      let background = supported ? (await Location.getBackgroundPermissionsAsync()).granted : false;
      if (!active) return;
      if (supported && !background && backgroundAttempt > backgroundPrompted.current) {
        backgroundPrompted.current = backgroundAttempt;
        background = (await Location.requestBackgroundPermissionsAsync()).granted;
      }
      if (!active || AppState.currentState === "background") return;
      if (!running) useSession.setState({ status: "searching" });
      if (background) {
        try {
          if (!running) await Location.startLocationUpdatesAsync(locationTask, {
            ...options,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "MapMine is tracking",
              notificationBody: "Recording your journey and explored territory.",
              killServiceOnDestroy: false,
            },
          });
          if (active) useSession.setState({ backgroundTracking: true });
        } catch (error) {
          background = false;
          if (active) report(error);
        }
      } else if (running) {
        await Location.stopLocationUpdatesAsync(locationTask);
      }

      if (!active) return;
      if (!background) {
        useSession.setState({ backgroundTracking: false, status: "searching" });
        watcher = await Location.watchPositionAsync(options, position => {
          if (active) void recordLocations([position]).catch(fail);
        }, fail);
        if (!active) { watcher.remove(); return; }
      }

      if (Date.now() - lastLocationReceived() <= 20_000 && useSession.getState().fix) {
        useSession.setState({ status: "live" });
      }
      const started = Date.now();
      timeout = setInterval(() => {
        if (Date.now() - Math.max(lastLocationReceived(), started) > 20_000 && useSession.getState().status !== "error") {
          useSession.setState({ status: "weak", fix: null });
        }
      }, 8000);
    }

    lifecycle = lifecycle.then(sync).catch(fail);
    return () => {
      active = false;
      watcher?.remove();
      if (timeout) clearInterval(timeout);
    };
  }, [ready, tracking, attempt, backgroundAttempt, appState]);
}
