import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

export type PhotoMeta = { location: LatLng | null; takenAt: number | null };

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length === 3) {
    const [d, m, s] = value.map(Number);
    return d + m / 60 + s / 3600;
  }
  return null;
}

/** GPS + capture time from picker EXIF (Android uses flat keys, iOS nests under {GPS}). */
export function readPhotoMeta(asset: ImagePickerAsset): PhotoMeta {
  const exif = (asset.exif ?? {}) as Record<string, any>;
  const gps = (exif["{GPS}"] ?? {}) as Record<string, any>;
  let lat = toNumber(exif.GPSLatitude ?? gps.Latitude);
  let lng = toNumber(exif.GPSLongitude ?? gps.Longitude);
  if (lat !== null && (exif.GPSLatitudeRef ?? gps.LatitudeRef) === "S") lat = -Math.abs(lat);
  if (lng !== null && (exif.GPSLongitudeRef ?? gps.LongitudeRef) === "W") lng = -Math.abs(lng);
  const location = lat !== null && lng !== null && !(lat === 0 && lng === 0) ? { lat, lng } : null;

  const raw = (exif.DateTimeOriginal ?? exif["{Exif}"]?.DateTimeOriginal) as string | undefined;
  const match = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  const takenAt = match
    ? new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]).getTime()
    : null;
  return { location, takenAt };
}

/**
 * Downscale and re-encode as JPEG. Re-encoding drops EXIF, so uploads can't
 * leak the location during the safety delay. Returns a cache file URI.
 */
export async function compressPhoto(asset: ImagePickerAsset, maxEdge = 2048): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxEdge) {
    context.resize(asset.width >= asset.height ? { width: maxEdge } : { height: maxEdge });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}
