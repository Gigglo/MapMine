import { existsSync } from "node:fs";
import { join } from "node:path";
import { httpUrl } from "./site";

const localApk = process.env.MAPMINE_ANDROID_APK_PATH;
const packagedApk = localApk && /^\/downloads\/[\w.-]+\.apk$/i.test(localApk) &&
  existsSync(join(process.cwd(), "public", localApk.slice(1))) ? localApk : undefined;

export const downloads = {
  androidApk: httpUrl(process.env.MAPMINE_ANDROID_APK_URL) ?? packagedApk,
  androidStore: httpUrl(process.env.MAPMINE_GOOGLE_PLAY_URL),
  iosStore: httpUrl(process.env.MAPMINE_APP_STORE_URL),
};
