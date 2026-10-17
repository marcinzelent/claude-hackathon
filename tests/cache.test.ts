import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/cache";

describe("TtlCache", () => {
  afterEach(() => vi.useRealTimers());

  it("reuses a value until it expires", async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(1000);
    const load = vi.fn(async () => load.mock.calls.length);
    expect(await cache.get("a", load)).toBe(1);
    expect(await cache.get("a", load)).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(await cache.get("a", load)).toBe(2);
  });

  it("shares a request that is still running", async () => {
    const cache = new TtlCache<string>(1000);
    const load = vi.fn(async () => "x");
    await Promise.all([cache.get("a", load), cache.get("a", load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("doesn't keep failures or rejected values", async () => {
    const cache = new TtlCache<string | null>(1000);
    await expect(cache.get("a", async () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect(await cache.get("a", async () => null, (v) => v !== null)).toBeNull();
    expect(await cache.get("a", async () => "ok")).toBe("ok");
  });

  it("forgets the oldest entry when full", async () => {
    const cache = new TtlCache<string>(1000, 2);
    const load = vi.fn(async () => "v");
    for (const key of ["a", "b", "c", "a"]) await cache.get(key, load);
    expect(load).toHaveBeenCalledTimes(4);
  });
});
