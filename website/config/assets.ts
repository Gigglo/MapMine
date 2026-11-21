import { existsSync } from "node:fs";
import { join } from "node:path";

export const brand = {
  logo: "/brand/logo.webp",
  icon: "/brand/favicon.png",
  share: "/brand/share.webp",
};

export const screenAssets = [
  { id: "explore", label: "Explore", alt: "MapMine exploration map and distance summary", video: "hero-demo" },
  { id: "fog-of-war", label: "Fog of war", alt: "MapMine showing clear territory through dark unexplored fog", video: "exploration" },
  { id: "places", label: "Saved places", alt: "MapMine saved places and visit history", video: "saved-places" },
  { id: "heatmap", label: "Heatmap", alt: "MapMine heatmap showing areas of repeated activity", video: "heatmap" },
  { id: "activity", label: "Activity", alt: "MapMine distance and area dashboard", video: "bottom-sheet" },
  { id: "achievements", label: "Achievements", alt: "MapMine achievements and exploration level", video: "achievements" },
  { id: "profile", label: "Profile & settings", alt: "MapMine profile and location controls", video: "navigation" },
] as const;
export type Screen = (typeof screenAssets)[number]["id"];

function available(path: string) {
  return existsSync(join(process.cwd(), "public", path.slice(1))) ? path : undefined;
}

export function mediaFor(screen: Screen) {
  const item = screenAssets.find(entry => entry.id === screen)!;
  const screenshot = available(`/screenshots/${screen}.avif`) ?? available(`/screenshots/${screen}.webp`);
  const video = {
    webm: available(`/videos/${item.video}.webm`),
    mp4: available(`/videos/${item.video}.mp4`),
    poster: available(`/posters/${item.video}.webp`) ?? screenshot,
  };
  return { ...item, screenshot, video: video.webm || video.mp4 ? video : undefined };
}
