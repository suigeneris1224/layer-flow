/**
 * Tiny pub-sub so UI mounted anywhere can react to queue changes.
 *
 * Not `useSyncExternalStore` -- that needs a synchronous snapshot, and every
 * read here is an async IndexedDB call. Subscribers just re-fetch when
 * notified; for a status banner that's plenty.
 */

const listeners = new Set<() => void>();

export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitQueueChange(): void {
  for (const listener of listeners) listener();
}
