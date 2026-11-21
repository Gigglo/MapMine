import { distance, type Fix } from "../exploration/engine";
import { landmarkDwellMs, landmarks, type Landmark } from "./catalog";

const maxFixGap = 15_000;
const maxArrivalSpeed = 3.5;
type Dwell = { started: number; last: number };

export function checkLandmarkVisits(fix: Fix, pending: ReadonlyMap<string, Dwell>,
  unlocked: Readonly<Record<string, number>>, catalog: readonly Landmark[] = landmarks) {
  const next = new Map<string, Dwell>();
  const discoveries: string[] = [];
  if (fix.speed !== null && fix.speed > maxArrivalSpeed) return { pending: next, discoveries };
  for (const landmark of catalog) {
    // The latitude bound skips almost every distant landmark without computing a great-circle distance.
    if (unlocked[landmark.id] || Math.abs(fix.latitude - landmark.latitude) > 0.004) continue;
    if (distance(fix, landmark) + fix.accuracy > landmark.radius) continue;
    const previous = pending.get(landmark.id);
    const continuing = previous && fix.timestamp > previous.last && fix.timestamp - previous.last <= maxFixGap;
    const started = continuing ? previous.started : fix.timestamp;
    if (fix.timestamp - started >= landmarkDwellMs) discoveries.push(landmark.id);
    else next.set(landmark.id, { started, last: fix.timestamp });
  }
  return { pending: next, discoveries };
}
