import { useEffect, useState, type ReactNode } from "react";
import { Image, type ImageProps } from "react-native";
import { File, Paths } from "expo-file-system";

let sequence = 0;

export async function cachedPhoto(jpeg: string) {
  const file = new File(Paths.cache, `mapmine-photo-${Date.now()}-${sequence++}.jpg`);
  try {
    await file.create({ overwrite: true });
    await file.write(jpeg, { encoding: "base64" });
    return file;
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}

export default function MemoryImage({ jpeg, fallback = null, ...props }: Omit<ImageProps, "source"> & {
  jpeg: string; fallback?: ReactNode;
}) {
  const [uri, setUri] = useState<string>();
  useEffect(() => {
    let active = true;
    let file: File | undefined;
    void cachedPhoto(jpeg).then(result => {
      if (!active) { if (result.exists) result.delete(); return; }
      file = result;
      setUri(result.uri);
    }).catch(() => {
      if (active) setUri("data:image/jpeg;base64," + jpeg);
    });
    return () => { active = false; if (file?.exists) file.delete(); };
  }, [jpeg]);
  if (!uri) return fallback;
  return <Image {...props} source={{ uri }} onError={() => setUri(undefined)} />;
}
