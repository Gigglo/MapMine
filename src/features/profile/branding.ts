import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImageSourcePropType } from "react-native";
import { create } from "zustand";

export const bundledLogo: ImageSourcePropType = require("../../../assets/splash-logo.png");
const useCustomLogo = create<{ uri: string | null }>(() => ({ uri: null }));

function savedLogos() {
  return new Directory(Paths.document).list().filter((entry): entry is File =>
    entry instanceof File && /^mapmine-logo(?:-\d+)?\.jpg$/.test(entry.name))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
}

export function useBrandLogo() {
  const uri = useCustomLogo(state => state.uri);
  return { source: uri ? { uri } : bundledLogo, custom: Boolean(uri) };
}

export function loadBrandLogo() {
  const file = savedLogos().find(item => item.exists && item.size > 0);
  useCustomLogo.setState({ uri: file?.uri ?? null });
}

export async function chooseBrandLogo() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1],
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  const image = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 512) {
    image.resize(asset.width >= asset.height ? { width: 512 } : { height: 512 });
  }
  const rendered = await image.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  const file = new File(Paths.document, `mapmine-logo-${Date.now()}.jpg`);
  const temporary = new File(saved.uri);
  await temporary.move(file);
  useCustomLogo.setState({ uri: file.uri });
  for (const outdated of savedLogos()) {
    if (outdated.uri !== file.uri && outdated.exists) {
      try { outdated.delete(); } catch { /* The selected logo is already available. */ }
    }
  }
}

export async function resetBrandLogo() {
  for (const file of savedLogos()) if (file.exists) await file.delete();
  useCustomLogo.setState({ uri: null });
}
