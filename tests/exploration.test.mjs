import assert from "node:assert/strict";
import { test } from "node:test";
import { cellToLatLng, cellsToMultiPolygon, latLngToCell } from "h3-js";
import { area, dayKey, detectVisit, distance, exploration, segment, streak, territory, validFix } from "../src/features/exploration/engine.ts";
import { earnedMilestones, levelFor, milestones } from "../src/features/achievements/milestones.ts";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const origin = { latitude: 20.2961, longitude: 85.8245 };
const now = 1700000000000;
const fix = (patch = {}) => ({ ...origin, timestamp: now, accuracy: 5, speed: null, heading: null, ...patch });

test("distance is in meters, symmetric and wraps across the antimeridian", () => {
  assert.equal(distance(origin, origin), 0);
  const a = { latitude: 0, longitude: 179.999 };
  const b = { latitude: 0, longitude: -179.999 };
  assert.ok(Math.abs(distance(a, b) - 222.4) < 0.5);
  assert.equal(distance(a, b), distance(b, a));
});

test("GPS validation rejects stale, inaccurate, out-of-range and non-finite fixes", () => {
  assert.ok(validFix(fix(), now));
  for (const patch of [{ accuracy: 75 }, { accuracy: 0 }, { latitude: 91 }, { longitude: NaN },
    { timestamp: now - 31_000 }, { timestamp: now + 6000 }, { speed: 100 }, { speed: NaN }]) {
    assert.equal(validFix(fix(patch), now), false);
  }
});

test("a GPS jump cannot produce an interpolated segment, and a long gap starts a new journey", () => {
  const older = fix();
  assert.equal(segment(older, fix({ timestamp: now + 4000, longitude: 86 })).jump, true);
  assert.equal(segment(older, fix()).jump, true);
  const gap = segment(older, fix({ timestamp: now + 61_000, longitude: origin.longitude + 0.001 }));
  assert.deepEqual(gap, { meters: 0, seconds: 0, jump: false });
  const jitter = segment(older, fix({ timestamp: now + 4000, longitude: origin.longitude + 0.00001 }));
  assert.equal(jitter.meters, 0);
  assert.equal(jitter.seconds, 4);
});

test("exploration deduplicates cells and produces a contiguous reveal for a short route", () => {
  const target = { latitude: origin.latitude, longitude: origin.longitude + 0.001 };
  const cells = territory(target, origin, distance(origin, target));
  assert.equal(cells.length, new Set(cells).size);
  assert.ok(cells.length > territory(target).length);
  const middle = latLngToCell(origin.latitude, origin.longitude + 0.0005, exploration.resolution);
  assert.ok(cells.includes(middle));
  assert.ok(cells.every(cell => area(cell) > 0 && distance(origin, {
    latitude: cellToLatLng(cell)[0], longitude: cellToLatLng(cell)[1],
  }) < 200));
  assert.equal(cellsToMultiPolygon(cells, true).length, 1);
});

test("antimeridian interpolation stays on the short side of the globe", () => {
  const start = { latitude: 0, longitude: 179.9997 };
  const end = { latitude: 0, longitude: -179.9997 };
  const cells = territory(end, start, distance(start, end));
  assert.ok(cells.length > 7);
  assert.ok(cells.every(cell => Math.abs(cellToLatLng(cell)[1]) > 179.99));
});

test("geofence dwell triggers once until exit and excludes time with no signal", () => {
  const first = detectVisit(undefined, fix(), origin, 60, 10_000);
  assert.equal(first?.unlock, false);
  const afterDwell = detectVisit(first, fix({ timestamp: now + 10_000 }), origin, 60, 10_000);
  assert.equal(afterDwell?.unlock, true);
  const staying = detectVisit(afterDwell, fix({ timestamp: now + 20_000 }), origin, 60, 10_000);
  assert.equal(staying?.recorded, true);
  assert.equal(staying?.unlock, false);
  assert.equal(detectVisit(staying, fix({ longitude: 86, timestamp: now + 25_000 }), origin, 60, 10_000), null);
  assert.equal(detectVisit(undefined, fix({ accuracy: 35 }), origin, 60, 10_000), null);
  const later = detectVisit(staying, fix({ timestamp: now + 90_000 }), origin, 60, 10_000);
  assert.equal(later?.recorded, true);
  assert.equal(later?.seconds, 20);
  assert.equal(later?.unlock, false);
});

test("streak uses calendar days and stays active through the following day", () => {
  assert.equal(dayKey(new Date(2025, 0, 1, 12).getTime()), "2025-01-01");
  assert.equal(streak(["2024-12-31", "2024-12-30", "2024-12-29"], "2025-01-01"), 3);
  assert.equal(streak(["2024-12-30"], "2025-01-01"), 0);
});

test("achievements derive from persisted metrics and never reward an existing ID", () => {
  const metrics = { cells: 100, meters: 10_500, squareMeters: 740_000, places: 1, streak: 7, discoveryDays: 3, landmarks: 0 };
  const awards = earnedMilestones(metrics, new Set(["first"]));
  assert.deepEqual(awards.map(award => award.id), ["wanderer", "explorer", "consistent"]);
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(250), 2);
});

test("advanced milestones award exact thresholds and never repeat already earned rewards", () => {
  const metrics = { cells: 50_000, meters: 499_999, squareMeters: 25_000_000, places: 149, streak: 30, discoveryDays: 99, landmarks: 25 };
  const ids = earnedMilestones(metrics, new Set(["century"])).map(award => award.id);
  assert.ok(ids.includes("territory-surveyor"));
  assert.ok(ids.includes("grid-master"));
  assert.ok(ids.includes("month-streak"));
  assert.ok(ids.includes("grand-tour"));
  for (const id of ["century", "long-haul", "regular", "season-streak", "hundred-days"]) assert.ok(!ids.includes(id));
});

test("new achievement titles still use existing IDs and new joke badges earn real milestones", () => {
  const atThresholds = {
    cells: 5_000, meters: 0, squareMeters: 0, places: 5, streak: 14, discoveryDays: 0, landmarks: 3,
  };
  const unlocked = new Set(["first", "consistent"]);
  const earned = earnedMilestones(atThresholds, unlocked);
  assert.ok(!earned.some(award => unlocked.has(award.id)));
  const names = new Set(earned.map(award => award.name));
  for (const name of ["Side Quest Gremlin", "Errand Goblin", "Suspiciously Offline", "GPS Gremlin Supreme"]) {
    assert.ok(names.has(name));
  }
});

test("every supplied meme appears in exactly one achievement", () => {
  const source = new URL("../assets/random_images/", import.meta.url);
  const badges = new URL("../assets/achievement_badges/", import.meta.url);
  const hash = url => createHash("sha256").update(readFileSync(url)).digest("hex");
  const originals = readdirSync(source).filter(file => file.endsWith(".jfif"))
    .map(file => hash(new URL(encodeURIComponent(file), source))).sort();
  const copies = milestones.map(({ id }) => hash(new URL(id + ".jpg", badges))).sort();
  assert.equal(new Set(copies).size, milestones.length);
  assert.deepEqual(copies, originals);
});

