# Offline support

> **Status: designed, not built.**
>
> There is **no service worker and no sync queue in this repository yet.** The app is installable
> as a PWA (manifest, icons, standalone display) but it does **not** work offline today. Do not
> tell a farmer it does.
>
> This document is the design to build against, plus the groundwork already in place.

## Why it matters

Poultry houses have thick walls and sit outside town. Farmers record at 6am, often on prepaid data
that may have run out overnight. If recording fails without a signal, they go back to a notebook —
and never come back.

## Scope

Offline is for **recording**, not browsing. These must work with no connection:

- Daily production, including the egg-size breakdown
- Mortality
- Feed usage

Reading history, sales and reports can require a connection. The asymmetry is deliberate: writes
are time-critical and small; reads are not.

Offline mode is a **Starter** feature (`canAccess(subject, "offline_mode")`).

## Design

```
Form submit
  → online?  → Server Action → done
  → offline? → IndexedDB queue → "Saved on your phone"
                    ↓ connection returns
              Sync queue → Server Action → mark synced
```

### Storage

IndexedDB, not `localStorage`: structured records, no 5MB ceiling, and async so it never blocks
the main thread while a farmer is typing.

One store, `pending_writes`:

```ts
{
  id: string;            // client-generated UUID — the idempotency key
  kind: "daily_production";
  payload: DailyProductionInput;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: "pending" | "syncing" | "failed";
}
```

### Why the write path is already safe to retry

`record_daily_production` **upserts** on `(flock_id, production_date)`.

This is the important groundwork. Submitting the same day twice updates one row rather than
creating two. A farmer who taps save on a flaky connection, then again, then again, ends up with
one correct record — not three.

Without that property, a retrying queue would be actively dangerous.

### Conflict handling

The conflict that actually happens: a record was made offline on a phone, and the same day was
also recorded on another device.

Last-write-wins would silently discard someone's morning. Instead:

1. Compare the server row's `updated_at` against the timestamp when the queued item was created.
2. If the server is newer and the values differ, mark the item `failed` and **ask the farmer**,
   showing both versions.
3. Never resolve a genuine disagreement silently.

### Sync triggers

- `window` `online` event
- App regains focus
- A retry button in the pending-records UI
- Background Sync API where supported — treat it as a bonus, never the only path

Retries use exponential backoff, capped. A permanently failing item stays in the queue, visible
and marked, until the farmer deals with it.

### The rule

**Never silently lose data.** A queued record is deleted only after the server confirms the write.
On unrecoverable failure it stays, visibly failed, with its error. A record that vanishes is worse
than one that is obviously stuck.

## What the farmer sees

| State | Message |
|---|---|
| Offline | "Offline — your records are saved on this phone." |
| Saved offline | "Saved. It will sync when you have signal." |
| Syncing | "Syncing…" |
| Done | "Records synchronised." |
| Failed | "Couldn't sync 2 records. Tap to review." |

A pending count is always visible while the queue is non-empty. Farmers must never have to guess
whether their morning made it.

## Service worker

Not written. When it is:

- **App shell**: cache-first, so the UI opens with no connection.
- **API calls**: network-first. Never serve stale farm numbers from cache — a farmer acting on
  yesterday's figures believing they are today's is worse than an error.
- **Versioned caches**, cleaned on activate, or a stale shell will outlive a deploy.

## Build order

1. IndexedDB wrapper + queue schema
2. Detect offline; route submits to the queue
3. Sync engine with backoff
4. Status UI and pending count
5. Conflict review screen
6. Service worker and app-shell caching
7. Gate on the `offline_mode` entitlement

## Testing it honestly

DevTools "Offline" is not enough — it is too clean. Also test:

- **Airplane mode on a real Android phone**
- Connection dropping *mid-request*, which is the case that actually corrupts state
- Very slow, non-zero connections — worse than no connection, and common on rural prepaid data
- Two devices recording the same flock-day, to exercise conflict handling
- A queue that has sat overnight
