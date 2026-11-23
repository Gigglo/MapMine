import type { SQLiteDatabase } from "expo-sqlite";

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;");
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  if (version?.user_version === 7) return;
  if (!version || ![0, 1, 2, 3, 4, 5, 6].includes(version.user_version)) throw new Error("Unsupported MapMine database version");
  await db.withTransactionAsync(async () => {
    if (version.user_version === 0) await db.execAsync(`
      CREATE TABLE explored_cells (id TEXT PRIMARY KEY, latitude REAL NOT NULL, longitude REAL NOT NULL, area REAL NOT NULL, day TEXT NOT NULL);
      CREATE INDEX cells_lat_lon ON explored_cells(latitude, longitude);
      CREATE TABLE journeys (id INTEGER PRIMARY KEY, started INTEGER NOT NULL, ended INTEGER NOT NULL, meters REAL NOT NULL DEFAULT 0, seconds REAL NOT NULL DEFAULT 0);
      CREATE TABLE location_samples (timestamp INTEGER PRIMARY KEY, journey INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE, latitude REAL NOT NULL, longitude REAL NOT NULL, accuracy REAL NOT NULL, speed REAL, heading REAL);
      CREATE TABLE saved_places (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, icon TEXT NOT NULL, notes TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, radius INTEGER NOT NULL, dwell INTEGER NOT NULL);
      CREATE TABLE place_visits (place INTEGER NOT NULL REFERENCES saved_places(id) ON DELETE CASCADE, entered INTEGER NOT NULL, ended INTEGER NOT NULL, day TEXT NOT NULL, seconds REAL NOT NULL, active INTEGER NOT NULL, PRIMARY KEY(place, entered));
      CREATE INDEX visits_day ON place_visits(day);
      CREATE UNIQUE INDEX active_visit ON place_visits(place) WHERE active=1;
      CREATE TABLE daily_statistics (day TEXT PRIMARY KEY, meters REAL NOT NULL DEFAULT 0, seconds REAL NOT NULL DEFAULT 0, cells INTEGER NOT NULL DEFAULT 0, area REAL NOT NULL DEFAULT 0);
      CREATE TABLE heat_cells (day TEXT NOT NULL, cell TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, seconds REAL NOT NULL, samples INTEGER NOT NULL, PRIMARY KEY(day, cell));
      CREATE INDEX heat_lat_lon ON heat_cells(latitude, longitude);
      CREATE TABLE achievements (id TEXT PRIMARY KEY, xp INTEGER NOT NULL);
      CREATE TABLE unlocked_achievements (id TEXT PRIMARY KEY REFERENCES achievements(id), timestamp INTEGER NOT NULL);
      CREATE TABLE user_preferences (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL DEFAULT 'Explorer', tracking INTEGER NOT NULL DEFAULT 0, haptics INTEGER NOT NULL DEFAULT 1, retention INTEGER NOT NULL DEFAULT 30, mode TEXT NOT NULL DEFAULT 'explore');
      INSERT INTO user_preferences(id) VALUES(1);
    `);
    if (version.user_version < 2) await db.execAsync(
      "CREATE TABLE unlocked_landmarks (id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL);"
    );
    if (version.user_version < 3) await db.execAsync(
      "ALTER TABLE user_preferences ADD COLUMN notifications INTEGER NOT NULL DEFAULT 0"
    );
    if (version.user_version < 4) await db.execAsync(`
      CREATE TABLE place_photos (place INTEGER NOT NULL REFERENCES saved_places(id) ON DELETE CASCADE,
        slot INTEGER NOT NULL CHECK(slot IN (0,1)), jpeg TEXT NOT NULL, PRIMARY KEY(place,slot));
      CREATE TABLE reminder_state (id INTEGER PRIMARY KEY CHECK(id=1), nearby_at INTEGER NOT NULL);
      INSERT INTO reminder_state VALUES(1,0);
    `);
    if (version.user_version < 5) await db.execAsync(`
      CREATE TABLE easter_eggs (id TEXT PRIMARY KEY NOT NULL, discovered INTEGER NOT NULL);
    `);
    if (version.user_version < 6) await db.execAsync(
      "CREATE INDEX completed_journeys_started ON journeys(started DESC) WHERE meters >= 10"
    );
    await db.execAsync(`
      ALTER TABLE user_preferences ADD COLUMN walkthrough_seen INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version=7;
    `);
  });
}

