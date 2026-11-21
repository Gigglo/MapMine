import type { Bounds, HeatPoint, Mode, Place } from "../../database/repository";
import { validPoint, type Point } from "../exploration/engine";

export type MapCommand =
  | { type: "zoom"; amount: 1 | -1 }
  | { type: "north" }
  | { type: "center"; point: Point; zoom?: number }
  | { type: "location"; point: Point | null; heading: number | null; follow: boolean }
  | { type: "mode"; mode: Mode }
  | { type: "fog"; polygons: number[][][][]; anchor: number }
  | { type: "heat"; points: HeatPoint[]; metric: "seconds" | "samples" }
  | { type: "placeGlyphs"; images: Record<string, string> }
  | { type: "landmarks"; points: (Point & { id: string; discovered: boolean })[] }
  | { type: "places"; places: Pick<Place, "id" | "latitude" | "longitude" | "icon">[] };

export type MapEvent =
  | { type: "ready" | "gesture" | "error" }
  | { type: "viewport"; bounds: Bounds }
  | { type: "hold"; point: Point }
  | { type: "attribution"; url: string }
  | { type: "landmark"; id: string }
  | { type: "place"; id: number };

const attributionLinks = new Set(["https://www.openstreetmap.org/copyright", "https://carto.com/about-carto/"]);

export function parseEvent(message: string): MapEvent | null {
  if (message.length > 2048) return null;
  try {
    const value: unknown = JSON.parse(message);
    if (!value || typeof value !== "object" || !("type" in value)) return null;
    switch (value.type) {
      case "ready": case "gesture": case "error": return { type: value.type };
      case "attribution":
        return "url" in value && typeof value.url === "string" && attributionLinks.has(value.url)
          ? { type: "attribution", url: value.url } : null;
      case "landmark":
        return "id" in value && typeof value.id === "string" && /^[a-z0-9-]{1,64}$/.test(value.id)
          ? { type: "landmark", id: value.id } : null;
      case "place":
        if ("id" in value && typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0)
          return { type: "place", id: value.id };
        return null;
      case "hold": {
        const point = "point" in value && value.point as Point | null;
        return point && validPoint(point) ? { type: "hold", point } : null;
      }
      case "viewport": {
        const bounds = "bounds" in value && value.bounds as Bounds | null;
        if (!bounds || ![bounds.south, bounds.north, bounds.west, bounds.east, bounds.zoom].every(Number.isFinite)) return null;
        return bounds.south >= -90 && bounds.north <= 90 && bounds.south <= bounds.north &&
          bounds.east >= bounds.west && bounds.east - bounds.west <= 1080 &&
          Math.abs(bounds.west) <= 100000 && Math.abs(bounds.east) <= 100000 && bounds.zoom >= 0 && bounds.zoom <= 22
          ? { type: "viewport", bounds } : null;
      }
      default: return null;
    }
  } catch {
    return null;
  }
}

