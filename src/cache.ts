// A small in-memory cache that forgets entries after `ttlMs`. Calls for the same key while a
// request is still running share that request. Failures (and values `keep` rejects) aren't cached,
// so the next call tries again.
export class TtlCache<T> {
  private entries = new Map<string, { at: number; value: Promise<T> }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
  ) {}

  get(key: string, load: () => Promise<T>, keep: (value: T) => boolean = () => true): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;

    const value = load();
    this.entries.delete(key); // re-insert so the Map's order stays oldest-first
    this.entries.set(key, { at: Date.now(), value });
    if (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);

    const drop = () => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    };
    value.then((v) => !keep(v) && drop(), drop);
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}
