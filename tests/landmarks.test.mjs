import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith(".ts") && /^\.{1,2}\//.test(specifier) && !specifier.endsWith(".ts")) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
});
const { findLandmark, landmarks, landmarksInView, landmarkMinZoom, landmarkDwellMs } =
  await import("../src/features/landmarks/catalog.ts");
const { checkLandmarkVisits } = await import("../src/features/landmarks/visiting.ts");
hooks.deregister();

const museum = findLandmark("bbi-state-museum");
const fixAt = (timestamp, details = {}) => ({
  latitude: museum.latitude, longitude: museum.longitude, timestamp, accuracy: 5, speed: null, heading: null, ...details,
});

test("the worldwide catalog is unique, coordinates are valid, and markers are filtered by zoom and viewport", () => {
  assert.ok(landmarks.length >= 1200);
  assert.equal(new Set(landmarks.map(item => item.id)).size, landmarks.length);
  assert.ok(landmarks.every(item => item.name && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180));
  assert.ok(landmarks.some(item => item.latitude < -25 && item.longitude < -40));
  assert.ok(landmarks.some(item => item.latitude < -25 && item.longitude > 130));
  const local = { north: 20.32, south: 20.21, west: 85.76, east: 85.88, zoom: landmarkMinZoom };
  assert.deepEqual(landmarksInView({ ...local, zoom: landmarkMinZoom - 1 }), []);
  assert.ok(landmarksInView(local).some(item => item.id === museum.id));
  assert.ok(landmarksInView({ ...local, west: local.west + 360, east: local.east + 360 }).some(item => item.id === museum.id));
});

test("only sustained accurate visits qualify and an unlocked landmark cannot be earned again", () => {
  const time = 1_000_000;
  const arrival = checkLandmarkVisits(fixAt(time), new Map(), {}, [museum]);
  const middle = checkLandmarkVisits(fixAt(time + 12_000), arrival.pending, {}, [museum]);
  assert.deepEqual(middle.discoveries, []);
  const discovered = checkLandmarkVisits(fixAt(time + landmarkDwellMs), middle.pending, {}, [museum]);
  assert.deepEqual(discovered.discoveries, [museum.id]);
  const unlocked = { [museum.id]: time + landmarkDwellMs };
  assert.equal(checkLandmarkVisits(fixAt(time + 30_000), middle.pending, unlocked, [museum]).pending.size, 0);
  assert.equal(checkLandmarkVisits(fixAt(time + 12_000, { speed: 16 }), arrival.pending, {}, [museum]).pending.size, 0);
  assert.equal(checkLandmarkVisits(fixAt(time + 12_000, { accuracy: 35, latitude: museum.latitude + 0.0006 }),
    arrival.pending, {}, [museum]).pending.size, 0);
  assert.deepEqual(checkLandmarkVisits(fixAt(time + 25_000), arrival.pending, {}, [museum]).discoveries, []);
});

test("the bundled India catalog has 150,000 indexed points with zoom-gated coverage and prefix search", () => {
  const catalog = new DatabaseSync(fileURLToPath(new URL("../assets/india_landmarks_v2.db", import.meta.url)), { readOnly: true });
  try {
    assert.equal(catalog.prepare("PRAGMA quick_check").get().quick_check, "ok");
    assert.equal(catalog.prepare("SELECT count(*) AS total FROM landmarks").get().total, 150_000);
    const prefix = "SELECT name FROM landmarks WHERE name LIKE ? ESCAPE '\\'";
    assert.ok(catalog.prepare(prefix).all("bhubane%").some(row => row.name === "Bhubaneswar"));
    assert.ok(catalog.prepare("EXPLAIN QUERY PLAN " + prefix).all("bhubane%").some(row => row.detail.includes("landmarks_name")));
    for (const [north, south, east, west] of [[20.6, 20.1, 86.1, 85.5], [28.9, 28.4, 77.5, 76.9], [13.3, 12.7, 80.5, 79.9]]) {
      const query = catalog.prepare("SELECT count(*) AS total FROM landmarks WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? AND minZoom <= ?");
      assert.ok(query.get(south, north, west, east, 11).total > 0);
      assert.ok(query.get(south, north, west, east, 13).total > query.get(south, north, west, east, 11).total);
    }
  } finally { catalog.close(); }
});
