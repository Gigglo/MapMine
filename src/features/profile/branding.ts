import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import type { ImageSourcePropType } from "react-native";
import { create } from "zustand";

export const bundledLogo: ImageSourcePropType = require("../../../assets/splash-logo.png");
const useCustomLogo = create<{ uri: string | null }>(() => ({ uri: null }));
const logoFile = () => new File(Paths.document, "mapmine-logo.jpg");

export function useBrandLogo() {
  const uri = useCustomLogo(state => state.uri);
  return { source: uri ? { uri } : bundledLogo, custom: Boolean(uri) };
}

export function loadBrandLogo() {
  const file = logoFile();
  useCustomLogo.setState({ uri: file.exists && file.size > 0 ? file.uri : null });
}

export async function chooseBrandLogo() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
  });
  if (result.canceled) return;
  const image = result.assets[0]?.base64;
  if (!image) throw new Error("The selected image could not be read.");
  if (image.length > 8_000_000) throw new Error("Choose a smaller image for the logo.");
  const file = logoFile();
  const staged = new File(Paths.document, "mapmine-logo-pending.jpg");
  await staged.create({ overwrite: true });
  try {
    await staged.write(image, { encoding: "base64" });
    await staged.move(file, { overwrite: true });
  } catch (error) {
    if (staged.exists) await staged.delete();
    throw error;
  }
  useCustomLogo.setState({ uri: file.uri + "?v=" + Date.now() });
}

export async function resetBrandLogo() {
  const file = logoFile();
  if (file.exists) await file.delete();
  useCustomLogo.setState({ uri: null });
}
