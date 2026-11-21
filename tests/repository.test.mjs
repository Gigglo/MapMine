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
    const point = { latitude: 20.2961, longitude: 85.8245 };
    assert.equal((await repo.readPreferences()).notifications, 0);
    await repo.setPreferences({ notifications: 1 });
    assert.equal((await repo.readPreferences()).notifications, 1);
    const time = Date.now() - 10_000;
    const fix = { ...point, accuracy: 5, heading: null, speed: 1, timestamp: time };
    const place = await repo.savePlace({ ...point, name: "Library", category: "School", icon: "Pin", notes: "", radius: 65, dwell: 90 });
    const cells = territory(point);
    const input = { fix, cells: [...cells, ...cells], meters: 12, seconds: 4, journey: null, visits: [], departures: [], landmarkIds: [] };
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
    const summary = await repo.summary();
    assert.equal(summary.metrics.cells, cells.length);
    assert.equal(summary.metrics.meters, 12);
    assert.equal(summary.today.seconds, 4);
    assert.equal(summary.metrics.places, 1);
    assert.equal(summary.metrics.landmarks, 1);
    assert.equal(summary.unlocked.length, 2);

    const bounds = { south: 20, north: 21, west: 85, east: 86, zoom: 16 };
    assert.equal((await repo.visibleCells(bounds)).length, cells.length);
    assert.equal((await repo.visibleHeat(bounds, "Today"))[0].samples, 2);
    assert.equal((await repo.visibleHeat(bounds, "Today"))[0].seconds, 8);
    await repo.clearHistory(false);
    const filtered = await repo.exportData();
    assert.equal(filtered.samples.length, 0);
    assert.equal(filtered.journeys.length, 0);
    assert.equal(filtered.visits.length, 0);
    assert.equal(filtered.heat.length, 0);
    assert.equal(filtered.cells.length, cells.length);
    assert.equal(filtered.landmarks.length, 1);

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
