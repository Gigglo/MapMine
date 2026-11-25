import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith(".ts") && /^\.{1,2}\//.test(specifier) && !specifier.endsWith(".ts")) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
});
let activity, geometry;
try {
  activity = await import("../src/features/activity/activityStats.ts");
  geometry = await import("../src/features/activity/routeGeometry.ts");
} finally {
  hooks.deregister();
}
const { activityWindow, summarizeActivity } = activity;
const { routeGeometry } = geometry;

test("all activity periods include the selected end date and page without overlaps", () => {
  const today = "2024-03-01";
  const cases = [
    ["Daily", "2024-03-01", "2024-02-29", 1],
    ["Weekly", "2024-02-24", "2024-02-23", 7],
    ["30 days", "2024-02-01", "2024-01-31", 6],
    ["90 days", "2023-12-03", "2023-12-02", 9],
  ];
  for (const [period, first, previousEnd, bars] of cases) {
    const window = activityWindow(today, period, 0);
    assert.equal(window.start, first);
    assert.equal(window.end, today);
    assert.equal(activityWindow(today, period, 1).end, previousEnd);
    const empty = summarizeActivity([], window);
    assert.deepEqual(empty.totals, { meters: 0, seconds: 0, area: 0 });
    assert.equal(empty.buckets.length, bars);
    assert.equal(empty.buckets[0].first, first);
    assert.equal(empty.buckets.at(-1).last, today);
  }
});

test("period totals span calendar boundaries and keep gaps in the chart", () => {
  const window = activityWindow("2024-03-01", "30 days", 0);
  const row = (day, meters) => ({ day, meters, seconds: meters * 2, area: meters * 3, cells: 1 });
  const rows = [
    row("2024-03-02", 1000), row("2024-02-06", 20), row("2024-02-01", 10),
    row("2024-02-05", 5), row("2024-01-31", 1000), row("2024-03-01", 40),
  ];
  const { totals, buckets } = summarizeActivity(rows, window);
  assert.deepEqual(totals, { meters: 75, seconds: 150, area: 225 });
  assert.deepEqual(buckets.map(bucket => bucket.meters), [15, 20, 0, 0, 0, 40]);
  assert.deepEqual(buckets.map(bucket => bucket.area), [45, 60, 0, 0, 0, 120]);
  assert.deepEqual(buckets[0], { first: "2024-02-01", last: "2024-02-05", meters: 15, area: 45 });
});

test("route replay handles empty, stationary, and interrupted recordings", () => {
  assert.deepEqual(routeGeometry([]), { zoom: 0, tiles: [], legs: [], total: 0 });
  const fix = { latitude: 20, longitude: 85, timestamp: 1_000, journey: 1 };
  assert.equal(routeGeometry([fix]).total, 0);
  assert.equal(routeGeometry([fix, { ...fix, timestamp: 5_000 }]).total, 0);
  const replay = routeGeometry([
    fix, { ...fix, timestamp: 5_000, longitude: 85.001 },
    { ...fix, timestamp: 10_000_000, longitude: 86 },
  ]);
  assert.ok(replay.total > 0);
  assert.equal(replay.legs.length, 2);
  assert.equal(replay.legs[1].length, 0);
  assert.equal(replay.total, replay.legs[0].length);
  assert.ok(replay.tiles.every(tile => tile.col >= 0 && tile.col < 2 ** replay.zoom));
});
