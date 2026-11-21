import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { migrate } from "../src/database/schema.ts";

test("schema migrates once, deduplicates territories and achievements, and cascades saved-place visits", async () => {
  const native = new DatabaseSync(":memory:");
  try {
    const db = {
      execAsync: async sql => native.exec(sql),
      getFirstAsync: async sql => native.prepare(sql).get(),
      async withTransactionAsync(work) {
        native.exec("BEGIN");
        try { await work(); native.exec("COMMIT"); }
        catch (error) { native.exec("ROLLBACK"); throw error; }
      },
    };
    await migrate(db);
    await migrate(db);
    native.exec(`
      INSERT OR IGNORE INTO explored_cells VALUES('cell',20,85,32,'2025-01-01');
      INSERT OR IGNORE INTO explored_cells VALUES('cell',20,85,32,'2025-01-01');
      INSERT INTO achievements VALUES('first',50);
      INSERT OR IGNORE INTO unlocked_achievements VALUES('first',1);
      INSERT OR IGNORE INTO unlocked_achievements VALUES('first',2);
      INSERT INTO saved_places VALUES(1,'Home','Home','House','',20,85,65,90);
      INSERT INTO place_visits VALUES(1,1000,2000,'2025-01-01',1,1);
      DELETE FROM saved_places WHERE id=1;
    `);
    native.exec("DROP TABLE unlocked_landmarks; ALTER TABLE user_preferences DROP COLUMN notifications; PRAGMA user_version=1;");
    await migrate(db);
    assert.equal(native.prepare("PRAGMA user_version").get().user_version, 3);
    assert.equal(native.prepare("SELECT count(*) AS total FROM unlocked_landmarks").get().total, 0);
    assert.equal(native.prepare("SELECT count(*) AS total FROM explored_cells").get().total, 1);
    assert.equal(native.prepare("SELECT timestamp FROM unlocked_achievements").get().timestamp, 1);
    assert.equal(native.prepare("SELECT count(*) AS total FROM place_visits").get().total, 0);
    assert.equal(native.prepare("SELECT tracking FROM user_preferences").get().tracking, 0);
  } finally { native.close(); }
});
