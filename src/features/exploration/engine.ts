import { cellArea, gridDisk, latLngToCell, UNITS } from "h3-js";

export type Point = { latitude: number; longitude: number };
export type Fix = Point & {
  timestamp: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
};

export const exploration = {
  resolution: 11,
  unlockRings: 1,
  maxAccuracy: 35,
  maxGap: 60_000,
  maxSpeed: 75,
};

export function distance(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const dy = (b.latitude - a.latitude) * rad;
  const dx = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dy / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dx / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function validPoint(point: Point) {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function validFix(fix: Fix, now: number) {
  return validPoint(fix) && Number.isFinite(fix.accuracy) &&
    fix.accuracy > 0 && fix.accuracy <= exploration.maxAccuracy &&
    Number.isFinite(fix.timestamp) && fix.timestamp >= now - 30_000 &&
    fix.timestamp <= now + 5_000 && (fix.speed === null ||
      (Number.isFinite(fix.speed) && fix.speed <= exploration.maxSpeed));
}

export function segment(previous: Fix | null, fix: Fix) {
  if (!previous) return { meters: 0, seconds: 0, jump: false };
  const elapsed = fix.timestamp - previous.timestamp;
  if (elapsed <= 0) return { meters: 0, seconds: 0, jump: true };
  const meters = distance(previous, fix);
  if (meters > exploration.maxSpeed * elapsed / 1000 + previous.accuracy + fix.accuracy) {
    return { meters: 0, seconds: 0, jump: true };
  }
  if (elapsed > exploration.maxGap) return { meters: 0, seconds: 0, jump: false };
  return {
    meters: meters >= Math.max(5, (previous.accuracy + fix.accuracy) * 0.65) ? meters : 0,
    seconds: elapsed / 1000,
    jump: false,
  };
}

export function territory(fix: Point, previous?: Point, meters = 0) {
  const cells = new Set<string>();
  const steps = Math.max(1, Math.ceil(meters / 15));
  const delta = previous ? (fix.longitude - previous.longitude + 540) % 360 - 180 : 0;
  for (let index = 1; index <= steps; index++) {
    const part = index / steps;
    const latitude = previous ? previous.latitude + (fix.latitude - previous.latitude) * part : fix.latitude;
    const longitude = previous ? (previous.longitude + delta * part + 540) % 360 - 180 : fix.longitude;
    for (const cell of gridDisk(latLngToCell(latitude, longitude, exploration.resolution), exploration.unlockRings)) {
      cells.add(cell);
    }
  }
  return [...cells];
}

export function area(cell: string) {
  return cellArea(cell, UNITS.m2);
}

export function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, "0")).join("-");
}

export function precedingDay(day: string, offset: number) {
  const [year, month, date] = day.split("-").map(Number);
  return dayKey(new Date(year, month - 1, date - offset, 12).getTime());
}

export function streak(days: string[], today = dayKey()) {
  const visited = new Set(days);
  let offset = visited.has(today) ? 0 : 1;
  const start = offset;
  while (visited.has(precedingDay(today, offset))) offset++;
  return offset - start;
}

export type VisitState = { entered: number; last: number; seconds: number; recorded: boolean };

export function detectVisit(state: VisitState | undefined, fix: Fix, place: Point, radius: number, dwellMs: number) {
  const meters = distance(fix, place);
  if (meters > radius + (state ? Math.min(fix.accuracy, radius / 2) : 0)) return null;
  if (!state && fix.accuracy > radius / 2) return null;
  const gap = state ? fix.timestamp - state.last : 0;
  const continuous = Boolean(state && gap > 0 && gap <= exploration.maxGap);
  const sameVisit = state && (continuous || state.recorded);
  const entered = sameVisit ? state.entered : fix.timestamp;
  const recorded = Boolean(sameVisit && state.recorded);
  const seconds = (sameVisit ? state.seconds : 0) + (continuous ? gap / 1000 : 0);
  const unlock = !recorded && seconds * 1000 >= dwellMs;
  return { entered, last: fix.timestamp, seconds, recorded: recorded || unlock, unlock };
}

