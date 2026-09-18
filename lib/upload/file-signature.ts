/**
 * Byte-signature sniffing for uploaded files, shared by every upload action.
 *
 * `file.type` is just a client-supplied header -- trivially spoofed by
 * anyone calling an action directly, but also, on mobile, sometimes just
 * wrong or empty through no malice at all (some Android gallery/file-manager
 * apps hand the browser `""` for a perfectly valid photo). Every upload
 * action should fall back to sniffing the real bytes before rejecting a file
 * whose declared MIME type didn't match anything expected.
 */

export type SniffableType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

const SIGNATURES: Record<SniffableType, (head: Uint8Array) => boolean> = {
  "image/jpeg": (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  "image/png": (head) =>
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a,
  // WebP is a RIFF container: bytes 0-3 "RIFF", bytes 8-11 "WEBP".
  "image/webp": (head) =>
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50,
  "application/pdf": (head) => head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46, // "%PDF"
};

/** Whether `file`'s actual bytes match `mimeType`, regardless of what `file.type` says. */
export async function matchesFileSignature(file: File, mimeType: SniffableType): Promise<boolean> {
  const check = SIGNATURES[mimeType];
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return check(head);
}

/**
 * Resolve a file to one of `allowed`'s extensions, trusting `file.type` when
 * it matches, and falling back to sniffing the bytes when it's empty or
 * wrong (see module doc). Returns null if nothing matches either way.
 */
export async function resolveUploadType<T extends SniffableType>(
  file: File,
  allowed: Record<T, string>
): Promise<string | null> {
  const declared = allowed[file.type as T];
  if (declared && (await matchesFileSignature(file, file.type as T))) return declared;

  for (const mimeType of Object.keys(allowed) as T[]) {
    if (await matchesFileSignature(file, mimeType)) return allowed[mimeType];
  }
  return null;
}
