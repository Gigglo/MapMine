import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { cellToLatLng, latLngToCell } from "h3-js";
import { area, dayKey, precedingDay, streak, type Fix, type Point } from "../features/exploration/engine";
import { earnedMilestones, milestones, type Metrics } from "../features/achievements/milestones";
import { migrate } from "./schema";

export type Mode = "explore" | "normal" | "heatmap" | "places";
export type Range = "Today" | "Week" | "Month" | "All time";
export type Bounds = { south: number; north: number; west: number; east: number; zoom: number };
export type Preferences = { name: string; tracking: number; haptics: number; retention: number; mode: Mode; notifications: number; walkthroughSeen: number };
export type PlaceInput = Point & { name: string; category: string; icon: string; notes: string; radius: number; dwell: number };
export type Place = PlaceInput & { id: number; hasPhoto: number };
export type Day = { day: string; meters: number; seconds: number; cells: number; area: number };
export type Journey = { id: number; started: number; ended: number; meters: number; seconds: number };
export type Visit = { place: number; entered: number; ended: number; day: string; seconds: number; active: number };
export type Unlock = { id: string; timestamp: number; xp: number };
export type LandmarkUnlock = { id: string; timestamp: number };
export type HeatPoint = Point & { seconds: number; samples: number };
export type Summary = {
  metrics: Metrics; days: Day[]; today: Day; visitsToday: number; seconds: number; journeys: Journey[]; unlocked: Unlock[];
};

let connection: Promise<SQLiteDatabase> | undefined;
let pending: Promise<unknown> = Promise.resolve();

