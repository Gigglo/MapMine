import { importDatabaseFromAssetAsync, openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { Point } from "../exploration/engine";
import { landmarkMinZoom, type Landmark, type LandmarkBounds } from "./catalog";

const assetId: number = require("../../../assets/india_landmarks_v2.db");
type Row = Omit<Landmark, "id"> & { id: number };
let connection: Promise<SQLiteDatabase> | undefined;

function catalog() {
  connection ??= (async () => {
    const name = "india_landmarks_v2.db";
    await importDatabaseFromAssetAsync(name, { assetId });
    const db = await openDatabaseAsync(name);
    await db.execAsync("PRAGMA query_only=ON");
    return db;
  })().catch(error => { connection = undefined; throw error; });
  return connection;
}

function landmark(row: Row): Landmark {
  return { ...row, id: "india-" + row.id };
}

export async function indiaLandmarksInView(bounds: LandmarkBounds) {
  if (bounds.zoom < landmarkMinZoom || bounds.north < 6 || bounds.south > 37) return [];
  const center = (bounds.west + bounds.east) / 2;
  const correction = 360 * Math.round((center - 83) / 360);
  const west = bounds.west - correction - 0.004;
  const east = bounds.east - correction + 0.004;
  if (east < 68 || west > 98) return [];
  const db = await catalog();
  const rows = await db.getAllAsync<Row>(`
    SELECT id,name,latitude,longitude,category,radius FROM landmarks
    WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? AND minZoom <= ?
    ORDER BY rank DESC, id LIMIT 180`,
  bounds.south - 0.004, bounds.north + 0.004, west, east, bounds.zoom);
  return rows.map(landmark);
}

export async function indiaLandmarksNear(point: Point) {
  if (point.latitude < 5.99 || point.latitude > 37.01 || point.longitude < 67.99 || point.longitude > 98.01) return [];
  const delta = 0.003;
  const width = delta / Math.cos(point.latitude * Math.PI / 180);
  const db = await catalog();
  const rows = await db.getAllAsync<Row>(`
    SELECT id,name,latitude,longitude,category,radius FROM landmarks
    WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
  point.latitude - delta, point.latitude + delta, point.longitude - width, point.longitude + width);
  return rows.map(landmark);
}

export async function findIndiaLandmark(id: string) {
  if (!/^india-[0-9]+$/.test(id)) return undefined;
  const db = await catalog();
  const row = await db.getFirstAsync<Row>("SELECT id,name,latitude,longitude,category,radius FROM landmarks WHERE id=?", Number(id.slice(6)));
  return row ? landmark(row) : undefined;
}

export async function searchIndiaLandmarks(query: string) {
  const name = query.trim();
  if (name.length < 2) return [];
  const prefix = name.replace(/[\\%_]/g, "\\$&") + "%";
  const db = await catalog();
  const rows = await db.getAllAsync<Row>(`
    SELECT id,name,latitude,longitude,category,radius FROM landmarks
    WHERE name LIKE ? ESCAPE '\\'
    ORDER BY (name = ? COLLATE NOCASE) DESC, rank DESC, name COLLATE NOCASE LIMIT 14`,
  prefix, name);
  return rows.map(landmark);
}
