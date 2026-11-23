import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { cachedPhoto } from "./MemoryImage";

const thumbnails = new Map<string, Promise<string>>();
const maxCachedThumbnails = 12;

export function placeThumbnail(jpeg: string) {
  const cached = thumbnails.get(jpeg);
  if (cached) {
    thumbnails.delete(jpeg);
    thumbnails.set(jpeg, cached);
    return cached;
  }
  const pending = makeThumbnail(jpeg).catch(error => {
    if (thumbnails.get(jpeg) === pending) thumbnails.delete(jpeg);
    throw error;
  });
  thumbnails.set(jpeg, pending);
  if (thumbnails.size > maxCachedThumbnails) {
    const oldest = thumbnails.keys().next().value;
    if (oldest !== undefined) thumbnails.delete(oldest);
  }
  return pending;
}

async function makeThumbnail(jpeg: string) {
  const original = await cachedPhoto(jpeg);
  let thumb: File | undefined;
  try {
    const image = await ImageManipulator.manipulate(original.uri).resize({ width: 112 }).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (saved.uri.startsWith("file:")) thumb = new File(saved.uri);
    return saved.base64 ?? jpeg;
  } finally {
    if (original.exists) original.delete();
    if (thumb?.exists) thumb.delete();
  }
}
