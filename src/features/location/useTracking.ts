import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { pruneHistory, readActiveVisits, readLandmarkUnlocks, recordFix, type Visit } from "../../database/repository";
import { dayKey, detectVisit, exploration, segment, territory, validFix, type Fix, type VisitState } from "../exploration/engine";
import { refresh, report, useSession, type Permission } from "../../store/session";
import { checkLandmarkVisits } from "../landmarks/visiting";
import { landmarks } from "../landmarks/catalog";
import { indiaLandmarksNear } from "../landmarks/indiaCatalog";

function permissionLabel(permission: Location.LocationPermissionResponse): Permission {
  if (permission.granted) return "Granted";
  if (!permission.canAskAgain) return "Blocked";
  return permission.status === "denied" ? "Denied" : "Unknown";
}

export function useTracking(enabled = true) {
  const ready = useSession(state => state.ready) && enabled;
  const tracking = useSession(state => state.preferences.tracking);
  const attempt = useSession(state => state.trackingAttempt);
  const prompted = useRef(0);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const listener = AppState.addEventListener("change", next => {
      if (next === "active" && useSession.getState().ready) {
        pruneHistory(useSession.getState().preferences.retention).then(() => refresh()).catch(report);
      }
      setAppState(next);
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!ready || appState !== "active") return;
    if (!tracking) {
      let active = true;
      Location.getForegroundPermissionsAsync().then(permission => {
        if (active) useSession.setState({ permission: permissionLabel(permission) });
      }).catch(report);
      return () => { active = false; };
    }
    let active = true;
    let watcher: Location.LocationSubscription | undefined;
    let previous: Fix | null = null;
    let movementAnchor: Fix | null = null;
    let candidate: Fix | null = null;
    let journey: number | null = null;
    let lastFix = 0;
    let lastAccepted = 0;
    let processing = Promise.resolve();
    let timeout: ReturnType<typeof setInterval> | undefined;
    let visits = new Map<number, VisitState>();
    let landmarkDwell: Parameters<typeof checkLandmarkVisits>[1] = new Map();

    async function onPosition(position: Location.LocationObject) {
      if (!active || !useSession.getState().preferences.tracking || position.mocked) return;
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const fix = { latitude, longitude, accuracy: accuracy ?? Infinity, heading, speed, timestamp: Math.round(position.timestamp) };
      if (!validFix(fix, Date.now())) {
        if (!lastAccepted || Date.now() - lastAccepted > 15_000) useSession.setState({ status: "weak" });
        return;
      }
      if (fix.timestamp - lastFix < 3_500) return;
      lastFix = fix.timestamp;
      let travel = segment(previous, fix);
      if (travel.jump) {
        if (!candidate || segment(candidate, fix).jump) {
          candidate = fix;
          return;
        }
        previous = null;
        movementAnchor = null;
        journey = null;
        landmarkDwell = new Map();
        travel = segment(null, fix);
      }
      candidate = null;
      if (previous && fix.timestamp - previous.timestamp > exploration.maxGap) {
        journey = null;
        movementAnchor = null;
      }
      lastAccepted = Date.now();
      useSession.setState({ fix, status: "live" });
      const movement = segment(movementAnchor, fix);
      const meters = movement.jump ? 0 : movement.meters;
      const cells = territory(fix, travel.meters && previous ? previous : undefined, travel.meters);
      const updates: Visit[] = [];
      const departures: number[] = [];
      const nextVisits = new Map<number, VisitState>();
      for (const place of useSession.getState().places) {
        const prior = visits.get(place.id);
        const visit = detectVisit(prior, fix, place, place.radius, place.dwell * 1000);
        if (!visit) {
          if (prior?.recorded) departures.push(place.id);
        }
        else {
          nextVisits.set(place.id, visit);
          if (visit.recorded) updates.push({
            place: place.id, entered: visit.entered, ended: fix.timestamp, day: dayKey(visit.entered),
            seconds: visit.seconds, active: 1,
          });
        }
      }
      const around = await indiaLandmarksNear(fix).catch(() => []);
      if (!active || !useSession.getState().preferences.tracking) return;
      const { pending, discoveries } = checkLandmarkVisits(fix, landmarkDwell, useSession.getState().unlockedLandmarks,
        [...around, ...landmarks]);
      const result = await recordFix({ fix, cells, meters, seconds: meters > 0 ? travel.seconds : 0,
        heatSeconds: travel.seconds, journey, visits: updates,
        departures, landmarkIds: discoveries });
      if (!active) return;
      if (!movementAnchor || meters || fix.timestamp - movementAnchor.timestamp >= exploration.maxGap) movementAnchor = fix;
      previous = fix;
      visits = nextVisits;
      landmarkDwell = pending;
      journey = result.journey;
      if (result.summary) useSession.setState(state => ({
        summary: result.summary, revision: state.revision + 1, award: result.awards.at(-1) ?? state.award,
        fogRevision: state.fogRevision + (result.discovered > 0 ? 1 : 0),
        unlockedLandmarks: result.landmarkUnlocks.length ? {
          ...state.unlockedLandmarks, ...Object.fromEntries(result.landmarkUnlocks.map(({ id, timestamp }) => [id, timestamp])),
        } : state.unlockedLandmarks,
        recentLandmark: result.landmarkUnlocks.at(-1) ?? state.recentLandmark,
      }));
    }

    async function start() {
      useSession.setState({ status: "checking" });
      let permission = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      if (!permission.granted && permission.canAskAgain && attempt > prompted.current) {
        prompted.current = attempt;
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!active) return;
      useSession.setState({ permission: permissionLabel(permission) });
      if (!permission.granted) {
        useSession.setState({ status: permission.canAskAgain ? "denied" : "blocked", fix: null });
        return;
      }
      const enabled = await Location.hasServicesEnabledAsync();
      if (!active) return;
      if (!enabled) {
        useSession.setState({ status: "off", fix: null });
        return;
      }
      useSession.setState({ status: "searching" });
      const [existing, unlockedLandmarks] = await Promise.all([readActiveVisits(), readLandmarkUnlocks()]);
      if (!active) return;
      useSession.setState({ unlockedLandmarks });
      visits = new Map(existing.map(visit => [visit.place, {
        entered: visit.entered, last: visit.ended, seconds: visit.seconds, recorded: true,
      }]));
      watcher = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 0,
      }, position => {
        processing = processing.then(() => onPosition(position)).catch(error => {
          if (active) { useSession.setState({ status: "error" }); report(error); }
        });
      }, () => { if (active) useSession.setState({ status: "error", fix: null }); });
      if (!active) { watcher.remove(); return; }
      const started = Date.now();
      timeout = setInterval(() => {
        if (Date.now() - (lastAccepted || started) > 20_000 && useSession.getState().status !== "error") {
          useSession.setState({ status: "weak", fix: null });
        }
      }, 8000);
    }
    start().catch(error => {
      if (active) { useSession.setState({ status: "error", fix: null }); report(error); }
    });
    return () => {
      active = false;
      watcher?.remove();
      if (timeout) clearInterval(timeout);
    };
  }, [ready, tracking, attempt, appState]);
}