function database() {
  connection ??= (async () => {
    const db = await openDatabaseAsync("mapmine.db");
    try {
      await migrate(db);
      await db.withTransactionAsync(async () => {
        for (const item of milestones) await db.runAsync("INSERT OR IGNORE INTO achievements VALUES (?, ?)", item.id, item.xp);
        await awardMilestones(db, await readSummary(db), Date.now());
      });
      return db;
    } catch (error) {
      await db.closeAsync();
      throw error;
    }
  })().catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

function query<T>(work: (db: SQLiteDatabase) => Promise<T>) {
  const result = pending.then(async () => work(await database()));
  pending = result.catch(() => undefined);
  return result;
}

async function readSummary(db: SQLiteDatabase): Promise<Summary> {
  const today = dayKey();
  const [total, lastDays, days, visits, visitsToday, journeys, unlocked, landmarks] = await Promise.all([
    db.getFirstAsync<{ meters: number; seconds: number; cells: number; area: number; discoveries: number }>(`
      SELECT coalesce(sum(meters),0) meters, coalesce(sum(seconds),0) seconds,
      coalesce(sum(cells),0) cells, coalesce(sum(area),0) area,
      count(CASE WHEN cells > 0 THEN 1 END) discoveries FROM daily_statistics`),
    db.getAllAsync<Day>("SELECT * FROM daily_statistics WHERE day BETWEEN ? AND ? ORDER BY day", precedingDay(today, 6), today),
    db.getAllAsync<{ day: string }>("SELECT day FROM daily_statistics WHERE meters > 0 OR cells > 0"),
    db.getFirstAsync<{ count: number }>("SELECT count(DISTINCT place) count FROM place_visits"),
    db.getFirstAsync<{ count: number }>("SELECT count(DISTINCT place) count FROM place_visits WHERE day=?", today),
    db.getAllAsync<Journey>("SELECT * FROM journeys WHERE meters >= 10 ORDER BY started DESC LIMIT 10"),
    db.getAllAsync<Unlock>("SELECT u.id, timestamp, xp FROM unlocked_achievements u JOIN achievements a ON a.id=u.id ORDER BY timestamp DESC"),
    db.getFirstAsync<{ count: number }>("SELECT count(*) count FROM unlocked_landmarks"),
  ]);
  const dayRows = Array.from({ length: 7 }, (_, i) => {
    const day = precedingDay(today, 6 - i);
    return lastDays.find(row => row.day === day) ?? { day, meters: 0, seconds: 0, cells: 0, area: 0 };
  });
  return {
    metrics: { cells: total?.cells ?? 0, meters: total?.meters ?? 0, squareMeters: total?.area ?? 0,
      discoveryDays: total?.discoveries ?? 0, places: visits?.count ?? 0,
      streak: streak(days.map(row => row.day), today), landmarks: landmarks?.count ?? 0 },
    today: dayRows[6], days: dayRows, visitsToday: visitsToday?.count ?? 0,
    seconds: total?.seconds ?? 0, journeys, unlocked,
  };
}

async function awardMilestones(db: SQLiteDatabase, summary: Summary, timestamp: number) {
  const unlocked = new Set(summary.unlocked.map(award => award.id));
  const awards: Unlock[] = [];
  for (const item of earnedMilestones(summary.metrics, unlocked)) {
    await db.runAsync("INSERT OR IGNORE INTO unlocked_achievements VALUES(?,?)", item.id, timestamp);
    awards.push({ id: item.id, xp: item.xp, timestamp });
  }
  return awards;
}

export const readPreferences = () => query(async db =>
  (await db.getFirstAsync<Preferences>("SELECT name,tracking,haptics,retention,mode,notifications,walkthrough_seen AS walkthroughSeen FROM user_preferences WHERE id=1"))!);
export const readPlaces = () => query(db => db.getAllAsync<Place>(`SELECT saved_places.*, EXISTS(
    SELECT 1 FROM place_photos WHERE place=saved_places.id AND slot=0) AS hasPhoto
    FROM saved_places ORDER BY name COLLATE NOCASE`));
export const readVisits = (id: number) => query(db =>
  db.getAllAsync<Visit>("SELECT * FROM place_visits WHERE place=? ORDER BY entered DESC LIMIT 20", id));
export const readActiveVisits = () => query(db =>
  db.getAllAsync<Visit>("SELECT * FROM place_visits WHERE active=1"));
export const readLandmarkUnlocks = () => query(async db => Object.fromEntries(
  (await db.getAllAsync<LandmarkUnlock>("SELECT id,timestamp FROM unlocked_landmarks")).map(row => [row.id, row.timestamp])));
export const summary = () => query(readSummary);

export type RoutePoint = Point & { timestamp: number; journey: number };

function dayBounds(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return [new Date(year, month - 1, date).getTime(), new Date(year, month - 1, date + 1).getTime()] as const;
}

export const readActivityRange = (first: string, last: string) => query(async db => {
  const [days, visits] = await Promise.all([
    db.getAllAsync<Day>("SELECT * FROM daily_statistics WHERE day BETWEEN ? AND ? ORDER BY day", first, last),
    db.getFirstAsync<{ count: number }>("SELECT count(DISTINCT place) count FROM place_visits WHERE day BETWEEN ? AND ?", first, last),
  ]);
  return { days, visits: visits?.count ?? 0 };
});

export const readDayActivity = (day: string) => query(async db => {
  const [start, end] = dayBounds(day);
  const [stats, visits, points, journeys] = await Promise.all([
    db.getFirstAsync<Day>("SELECT * FROM daily_statistics WHERE day=?", day),
    db.getFirstAsync<{ count: number }>("SELECT count(DISTINCT place) count FROM place_visits WHERE day=?", day),
    db.getAllAsync<RoutePoint>(`SELECT timestamp,journey,latitude,longitude FROM location_samples
      WHERE timestamp>=? AND timestamp<? ORDER BY timestamp`, start, end),
    db.getAllAsync<Journey>(`SELECT * FROM journeys WHERE meters>=10 AND started<? AND ended>=?
      ORDER BY started DESC`, end, start),
  ]);
  return { stats, visits: visits?.count ?? 0, points, journeys };
});

export const readAchievementRoute = (timestamp: number) => query(db =>
  db.getAllAsync<RoutePoint>(`SELECT timestamp,journey,latitude,longitude FROM location_samples
    WHERE timestamp>=? AND timestamp<=? ORDER BY timestamp`, dayBounds(dayKey(timestamp))[0], timestamp));


export function setPreferences(value: Partial<Preferences>) {
  return query(async db => {
    await db.runAsync(`UPDATE user_preferences SET name=coalesce(?,name), tracking=coalesce(?,tracking),
      haptics=coalesce(?,haptics), retention=coalesce(?,retention), mode=coalesce(?,mode),
      notifications=coalesce(?,notifications), walkthrough_seen=coalesce(?,walkthrough_seen) WHERE id=1`,
    value.name ?? null, value.tracking ?? null, value.haptics ?? null, value.retention ?? null, value.mode ?? null,
    value.notifications ?? null, value.walkthroughSeen ?? null);
    if (value.retention !== undefined) await prune(db, value.retention);
  });
}

function prune(db: SQLiteDatabase, days: number) {
  return db.runAsync("DELETE FROM location_samples WHERE timestamp < ?", Date.now() - days * 86_400_000);
}
export const pruneHistory = (days: number) => query(db => prune(db, days));

export const readEasterEggs = () => query(db =>
  db.getAllAsync<{ id: string; discovered: number }>("SELECT id,discovered FROM easter_eggs ORDER BY discovered DESC"));

export const recordEasterEgg = (id: string) => query(async db =>
  (await db.runAsync("INSERT OR IGNORE INTO easter_eggs VALUES(?,?)", id, Date.now())).changes > 0);

export const maxPlacePhotos = 2;

export const readPlaceCover = (id: number) => query(async db =>
  (await db.getFirstAsync<{ jpeg: string }>("SELECT jpeg FROM place_photos WHERE place=? AND slot=0", id))?.jpeg);

export const readPlacePhotos = (id: number) => query(async db =>
  (await db.getAllAsync<{ jpeg: string }>("SELECT jpeg FROM place_photos WHERE place=? ORDER BY slot", id)).map(row => row.jpeg));

export const readNearbyReminderTime = () => query(async db =>
  (await db.getFirstAsync<{ nearby_at: number }>("SELECT nearby_at FROM reminder_state WHERE id=1"))?.nearby_at ?? 0);
export const markNearbyReminder = (time: number) => query(db =>
  db.runAsync("UPDATE reminder_state SET nearby_at=? WHERE id=1", time));

export function savePlace(place: PlaceInput, id?: number, photos?: readonly string[]) {
  return query(async db => {
    if (photos && (photos.length > maxPlacePhotos || photos.some(photo => !photo || photo.length > 1_500_000))) {
      throw new Error("A place can hold up to two photos.");
    }
    const args = [place.name.trim(), place.category, place.icon, place.notes.trim(),
      place.latitude, place.longitude, place.radius, place.dwell];
    let saved = id;
    await db.withTransactionAsync(async () => {
      if (id !== undefined) {
        const updated = await db.runAsync(`UPDATE saved_places SET name=?,category=?,icon=?,notes=?,latitude=?,longitude=?,radius=?,dwell=? WHERE id=?`, ...args, id);
        if (!updated.changes) throw new Error("This place no longer exists.");
      } else {
        saved = (await db.runAsync("INSERT INTO saved_places(name,category,icon,notes,latitude,longitude,radius,dwell) VALUES(?,?,?,?,?,?,?,?)", ...args)).lastInsertRowId;
      }
      if (photos !== undefined) {
        await db.runAsync("DELETE FROM place_photos WHERE place=?", saved!);
        for (const [slot, jpeg] of photos.entries()) {
          await db.runAsync("INSERT INTO place_photos(place,slot,jpeg) VALUES(?,?,?)", saved!, slot, jpeg);
        }
      }
    });
    return saved!;
  });
}
export const deletePlace = (id: number) => query(db => db.runAsync("DELETE FROM saved_places WHERE id=?", id));

type RecordInput = {
  fix: Fix; cells: string[]; meters: number; seconds: number; journey: number | null;
  visits: Visit[]; departures: number[]; landmarkIds: string[]; heatSeconds?: number; summaryDay?: string;
};

export function recordFix(input: RecordInput) {
  return query(async db => {
    const { fix, cells, meters, seconds, visits } = input;
    const day = dayKey(fix.timestamp);
    let journey = input.journey;
    let discovered = 0;
    let squareMeters = 0;
    let summary: Summary | null = null;
    let awards: Unlock[] = [];
    const landmarkUnlocks: LandmarkUnlock[] = [];
    let recorded = false;
    await db.withTransactionAsync(async () => {
      const preference = await db.getFirstAsync<{ tracking: number }>("SELECT tracking FROM user_preferences WHERE id=1");
      if (!preference?.tracking) return;
      const newer = await db.getFirstAsync("SELECT timestamp FROM location_samples WHERE timestamp >= ? LIMIT 1", fix.timestamp);
      if (newer) return;
      recorded = true;
      if (journey === null) {
        journey = (await db.runAsync("INSERT INTO journeys(started,ended) VALUES(?,?)", fix.timestamp, fix.timestamp)).lastInsertRowId;
      }
      await db.runAsync("UPDATE journeys SET ended=?,meters=meters+?,seconds=seconds+? WHERE id=?", fix.timestamp, meters, seconds, journey);
      await db.runAsync("INSERT INTO location_samples VALUES(?,?,?,?,?,?,?)", fix.timestamp, journey, fix.latitude,
        fix.longitude, fix.accuracy, fix.speed, fix.heading);
      for (let index = 0; index < cells.length; index += 100) {
        const batch = cells.slice(index, index + 100);
        const rows = await db.getAllAsync<{ area: number }>(`
          INSERT OR IGNORE INTO explored_cells VALUES ${batch.map(() => "(?,?,?,?,?)").join(",")} RETURNING area`,
        ...batch.flatMap(cell => [cell, ...cellToLatLng(cell), area(cell), day]));
        discovered += rows.length;
        for (const row of rows) squareMeters += row.area;
      }
      await db.runAsync(`INSERT INTO daily_statistics VALUES(?,?,?,?,?) ON CONFLICT(day) DO UPDATE SET
        meters=meters+excluded.meters, seconds=seconds+excluded.seconds, cells=cells+excluded.cells, area=area+excluded.area`,
      day, meters, seconds, discovered, squareMeters);
      const heat = latLngToCell(fix.latitude, fix.longitude, 10);
      const [lat, lng] = cellToLatLng(heat);
      await db.runAsync(`INSERT INTO heat_cells VALUES(?,?,?,?,?,1) ON CONFLICT(day,cell) DO UPDATE SET
        seconds=seconds+excluded.seconds,samples=samples+1`, day, heat, lat, lng, input.heatSeconds ?? seconds);
      for (const id of input.departures) {
        await db.runAsync("UPDATE place_visits SET active=0 WHERE place=? AND active=1", id);
      }
      for (const visit of visits) {
        await db.runAsync(`INSERT INTO place_visits SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM saved_places WHERE id=?)
          ON CONFLICT(place,entered) DO UPDATE SET ended=max(ended,excluded.ended),seconds=max(seconds,excluded.seconds)`,
        visit.place, visit.entered, visit.ended, visit.day, visit.seconds, visit.active, visit.place);
      }
      for (const id of input.landmarkIds) {
        const result = await db.runAsync("INSERT OR IGNORE INTO unlocked_landmarks VALUES(?,?)", id, fix.timestamp);
        if (result.changes) landmarkUnlocks.push({ id, timestamp: fix.timestamp });
      }
      // Stationary samples still update the journey and heatmap. Reuse the published counters when none changed.
      if (input.summaryDay === day && input.summaryDay === dayKey() &&
        !meters && !seconds && !discovered && !visits.length && !landmarkUnlocks.length) return;
      const value = await readSummary(db);
      awards = await awardMilestones(db, value, fix.timestamp);
      value.unlocked.unshift(...awards);
      summary = value;
    });
    return { recorded, journey, summary, awards, discovered, landmarkUnlocks };
  });
}

function viewport(bounds: Bounds) {
  const latitudePad = Math.max(0.002, (bounds.north - bounds.south) * 0.15);
  const longitudePad = Math.max(0.002, (bounds.east - bounds.west) * 0.15);
  const west = bounds.west - longitudePad;
  const east = bounds.east + longitudePad;
  const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
  const left = wrap(west);
  const right = wrap(east);
  const args = [bounds.south - latitudePad, bounds.north + latitudePad];
  let sql = "latitude BETWEEN ? AND ?";
  if (east - west < 360) {
    sql += left <= right ? " AND longitude BETWEEN ? AND ?" : " AND (longitude>=? OR longitude<=?)";
    args.push(left, right);
  }
  return { sql, args };
}

export type PlacePhotoMarker = Point & { id: number; name: string; jpeg: string };
export function visiblePlacePhotos(bounds: Bounds) {
  if (bounds.zoom < 11) return Promise.resolve([]);
  const { sql, args } = viewport(bounds);
  return query(db => db.getAllAsync<PlacePhotoMarker>(`
    SELECT saved_places.id, name, latitude, longitude, jpeg
    FROM saved_places JOIN place_photos ON place_photos.place=saved_places.id AND slot=0
    WHERE ${sql} ORDER BY saved_places.id DESC LIMIT 8`, ...args));
}

export function visibleCells(bounds: Bounds) {
  if (bounds.zoom < 11) return Promise.resolve([]);
  const { sql, args } = viewport(bounds);
  return query(async db => (await db.getAllAsync<{ id: string }>(
    `SELECT id FROM explored_cells WHERE ${sql} LIMIT 16000`, ...args)).map(row => row.id));
}

export function visibleHeat(bounds: Bounds, range: Range) {
  const { sql, args } = viewport(bounds);
  const day = dayKey();
  const start = range === "Today" ? day : range === "Week" ? precedingDay(day, 6) :
    range === "Month" ? precedingDay(day, 29) : "";
  return query(db => db.getAllAsync<HeatPoint>(`SELECT latitude,longitude,sum(seconds) seconds,sum(samples) samples
    FROM heat_cells WHERE ${sql} AND day>=? GROUP BY cell ORDER BY samples DESC LIMIT 6000`, ...args, start));
}

export function clearHistory(reset: boolean) {
  return query(async db => {
    await db.withTransactionAsync(async () => {
      await db.execAsync("DELETE FROM location_samples; DELETE FROM heat_cells; DELETE FROM journeys; DELETE FROM place_visits;");
      if (reset) await db.execAsync("DELETE FROM explored_cells; DELETE FROM daily_statistics; DELETE FROM unlocked_achievements; DELETE FROM unlocked_landmarks;");
    });
    await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
  });
}

export function exportData() {
  return query(async db => ({
    version: 3, exportedAt: new Date().toISOString(),
    cells: await db.getAllAsync("SELECT * FROM explored_cells"),
    samples: await db.getAllAsync("SELECT * FROM location_samples"),
    journeys: await db.getAllAsync("SELECT * FROM journeys"),
    places: await db.getAllAsync("SELECT * FROM saved_places"),
    placePhotos: await db.getAllAsync("SELECT * FROM place_photos ORDER BY place,slot"),
    visits: await db.getAllAsync("SELECT * FROM place_visits"),
    daily: await db.getAllAsync("SELECT * FROM daily_statistics"),
    heat: await db.getAllAsync("SELECT * FROM heat_cells"),
    achievements: await db.getAllAsync("SELECT * FROM unlocked_achievements"),
    landmarks: await db.getAllAsync<LandmarkUnlock>("SELECT * FROM unlocked_landmarks"),
    preferences: await db.getFirstAsync("SELECT * FROM user_preferences"),
  }));
}

