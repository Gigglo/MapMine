import { httpUrl } from "./site";

export const downloads = {
  androidApk: "https://github.com/Gigglo/MapMine/releases/tag/v2",
  androidStore: httpUrl(process.env.MAPMINE_GOOGLE_PLAY_URL),
  iosStore: httpUrl(process.env.MAPMINE_APP_STORE_URL),
};
