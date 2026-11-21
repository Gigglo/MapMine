import type { Point } from "../exploration/engine";
import { heritageSites } from "./heritageData";

export type Landmark = Point & { id: string; name: string; category: string; radius: number };
export type LandmarkBounds = { north: number; south: number; east: number; west: number; zoom: number };
export const landmarkMinZoom = 11;
export const landmarkDwellMs = 24_000;

const bhubaneswar: Landmark[] = [
  { id: "bbi-state-museum", name: "Odisha State Museum", category: "Museum", latitude: 20.2562, longitude: 85.8415, radius: 80 },
  { id: "bbi-udayagiri-khandagiri", name: "Udayagiri and Khandagiri Caves", category: "Rock-cut caves", latitude: 20.2628, longitude: 85.7861, radius: 145 },
  { id: "bbi-esplanade", name: "Nexus Esplanade", category: "Shopping centre", latitude: 20.29137, longitude: 85.85631, radius: 100 },
  { id: "bbi-dn-regalia", name: "DN Regalia Mall", category: "Shopping centre", latitude: 20.2409, longitude: 85.75806, radius: 82 },
  { id: "bbi-lingaraj", name: "Lingaraj Temple", category: "Historic temple", latitude: 20.2384, longitude: 85.8337, radius: 115 },
  { id: "bbi-dhauli", name: "Dhauli Shanti Stupa", category: "Peace pagoda", latitude: 20.19245, longitude: 85.83958, radius: 105 },
];

export const landmarks: readonly Landmark[] = [
  ...bhubaneswar,
  ...heritageSites.map(([id, name, latitude, longitude, kind]) => ({
    id: "unesco-" + id, name, latitude, longitude, category: kind + " heritage", radius: 160,
  })),
];
const indexed = new Map(landmarks.map(landmark => [landmark.id, landmark]));
export const findLandmark = (id: string) => indexed.get(id);

export function landmarksInView(bounds: LandmarkBounds, catalog: readonly Landmark[] = landmarks) {
  if (bounds.zoom < landmarkMinZoom) return [];
  const center = (bounds.west + bounds.east) / 2;
  const padding = 0.004;
  return catalog.filter(landmark => {
    const longitude = landmark.longitude + 360 * Math.round((center - landmark.longitude) / 360);
    return landmark.latitude >= bounds.south - padding && landmark.latitude <= bounds.north + padding &&
      longitude >= bounds.west - padding && longitude <= bounds.east + padding;
  });
}
