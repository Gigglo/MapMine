import { distance, territory, type Point } from "./engine";

export function walkingRoute(origin: Point) {
  const latitude = Math.max(-84, Math.min(84, origin.latitude));
  const longitude = origin.longitude;
  return Array.from({ length: 42 }, (_, index) => ({
    latitude: latitude + Math.sin(index / 7) * 0.00035 + index * 0.000034,
    longitude: (longitude + index * 0.000045 + 540) % 360 - 180,
  }));
}

export function simulatedCells(route: Point[]) {
  return [...new Set(route.flatMap((point, index) => {
    const previous = route[index - 1];
    return territory(point, previous, previous ? distance(previous, point) : 0);
  }))];
}

