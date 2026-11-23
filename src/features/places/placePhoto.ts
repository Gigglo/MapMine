import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";

export async function choosePlacePhoto() {
  const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
  if (selection.canceled) return undefined;
  const asset = selection.assets[0];
  const image = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 960) {
    image.resize(asset.width >= asset.height ? { width: 960 } : { height: 960 });
  }
  const rendered = await image.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  try {
    if (!saved.base64 || saved.base64.length > 1_500_000) throw new Error("Photo is too large.");
    return saved.base64;
  } finally {
    if (saved.uri.startsWith("file:")) {
      try { new File(saved.uri).delete(); } catch { /* The temporary image can be cleared by the system. */ }
    }
  }
}
