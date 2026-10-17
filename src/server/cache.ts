import { createHash } from "node:crypto";
import { TtlCache } from "../cache";

// Server-only: named caches that every API route shares and that survive hot reloads.
// Memory only: nothing is written to disk, and a server restart empties them.

export const MINUTE = 60 * 1000;

const caches: Map<string, TtlCache<unknown>> = ((globalThis as { __roomradarCaches?: Map<string, TtlCache<unknown>> })
  .__roomradarCaches ??= new Map());

export function serverCache<T>(name: string, ttlMs: number): TtlCache<T> {
  if (!caches.has(name)) caches.set(name, new TtlCache<unknown>(ttlMs));
  return caches.get(name) as TtlCache<T>;
}

/** A short key for any input (a CV, a guest list), so large or personal inputs aren't kept as keys. */
export const cacheKey = (...parts: unknown[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
