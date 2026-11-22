import { httpUrl } from "./site";

export const downloads = {
  androidApk: "https://github.com/cynicalmindset/MapMine/releases/tag/android",
  androidStore: httpUrl(process.env.MAPMINE_GOOGLE_PLAY_URL),
  iosStore: httpUrl(process.env.MAPMINE_APP_STORE_URL),
};
