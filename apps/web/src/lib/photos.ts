import exifr from "exifr";

import type { LatLng } from "@sojourn/backend/convex/lib/paths";

export type PhotoMeta = { location: LatLng | null; takenAt: number | null };

/** Read GPS position and capture time from a photo's EXIF, if present. */
export async function readPhotoMeta(file: Blob): Promise<PhotoMeta> {
  try {
    const data = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "latitude", "longitude"] });
    const location =
      data && typeof data.latitude === "number" && typeof data.longitude === "number"
        ? { lat: data.latitude, lng: data.longitude }
        : null;
    const takenAt = data?.DateTimeOriginal instanceof Date ? data.DateTimeOriginal.getTime() : null;
    return { location, takenAt };
  } catch {
    return { location: null, takenAt: null };
  }
}

/**
 * Downscale and re-encode as JPEG. Re-encoding through a canvas also strips
 * EXIF, so the uploaded photo can't leak the location during the safety delay.
 */
export async function compressPhoto(file: Blob, maxEdge = 2048, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))), "image/jpeg", quality),
  );
}

export async function uploadPhoto(uploadUrl: string, blob: Blob): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!res.ok) throw new Error("Photo upload failed");
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}
