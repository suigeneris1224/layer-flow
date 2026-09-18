"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Crop-then-upload for avatar/cover/farm photos.
 *
 * Output is always a fixed-size JPEG, regardless of the input's format or
 * dimensions -- one encode path, and a predictable, small file size (a few
 * hundred KB at these dimensions), comfortably under every caller's existing
 * server-side byte cap. The crop step is purely client-side; nothing here
 * touches the upload server actions, which only ever cared that *a* valid
 * image arrives in FormData.
 */
async function getCroppedFile(
  imageSrc: string,
  cropPixels: Area,
  outputWidth: number,
  outputHeight: number,
  filename: string
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported.");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not encode the cropped image.");

  return new File([blob], filename, { type: "image/jpeg" });
}

export function ImageCropModal({
  file,
  aspect,
  round = false,
  outputWidth,
  outputHeight,
  onCancel,
  onCropped,
}: {
  /** Modal is open whenever this is non-null. */
  file: File | null;
  aspect: number;
  /** Circular crop guide, for the avatar. */
  round?: boolean;
  outputWidth: number;
  outputHeight: number;
  onCancel: () => void;
  /** Receives the cropped, re-encoded File once "Save" is pressed. */
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recreated only when `file` changes, and revoked on cleanup -- creating a
  // fresh object URL on every render would leak one per render and could
  // flicker the Cropper's <img>, since its src identity would keep changing.
  const imageSrc = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  }

  async function onSave() {
    if (!file || !imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    setError(null);

    try {
      const cropped = await getCroppedFile(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
        file.name
      );
      reset();
      onCropped(cropped);
    } catch {
      setError("Could not crop that image. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  return (
    <Modal open={file !== null} onClose={handleCancel} title="Crop photo" size="lg">
      <div className="flex flex-col gap-3">
        {imageSrc && (
          <div className={cn("relative h-72 w-full overflow-hidden rounded-md bg-muted")}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={round ? "round" : "rect"}
              showGrid={!round}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
