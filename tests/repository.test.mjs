import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

test("recording is transactional and idempotent, and privacy actions erase the intended data", async () => {
  const native = new DatabaseSync(":memory:");
  const bind = value => value ?? null;
  globalThis.mapMineTestDatabase = {
    execAsync: async sql => native.exec(sql),
    getFirstAsync: async (sql, ...args) => native.prepare(sql).get(...args.map(bind)),
    getAllAsync: async (sql, ...args) => native.prepare(sql).all(...args.map(bind)),
    async runAsync(sql, ...args) {
      const result = native.prepare(sql).run(...args.map(bind));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async withTransactionAsync(work) {
      native.exec("BEGIN");
      try { await work(); native.exec("COMMIT"); }
      catch (error) { native.exec("ROLLBACK"); throw error; }
    },
    closeAsync: async () => native.close(),
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === "expo-sqlite") {
        return { url: "data:text/javascript,export const openDatabaseAsync = async () => globalThis.mapMineTestDatabase", shortCircuit: true };
      }
      if (context.parentURL?.endsWith(".ts") && /^\.{1,2}\//.test(specifier) && !specifier.endsWith(".ts")) {
        return next(specifier + ".ts", context);
      }
      return next(specifier, context);
    },
  });

  try {
    const repo = await import("../src/database/repository.ts");
    const { territory, dayKey } = await import("../src/features/exploration/engine.ts");
    const { eggForSearch, eggForPoint, eggs } = await import("../src/features/easterEggs/catalog.ts");
    assert.equal(new Set(eggs.map(egg => egg.id)).size, 28);
    assert.equal(eggForSearch("  HERE  BE DRAGONS ").id, "search:here be dragons");
    assert.equal(eggForSearch("ordinary places"), undefined);
    assert.equal(eggForPoint({ latitude: 0, longitude: -180 }).id, "dateline");
    assert.equal(await repo.recordEasterEgg("null-island"), true);
    assert.equal(await repo.recordEasterEgg("null-island"), false);
    assert.deepEqual((await repo.readEasterEggs()).map(row => row.id), ["null-island"]);
    const { routeGeometry } = await import("../src/features/activity/routeGeometry.ts");
    const point = { latitude: 20.2961, longitude: 85.8245 };
    const { formatCoordinates, parseCoordinates } = await import("../src/features/map/coordinates.ts");
    assert.deepEqual(parseCoordinates(formatCoordinates(point)), point);
    assert.deepEqual(parseCoordinates(" -20.2961   85.8245 "), { latitude: -20.2961, longitude: 85.8245 });
    assert.equal(parseCoordinates("91, 85"), undefined);
    assert.equal(parseCoordinates("20, -181"), undefined);
    assert.equal(parseCoordinates("Cafe 20, 85"), undefined);
    assert.equal((await repo.readPreferences()).walkthroughSeen, 0);
    await repo.setPreferences({ walkthroughSeen: 1 });
    assert.equal((await repo.readPreferences()).walkthroughSeen, 1);
    assert.equal((await repo.readPreferences()).notifications, 0);
    await repo.setPreferences({ notifications: 1 });
    assert.equal((await repo.readPreferences()).notifications, 1);
    const time = Date.now() - 10_000;
    const fix = { ...point, accuracy: 5, heading: null, speed: 1, timestamp: time };
    const place = await repo.savePlace({ ...point, name: "Library", category: "School", icon: "Pin", notes: "", radius: 65, dwell: 90 });
    const memory = { ...point, name: "Park", category: "Other", icon: "Pin", notes: "Morning walk", radius: 65, dwell: 90 };
    const memoryId = await repo.savePlace(memory, undefined, ["first-photo", "second-photo"]);
    assert.deepEqual(await repo.readPlacePhotos(memoryId), ["first-photo", "second-photo"]);
    await assert.rejects(repo.savePlace({ ...memory, notes: "Must roll back" }, memoryId, ["a", "b", "c"]));
    assert.equal((await repo.readPlaces()).find(item => item.id === memoryId).notes, "Morning walk");
    await repo.savePlace({ ...memory, notes: "Back again" }, memoryId);
    assert.deepEqual(await repo.readPlacePhotos(memoryId), ["first-photo", "second-photo"]);
    await repo.savePlace(memory, memoryId, ["second-photo"]);
    assert.deepEqual((await repo.exportData()).placePhotos.map(row => ({ ...row })), [{ place: memoryId, slot: 0, jpeg: "second-photo" }]);
    const photoView = { north: 21, south: 20, west: 85, east: 86, zoom: 15 };
    assert.equal(await repo.readPlaceCover(memoryId), "second-photo");
    assert.equal((await repo.readPlaces()).find(item => item.id === memoryId).hasPhoto, 1);
    const markers = await repo.visiblePlacePhotos(photoView);
    assert.deepEqual(markers.map(marker => [marker.id, marker.jpeg]), [[memoryId, "second-photo"]]);
    assert.deepEqual(await repo.visiblePlacePhotos({ ...photoView, west: 50, east: 51 }), []);
    assert.deepEqual(await repo.visiblePlacePhotos({ ...photoView, zoom: 10 }), []);
    await repo.deletePlace(memoryId);
    assert.deepEqual(await repo.visiblePlacePhotos(photoView), []);
    assert.equal(await repo.readPlaceCover(memoryId), undefined);
    assert.deepEqual(await repo.readPlacePhotos(memoryId), []);
    assert.equal(await repo.readNearbyReminderTime(), 0);
    await repo.markNearbyReminder(time);
    assert.equal(await repo.readNearbyReminderTime(), time);
    const cells = territory(point);
    const input = { fix, cells: [...cells, ...cells], meters: 12, seconds: 4, journey: null, visits: [], departures: [], landmarkIds: [] };
    assert.equal((await repo.recordFix(input)).recorded, false);
    await repo.setPreferences({ tracking: 1 });
    const first = await repo.recordFix(input);
    assert.equal(first.summary.metrics.cells, cells.length);
    assert.equal(first.summary.metrics.meters, 12);
    assert.equal(first.awards[0].id, "first");
    assert.equal((await repo.recordFix({ ...input, journey: first.journey })).summary, null);
    const visit = { place, entered: time - 90_000, ended: time + 4000, day: dayKey(time), seconds: 94, active: 1 };
    const discovered = await repo.recordFix({ ...input, journey: first.journey, fix: { ...fix, timestamp: time + 4000 },
      meters: 0, seconds: 0, heatSeconds: 4, visits: [visit], landmarkIds: ["bbi-state-museum", "bbi-state-museum"] });
    assert.deepEqual(discovered.landmarkUnlocks, [{ id: "bbi-state-museum", timestamp: time + 4000 }]);
    assert.equal((await repo.readLandmarkUnlocks())["bbi-state-museum"], time + 4000);
    assert.equal((await repo.readActiveVisits()).length, 1);
    const lateFix = { ...fix, timestamp: time + 2000 };
    assert.equal((await repo.recordFix({ ...input, fix: lateFix })).recorded, false);
    await repo.setPreferences({ tracking: 0 });
    assert.equal((await repo.recordFix({ ...input, fix: { ...fix, timestamp: time + 8000 } })).recorded, false);
    const summary = await repo.summary();
    assert.equal(summary.metrics.cells, cells.length);
    assert.equal(summary.metrics.meters, 12);
    assert.equal(summary.today.seconds, 4);
    assert.equal(summary.metrics.places, 1);
    assert.equal(summary.metrics.landmarks, 1);
    assert.equal(summary.unlocked.length, 2);

    const date = dayKey(time);
    assert.deepEqual((await repo.readActivityDays(date, date)).map(day => day.meters), [12]);
    const activity = await repo.readDayActivity(date);
    assert.equal(activity.stats.meters, 12);
    assert.equal(activity.visits, 1);
    assert.deepEqual(activity.journeys.map(journey => journey.id), [first.journey]);
    assert.deepEqual(activity.points.map(point => point.timestamp), [time, time + 4000]);
    assert.deepEqual((await repo.readAchievementRoute(time)).map(point => point.timestamp), [time]);
    const replay = routeGeometry([
      { ...point, longitude: 179.999, journey: 1, timestamp: time },
      { ...point, longitude: -179.999, journey: 1, timestamp: time + 4000 },
      { ...point, longitude: -179.998, journey: 2, timestamp: time + 8000 },
    ]);
    assert.equal(replay.legs.length, 2);
    assert.ok(replay.zoom > 12 && replay.legs[0].length > 0);
    assert.equal(replay.legs[1].length, 0);

    const bounds = { south: 20, north: 21, west: 85, east: 86, zoom: 16 };
    assert.equal((await repo.visibleCells(bounds)).length, cells.length);
    assert.equal((await repo.visibleHeat(bounds, "Today"))[0].samples, 2);
    assert.equal((await repo.visibleHeat(bounds, "Today"))[0].seconds, 8);
    await repo.setPreferences({ tracking: 1 });
    const stationary = await repo.recordFix({ ...input, journey: first.journey, cells, meters: 0, seconds: 0,
      heatSeconds: 4, summaryDay: dayKey(), fix: { ...fix, timestamp: Date.now() } });
    assert.equal(stationary.recorded, true);
    assert.equal(stationary.summary, null);
    assert.equal((await repo.visibleHeat(bounds, "Today"))[0].samples, 3);
    assert.equal((await repo.summary()).metrics.meters, 12);
    await repo.clearHistory(false);
    const filtered = await repo.exportData();
    assert.equal(filtered.samples.length, 0);
    assert.equal(filtered.journeys.length, 0);
    assert.equal(filtered.visits.length, 0);
    assert.equal(filtered.heat.length, 0);
    assert.equal(filtered.cells.length, cells.length);
    assert.equal(filtered.landmarks.length, 1);
    const historical = await repo.readDayActivity(date);
    assert.equal(historical.stats.meters, 12);
    assert.equal(historical.points.length, 0);

    await repo.clearHistory(true);
    const reset = await repo.exportData();
    assert.equal(reset.cells.length, 0);
    assert.equal(reset.achievements.length, 0);
    assert.equal(reset.daily.length, 0);
    assert.equal(reset.landmarks.length, 0);
    assert.equal(reset.places.length, 1);
  } finally {
    hooks.deregister();
    delete globalThis.mapMineTestDatabase;
    if (native.isOpen) native.close();
  }
});
