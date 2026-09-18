"use client";

/**
 * Downscales an image to fit within `maxDimension` on its longest edge and
 * re-encodes it as JPEG, without any crop -- no dialog, no user interaction,
 * nothing rendered to the page. A raw phone photo is routinely 3-8MB at full
 * resolution; this keeps uploads comfortably under each caller's existing
 * server-side byte cap while preserving the original aspect ratio (display
 * still relies on CSS `object-cover` where a fixed frame, like the avatar
 * circle, is needed).
 *
 * Deliberately not `ImageCropModal` (removed) -- that gave users a drag-to-
 * reposition step, but its `<canvas>` source decoding was a recurring source
 * of black-output bugs on mobile. This is the same proven `<img>`-based
 * decode path minus the interactive part.
 */
export async function resizeImage(file: File, maxDimension: number, quality = 0.9): Promise<File> {
  const imageSrc = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
    });

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported.");

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Could not encode the image.");

    return new File([blob], file.name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageSrc);
  }
}
