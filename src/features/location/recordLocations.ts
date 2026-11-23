import type { LocationObject } from "expo-location";
import { readActiveVisits, readLandmarkUnlocks, readPlaces, readPreferences, recordFix, type Visit } from "../../database/repository";
import { dayKey, detectVisit, exploration, segment, territory, validFix, type Fix, type VisitState } from "../exploration/engine";
import { useSession } from "../../store/session";
import { checkLandmarkVisits } from "../landmarks/visiting";
import { landmarks } from "../landmarks/catalog";
import { considerNearbySuggestion, notificationOptions, notifyExploration } from "../engagement/notifications";
import { indiaLandmarksNear } from "../landmarks/indiaCatalog";

let previous: Fix | null = null;
let movementAnchor: Fix | null = null;
let candidate: Fix | null = null;
let journey: number | null = null;
let lastFix = 0;
let lastAccepted = 0;
let visits: Map<number, VisitState> | undefined;
let landmarkDwell: Parameters<typeof checkLandmarkVisits>[1] = new Map();
let nearbyCatalog: { latitude: number; longitude: number; fetched: number; landmarks: Awaited<ReturnType<typeof indiaLandmarksNear>> } | undefined;
let processing: Promise<unknown> = Promise.resolve();

function enqueue(work: () => Promise<void>) {
  const result = processing.then(work);
  processing = result.catch(() => undefined);
  return result;
}

export function resetRecording() {
  return enqueue(async () => {
    previous = movementAnchor = candidate = null;
    journey = null;
    lastFix = lastAccepted = 0;
    visits = undefined;
    landmarkDwell = new Map();
  });
}

export function lastLocationReceived() {
  return lastAccepted;
}

async function landmarksNearFix(fix: Fix) {
  // Fetch a slightly larger box so nearby fixes can share the lookup during a visit.
  if (nearbyCatalog && Math.abs(fix.latitude - nearbyCatalog.latitude) < 0.0008 &&
    Math.abs(fix.longitude - nearbyCatalog.longitude) < 0.0008 && Date.now() - nearbyCatalog.fetched < 60_000) {
    return nearbyCatalog.landmarks;
  }
  try {
    const local = await indiaLandmarksNear(fix, 0.004);
    nearbyCatalog = { latitude: fix.latitude, longitude: fix.longitude, fetched: Date.now(), landmarks: local };
    return local;
  } catch {
    return [];
  }
}

export function recordLocations(positions: LocationObject[], background = false) {
  return enqueue(async () => {
    if (!positions.length) return;
    const state = useSession.getState();
    const preferences = state.ready ? state.preferences : await readPreferences();
    if (!preferences.tracking) return;
    const places = state.ready ? state.places : await readPlaces();
    const unlockedLandmarks = state.ready ? { ...state.unlockedLandmarks } : await readLandmarkUnlocks();
    visits ??= new Map((await readActiveVisits()).map(visit => [visit.place, {
      entered: visit.entered, last: visit.ended, seconds: visit.seconds, recorded: true,
    }]));
    const ordered = positions.length === 1 ? positions : [...positions].sort((a, b) => a.timestamp - b.timestamp);
    for (const position of ordered) {
      if (!position.mocked) await recordPosition(position, places, unlockedLandmarks, background, preferences.notifications);
    }
  });
}

async function recordPosition(position: LocationObject, places: Awaited<ReturnType<typeof readPlaces>>,
  unlockedLandmarks: Record<string, number>, background: boolean, notifications: number) {
  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  const fix = { latitude, longitude, accuracy: accuracy ?? Infinity, heading, speed, timestamp: Math.round(position.timestamp) };
  if (!validFix(fix, background ? Math.min(Date.now(), fix.timestamp) : Date.now())) {
    if (!lastAccepted || Date.now() - lastAccepted > 15_000) useSession.setState({ status: "weak" });
    return;
  }
  if (fix.timestamp - lastFix < 3_500) return;

  let travel = segment(previous, fix);
  if (travel.jump) {
    if (!candidate || segment(candidate, fix).jump) {
      lastFix = fix.timestamp;
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
  const movement = segment(movementAnchor, fix);
  const meters = movement.jump ? 0 : movement.meters;
  const cells = territory(fix, travel.meters && previous ? previous : undefined, travel.meters);
  const updates: Visit[] = [];
  const departures: number[] = [];
  const nextVisits = new Map<number, VisitState>();
  for (const place of places) {
    const prior = visits?.get(place.id);
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
  const around = await landmarksNearFix(fix);
  if (useSession.getState().ready && !useSession.getState().preferences.tracking) return;
  const { pending, discoveries } = checkLandmarkVisits(fix, landmarkDwell, unlockedLandmarks,
    [...around, ...landmarks]);
  const summaryDay = useSession.getState().summary?.today.day;
  const result = await recordFix({ fix, cells, meters, seconds: meters > 0 ? travel.seconds : 0,
    heatSeconds: travel.seconds, journey, visits: updates,
    departures, landmarkIds: discoveries, summaryDay });
  if (!result.recorded) return;
  lastFix = fix.timestamp;
  if (!movementAnchor || meters || fix.timestamp - movementAnchor.timestamp >= exploration.maxGap) movementAnchor = fix;
  previous = fix;
  visits = nextVisits;
  landmarkDwell = pending;
  journey = result.journey;
  for (const { id, timestamp } of result.landmarkUnlocks) unlockedLandmarks[id] = timestamp;
  lastAccepted = Date.now();
  useSession.setState(state => ({
    ...((!state.ready || state.preferences.tracking) ? { fix, status: "live" as const } : {}),
    sampleRevision: state.sampleRevision + 1, latestRecordedDay: dayKey(fix.timestamp),
    summary: result.summary ?? state.summary,
    revision: state.revision + (result.summary ? 1 : 0), award: result.awards.at(-1) ?? state.award,
    fogRevision: state.fogRevision + (result.discovered > 0 ? 1 : 0),
    unlockedLandmarks: result.landmarkUnlocks.length ? {
      ...state.unlockedLandmarks, ...Object.fromEntries(result.landmarkUnlocks.map(({ id, timestamp }) => [id, timestamp])),
    } : state.unlockedLandmarks,
    recentLandmark: result.landmarkUnlocks.at(-1) ?? state.recentLandmark,
  }));
  if (notifications & notificationOptions.unlocks) {
    await notifyExploration(result.landmarkUnlocks, result.awards).catch(() => undefined);
  }
  if (notifications & notificationOptions.nearby) {
    await considerNearbySuggestion(fix, unlockedLandmarks).catch(() => undefined);
  }
}
