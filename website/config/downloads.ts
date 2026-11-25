import { httpUrl } from "./site";

export const androidRelease = {
  tag: "v2",
  url: "https://github.com/Gigglo/MapMine/releases/tag/bugs_fixed",
};

export const downloads = {
  androidRelease: androidRelease.url,
  androidStore: httpUrl(process.env.MAPMINE_GOOGLE_PLAY_URL),
  iosStore: httpUrl(process.env.MAPMINE_APP_STORE_URL),
};
