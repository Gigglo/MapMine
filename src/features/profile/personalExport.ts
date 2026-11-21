import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { exportData } from "../../database/repository";

function exportFile() {
  return new File(Paths.cache, "mapmine-export.json");
}

export async function removeCachedExport() {
  const file = exportFile();
  if (file.exists) await file.delete();
}

export async function sharePersonalData() {
  if (!(await Sharing.isAvailableAsync())) return false;
  const contents = JSON.stringify(await exportData(), null, 2);
  const file = exportFile();
  await file.create({ overwrite: true });
  await file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Export MapMine data" });
  return true;
}
