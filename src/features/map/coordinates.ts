import { validPoint, type Point } from "../exploration/engine";

const number = "[+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)";
const pair = new RegExp("^(" + number + ")(?:\\s*,\\s*|[ \\t]+)(" + number + ")$");

export function formatCoordinates(point: Point) {
  return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
}

export function parseCoordinates(text: string): Point | undefined {
  const match = pair.exec(text.trim());
  if (!match) return;
  const point = { latitude: Number(match[1]), longitude: Number(match[2]) };
  return validPoint(point) ? point : undefined;
}
