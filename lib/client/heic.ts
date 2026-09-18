"use client";

/**
 * iPhones save camera photos as HEIC by default. Chrome, Firefox, and most
 * Android browsers cannot decode HEIC in an <img>/<canvas> at all -- only
 * Safari/WebKit can -- so every photo picker in the app needs to convert a
 * HEIC/HEIF file to JPEG before handing it to the crop modal or a server
 * upload action, neither of which can otherwise do anything useful with it.
 */
export function looksLikeHeic(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  if (file.type) return false;
  return /\.(heic|heif)$/i.test(file.name);
}

/** Converts a HEIC/HEIF file to a JPEG `File` with the same base name. Throws on decode failure. */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  const name = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/** Passes `file` through unchanged unless it looks like HEIC, in which case it's converted first. */
export async function normalizeImageFile(file: File): Promise<File> {
  return looksLikeHeic(file) ? convertHeicToJpeg(file) : file;
}
