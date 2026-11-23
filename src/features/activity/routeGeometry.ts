import type { RoutePoint } from "../../database/repository";
import { exploration } from "../exploration/engine";

type XY = { x: number; y: number };
export type Leg = { path: string; length: number; start: number; points: (XY & { distance: number })[] };
export const mapWidth = 320;
export const mapHeight = 180;
const tileSize = 256;

export function routeGeometry(samples: RoutePoint[]) {
  if (!samples.length) return { zoom: 0, tiles: [], legs: [] as Leg[], total: 0 };
  const projected: XY[][] = [];
  let last: RoutePoint | undefined;
  let longitude = 0;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const sample of samples) {
    if (!last || sample.journey !== last.journey || sample.timestamp - last.timestamp > exploration.maxGap) {
      projected.push([]);
    }
    longitude = last ? longitude + ((sample.longitude - last.longitude + 540) % 360 - 180) : sample.longitude;
    const latitude = Math.max(-85.051128, Math.min(85.051128, sample.latitude)) * Math.PI / 180;
    const x = longitude / 360 + 0.5;
    const y = 0.5 - Math.asinh(Math.tan(latitude)) / (2 * Math.PI);
    projected[projected.length - 1].push({ x, y });
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    last = sample;
  }

  const zoom = Math.max(0, Math.min(17, Math.floor(Math.log2(Math.min(
    (mapWidth - 54) / (tileSize * (right - left)),
    (mapHeight - 54) / (tileSize * (bottom - top)),
  )))));
  const tilesAcross = 2 ** zoom;
  const scale = tilesAcross * tileSize;
  const originX = (left + right) * scale / 2 - mapWidth / 2;
  const originY = (top + bottom) * scale / 2 - mapHeight / 2;
  const tiles = [];
  for (let row = Math.max(0, Math.floor(originY / tileSize)); row < tilesAcross && row * tileSize < originY + mapHeight; row++) {
    for (let col = Math.floor(originX / tileSize); col * tileSize < originX + mapWidth; col++) {
      tiles.push({ id: col + ":" + row, col: ((col % tilesAcross) + tilesAcross) % tilesAcross, row,
        left: col * tileSize - originX, top: row * tileSize - originY });
    }
  }

  const stride = Math.max(1, Math.ceil(samples.length / 900));
  let total = 0;
  const legs = projected.map((leg): Leg => {
    let length = 0;
    const points = leg.filter((_, i) => i % stride === 0 || i === leg.length - 1).map(({ x, y }) => {
      const point = { x: x * scale - originX, y: y * scale - originY };
      // Rounded coordinates keep the native path payload small.
      return { x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)), distance: 0 };
    });
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      points[i].distance = length;
    }
    const path = points.map(({ x, y }, i) => (i ? "L" : "M") + x + " " + y).join("");
    const start = total;
    total += length;
    return { path, length, points, start };
  });
  return { zoom, tiles, legs, total };
}
