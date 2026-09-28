const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a task for each item, with up to `max` tasks at the same time.
 * A task returns { throttled: true, retryAfter } when the API says "too many requests".
 * Then the queue puts the item back, halves the concurrency and waits. After a run of successes, it adds one again.
 * The promise resolves when all items are done or when stopped() is true.
 */
export function runQueue({ items, task, max, stopped = () => false, onChange = () => {} }) {
  let limit = max;
  let active = 0;
  let streak = 0;
  let pausedUntil = 0;
  let exhausted = false;
  const retry = [];
  const next = () => {
    if (retry.length) return { value: retry.shift() };
    if (exhausted) return null;
    const r = items.next();
    if (r.done) exhausted = true;
    return r.done ? null : r;
  };

  return new Promise((resolve) => {
    const pump = () => {
      const finished = stopped() || (exhausted && retry.length === 0);
      if (finished && active === 0) return resolve();
      if (stopped()) return;
      const wait = pausedUntil - Date.now();
      if (wait > 0) return void setTimeout(pump, wait);
      while (active < limit) {
        const item = next();
        if (!item) break;
        active++;
        Promise.resolve(task(item.value))
          .catch(() => null)
          .then((result) => {
            active--;
            if (result?.throttled) {
              retry.push(item.value);
              limit = Math.max(1, Math.floor(limit / 2));
              streak = 0;
              pausedUntil = Date.now() + (result.retryAfter ?? 1) * 1000;
            } else if (++streak >= limit * 10 && limit < max) {
              limit++;
              streak = 0;
            }
            onChange({ limit, active });
            pump();
          });
      }
      if (exhausted && retry.length === 0 && active === 0) resolve();
    };
    pump();
  });
}

/** Runs a task for one item at a time, with a gap between tasks. Items can join while it runs. */
export class SerialQueue {
  constructor(task, gapMs) {
    this.task = task;
    this.gapMs = gapMs;
    this.items = [];
    this.running = false;
    this.stopped = false;
    this.waiters = [];
  }

  get size() {
    return this.items.length + (this.running ? 1 : 0);
  }

  push(item) {
    this.items.push(item);
    this.run();
  }

  stop() {
    this.stopped = true;
    this.items = [];
  }

  /** Resolves when the queue is empty and no task runs. */
  idle() {
    return this.running || this.items.length ? new Promise((resolve) => this.waiters.push(resolve)) : Promise.resolve();
  }

  async run() {
    if (this.running) return;
    this.running = true;
    while (this.items.length && !this.stopped) {
      await Promise.resolve(this.task(this.items.shift())).catch(() => null);
      await sleep(this.gapMs);
    }
    this.running = false;
    this.waiters.splice(0).forEach((resolve) => resolve());
  }
}
